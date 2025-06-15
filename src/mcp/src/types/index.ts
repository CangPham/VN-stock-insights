// Vietnamese Stock Market MCP Server Types

export interface VNStockServerConfig {
  name: string;
  version: string;
  port?: number;
  host?: string;
  transportType: 'stdio' | 'http';
  capabilities: {
    resources: {
      subscribe: boolean;
      listChanged: boolean;
    };
    tools: {
      listChanged: boolean;
    };
    prompts: {
      listChanged: boolean;
    };
  };
}

export interface DataProviderConfig {
  type: DataSourceType;
  apiKey?: string;
  apiSecret?: string;
  baseUrl: string;
  rateLimit: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  priority: number;
  enabled: boolean;
}

export enum DataSourceType {
  SSI = 'ssi',
  VIETSTOCK = 'vietstock',
  CAFEF = 'cafef',
  FIREANT = 'fireant',
  APEC = 'apec',
  VNSTOCK = 'vnstock'
}

export interface StockData {
  symbol: string;
  exchange: 'HOSE' | 'HNX' | 'UPCOM';
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  value: number;
  change: number;
  changePercent: number;
  timestamp: Date;
  source: DataSourceType;
}

export interface MarketData {
  index: string;
  value: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
  source: DataSourceType;
}

export interface CompanyInfo {
  symbol: string;
  companyName: string;
  englishName?: string;
  exchange: string;
  industry: string;
  sector: string;
  marketCap: number;
  listedShares: number;
  freeFloat?: number;
  establishedDate?: Date;
  listingDate?: Date;
  website?: string;
  description?: string;
  source: DataSourceType;
}

export interface FinancialData {
  symbol: string;
  period: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'FY';
  year: number;
  revenue: number;
  netIncome: number;
  totalAssets: number;
  totalEquity: number;
  eps: number;
  roe: number;
  roa: number;
  debtToEquity: number;
  currentRatio: number;
  source: DataSourceType;
  reportDate: Date;
}

export interface AnalysisRequest {
  symbol: string;
  analysisType: 'technical' | 'fundamental' | 'comprehensive';
  timeframe?: '1D' | '1W' | '1M' | '3M' | '1Y';
  includeNews?: boolean;
  includePeers?: boolean;
}

export interface AnalysisResult {
  symbol: string;
  analysisType: string;
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  summary: string;
  details: Record<string, any>;
  timestamp: Date;
  sources: DataSourceType[];
}

export interface MCPError extends Error {
  code: number;
  data?: any;
}

export interface ProviderHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  errorRate: number;
  lastCheck: Date;
  consecutiveFailures: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  ttl: number;
  key: string;
}

export interface RateLimitConfig {
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit?: number;
}

// Resource URI patterns for Vietnamese stock market
export const VN_STOCK_RESOURCE_PATTERNS = {
  STOCK_INFO: 'stock://{symbol}',
  STOCK_FINANCIALS: 'stock://{symbol}/financials',
  STOCK_NEWS: 'stock://{symbol}/news',
  MARKET_INDEX: 'market://{index}',
  SECTOR_DATA: 'sector://{sector}',
  ANALYSIS: 'analysis://{symbol}/{type}'
} as const;

// Tool names for Vietnamese stock market
export const VN_STOCK_TOOLS = {
  GET_STOCK_PRICE: 'get_stock_price',
  GET_FINANCIAL_REPORT: 'get_financial_report',
  ANALYZE_STOCK: 'analyze_stock',
  SEARCH_STOCKS: 'search_stocks',
  GET_MARKET_OVERVIEW: 'get_market_overview',
  GET_NEWS: 'get_news'
} as const;
