/**
 * @fileOverview CafeF API Client - Tích hợp với cafef.vn
 * Cung cấp dữ liệu thời gian thực, tin tức và phân tích thị trường
 */

import { z } from 'zod';
import { BaseApiClient, DataSourceType, ApiResponse } from '../base-client';
import { globalErrorHandler } from '../error-handler';
import { globalTransformationPipeline } from '../../transformation/data-transformer';
import type { StockInfo, StockPrice } from '@/types/stock';
import type { RealTimePrice, OrderBook, TradeTick, MarketIndex } from '@/types/market';
import type { ComprehensiveFinancialReport } from '@/types/financial';

// CafeF specific response schemas
const CafeFStockInfoSchema = z.object({
  Symbol: z.string(),
  CompanyName: z.string(),
  Exchange: z.string(),
  Industry: z.string().optional(),
  MarketCap: z.number().optional(),
  OutstandingShares: z.number().optional()
});

const CafeFRealTimePriceSchema = z.object({
  s: z.string(), // symbol
  c: z.number(), // current price
  o: z.number(), // open
  h: z.number(), // high
  l: z.number(), // low
  v: z.number(), // volume
  val: z.number(), // value
  ch: z.number(), // change
  cp: z.number(), // change percent
  r: z.number(), // reference price
  ceil: z.number(), // ceiling
  floor: z.number(), // floor
  t: z.number().optional() // timestamp
});

const CafeFOrderBookSchema = z.object({
  symbol: z.string(),
  bid: z.array(z.object({
    price: z.number(),
    volume: z.number()
  })),
  ask: z.array(z.object({
    price: z.number(),
    volume: z.number()
  })),
  timestamp: z.number().optional()
});

const CafeFNewsSchema = z.object({
  title: z.string(),
  summary: z.string().optional(),
  content: z.string().optional(),
  publishDate: z.string(),
  url: z.string().optional(),
  category: z.string().optional()
});

export class CafeFClient extends BaseApiClient {
  constructor() {
    const config = {
      baseUrl: 'https://s.cafef.vn',
      timeout: 25000,
      retryAttempts: 2,
      retryDelay: 1500,
      rateLimit: {
        requestsPerSecond: 8,
        requestsPerMinute: 480,
        requestsPerHour: 28800
      },
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'VN-Stock-Insights/1.0.0',
        'Referer': 'https://cafef.vn'
      }
    };

