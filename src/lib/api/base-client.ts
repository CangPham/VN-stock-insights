/**
 * @fileOverview Base API Client - Lớp trừu tượng cho tất cả API clients
 * Cung cấp interface chung và các chức năng cơ bản cho việc tích hợp dữ liệu
 */

import { z } from 'zod';
import type { StockInfo } from '@/types/stock';
import type { RealTimePrice, OrderBook, TradeTick, MarketIndex } from '@/types/market';
import type { ComprehensiveFinancialReport } from '@/types/financial';

// Enum cho các loại nguồn dữ liệu
export enum DataSourceType {
  FIREANT = 'FIREANT',
  CAFEF = 'CAFEF',
  VIETSTOCK = 'VIETSTOCK',
  SSI = 'SSI',
  VPS = 'VPS',
  HOSE = 'HOSE',
  HNX = 'HNX'
}

// Enum cho trạng thái API
export enum ApiStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  ERROR = 'ERROR'
}

// Interface cho cấu hình API
export interface ApiConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  rateLimit: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  headers?: Record<string, string>;
}

// Interface cho response metadata
export interface ApiResponseMetadata {
  source: DataSourceType;
  timestamp: Date;
  requestId: string;
  responseTime: number;
  cached: boolean;
  rateLimit?: {
    remaining: number;
    resetTime: Date;
  };
}

// Generic API Response wrapper
export interface ApiResponse<T> {
  data: T;
  metadata: ApiResponseMetadata;
  success: boolean;
  error?: string;
}

// Interface cho thống kê API
export interface ApiStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastRequestTime?: Date;
  status: ApiStatus;
}

// Abstract base class cho tất cả API clients
export abstract class BaseApiClient {
  protected config: ApiConfig;
  protected sourceType: DataSourceType;
  protected stats: ApiStats;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;

  constructor(config: ApiConfig, sourceType: DataSourceType) {
    this.config = config;
    this.sourceType = sourceType;
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      status: ApiStatus.ACTIVE
    };
  }

  // Abstract methods - phải được implement bởi các subclass
  abstract getStockInfo(stockCode: string): Promise<ApiResponse<StockInfo>>;
  abstract getRealTimePrice(stockCode: string): Promise<ApiResponse<RealTimePrice>>;
  abstract getOrderBook(stockCode: string): Promise<ApiResponse<OrderBook>>;
  abstract getTradeTicks(stockCode: string, limit?: number): Promise<ApiResponse<TradeTick[]>>;
  abstract getFinancialReport(stockCode: string, year: number, quarter?: number): Promise<ApiResponse<ComprehensiveFinancialReport>>;
  abstract getMarketIndex(indexCode: string): Promise<ApiResponse<MarketIndex>>;

  // Method để test kết nối
  abstract testConnection(): Promise<boolean>;

  // Protected method cho HTTP requests với retry logic
  protected async makeRequest<T>(
    url: string,
    options: RequestInit = {},
    schema?: z.ZodSchema<T>
  ): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // Rate limiting
      await this.enforceRateLimit();

      // Thực hiện request với retry
      const response = await this.executeWithRetry(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Validate data nếu có schema
      const validatedData = schema ? schema.parse(data) : data;

      const responseTime = Date.now() - startTime;
      this.updateStats(true, responseTime);

      return {
        data: validatedData,
        metadata: {
          source: this.sourceType,
          timestamp: new Date(),
          requestId,
          responseTime,
          cached: false
        },
        success: true
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateStats(false, responseTime);

      return {
        data: null as any,
        metadata: {
          source: this.sourceType,
          timestamp: new Date(),
          requestId,
          responseTime,
          cached: false
        },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Rate limiting implementation
  private async enforceRateLimit(): Promise<void> {
    // Implement rate limiting logic based on config
    const now = Date.now();
    const timeSinceLastRequest = this.stats.lastRequestTime 
      ? now - this.stats.lastRequestTime.getTime() 
      : 1000;

    const minInterval = 1000 / this.config.rateLimit.requestsPerSecond;
    
    if (timeSinceLastRequest < minInterval) {
      const delay = minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Retry logic implementation
  private async executeWithRetry(
    url: string, 
    options: RequestInit,
    attempt = 1
  ): Promise<Response> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
          ...options.headers
        }
      });

      clearTimeout(timeoutId);
      return response;

    } catch (error) {
      if (attempt < this.config.retryAttempts) {
        const delay = this.config.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeWithRetry(url, options, attempt + 1);
      }
      throw error;
    }
  }

  // Update API statistics
  private updateStats(success: boolean, responseTime: number): void {
    this.stats.totalRequests++;
    this.stats.lastRequestTime = new Date();

    if (success) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }

    // Update average response time
    const totalResponseTime = this.stats.averageResponseTime * (this.stats.totalRequests - 1) + responseTime;
    this.stats.averageResponseTime = totalResponseTime / this.stats.totalRequests;

    // Update status based on success rate
    const successRate = this.stats.successfulRequests / this.stats.totalRequests;
    if (successRate < 0.5) {
      this.stats.status = ApiStatus.ERROR;
    } else if (successRate < 0.8) {
      this.stats.status = ApiStatus.MAINTENANCE;
    } else {
      this.stats.status = ApiStatus.ACTIVE;
    }
  }

  // Generate unique request ID
  private generateRequestId(): string {
    return `${this.sourceType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public methods
  public getStats(): ApiStats {
    return { ...this.stats };
  }

  public getConfig(): ApiConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      status: ApiStatus.ACTIVE
    };
  }

  // Health check method
  public async healthCheck(): Promise<{
    status: ApiStatus;
    responseTime: number;
    lastCheck: Date;
  }> {
    const startTime = Date.now();
    const isHealthy = await this.testConnection();
    const responseTime = Date.now() - startTime;

    return {
      status: isHealthy ? ApiStatus.ACTIVE : ApiStatus.ERROR,
      responseTime,
      lastCheck: new Date()
    };
  }
}

// Factory pattern cho việc tạo API clients
export interface ApiClientFactory {
  createClient(sourceType: DataSourceType, config: ApiConfig): BaseApiClient;
}

// Utility functions
export const createDefaultConfig = (baseUrl: string): ApiConfig => ({
  baseUrl,
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  rateLimit: {
    requestsPerSecond: 10,
    requestsPerMinute: 600,
    requestsPerHour: 36000
  }
});

export const validateApiConfig = (config: ApiConfig): boolean => {
  return !!(
    config.baseUrl &&
    config.timeout > 0 &&
    config.retryAttempts >= 0 &&
    config.retryDelay >= 0 &&
    config.rateLimit.requestsPerSecond > 0
  );
};
