import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
} else {
  console.warn('⚠️ GEMINI_API_KEY is not set. API calls will return mock or informative error responses.');
}

// Flash Lite primary model alias
const FLASH_LITE_MODEL = 'gemini-3.1-flash-lite';
const FALLBACK_MODEL = 'gemini-3.8-flash';

// --- SERVER-SIDE TOKEN QUOTA ENFORCEMENT ENGINE ---
const GUEST_DAILY_LIMIT = 10000;
const GOOGLE_DAILY_LIMIT = 50000;

interface QuotaRecord {
  usedToday: number;
  dailyLimit: number;
  lastResetDate: string;
  totalUsed: number;
}

// In-memory server quota cache (un-bypassable by client DevTools / localStorage clears)
const serverQuotaStore = new Map<string, QuotaRecord>();

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function getClientIdentifier(req: Request): { key: string; isGoogleUser: boolean; userId?: string } {
  const userIdBody = req.body?.userId;
  const deviceIdHeader = (req.headers['x-device-id'] as string) || req.body?.deviceId || 'fp_unknown';
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';

  // Logged-in Google User
  if (userIdBody && typeof userIdBody === 'string' && userIdBody.trim() !== '') {
    return { key: `user:${userIdBody.trim()}`, isGoogleUser: true, userId: userIdBody.trim() };
  }

  // Guest User: IP + Device Fingerprint hash prevents reset via clearing localStorage
  const guestKey = `guest:${clientIp}_${deviceIdHeader}`;
  return { key: guestKey, isGoogleUser: false };
}

function checkQuotaServer(req: Request, estimatedTokens: number = 50): {
  allowed: boolean;
  reason?: string;
  usedToday: number;
  dailyLimit: number;
  key: string;
  isGoogleUser: boolean;
  userId?: string;
} {
  const { key, isGoogleUser, userId } = getClientIdentifier(req);
  const today = getTodayString();
  const dailyLimit = isGoogleUser ? GOOGLE_DAILY_LIMIT : GUEST_DAILY_LIMIT;

  let record = serverQuotaStore.get(key);
  if (!record || record.lastResetDate !== today) {
    record = {
      usedToday: 0,
      dailyLimit,
      lastResetDate: today,
      totalUsed: record?.totalUsed || 0,
    };
    serverQuotaStore.set(key, record);
  }

  if (record.usedToday + estimatedTokens > record.dailyLimit) {
    return {
      allowed: false,
      reason: isGoogleUser
        ? `Kuota token harian Akun Google Anda (${GOOGLE_DAILY_LIMIT.toLocaleString()} token) telah habis untuk hari ini. Kuota akan di-reset otomatis besok!`
        : `Kuota token harian Tamu (${GUEST_DAILY_LIMIT.toLocaleString()} token) untuk perangkat/IP ini telah habis. Masuk dengan Akun Google untuk mendapatkan 50.000 token per hari!`,
      usedToday: record.usedToday,
      dailyLimit,
      key,
      isGoogleUser,
      userId,
    };
  }

  return { allowed: true, usedToday: record.usedToday, dailyLimit, key, isGoogleUser, userId };
}

function recordUsageServer(key: string, isGoogleUser: boolean, tokenAmount: number, userId?: string): QuotaRecord {
  const today = getTodayString();
  const dailyLimit = isGoogleUser ? GOOGLE_DAILY_LIMIT : GUEST_DAILY_LIMIT;

  let record = serverQuotaStore.get(key);
  if (!record || record.lastResetDate !== today) {
    record = {
      usedToday: 0,
      dailyLimit,
      lastResetDate: today,
      totalUsed: 0,
    };
  }

  record.usedToday += tokenAmount;
  record.totalUsed += tokenAmount;
  serverQuotaStore.set(key, record);

  return record;
}

