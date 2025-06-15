/**
 * @fileOverview AI Provider Configuration Types
 * Định nghĩa các kiểu dữ liệu cho hệ thống cấu hình AI đa nhà cung cấp
 */

import { z } from 'zod';

// Enum cho các nhà cung cấp AI được hỗ trợ
export enum AIProvider {
  GOOGLE_GEMINI = 'google_gemini',
  OPENAI_GPT = 'openai_gpt',
  PERPLEXITY = 'perplexity',
  ANTHROPIC_CLAUDE = 'anthropic_claude',
}

// Enum cho các mô hình AI
export enum AIModel {
  // Google Gemini models
  GEMINI_2_0_FLASH = 'gemini-2.0-flash',
  GEMINI_1_5_PRO = 'gemini-1.5-pro',
  GEMINI_1_5_FLASH = 'gemini-1.5-flash',
  
  // OpenAI models
  GPT_4O = 'gpt-4o',
  GPT_4O_MINI = 'gpt-4o-mini',
  GPT_4_TURBO = 'gpt-4-turbo',
  
  // Perplexity models
  PERPLEXITY_SONAR_LARGE = 'llama-3.1-sonar-large-128k-online',
  PERPLEXITY_SONAR_SMALL = 'llama-3.1-sonar-small-128k-online',
  
  // Anthropic Claude models
  CLAUDE_3_5_SONNET = 'claude-3-5-sonnet-20241022',
  CLAUDE_3_HAIKU = 'claude-3-haiku-20240307',
}

// Schema cho cấu hình API key
export const APIKeyConfigSchema = z.object({
  provider: z.nativeEnum(AIProvider),
  apiKey: z.string().min(1, 'API key không được để trống'),
  isValid: z.boolean().default(false),
  lastValidated: z.date().optional(),
  errorMessage: z.string().optional(),
});

export type APIKeyConfig = z.infer<typeof APIKeyConfigSchema>;

// Schema cho cấu hình mô hình AI
export const AIModelConfigSchema = z.object({
  provider: z.nativeEnum(AIProvider),
  model: z.nativeEnum(AIModel),
  displayName: z.string(),
  description: z.string(),
  maxTokens: z.number().positive().default(4096),
  temperature: z.number().min(0).max(2).default(0.7),
  topP: z.number().min(0).max(1).default(0.9),
  frequencyPenalty: z.number().min(-2).max(2).default(0),
  presencePenalty: z.number().min(-2).max(2).default(0),
  supportsStreaming: z.boolean().default(true),
  supportsTools: z.boolean().default(true),
  supportsVision: z.boolean().default(false),
  supportsWebSearch: z.boolean().default(false),
  costPer1kTokens: z.number().positive().optional(),
});

export type AIModelConfig = z.infer<typeof AIModelConfigSchema>;

// Schema cho cấu hình tìm kiếm web
export const WebSearchConfigSchema = z.object({
  enabled: z.boolean().default(false),
  provider: z.enum(['google', 'bing', 'serper', 'tavily']).default('google'),
  apiKey: z.string().optional(),
  maxResults: z.number().min(1).max(20).default(10),
  includeImages: z.boolean().default(false),
  includeNews: z.boolean().default(true),
  freshness: z.enum(['day', 'week', 'month', 'year', 'all']).default('week'),
  safeSearch: z.enum(['off', 'moderate', 'strict']).default('moderate'),
  region: z.string().default('vn'), // Vietnam region
  language: z.string().default('vi'), // Vietnamese language
});

export type WebSearchConfig = z.infer<typeof WebSearchConfigSchema>;

// Schema cho cấu hình phân tích cổ phiếu
export const StockAnalysisConfigSchema = z.object({
  // Cấu hình chỉ số kỹ thuật
  technicalIndicators: z.object({
    enabled: z.boolean().default(true),
    rsi: z.object({
      enabled: z.boolean().default(true),
      period: z.number().min(5).max(50).default(14),
      overbought: z.number().min(70).max(90).default(70),
      oversold: z.number().min(10).max(30).default(30),
    }),
    macd: z.object({
      enabled: z.boolean().default(true),
      fastPeriod: z.number().min(5).max(20).default(12),
      slowPeriod: z.number().min(20).max(50).default(26),
      signalPeriod: z.number().min(5).max(15).default(9),
    }),
    movingAverages: z.object({
      enabled: z.boolean().default(true),
      periods: z.array(z.number().positive()).default([20, 50, 200]),
    }),
    bollingerBands: z.object({
      enabled: z.boolean().default(true),
      period: z.number().min(10).max(30).default(20),
      standardDeviations: z.number().min(1).max(3).default(2),
    }),
  }),
  
  // Cấu hình phân tích cơ bản
  fundamentalAnalysis: z.object({
    enabled: z.boolean().default(true),
    peRatio: z.object({
      enabled: z.boolean().default(true),
      lowThreshold: z.number().positive().default(10),
      highThreshold: z.number().positive().default(25),
    }),
    roe: z.object({
      enabled: z.boolean().default(true),
      minThreshold: z.number().min(0).max(100).default(15),
    }),
    debtToEquity: z.object({
      enabled: z.boolean().default(true),
      maxThreshold: z.number().positive().default(1.5),
    }),
    revenueGrowth: z.object({
      enabled: z.boolean().default(true),
      minThreshold: z.number().min(-100).max(1000).default(10),
    }),
  }),
  
  // Cấu hình phân tích tình cảm
  sentimentAnalysis: z.object({
    enabled: z.boolean().default(true),
    sources: z.array(z.enum(['news', 'social_media', 'analyst_reports'])).default(['news', 'analyst_reports']),
    timeframe: z.enum(['1d', '7d', '30d', '90d']).default('30d'),
    weight: z.number().min(0).max(1).default(0.3),
  }),
  
  // Cấu hình đánh giá rủi ro
  riskAssessment: z.object({
    enabled: z.boolean().default(true),
    volatilityWeight: z.number().min(0).max(1).default(0.4),
    liquidityWeight: z.number().min(0).max(1).default(0.3),
    marketCapWeight: z.number().min(0).max(1).default(0.3),
    riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']).default('moderate'),
  }),
  
  // Cấu hình khuyến nghị
  recommendation: z.object({
    confidenceThreshold: z.number().min(0).max(1).default(0.7),
    includeTargetPrice: z.boolean().default(true),
    includeStopLoss: z.boolean().default(true),
    timeHorizon: z.enum(['short', 'medium', 'long']).default('medium'),
  }),
});

