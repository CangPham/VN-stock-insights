/**
 * @fileOverview VPS API Client - Tích hợp với API chính thức của VPS Securities
 * Cung cấp dữ liệu chính thức từ công ty chứng khoán VPS
 */

import { z } from 'zod';
import { BaseApiClient, DataSourceType, ApiResponse } from '../base-client';
import { globalErrorHandler } from '../error-handler';
import { globalTransformationPipeline } from '../../transformation/data-transformer';
import type { StockInfo, StockPrice } from '@/types/stock';
import type { RealTimePrice, OrderBook, TradeTick, MarketIndex } from '@/types/market';
import type { ComprehensiveFinancialReport } from '@/types/financial';

// VPS specific response schemas
const VPSStockInfoSchema = z.object({
  code: z.string(),
  name: z.string(),
  exchange: z.string(),
  sector: z.string().optional(),
  industry: z.string().optional(),
  listedShares: z.number().optional(),
  marketCap: z.number().optional()
});

const VPSRealTimePriceSchema = z.object({
  code: z.string(),
  price: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  previousClose: z.number().optional(),
  volume: z.number(),
  value: z.number(),
  change: z.number(),
  changePercent: z.number(),
  refPrice: z.number(),
  ceiling: z.number(),
  floor: z.number(),
  lastUpdated: z.string()
});

const VPSFinancialSchema = z.object({
  code: z.string(),
  year: z.number(),
  quarter: z.number().optional(),
  reportType: z.string(),
  financialData: z.record(z.any())
});

export class VPSClient extends BaseApiClient {
  private accessToken: string;

  constructor(accessToken?: string) {
    const config = {
      baseUrl: 'https://api.vps.com.vn',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      rateLimit: {
        requestsPerSecond: 12,
        requestsPerMinute: 720,
        requestsPerHour: 43200
      },
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'VN-Stock-Insights/1.0.0',
        'Content-Type': 'application/json'
      }
    };

    super(config, DataSourceType.VPS);
    this.accessToken = accessToken || process.env.VPS_ACCESS_TOKEN || '';
    
