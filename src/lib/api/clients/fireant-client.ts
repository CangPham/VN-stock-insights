/**
 * @fileOverview FireAnt API Client - Tích hợp với fireant.vn
 * Cung cấp dữ liệu giá cổ phiếu, báo cáo tài chính và thông tin thị trường
 */

import { z } from 'zod';
import { BaseApiClient, DataSourceType, ApiResponse } from '../base-client';
import { globalErrorHandler } from '../error-handler';
import { globalTransformationPipeline } from '../../transformation/data-transformer';
import type { StockInfo, StockPrice } from '@/types/stock';
import type { RealTimePrice, OrderBook, TradeTick, MarketIndex } from '@/types/market';
import type { ComprehensiveFinancialReport } from '@/types/financial';

// FireAnt specific response schemas
const FireAntStockInfoSchema = z.object({
  symbol: z.string(),
  companyName: z.string(),
  exchange: z.string(),
  industry: z.string(),
  listedDate: z.string().optional(),
  outstandingShares: z.number().optional(),
  marketCap: z.number().optional()
});

const FireAntPriceSchema = z.object({
  symbol: z.string(),
  date: z.string(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
  value: z.number(),
  change: z.number().optional(),
  changePercent: z.number().optional()
});

const FireAntFinancialSchema = z.object({
  symbol: z.string(),
  year: z.number(),
  quarter: z.number().optional(),
  reportType: z.string(),
  data: z.record(z.any())
});

export class FireAntClient extends BaseApiClient {
  constructor() {
    const config = {
      baseUrl: 'https://restv2.fireant.vn',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      rateLimit: {
        requestsPerSecond: 10,
        requestsPerMinute: 600,
        requestsPerHour: 36000
      },
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'VN-Stock-Insights/1.0.0'
      }
    };

    super(config, DataSourceType.FIREANT);
  }

  async getStockInfo(stockCode: string): Promise<ApiResponse<StockInfo>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/symbols/${stockCode.toUpperCase()}`;
        const response = await this.makeRequest(url, {}, FireAntStockInfoSchema);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch stock info');
        }

        // Transform FireAnt data to our standard format
        const transformResult = await globalTransformationPipeline.transformData<StockInfo>(
          'fireant_stock_info',
          response.data
        );

        return {
          ...response,
          data: transformResult.data
        };
      },
      { source: 'FireAntClient', requestId: this.generateRequestId() }
    );
  }

  async getRealTimePrice(stockCode: string): Promise<ApiResponse<RealTimePrice>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/symbols/${stockCode.toUpperCase()}/latest`;
        const response = await this.makeRequest(url);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch real-time price');
        }

        // Transform to standard format
        const transformResult = await globalTransformationPipeline.transformData<RealTimePrice>(
          'fireant_realtime_price',
          response.data
        );

        return {
          ...response,
          data: transformResult.data
        };
      },
      { source: 'FireAntClient', requestId: this.generateRequestId() }
    );
  }

  async getHistoricalPrices(
    stockCode: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<ApiResponse<StockPrice[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const start = startDate.toISOString().split('T')[0];
        const end = endDate.toISOString().split('T')[0];
        const url = `${this.config.baseUrl}/symbols/${stockCode.toUpperCase()}/historical?startDate=${start}&endDate=${end}`;
        
        const response = await this.makeRequest(url);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch historical prices');
        }

        // Transform array of price data
        const transformedData: StockPrice[] = [];
        for (const item of response.data) {
          const transformResult = await globalTransformationPipeline.transformData<StockPrice>(
            'fireant_stock_price',
            item
          );
          transformedData.push(transformResult.data);
        }

        return {
          ...response,
          data: transformedData
        };
      },
      { source: 'FireAntClient', requestId: this.generateRequestId() }
    );
  }

  async getOrderBook(stockCode: string): Promise<ApiResponse<OrderBook>> {
    // FireAnt doesn't provide order book data
    throw new Error('Order book data not available from FireAnt');
  }

  async getTradeTicks(stockCode: string, limit?: number): Promise<ApiResponse<TradeTick[]>> {
    // FireAnt doesn't provide trade tick data
    throw new Error('Trade tick data not available from FireAnt');
  }

  async getFinancialReport(
    stockCode: string, 
    year: number, 
    quarter?: number
  ): Promise<ApiResponse<ComprehensiveFinancialReport>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        let url = `${this.config.baseUrl}/symbols/${stockCode.toUpperCase()}/financial-reports?year=${year}`;
        if (quarter) {
          url += `&quarter=${quarter}`;
        }
        
        const response = await this.makeRequest(url, {}, FireAntFinancialSchema);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch financial report');
        }

        // Transform financial data
        const transformResult = await globalTransformationPipeline.transformData<ComprehensiveFinancialReport>(
          'fireant_financial',
          response.data
        );

        return {
          ...response,
          data: transformResult.data
        };
      },
      { source: 'FireAntClient', requestId: this.generateRequestId() }
    );
  }

  async getMarketIndex(indexCode: string): Promise<ApiResponse<MarketIndex>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/indices/${indexCode.toUpperCase()}`;
        const response = await this.makeRequest(url);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch market index');
        }

        // Transform index data
        const transformResult = await globalTransformationPipeline.transformData<MarketIndex>(
          'fireant_market_index',
          response.data
        );

        return {
          ...response,
          data: transformResult.data
        };
      },
      { source: 'FireAntClient', requestId: this.generateRequestId() }
    );
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        headers: this.config.headers,
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // FireAnt specific methods
  async getCompanyProfile(stockCode: string): Promise<ApiResponse<any>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/symbols/${stockCode.toUpperCase()}/profile`;
        return this.makeRequest(url);
      },
      { source: 'FireAntClient', requestId: this.generateRequestId() }
    );
  }

  async getFinancialRatios(stockCode: string): Promise<ApiResponse<any>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/symbols/${stockCode.toUpperCase()}/financial-ratios`;
        return this.makeRequest(url);
      },
      { source: 'FireAntClient', requestId: this.generateRequestId() }
    );
  }

  async getEvents(stockCode: string): Promise<ApiResponse<any>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/symbols/${stockCode.toUpperCase()}/events`;
        return this.makeRequest(url);
      },
      { source: 'FireAntClient', requestId: this.generateRequestId() }
    );
  }

  async searchSymbols(query: string): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/symbols/search?q=${encodeURIComponent(query)}`;
        return this.makeRequest(url);
      },
      { source: 'FireAntClient', requestId: this.generateRequestId() }
    );
  }

  async getTopMovers(type: 'gainers' | 'losers' | 'volume'): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/market/top-movers?type=${type}`;
        return this.makeRequest(url);
      },
      { source: 'FireAntClient', requestId: this.generateRequestId() }
    );
  }

  async getMarketOverview(): Promise<ApiResponse<any>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/market/overview`;
        return this.makeRequest(url);
      },
      { source: 'FireAntClient', requestId: this.generateRequestId() }
    );
  }

  // Helper method to generate request ID
  private generateRequestId(): string {
    return `fireant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Method to get supported features
  public getSupportedFeatures(): string[] {
    return [
      'stockInfo',
      'realTimePrice',
      'historicalPrice',
      'financialReports',
      'marketIndex',
      'companyProfile',
      'financialRatios',
      'events',
      'search',
      'topMovers',
      'marketOverview'
    ];
  }

  // Method to check if a feature is supported
  public supportsFeature(feature: string): boolean {
    return this.getSupportedFeatures().includes(feature);
  }
}

// Export singleton instance
export const fireAntClient = new FireAntClient();
