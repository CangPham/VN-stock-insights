/**
 * @fileOverview Web Search Types and Interfaces
 * Định nghĩa các kiểu dữ liệu cho hệ thống tìm kiếm web
 */

import { z } from 'zod';

// Enum cho các nhà cung cấp tìm kiếm
export enum SearchProvider {
  GOOGLE = 'google',
  BING = 'bing',
  SERPER = 'serper',
  TAVILY = 'tavily',
}

// Schema cho kết quả tìm kiếm
export const SearchResultSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  snippet: z.string(),
  displayUrl: z.string().optional(),
  date: z.date().optional(),
  source: z.string().optional(),
  relevanceScore: z.number().min(0).max(1).optional(),
  imageUrl: z.string().url().optional(),
  type: z.enum(['web', 'news', 'image', 'video']).default('web'),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

// Schema cho cấu hình tìm kiếm
export const SearchConfigSchema = z.object({
  provider: z.nativeEnum(SearchProvider),
  apiKey: z.string(),
  maxResults: z.number().min(1).max(100).default(10),
  language: z.string().default('vi'),
  region: z.string().default('vn'),
  safeSearch: z.enum(['off', 'moderate', 'strict']).default('moderate'),
  freshness: z.enum(['day', 'week', 'month', 'year', 'all']).default('all'),
  includeImages: z.boolean().default(false),
  includeNews: z.boolean().default(true),
  includeVideos: z.boolean().default(false),
  timeout: z.number().positive().default(10000),
});

export type SearchConfig = z.infer<typeof SearchConfigSchema>;

// Schema cho financial news search
export const FinancialNewsSearchSchema = z.object({
  stockCode: z.string().optional(),
  company: z.string().optional(),
  sector: z.string().optional(),
  timeframe: z.enum(['1h', '6h', '1d', '3d', '7d', '30d', '90d']).default('7d'),
  sources: z.array(z.string()).optional(),
  sentiment: z.enum(['positive', 'negative', 'neutral', 'all']).default('all'),
  language: z.string().default('vi'),
});

export type FinancialNewsSearch = z.infer<typeof FinancialNewsSearchSchema>;

// Schema cho market data search
export const MarketDataSearchSchema = z.object({
  stockCode: z.string(),
  dataTypes: z.array(z.enum(['price', 'volume', 'financials', 'ratios', 'news'])).default(['price', 'news']),
  timeframe: z.enum(['1d', '7d', '30d', '90d', '1y']).default('30d'),
  includeAnalysis: z.boolean().default(true),
  includePeerComparison: z.boolean().default(false),
});

export type MarketDataSearch = z.infer<typeof MarketDataSearchSchema>;

// Interface cho search provider
export interface ISearchProvider {
  readonly provider: SearchProvider;
  
  search(query: string, config: SearchConfig): Promise<SearchResult[]>;
  searchNews(query: string, config: SearchConfig): Promise<SearchResult[]>;
  searchImages?(query: string, config: SearchConfig): Promise<SearchResult[]>;
  validateApiKey(apiKey: string): Promise<boolean>;
}

// Interface cho financial search engine
export interface IFinancialSearchEngine {
  searchFinancialNews(params: FinancialNewsSearch): Promise<SearchResult[]>;
  searchMarketData(params: MarketDataSearch): Promise<any>;
  searchCompanyInfo(stockCode: string): Promise<any>;
  searchSectorNews(sector: string): Promise<SearchResult[]>;
  searchAnalystReports(stockCode: string): Promise<SearchResult[]>;
}

// Kết quả phân tích sentiment từ news
export interface NewsSentimentResult {
  stockCode: string;
  overallSentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number; // -1 to 1
  confidence: number; // 0 to 1
  articlesAnalyzed: number;
  timeframe: string;
  sentimentBreakdown: {
    positive: number;
    negative: number;
    neutral: number;
  };
  keyTopics: string[];
  sources: Array<{
    source: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    articles: number;
  }>;
  recentNews: SearchResult[];
}

// Kết quả market data validation
export interface MarketDataValidation {
  stockCode: string;
  dataPoints: Array<{
    metric: string;
    value: number | string;
    source: string;
    timestamp: Date;
    confidence: number;
    isConsistent: boolean;
  }>;
  consistencyScore: number; // 0 to 1
  reliabilitySources: string[];
  discrepancies: Array<{
    metric: string;
    values: Array<{
      value: number | string;
      source: string;
    }>;
    variance: number;
  }>;
  recommendation: 'reliable' | 'caution' | 'unreliable';
}