    if (this.accessToken) {
      this.config.headers = {
        ...this.config.headers,
        'Authorization': `Bearer ${this.accessToken}`
      };
    }
  }

  async getStockInfo(stockCode: string): Promise<ApiResponse<StockInfo>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/api/v1/stocks/${stockCode.toUpperCase()}`;
        const response = await this.makeRequest(url, {}, VPSStockInfoSchema);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch stock info from VPS');
        }

        // Transform VPS data to our standard format
        const transformResult = await globalTransformationPipeline.transformData<StockInfo>(
          'vps_stock_info',
          response.data
        );

        return {
          ...response,
          data: transformResult.data
        };
      },
      { source: 'VPSClient', requestId: this.generateRequestId() }
    );
  }

  async getRealTimePrice(stockCode: string): Promise<ApiResponse<RealTimePrice>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/api/v1/quotes/${stockCode.toUpperCase()}`;
        const response = await this.makeRequest(url, {}, VPSRealTimePriceSchema);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch real-time price from VPS');
        }

        // Transform to standard format
        const transformResult = await globalTransformationPipeline.transformData<RealTimePrice>(
          'vps_realtime_price',
          response.data
        );

        return {
          ...response,
          data: transformResult.data
        };
      },
      { source: 'VPSClient', requestId: this.generateRequestId() }
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
        const url = `${this.config.baseUrl}/api/v1/historical/${stockCode.toUpperCase()}?startDate=${start}&endDate=${end}`;
        
        const response = await this.makeRequest(url);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch historical prices from VPS');
        }

        // Transform array of price data
        const transformedData: StockPrice[] = [];
        for (const item of response.data) {
          const transformResult = await globalTransformationPipeline.transformData<StockPrice>(
            'vps_stock_price',
            item
          );
          transformedData.push(transformResult.data);
        }

        return {
          ...response,
          data: transformedData
        };
      },
      { source: 'VPSClient', requestId: this.generateRequestId() }
    );
  }

  async getOrderBook(stockCode: string): Promise<ApiResponse<OrderBook>> {
    // VPS doesn't provide order book data
    throw new Error('Order book data not available from VPS');
  }

  async getTradeTicks(stockCode: string, limit?: number): Promise<ApiResponse<TradeTick[]>> {
    // VPS doesn't provide trade tick data
    throw new Error('Trade tick data not available from VPS');
  }

  async getFinancialReport(
    stockCode: string, 
    year: number, 
    quarter?: number
  ): Promise<ApiResponse<ComprehensiveFinancialReport>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        let url = `${this.config.baseUrl}/api/v1/financials/${stockCode.toUpperCase()}?year=${year}`;
        if (quarter) {
          url += `&quarter=${quarter}`;
        }
        
        const response = await this.makeRequest(url, {}, VPSFinancialSchema);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch financial report from VPS');
        }

        // Transform financial data
        const transformResult = await globalTransformationPipeline.transformData<ComprehensiveFinancialReport>(
          'vps_financial',
          response.data
        );

        return {
          ...response,
          data: transformResult.data
        };
      },
      { source: 'VPSClient', requestId: this.generateRequestId() }
    );
  }

  async getMarketIndex(indexCode: string): Promise<ApiResponse<MarketIndex>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/api/v1/indices/${indexCode.toUpperCase()}`;
        const response = await this.makeRequest(url);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch market index from VPS');
        }

        // Transform index data
        const transformResult = await globalTransformationPipeline.transformData<MarketIndex>(
          'vps_market_index',
          response.data
        );

        return {
          ...response,
          data: transformResult.data
        };
      },
      { source: 'VPSClient', requestId: this.generateRequestId() }
    );
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/health`, {
        method: 'GET',
        headers: this.config.headers,
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // VPS specific methods
  async getMarketSummary(): Promise<ApiResponse<any>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/api/v1/market/summary`;
        return this.makeRequest(url);
      },
      { source: 'VPSClient', requestId: this.generateRequestId() }
    );
  }

  async getTopStocks(type: 'gainers' | 'losers' | 'volume' | 'value'): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/api/v1/market/top-stocks?type=${type}`;
        return this.makeRequest(url);
      },
      { source: 'VPSClient', requestId: this.generateRequestId() }
    );
  }

  async getAnalystRecommendations(stockCode: string): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/api/v1/research/recommendations/${stockCode.toUpperCase()}`;
        return this.makeRequest(url);
      },
      { source: 'VPSClient', requestId: this.generateRequestId() }
    );
  }

  async getResearchReports(stockCode?: string): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        let url = `${this.config.baseUrl}/api/v1/research/reports`;
        if (stockCode) {
          url += `?symbol=${stockCode.toUpperCase()}`;
        }
        return this.makeRequest(url);
      },
      { source: 'VPSClient', requestId: this.generateRequestId() }
    );
  }

  async getEarningsCalendar(startDate?: Date, endDate?: Date): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        let url = `${this.config.baseUrl}/api/v1/calendar/earnings`;
        const params = new URLSearchParams();
        
        if (startDate) {
          params.append('startDate', startDate.toISOString().split('T')[0]);
        }
        if (endDate) {
          params.append('endDate', endDate.toISOString().split('T')[0]);
        }
        
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
        
        return this.makeRequest(url);
      },
      { source: 'VPSClient', requestId: this.generateRequestId() }
    );
  }

  async getDividendCalendar(startDate?: Date, endDate?: Date): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        let url = `${this.config.baseUrl}/api/v1/calendar/dividends`;
        const params = new URLSearchParams();
        
        if (startDate) {
          params.append('startDate', startDate.toISOString().split('T')[0]);
        }
        if (endDate) {
          params.append('endDate', endDate.toISOString().split('T')[0]);
        }
        
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
        
        return this.makeRequest(url);
      },
      { source: 'VPSClient', requestId: this.generateRequestId() }
    );
  }

  async getPortfolioAnalysis(holdings: Array<{symbol: string, quantity: number}>): Promise<ApiResponse<any>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/api/v1/portfolio/analysis`;
        const response = await this.makeRequest(url, {
          method: 'POST',
          body: JSON.stringify({ holdings })
        });
        return response;
      },
      { source: 'VPSClient', requestId: this.generateRequestId() }
    );
  }

  // Helper method to generate request ID
  protected generateRequestId(): string {
    return `vps_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Method to get supported features
  public getSupportedFeatures(): string[] {
    return [
      'stockInfo',
      'realTimePrice',
      'historicalPrice',
      'financialReports',
      'marketIndex',
      'marketSummary',
      'topStocks',
      'analystRecommendations',
      'researchReports',
      'earningsCalendar',
      'dividendCalendar',
      'portfolioAnalysis'
    ];
  }

  // Method to check if a feature is supported
  public supportsFeature(feature: string): boolean {
    return this.getSupportedFeatures().includes(feature);
  }

  // Method to update access token
  public updateAccessToken(token: string): void {
    this.accessToken = token;
    this.config.headers = {
      ...this.config.headers,
      'Authorization': `Bearer ${token}`
    };
  }
}

// Export singleton instance
export const vpsClient = new VPSClient();
