import { Dataset, ColumnMeta } from '../types';

function buildMeta(name: string, data: Record<string, any>[]): ColumnMeta[] {
  if (!data || data.length === 0) return [];
  const keys = Object.keys(data[0]);

  return keys.map((key) => {
    const values = data.map((d) => d[key]);
    const nonNullValues = values.filter((v) => v !== null && v !== undefined && v !== '');
    const isNum = nonNullValues.length > 0 && nonNullValues.every((v) => !isNaN(Number(v)));
    const isDate =
      !isNum &&
      nonNullValues.length > 0 &&
      nonNullValues.every((v) => !isNaN(Date.parse(String(v))) && isNaN(Number(v)));

    const type: 'number' | 'string' | 'date' | 'boolean' = isNum
      ? 'number'
      : isDate
      ? 'date'
      : typeof nonNullValues[0] === 'boolean'
      ? 'boolean'
      : 'string';

    const uniqueCount = new Set(values).size;

    let stats: ColumnMeta['stats'] = {};
    if (type === 'number') {
      const numVals = nonNullValues.map(Number);
      const min = Math.min(...numVals);
      const max = Math.max(...numVals);
      const sum = numVals.reduce((a, b) => a + b, 0);
      const mean = Math.round((sum / numVals.length) * 100) / 100;
      const sorted = [...numVals].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      stats = { min, max, sum, mean, median };
    } else {
      const counts: Record<string, number> = {};
      nonNullValues.forEach((v) => {
        const s = String(v);
        counts[s] = (counts[s] || 0) + 1;
      });
      const topCategories = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([value, count]) => ({ value, count }));
      stats = { topCategories };
    }

    return {
      name: key,
      type,
      sampleValues: values.slice(0, 5),
      nullCount: values.length - nonNullValues.length,
      uniqueCount,
      stats,
    };
  });
}

// 1. Fintech MRR & Growth Dataset
const fintechData: Record<string, any>[] = [
  { month: '2024-01', mrr: 124500, netNewMrr: 14200, churnRate: 1.8, arpu: 320, activeCustomers: 410, grossMargin: 82.5, cac: 680, ltv: 17770 },
  { month: '2024-02', mrr: 138200, netNewMrr: 13700, churnRate: 1.6, arpu: 325, activeCustomers: 442, grossMargin: 83.1, cac: 650, ltv: 20312 },
  { month: '2024-03', mrr: 154900, netNewMrr: 16700, churnRate: 1.5, arpu: 334, activeCustomers: 485, grossMargin: 83.8, cac: 630, ltv: 22266 },
  { month: '2024-04', mrr: 172300, netNewMrr: 17400, churnRate: 1.4, arpu: 342, activeCustomers: 526, grossMargin: 84.2, cac: 610, ltv: 24428 },
  { month: '2024-05', mrr: 191800, netNewMrr: 19500, churnRate: 1.3, arpu: 350, activeCustomers: 572, grossMargin: 84.9, cac: 590, ltv: 26923 },
  { month: '2024-06', mrr: 215400, netNewMrr: 23600, churnRate: 1.2, arpu: 362, activeCustomers: 620, grossMargin: 85.5, cac: 560, ltv: 30166 },
  { month: '2024-07', mrr: 238900, netNewMrr: 23500, churnRate: 1.2, arpu: 370, activeCustomers: 671, grossMargin: 85.8, cac: 550, ltv: 30833 },
  { month: '2024-08', mrr: 264200, netNewMrr: 25300, churnRate: 1.1, arpu: 382, activeCustomers: 718, grossMargin: 86.2, cac: 540, ltv: 34727 },
  { month: '2024-09', mrr: 292100, netNewMrr: 27900, churnRate: 1.0, arpu: 395, activeCustomers: 768, grossMargin: 86.9, cac: 520, ltv: 39500 },
  { month: '2024-10', mrr: 324500, netNewMrr: 32400, churnRate: 0.9, arpu: 410, activeCustomers: 822, grossMargin: 87.4, cac: 510, ltv: 45555 },
  { month: '2024-11', mrr: 358900, netNewMrr: 34400, churnRate: 0.9, arpu: 422, activeCustomers: 880, grossMargin: 87.8, cac: 495, ltv: 46888 },
  { month: '2024-12', mrr: 398000, netNewMrr: 39100, churnRate: 0.8, arpu: 438, activeCustomers: 940, grossMargin: 88.3, cac: 480, ltv: 54750 },
  { month: '2025-01', mrr: 442300, netNewMrr: 44300, churnRate: 0.8, arpu: 452, activeCustomers: 1010, grossMargin: 88.7, cac: 470, ltv: 56500 },
  { month: '2025-02', mrr: 489100, netNewMrr: 46800, churnRate: 0.7, arpu: 468, activeCustomers: 1082, grossMargin: 89.2, cac: 460, ltv: 66857 }
];