// Search query builder helpers
export class SearchQueryBuilder {
  private query: string = '';
  private filters: string[] = [];

  constructor(baseQuery: string) {
    this.query = baseQuery;
  }

  // Thêm filter cho stock code
  addStockCode(stockCode: string): this {
    this.filters.push(`"${stockCode}"`);
    return this;
  }

  // Thêm filter cho company name
  addCompany(companyName: string): this {
    this.filters.push(`"${companyName}"`);
    return this;
  }

  // Thêm filter cho timeframe
  addTimeframe(timeframe: string): this {
    const timeframeMap: Record<string, string> = {
      '1h': 'past hour',
      '6h': 'past 6 hours',
      '1d': 'past day',
      '3d': 'past 3 days',
      '7d': 'past week',
      '30d': 'past month',
      '90d': 'past 3 months',
    };

    if (timeframeMap[timeframe]) {
      this.filters.push(`after:${timeframeMap[timeframe]}`);
    }
    return this;
  }

  // Thêm filter cho site
  addSite(site: string): this {
    this.filters.push(`site:${site}`);
    return this;
  }

  // Thêm filter cho Vietnamese financial sites
  addVietnameseFinancialSites(): this {
    const sites = [
      'cafef.vn',
      'vietstock.vn',
      'ndh.vn',
      'tinnhanhchungkhoan.vn',
      'dautuchungkhoan.vn',
      'vneconomy.vn',
      'baodautu.vn',
    ];
    
    const siteFilter = sites.map(site => `site:${site}`).join(' OR ');
    this.filters.push(`(${siteFilter})`);
    return this;
  }

  // Thêm keywords
  addKeywords(keywords: string[]): this {
    keywords.forEach(keyword => {
      this.filters.push(`"${keyword}"`);
    });
    return this;
  }

  // Exclude keywords
  excludeKeywords(keywords: string[]): this {
    keywords.forEach(keyword => {
      this.filters.push(`-"${keyword}"`);
    });
    return this;
  }

  // Build final query
  build(): string {
    if (this.filters.length === 0) {
      return this.query;
    }

    return `${this.query} ${this.filters.join(' ')}`;
  }

  // Static method để tạo financial news query
  static buildFinancialNewsQuery(params: FinancialNewsSearch): string {
    const builder = new SearchQueryBuilder('');

    if (params.stockCode) {
      builder.addStockCode(params.stockCode);
    }

    if (params.company) {
      builder.addCompany(params.company);
    }

    if (params.timeframe) {
      builder.addTimeframe(params.timeframe);
    }

    // Thêm financial keywords
    builder.addKeywords(['cổ phiếu', 'chứng khoán', 'tài chính', 'đầu tư']);

    // Add Vietnamese financial sites
    builder.addVietnameseFinancialSites();

    // Exclude irrelevant content
    builder.excludeKeywords(['quảng cáo', 'khuyến mãi', 'spam']);

    return builder.build();
  }

  // Static method để tạo market data query
  static buildMarketDataQuery(params: MarketDataSearch): string {
    const builder = new SearchQueryBuilder('');

    builder.addStockCode(params.stockCode);
    builder.addTimeframe(params.timeframe);

    // Add specific data type keywords
    const dataTypeKeywords: Record<string, string[]> = {
      price: ['giá', 'price', 'quote'],
      volume: ['khối lượng', 'volume', 'trading volume'],
      financials: ['báo cáo tài chính', 'financial report', 'earnings'],
      ratios: ['tỷ số', 'ratio', 'P/E', 'ROE'],
      news: ['tin tức', 'news', 'thông tin'],
    };

    params.dataTypes.forEach(dataType => {
      if (dataTypeKeywords[dataType]) {
        builder.addKeywords(dataTypeKeywords[dataType]);
      }
    });

    builder.addVietnameseFinancialSites();

    return builder.build();
  }
}

// Error types
export class SearchError extends Error {
  constructor(
    message: string,
    public provider: SearchProvider,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'SearchError';
  }
}

export class SearchRateLimitError extends SearchError {
  constructor(provider: SearchProvider, retryAfter?: number) {
    super(`Rate limit exceeded for ${provider}`, provider, 429);
    this.name = 'SearchRateLimitError';
    this.retryAfter = retryAfter;
  }

  public retryAfter?: number;
}

export class SearchQuotaExceededError extends SearchError {
  constructor(provider: SearchProvider) {
    super(`Quota exceeded for ${provider}`, provider, 403);
    this.name = 'SearchQuotaExceededError';
  }
}