export type StockAnalysisConfig = z.infer<typeof StockAnalysisConfigSchema>;

// Schema tổng hợp cho cấu hình AI
export const AIConfigSchema = z.object({
  // Nhà cung cấp AI hiện tại
  currentProvider: z.nativeEnum(AIProvider).default(AIProvider.GOOGLE_GEMINI),
  currentModel: z.nativeEnum(AIModel).default(AIModel.GEMINI_2_0_FLASH),
  
  // Cấu hình API keys
  apiKeys: z.record(z.nativeEnum(AIProvider), APIKeyConfigSchema).default({}),
  
  // Cấu hình mô hình
  modelConfigs: z.record(z.nativeEnum(AIModel), AIModelConfigSchema).default({}),
  
  // Cấu hình tìm kiếm web
  webSearch: WebSearchConfigSchema.default({}),
  
  // Cấu hình phân tích cổ phiếu
  stockAnalysis: StockAnalysisConfigSchema.default({}),
  
  // Cấu hình chung
  general: z.object({
    language: z.enum(['vi', 'en']).default('vi'),
    timezone: z.string().default('Asia/Ho_Chi_Minh'),
    currency: z.string().default('VND'),
    enableLogging: z.boolean().default(true),
    enableCaching: z.boolean().default(true),
    cacheTimeout: z.number().positive().default(300000), // 5 minutes
  }).default({}),
});

export type AIConfig = z.infer<typeof AIConfigSchema>;

// Interface cho AI Provider
export interface IAIProvider {
  readonly provider: AIProvider;
  readonly supportedModels: AIModel[];
  
  validateApiKey(apiKey: string): Promise<boolean>;
  generateResponse(prompt: string, config: AIModelConfig): Promise<string>;
  generateStreamResponse(prompt: string, config: AIModelConfig): AsyncGenerator<string>;
  supportsWebSearch(): boolean;
  searchWeb?(query: string, config: WebSearchConfig): Promise<any[]>;
}

// Interface cho Stock Analysis Engine
export interface IStockAnalysisEngine {
  analyzeStock(stockCode: string, config: StockAnalysisConfig): Promise<StockAnalysisResult>;
  getRecommendation(stockCode: string, config: StockAnalysisConfig): Promise<StockRecommendation>;
  getCompanyInfo(stockCode: string, config: StockAnalysisConfig): Promise<CompanyInfo>;
}

// Kết quả phân tích cổ phiếu
export interface StockAnalysisResult {
  stockCode: string;
  companyName: string;
  currentPrice: number;
  currency: string;
  lastUpdated: Date;
  
  technicalAnalysis?: {
    rsi?: number;
    macd?: { value: number; signal: number; histogram: number };
    movingAverages?: Record<number, number>;
    bollingerBands?: { upper: number; middle: number; lower: number };
    trend: 'bullish' | 'bearish' | 'neutral';
    strength: number; // 0-1
  };
  
  fundamentalAnalysis?: {
    peRatio?: number;
    roe?: number;
    debtToEquity?: number;
    revenueGrowth?: number;
    marketCap?: number;
    bookValue?: number;
    eps?: number;
    score: number; // 0-1
  };
  
  sentimentAnalysis?: {
    score: number; // -1 to 1
    sources: Array<{
      type: 'news' | 'social_media' | 'analyst_reports';
      sentiment: number;
      confidence: number;
      summary: string;
    }>;
  };
  
  riskAssessment?: {
    volatility: number;
    liquidity: number;
    marketCapRisk: number;
    overallRisk: 'low' | 'medium' | 'high';
    score: number; // 0-1
  };
}

// Khuyến nghị cổ phiếu
export interface StockRecommendation {
  stockCode: string;
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  confidence: number; // 0-1
  targetPrice?: number;
  stopLoss?: number;
  timeHorizon: 'short' | 'medium' | 'long';
  rationale: string;
  keyFactors: string[];
  risks: string[];
  opportunities: string[];
}

// Thông tin công ty
export interface CompanyInfo {
  stockCode: string;
  companyName: string;
  sector: string;
  industry: string;
  description: string;
  website?: string;
  employees?: number;
  founded?: number;
  headquarters?: string;
  marketCap?: number;
  sharesOutstanding?: number;
  businessModel: string;
  competitiveAdvantages: string[];
  keyRisks: string[];
  recentNews: Array<{
    title: string;
    summary: string;
    date: Date;
    source: string;
    sentiment: 'positive' | 'negative' | 'neutral';
  }>;
}