// 2. Global Server Infrastructure & Telemetry Dataset
const devopsData: Record<string, any>[] = [
  { cluster: 'us-east-1a', region: 'North America', nodes: 64, cpuUsagePct: 68.4, memUsagePct: 74.2, p99LatencyMs: 142, reqPerSec: 48200, errorRatePct: 0.04, networkIOGbps: 18.4, status: 'Healthy' },
  { cluster: 'us-west-2b', region: 'North America', nodes: 48, cpuUsagePct: 54.1, memUsagePct: 61.8, p99LatencyMs: 118, reqPerSec: 32100, errorRatePct: 0.02, networkIOGbps: 12.1, status: 'Healthy' },
  { cluster: 'eu-west-1', region: 'Europe', nodes: 56, cpuUsagePct: 88.2, memUsagePct: 91.5, p99LatencyMs: 285, reqPerSec: 41800, errorRatePct: 0.42, networkIOGbps: 16.9, status: 'Warning' },
  { cluster: 'eu-central-1', region: 'Europe', nodes: 40, cpuUsagePct: 62.0, memUsagePct: 68.3, p99LatencyMs: 130, reqPerSec: 28900, errorRatePct: 0.03, networkIOGbps: 10.8, status: 'Healthy' },
  { cluster: 'ap-southeast-1', region: 'Asia Pacific', nodes: 52, cpuUsagePct: 73.6, memUsagePct: 78.4, p99LatencyMs: 165, reqPerSec: 37500, errorRatePct: 0.08, networkIOGbps: 14.7, status: 'Healthy' },
  { cluster: 'ap-northeast-1', region: 'Asia Pacific', nodes: 44, cpuUsagePct: 58.9, memUsagePct: 66.2, p99LatencyMs: 125, reqPerSec: 31000, errorRatePct: 0.02, networkIOGbps: 11.5, status: 'Healthy' },
  { cluster: 'sa-east-1', region: 'South America', nodes: 24, cpuUsagePct: 94.1, memUsagePct: 96.0, p99LatencyMs: 410, reqPerSec: 15400, errorRatePct: 1.25, networkIOGbps: 5.8, status: 'Critical' },
  { cluster: 'me-central-1', region: 'Middle East', nodes: 20, cpuUsagePct: 42.5, memUsagePct: 49.0, p99LatencyMs: 110, reqPerSec: 11200, errorRatePct: 0.01, networkIOGbps: 4.2, status: 'Healthy' }
];

// 3. E-Commerce Multi-Category Performance Dataset
const ecommerceData: Record<string, any>[] = [
  { category: 'AI & Developer Tools', orders: 18450, revenue: 1476000, avgOrderValue: 80.0, conversionRate: 4.8, returnRatePct: 0.4, adSpend: 185000, roas: 7.98 },
  { category: 'Cloud Infrastructure SaaS', orders: 12200, revenue: 2196000, avgOrderValue: 180.0, conversionRate: 3.9, returnRatePct: 0.2, adSpend: 260000, roas: 8.44 },
  { category: 'Enterprise Security', orders: 4800, revenue: 1920000, avgOrderValue: 400.0, conversionRate: 2.4, returnRatePct: 0.1, adSpend: 210000, roas: 9.14 },
  { category: 'Data Intelligence API', orders: 24600, revenue: 1230000, avgOrderValue: 50.0, conversionRate: 6.2, returnRatePct: 0.3, adSpend: 140000, roas: 8.78 },
  { category: 'Mobile SDK & Addons', orders: 16800, revenue: 672000, avgOrderValue: 40.0, conversionRate: 5.1, returnRatePct: 0.8, adSpend: 95000, roas: 7.07 },
  { category: 'Hardware IoT Devices', orders: 8300, revenue: 996000, avgOrderValue: 120.0, conversionRate: 2.9, returnRatePct: 2.1, adSpend: 160000, roas: 6.22 }
];

// 4. AI LLM Performance & Latency Benchmark Dataset
const aiBenchmarkData: Record<string, any>[] = [
  { modelName: 'ADJDEV Flash Lite (v3.1)', provider: 'Google GenAI', ttftMs: 145, latencyP95Ms: 380, tokensPerSec: 112.5, costPer1M: 0.075, contextWindowK: 1000, reasoningScore: 88.4, throughputTier: 'Ultra Fast' },
  { modelName: 'Gemini 3.8 Flash', provider: 'Google GenAI', ttftMs: 210, latencyP95Ms: 540, tokensPerSec: 88.0, costPer1M: 0.15, contextWindowK: 1000, reasoningScore: 92.1, throughputTier: 'Fast' },
  { modelName: 'Gemini 3.1 Pro', provider: 'Google GenAI', ttftMs: 460, latencyP95Ms: 1250, tokensPerSec: 42.0, costPer1M: 1.25, contextWindowK: 2000, reasoningScore: 97.8, throughputTier: 'High Reasoning' },
  { modelName: 'Claude 3.5 Haiku', provider: 'Anthropic', ttftMs: 240, latencyP95Ms: 620, tokensPerSec: 74.0, costPer1M: 0.80, contextWindowK: 200, reasoningScore: 89.2, throughputTier: 'Fast' },
  { modelName: 'GPT-4o Mini', provider: 'OpenAI', ttftMs: 260, latencyP95Ms: 690, tokensPerSec: 68.0, costPer1M: 0.60, contextWindowK: 128, reasoningScore: 89.5, throughputTier: 'Fast' },
  { modelName: 'Llama 3.3 70B', provider: 'Meta / Groq', ttftMs: 190, latencyP95Ms: 440, tokensPerSec: 96.0, costPer1M: 0.59, contextWindowK: 128, reasoningScore: 90.1, throughputTier: 'Ultra Fast' }
];