    super(config, DataSourceType.CAFEF);
  }

  async getStockInfo(stockCode: string): Promise<ApiResponse<StockInfo>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/ajax/tktt.ashx?symbol=${stockCode.toUpperCase()}`;
        const response = await this.makeRequest(url, {}, CafeFStockInfoSchema);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch stock info from CafeF');
        }

        // Transform CafeF data to our standard format
        const transformResult = await globalTransformationPipeline.transformData<StockInfo>(
          'cafef_stock_info',
          response.data
        );

        return {
          ...response,
          data: transformResult.data
        };
      },
      { source: 'CafeFClient', requestId: this.generateRequestId() }
    );
  }

  async getRealTimePrice(stockCode: string): Promise<ApiResponse<RealTimePrice>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/ajax/paging/stockinfo.ashx?symbol=${stockCode.toUpperCase()}`;
        const response = await this.makeRequest(url, {}, CafeFRealTimePriceSchema);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch real-time price from CafeF');
        }

        // Transform to standard format
        const transformResult = await globalTransformationPipeline.transformData<RealTimePrice>(
          'cafef_realtime_price',
          response.data
        );

        return {
          ...response,
          data: transformResult.data
        };
      },
      { source: 'CafeFClient', requestId: this.generateRequestId() }
    );
  }

  async getOrderBook(stockCode: string): Promise<ApiResponse<OrderBook>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/ajax/orderbook.ashx?symbol=${stockCode.toUpperCase()}`;
        const response = await this.makeRequest(url, {}, CafeFOrderBookSchema);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch order book from CafeF');
        }

        // Transform to standard format
        const transformResult = await globalTransformationPipeline.transformData<OrderBook>(
          'cafef_order_book',
          response.data
        );

        return {
          ...response,
          data: transformResult.data
        };
      },
      { source: 'CafeFClient', requestId: this.generateRequestId() }
    );
  }

  async getTradeTicks(stockCode: string, limit: number = 100): Promise<ApiResponse<TradeTick[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/ajax/tradeticks.ashx?symbol=${stockCode.toUpperCase()}&limit=${limit}`;
        const response = await this.makeRequest(url);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch trade ticks from CafeF');
        }

        // Transform array of trade tick data
        const transformedData: TradeTick[] = [];
        for (const item of response.data) {
          const transformResult = await globalTransformationPipeline.transformData<TradeTick>(
            'cafef_trade_tick',
            item
          );
          transformedData.push(transformResult.data);
        }

        return {
          ...response,
          data: transformedData
        };
      },
      { source: 'CafeFClient', requestId: this.generateRequestId() }
    );
  }

  async getFinancialReport(
    stockCode: string, 
    year: number, 
    quarter?: number
  ): Promise<ApiResponse<ComprehensiveFinancialReport>> {
    // CafeF doesn't provide detailed financial reports
    throw new Error('Financial reports not available from CafeF');
  }

  async getMarketIndex(indexCode: string): Promise<ApiResponse<MarketIndex>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/ajax/index.ashx?index=${indexCode.toUpperCase()}`;
        const response = await this.makeRequest(url);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch market index from CafeF');
        }

        // Transform index data
        const transformResult = await globalTransformationPipeline.transformData<MarketIndex>(
          'cafef_market_index',
          response.data
        );

        return {
          ...response,
          data: transformResult.data
        };
      },
      { source: 'CafeFClient', requestId: this.generateRequestId() }
    );
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/ajax/ping.ashx`, {
        method: 'GET',
        headers: this.config.headers,
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // CafeF specific methods
  async getNews(stockCode?: string, limit: number = 20): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        let url = `${this.config.baseUrl}/ajax/paging/news.ashx?limit=${limit}`;
        if (stockCode) {
          url += `&symbol=${stockCode.toUpperCase()}`;
        }
        
        const response = await this.makeRequest(url);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch news from CafeF');
        }

        return response;
      },
      { source: 'CafeFClient', requestId: this.generateRequestId() }
    );
  }

  async getMarketNews(category?: string, limit: number = 20): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        let url = `${this.config.baseUrl}/ajax/paging/marketnews.ashx?limit=${limit}`;
        if (category) {
          url += `&category=${encodeURIComponent(category)}`;
        }
        
        return this.makeRequest(url);
      },
      { source: 'CafeFClient', requestId: this.generateRequestId() }
    );
  }

  async getTopMovers(exchange: 'HOSE' | 'HNX' | 'UPCOM' = 'HOSE'): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/ajax/topmovers.ashx?exchange=${exchange}`;
        return this.makeRequest(url);
      },
      { source: 'CafeFClient', requestId: this.generateRequestId() }
    );
  }

  async getMarketOverview(): Promise<ApiResponse<any>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/ajax/marketoverview.ashx`;
        return this.makeRequest(url);
      },
      { source: 'CafeFClient', requestId: this.generateRequestId() }
    );
  }

  async getForeignTradingData(stockCode?: string): Promise<ApiResponse<any>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        let url = `${this.config.baseUrl}/ajax/foreigntrading.ashx`;
        if (stockCode) {
          url += `?symbol=${stockCode.toUpperCase()}`;
        }
        
        return this.makeRequest(url);
      },
      { source: 'CafeFClient', requestId: this.generateRequestId() }
    );
  }

  async getIndustryData(industryCode?: string): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        let url = `${this.config.baseUrl}/ajax/industry.ashx`;
        if (industryCode) {
          url += `?code=${industryCode}`;
        }
        
        return this.makeRequest(url);
      },
      { source: 'CafeFClient', requestId: this.generateRequestId() }
    );
  }

  async searchStocks(query: string): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/ajax/search.ashx?q=${encodeURIComponent(query)}`;
        return this.makeRequest(url);
      },
      { source: 'CafeFClient', requestId: this.generateRequestId() }
    );
  }

  async getIntradayChart(stockCode: string): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/ajax/intradaychart.ashx?symbol=${stockCode.toUpperCase()}`;
        return this.makeRequest(url);
      },
      { source: 'CafeFClient', requestId: this.generateRequestId() }
    );
  }

  // Helper method to generate request ID
  private generateRequestId(): string {
    return `cafef_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Method to get supported features
  public getSupportedFeatures(): string[] {
    return [
      'stockInfo',
      'realTimePrice',
      'orderBook',
      'tradeTicks',
      'marketIndex',
      'news',
      'marketNews',
      'topMovers',
      'marketOverview',
      'foreignTrading',
      'industryData',
      'search',
      'intradayChart'
    ];
  }

  // Method to check if a feature is supported
  public supportsFeature(feature: string): boolean {
    return this.getSupportedFeatures().includes(feature);
  }
}

// Export singleton instance
export const cafeFClient = new CafeFClient();
