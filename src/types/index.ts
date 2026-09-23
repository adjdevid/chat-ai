export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  stats?: {
    latencyMs?: number;
    totalDurationMs?: number;
    tokensPerSec?: number;
    tokenCount?: number;
    model?: string;
  };
  charts?: ChartConfig[];
  quickActions?: string[];
  isStreaming?: boolean;
}

export interface ColumnMeta {
  name: string;
  type: 'number' | 'string' | 'date' | 'boolean';
  sampleValues: any[];
  nullCount: number;
  uniqueCount: number;
  stats?: {
    min?: number;
    max?: number;
    mean?: number;
    median?: number;
    sum?: number;
    topCategories?: { value: string; count: number }[];
  };
}

export interface Dataset {
  id: string;
  name: string;
  description: string;
  category: 'financial' | 'devops' | 'ecommerce' | 'ai_benchmark' | 'marketing' | 'custom';
  rowCount: number;
  columns: ColumnMeta[];
  data: Record<string, any>[];
  createdAt: string;
  fileSizeFormatted?: string;
}

export interface ChartConfig {
  id?: string;
  type: 'bar' | 'line' | 'area' | 'pie' | 'composed' | 'scatter';
  title: string;
  xAxisKey: string;
  yAxisKey: string | string[];
  color?: string;
  colors?: string[];
  description?: string;
}

export type ChatMode = 'analytics' | 'general';

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  activeDatasetId: string;
  createdAt: string;
  updatedAt: number;
  isPinned?: boolean;
  mode?: ChatMode;
}

export interface DeepAnalysisResult {
  title: string;
  executiveSummary: string;
  kpis: {
    label: string;
    value: string;
    trend: string;
    status: 'positive' | 'warning' | 'neutral' | 'negative';
  }[];
  insights: {
    category: string;
    title: string;
    description: string;
  }[];
  recommendedChart?: {
    chartType: 'bar' | 'line' | 'area' | 'pie' | 'scatter';
    title: string;
    xAxisKey: string;
    yAxisKey: string;
    reason: string;
  };
  actionableRecommendations: string[];
}

export interface TelemetryMetrics {
  totalQueries: number;
  avgTokensPerSec: number;
  fastestLatencyMs: number;
  totalTokensGenerated: number;
  activeModel: string;
  status: 'optimal' | 'busy' | 'reconnecting';
}