// 5. Marketing Attribution & Lead Pipeline Dataset
const marketingData: Record<string, any>[] = [
  { channel: 'Google Search Ads', spendUsd: 42000, impressions: 840000, clicks: 33600, ctrPct: 4.0, cpcUsd: 1.25, leads: 2520, cplUsd: 16.67, dealsClosed: 142, closedRevUsd: 213000, roas: 5.07 },
  { channel: 'LinkedIn B2B Ads', spendUsd: 38000, impressions: 320000, clicks: 12800, ctrPct: 4.0, cpcUsd: 2.97, leads: 1408, cplUsd: 26.98, dealsClosed: 168, closedRevUsd: 352800, roas: 9.28 },
  { channel: 'Organic SEO & Tech Blog', spendUsd: 14000, impressions: 1650000, clicks: 82500, ctrPct: 5.0, cpcUsd: 0.17, leads: 4950, cplUsd: 2.83, dealsClosed: 210, closedRevUsd: 315000, roas: 22.50 },
  { channel: 'Developer Community & Docs', spendUsd: 8000, impressions: 920000, clicks: 64400, ctrPct: 7.0, cpcUsd: 0.12, leads: 5152, cplUsd: 1.55, dealsClosed: 245, closedRevUsd: 294000, roas: 36.75 },
  { channel: 'YouTube Tech Reviews', spendUsd: 18000, impressions: 450000, clicks: 18000, ctrPct: 4.0, cpcUsd: 1.00, leads: 1080, cplUsd: 16.67, dealsClosed: 72, closedRevUsd: 108000, roas: 6.00 }
];

export const PRESET_DATASETS: Dataset[] = [
  {
    id: 'dataset-fintech-mrr',
    name: 'SaaS Financial & MRR Growth (2024-2025)',
    description: 'Data pertumbuhan finansial, MRR, Net New MRR, CAC, LTV, dan Churn Rate bulanan.',
    category: 'financial',
    rowCount: fintechData.length,
    columns: buildMeta('SaaS Financial & MRR Growth', fintechData),
    data: fintechData,
    createdAt: '2025-01-15',
    fileSizeFormatted: '14.2 KB',
  },
  {
    id: 'dataset-devops-telemetry',
    name: 'Global Cloud Cluster & Server Telemetry',
    description: 'Metrik real-time CPU, RAM, Latency P99, Throughput QPS, dan Error Rate antar Region.',
    category: 'devops',
    rowCount: devopsData.length,
    columns: buildMeta('Global Cloud Cluster Telemetry', devopsData),
    data: devopsData,
    createdAt: '2025-02-10',
    fileSizeFormatted: '8.4 KB',
  },
  {
    id: 'dataset-ai-benchmark',
    name: 'AI Model Latency & Token Speed Benchmark',
    description: 'Komparasi performa TTFT, throughput token/detik, latency P95, dan cost per model.',
    category: 'ai_benchmark',
    rowCount: aiBenchmarkData.length,
    columns: buildMeta('AI Model Latency Benchmark', aiBenchmarkData),
    data: aiBenchmarkData,
    createdAt: '2025-02-18',
    fileSizeFormatted: '9.6 KB',
  },
  {
    id: 'dataset-ecommerce',
    name: 'E-Commerce GMV & Category Performance',
    description: 'Analisis penjualan produk tech, konversi order, ROAS iklan, dan tingkat retur per kategori.',
    category: 'ecommerce',
    rowCount: ecommerceData.length,
    columns: buildMeta('E-Commerce GMV Performance', ecommerceData),
    data: ecommerceData,
    createdAt: '2025-01-20',
    fileSizeFormatted: '6.8 KB',
  },
  {
    id: 'dataset-marketing',
    name: 'Omnichannel B2B Marketing Attribution & ROI',
    description: 'Efektivitas kanal promosi, Cost per Lead (CPL), Close Rate, dan ROAS real-time.',
    category: 'marketing',
    rowCount: marketingData.length,
    columns: buildMeta('Marketing ROI Attribution', marketingData),
    data: marketingData,
    createdAt: '2025-02-01',
    fileSizeFormatted: '7.1 KB',
  },
];
