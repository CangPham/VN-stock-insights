/**
 * @fileOverview HNX API Client - Tích hợp với API chính thức của HNX
 * Cung cấp dữ liệu chính thức từ Sở Giao dịch Chứng khoán Hà Nội
 */

import { z } from 'zod';
import { BaseApiClient, DataSourceType, ApiResponse } from '../base-client';
import { globalErrorHandler } from '../error-handler';
import { globalTransformationPipeline } from '../../transformation/data-transformer';
import type { StockInfo, StockPrice } from '@/types/stock';
import type { RealTimePrice, OrderBook, TradeTick, MarketIndex } from '@/types/market';
import type { ComprehensiveFinancialReport } from '@/types/financial';

// HNX specific response schemas
const HNXStockInfoSchema = z.object({
  symbol: z.string(),
  companyName: z.string(),
  englishName: z.string().optional(),
  industry: z.string().optional(),
  listedDate: z.string().optional(),
  listedVolume: z.number().optional(),
  charteredCapital: z.number().optional(),
  market: z.string().optional() // HNX, UPCOM
});

const HNXMarketIndexSchema = z.object({
  indexCode: z.string(),
  indexValue: z.number(),
  change: z.number(),
  changePercent: z.number(),
  openIndex: z.number(),
  highIndex: z.number(),
  lowIndex: z.number(),
  totalVolume: z.number(),
  totalValue: z.number(),
  timestamp: z.string()
});