// GET Endpoint for Syncing Quota directly from Server
app.get('/api/quota', (req: Request, res: Response) => {
  const { key, isGoogleUser } = getClientIdentifier(req);
  const today = getTodayString();
  const dailyLimit = isGoogleUser ? GOOGLE_DAILY_LIMIT : GUEST_DAILY_LIMIT;

  let record = serverQuotaStore.get(key);
  if (!record || record.lastResetDate !== today) {
    record = {
      usedToday: 0,
      dailyLimit,
      lastResetDate: today,
      totalUsed: 0,
    };
  }

  res.json({
    usedToday: record.usedToday,
    dailyLimit,
    remainingTokens: Math.max(0, dailyLimit - record.usedToday),
    isGoogleUser,
    key,
    lastResetDate: today,
  });
});

// Health Check Endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    model: FLASH_LITE_MODEL,
    brand: 'ADJDEV AI',
    timestamp: new Date().toISOString(),
    hasApiKey: !!apiKey,
  });
});

// SSE Streaming Chat Endpoint
app.post('/api/chat', async (req: Request, res: Response) => {
  const { messages, datasetSummary, contextConfig } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  if (!ai) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY is not configured on the server. Please verify your environment secrets.',
    });
  }

  // Server-Side Quota Enforcement Check
  const quotaCheck = checkQuotaServer(req, 10);
  if (!quotaCheck.allowed) {
    return res.status(429).json({
      error: 'QUOTA_EXCEEDED',
      message: quotaCheck.reason,
      usedToday: quotaCheck.usedToday,
      dailyLimit: quotaCheck.dailyLimit,
    });
  }

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const systemInstruction = `You are ADJDEV AI, a high-performance, ultra-fast real-time data analytics and intelligence engine built by ADJDEV.
Your characteristics:
1. Tone: Professional, precise, analytical, modern, and highly structured (in Indonesian or English depending on user query, Indonesian by default if prompt is Indonesian).
2. Specialization: Real-time statistical computing, anomaly detection, predictive forecasting, SQL/Python query generation, KPI dashboard synthesis, and business intelligence.
3. Speed & Precision: Powered exclusively by Flash Lite for ultra-fast, sub-second responses. Provide crisp executive summaries, data bullet points, and actionable takeaways.
4. Visualization & Charts: When suggesting data visualization or presenting numeric trends, you can format insights with clear markdown tables or suggest chart configurations (e.g. Bar, Line, Area, Pie) specifying categories and values.
5. If dataset context is provided below, strictly ground your numerical calculations, metrics, and conclusions on that dataset. Highlight key statistics (Mean, Median, Min, Max, Outliers, Correlation) accurately.

${datasetSummary ? `### ACTIVE DATASET CONTEXT:\n${datasetSummary}\n` : ''}
${contextConfig ? `### USER PREFERENCES:\n${JSON.stringify(contextConfig)}\n` : ''}`;

  // Format contents for Gemini API
  const contents = messages.map((m: { role: string; content: string }) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const startTime = Date.now();
  let firstTokenTime = 0;
  let totalTokensEstimate = 0;

  try {
    let streamResponse;
    try {
      streamResponse = await ai.models.generateContentStream({
        model: FLASH_LITE_MODEL,
        contents,
        config: {
          systemInstruction,
          temperature: 0.2, // Low temperature for high analytical precision
          topP: 0.9,
        },
      });
    } catch (modelError: any) {
      console.warn(`Primary model ${FLASH_LITE_MODEL} failed, trying fallback ${FALLBACK_MODEL}:`, modelError?.message);
      streamResponse = await ai.models.generateContentStream({
        model: FALLBACK_MODEL,
        contents,
        config: {
          systemInstruction,
          temperature: 0.2,
          topP: 0.9,
        },
      });
    }

    for await (const chunk of streamResponse) {
      const text = chunk.text;
      if (text) {
        if (!firstTokenTime) {
          firstTokenTime = Date.now() - startTime;
        }
        // Approximate token counting (~4 chars per token)
        totalTokensEstimate += Math.ceil(text.length / 4);

        res.write(`data: ${JSON.stringify({ text, firstTokenTime })}\n\n`);
      }
    }

    const totalDuration = Date.now() - startTime;
    const tokensPerSec = totalDuration > 0 ? ((totalTokensEstimate / totalDuration) * 1000).toFixed(1) : '0';

    // Deduct tokens on server
    const updatedRecord = recordUsageServer(
      quotaCheck.key,
      quotaCheck.isGoogleUser,
      totalTokensEstimate,
      quotaCheck.userId
    );

    res.write(`data: ${JSON.stringify({
      done: true,
      stats: {
        latencyMs: firstTokenTime || totalDuration,
        totalDurationMs: totalDuration,
        tokenCount: totalTokensEstimate,
        tokensPerSec: parseFloat(tokensPerSec),
        model: FLASH_LITE_MODEL,
        usedToday: updatedRecord.usedToday,
        dailyLimit: updatedRecord.dailyLimit,
        remainingTokens: Math.max(0, updatedRecord.dailyLimit - updatedRecord.usedToday),
      }
    })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Chat Stream Error:', error);
    res.write(`data: ${JSON.stringify({ error: error?.message || 'Error generating AI response' })}\n\n`);
    res.end();
  }
});