const HNXHistoricalSchema = z.object({
  symbol: z.string(),
  date: z.string(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
  value: z.number()
});

export class HNXClient extends BaseApiClient {
  constructor() {
    const config = {
      baseUrl: 'https://www.hnx.vn',
      timeout: 40000,
      retryAttempts: 2,
      retryDelay: 2000,
      rateLimit: {
        requestsPerSecond: 3,
        requestsPerMinute: 180,
        requestsPerHour: 10800
      },
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'VN-Stock-Insights/1.0.0',
        'Content-Type': 'application/json'
      }
    };

    super(config, DataSourceType.HNX);
  }

  async getStockInfo(stockCode: string): Promise<ApiResponse<StockInfo>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/api/stocks/${stockCode.toUpperCase()}`;
        const response = await this.makeRequest(url, {}, HNXStockInfoSchema);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch stock info from HNX');
        }

        // Transform HNX data to our standard format
        const transformResult = await globalTransformationPipeline.transformData<StockInfo>(
          'hnx_stock_info',
          response.data
        );

        return {
          ...response,
          data: transformResult.data
        };
      },
      { source: 'HNXClient', requestId: this.generateRequestId() }
    );
  }

  async getRealTimePrice(stockCode: string): Promise<ApiResponse<RealTimePrice>> {
    // HNX doesn't provide real-time price data through public API
    throw new Error('Real-time price data not available from HNX public API');
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
        const url = `${this.config.baseUrl}/api/historical/${stockCode.toUpperCase()}?startDate=${start}&endDate=${end}`;
        
        const response = await this.makeRequest(url);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch historical prices from HNX');
        }

        // Transform array of price data
        const transformedData: StockPrice[] = [];
        for (const item of response.data) {
          const transformResult = await globalTransformationPipeline.transformData<StockPrice>(
            'hnx_stock_price',
            item
          );
          transformedData.push(transformResult.data);
        }

        return {
          ...response,
          data: transformedData
        };
      },
      { source: 'HNXClient', requestId: this.generateRequestId() }
    );
  }

  async getOrderBook(stockCode: string): Promise<ApiResponse<OrderBook>> {
    // HNX doesn't provide order book data through public API
    throw new Error('Order book data not available from HNX public API');
  }

  async getTradeTicks(stockCode: string, limit?: number): Promise<ApiResponse<TradeTick[]>> {
    // HNX doesn't provide trade tick data through public API
    throw new Error('Trade tick data not available from HNX public API');
  }

  async getFinancialReport(
    stockCode: string, 
    year: number, 
    quarter?: number
  ): Promise<ApiResponse<ComprehensiveFinancialReport>> {
    // HNX doesn't provide financial reports through public API
    throw new Error('Financial reports not available from HNX public API');
  }

  async getMarketIndex(indexCode: string): Promise<ApiResponse<MarketIndex>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/api/indices/${indexCode.toUpperCase()}`;
        const response = await this.makeRequest(url, {}, HNXMarketIndexSchema);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch market index from HNX');
        }

        // Transform index data
        const transformResult = await globalTransformationPipeline.transformData<MarketIndex>(
          'hnx_market_index',
          response.data
        );

        return {
          ...response,
          data: transformResult.data
        };
      },
      { source: 'HNXClient', requestId: this.generateRequestId() }
    );
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/health`, {
        method: 'GET',
        headers: this.config.headers,
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // HNX specific methods
  async getListedCompanies(market: 'HNX' | 'UPCOM' = 'HNX'): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/api/companies?market=${market}`;
        return this.makeRequest(url);
      },
      { source: 'HNXClient', requestId: this.generateRequestId() }
    );
  }

  async getMarketStatistics(market: 'HNX' | 'UPCOM' = 'HNX'): Promise<ApiResponse<any>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/api/statistics?market=${market}`;
        return this.makeRequest(url);
      },
      { source: 'HNXClient', requestId: this.generateRequestId() }
    );
  }

  async getTradingCalendar(year: number): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/api/trading-calendar?year=${year}`;
        return this.makeRequest(url);
      },
      { source: 'HNXClient', requestId: this.generateRequestId() }
    );
  }

  async getAnnouncementsByCompany(stockCode: string): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/api/announcements/${stockCode.toUpperCase()}`;
        return this.makeRequest(url);
      },
      { source: 'HNXClient', requestId: this.generateRequestId() }
    );
  }

  async getDisclosureDocuments(stockCode: string): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/api/disclosures/${stockCode.toUpperCase()}`;
        return this.makeRequest(url);
      },
      { source: 'HNXClient', requestId: this.generateRequestId() }
    );
  }

  async getBondList(): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/api/bonds`;
        return this.makeRequest(url);
      },
      { source: 'HNXClient', requestId: this.generateRequestId() }
    );
  }

  async getGovernmentBonds(): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/api/government-bonds`;
        return this.makeRequest(url);
      },
      { source: 'HNXClient', requestId: this.generateRequestId() }
    );
  }

  async getUPCOMStatistics(): Promise<ApiResponse<any>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/api/upcom/statistics`;
        return this.makeRequest(url);
      },
      { source: 'HNXClient', requestId: this.generateRequestId() }
    );
  }

  async getMarketNews(): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/api/news`;
        return this.makeRequest(url);
      },
      { source: 'HNXClient', requestId: this.generateRequestId() }
    );
  }

  async getRegulations(): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/api/regulations`;
        return this.makeRequest(url);
      },
      { source: 'HNXClient', requestId: this.generateRequestId() }
    );
  }

  async getInvestorStatistics(): Promise<ApiResponse<any>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/api/investor-statistics`;
        return this.makeRequest(url);
      },
      { source: 'HNXClient', requestId: this.generateRequestId() }
    );
  }

  // Helper method to generate request ID
  protected generateRequestId(): string {
    return `hnx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Method to get supported features
  public getSupportedFeatures(): string[] {
    return [
      'stockInfo',
      'historicalPrice',
      'marketIndex',
      'listedCompanies',
      'marketStatistics',
      'tradingCalendar',
      'announcements',
      'disclosures',
      'bonds',
      'governmentBonds',
      'upcomStatistics',
      'marketNews',
      'regulations',
      'investorStatistics'
    ];
  }

  // Method to check if a feature is supported
  public supportsFeature(feature: string): boolean {
    return this.getSupportedFeatures().includes(feature);
  }
}

// Export singleton instance
export const hnxClient = new HNXClient();