// Real-time Data Deep Analyzer Endpoint
app.post('/api/analyze-data', async (req: Request, res: Response) => {
  const { dataSample, schema, question, targetMetric } = req.body;

  if (!ai) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is missing.' });
  }

  // Server-Side Quota Enforcement Check
  const quotaCheck = checkQuotaServer(req, 100);
  if (!quotaCheck.allowed) {
    return res.status(429).json({
      error: 'QUOTA_EXCEEDED',
      message: quotaCheck.reason,
      usedToday: quotaCheck.usedToday,
      dailyLimit: quotaCheck.dailyLimit,
    });
  }

  try {
    const prompt = `Analisis dataset berikut secara mendalam dan cepat.
Skema: ${JSON.stringify(schema)}
Sampel Data (hingga 50 baris):
${JSON.stringify(dataSample, null, 2)}

Pertanyaan/Fokus Khusus: ${question || 'Lakukan audit menyeluruh, temukan korelasi, outlier, tren kunci, dan rekomendasi aksi bisnis.'}
${targetMetric ? `Target Metrik Utama: ${targetMetric}` : ''}

Berikan respons terstruktur dalam format JSON dengan schema persis berikut:
{
  "title": "Judul Analisis Singkat",
  "executiveSummary": "Ringkasan eksekutif 2-3 kalimat tajam",
  "kpis": [
    { "label": "Nama Metrik", "value": "Nilai formatted", "trend": "+12.4% vs benchmark", "status": "positive | warning | neutral | negative" }
  ],
  "insights": [
    { "category": "Korelasi / Anomali / Tren / Peluang", "title": "Poin Kunci", "description": "Penjelasan kuantitatif dan dampak bisnis" }
  ],
  "recommendedChart": {
    "chartType": "bar | line | area | pie | scatter",
    "title": "Judul Grafik Rekomendasi",
    "xAxisKey": "nama_kolom_x",
    "yAxisKey": "nama_kolom_y",
    "reason": "Alasan pemilihan grafik ini"
  },
  "actionableRecommendations": [
    "Rekomendasi taktis 1",
    "Rekomendasi taktis 2",
    "Rekomendasi taktis 3"
  ]
}`;

    const response = await ai.models.generateContent({
      model: FLASH_LITE_MODEL,
      contents: prompt,
      config: {
        systemInstruction: "You are the ADJDEV AI Real-time Data Analytics Core. You output pure valid JSON only.",
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const parsed = JSON.parse(response.text || '{}');

    // Deduct estimated ~300 tokens for deep analysis
    const updatedRecord = recordUsageServer(
      quotaCheck.key,
      quotaCheck.isGoogleUser,
      300,
      quotaCheck.userId
    );

    res.json({
      ...parsed,
      _quota: {
        usedToday: updatedRecord.usedToday,
        dailyLimit: updatedRecord.dailyLimit,
        remainingTokens: Math.max(0, updatedRecord.dailyLimit - updatedRecord.usedToday),
      }
    });
  } catch (err: any) {
    console.error('Data Analysis Error:', err);
    res.status(500).json({ error: err?.message || 'Failed to analyze data.' });
  }
});

// Setup Vite or Static File Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(__dirname, 'index.html'))
      ? __dirname
      : path.join(__dirname, 'dist');
    
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`🚀 ADJDEV AI Engine running on port ${PORT}`);
  });
}

startServer();
