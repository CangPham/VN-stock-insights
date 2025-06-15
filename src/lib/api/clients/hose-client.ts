/**
 * @fileOverview HOSE API Client - Tích hợp với API chính thức của HOSE
 * Cung cấp dữ liệu chính thức từ Sở Giao dịch Chứng khoán TP.HCM
 */

import { z } from 'zod';
import { BaseApiClient, DataSourceType, ApiResponse } from '../base-client';
import { globalErrorHandler } from '../error-handler';
import { globalTransformationPipeline } from '../../transformation/data-transformer';
import type { StockInfo, StockPrice } from '@/types/stock';
import type { RealTimePrice, OrderBook, TradeTick, MarketIndex } from '@/types/market';
import type { ComprehensiveFinancialReport } from '@/types/financial';

// HOSE specific response schemas
const HOSEStockInfoSchema = z.object({
  symbol: z.string(),
  companyName: z.string(),
  englishName: z.string().optional(),
  industry: z.string().optional(),
  listedDate: z.string().optional(),
  listedVolume: z.number().optional(),
  charteredCapital: z.number().optional()
});

const HOSEMarketIndexSchema = z.object({
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

const HOSEHistoricalSchema = z.object({
  symbol: z.string(),
  date: z.string(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
  value: z.number()
});

export class HOSEClient extends BaseApiClient {
  constructor() {
    const config = {
      baseUrl: 'https://www.hsx.vn',
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

    super(config, DataSourceType.HOSE);
  }

  async getStockInfo(stockCode: string): Promise<ApiResponse<StockInfo>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/Modules/Listed/Web/StockInfo/${stockCode.toUpperCase()}`;
        const response = await this.makeRequest(url, {}, HOSEStockInfoSchema);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch stock info from HOSE');
        }

        // Transform HOSE data to our standard format
        const transformResult = await globalTransformationPipeline.transformData<StockInfo>(
          'hose_stock_info',
          response.data
        );

        return {
          ...response,
          data: transformResult.data
        };
      },
      { source: 'HOSEClient', requestId: this.generateRequestId() }
    );
  }

  async getRealTimePrice(stockCode: string): Promise<ApiResponse<RealTimePrice>> {
    // HOSE doesn't provide real-time price data through public API
    throw new Error('Real-time price data not available from HOSE public API');
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
        const url = `${this.config.baseUrl}/Modules/Listed/Web/HistoricalQuotes/${stockCode.toUpperCase()}?startDate=${start}&endDate=${end}`;
        
        const response = await this.makeRequest(url);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch historical prices from HOSE');
        }

        // Transform array of price data
        const transformedData: StockPrice[] = [];
        for (const item of response.data) {
          const transformResult = await globalTransformationPipeline.transformData<StockPrice>(
            'hose_stock_price',
            item
          );
          transformedData.push(transformResult.data);
        }

        return {
          ...response,
          data: transformedData
        };
      },
      { source: 'HOSEClient', requestId: this.generateRequestId() }
    );
  }

  async getOrderBook(stockCode: string): Promise<ApiResponse<OrderBook>> {
    // HOSE doesn't provide order book data through public API
    throw new Error('Order book data not available from HOSE public API');
  }

  async getTradeTicks(stockCode: string, limit?: number): Promise<ApiResponse<TradeTick[]>> {
    // HOSE doesn't provide trade tick data through public API
    throw new Error('Trade tick data not available from HOSE public API');
  }

  async getFinancialReport(
    stockCode: string, 
    year: number, 
    quarter?: number
  ): Promise<ApiResponse<ComprehensiveFinancialReport>> {
    // HOSE doesn't provide financial reports through public API
    throw new Error('Financial reports not available from HOSE public API');
  }

  async getMarketIndex(indexCode: string): Promise<ApiResponse<MarketIndex>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/Modules/Listed/Web/Indices/${indexCode.toUpperCase()}`;
        const response = await this.makeRequest(url, {}, HOSEMarketIndexSchema);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch market index from HOSE');
        }

        // Transform index data
        const transformResult = await globalTransformationPipeline.transformData<MarketIndex>(
          'hose_market_index',
          response.data
        );

        return {
          ...response,
          data: transformResult.data
        };
      },
      { source: 'HOSEClient', requestId: this.generateRequestId() }
    );
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/Modules/Listed/Web/Health`, {
        method: 'GET',
        headers: this.config.headers,
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // HOSE specific methods
  async getListedCompanies(): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/Modules/Listed/Web/Companies`;
        return this.makeRequest(url);
      },
      { source: 'HOSEClient', requestId: this.generateRequestId() }
    );
  }

  async getMarketStatistics(): Promise<ApiResponse<any>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/Modules/Listed/Web/Statistics`;
        return this.makeRequest(url);
      },
      { source: 'HOSEClient', requestId: this.generateRequestId() }
    );
  }

  async getTradingCalendar(year: number): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/Modules/Listed/Web/TradingCalendar?year=${year}`;
        return this.makeRequest(url);
      },
      { source: 'HOSEClient', requestId: this.generateRequestId() }
    );
  }

  async getAnnouncementsByCompany(stockCode: string): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/Modules/Listed/Web/Announcements/${stockCode.toUpperCase()}`;
        return this.makeRequest(url);
      },
      { source: 'HOSEClient', requestId: this.generateRequestId() }
    );
  }

  async getDisclosureDocuments(stockCode: string): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/Modules/Listed/Web/Disclosures/${stockCode.toUpperCase()}`;
        return this.makeRequest(url);
      },
      { source: 'HOSEClient', requestId: this.generateRequestId() }
    );
  }

  async getETFList(): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/Modules/Listed/Web/ETF`;
        return this.makeRequest(url);
      },
      { source: 'HOSEClient', requestId: this.generateRequestId() }
    );
  }

  async getBondList(): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/Modules/Listed/Web/Bonds`;
        return this.makeRequest(url);
      },
      { source: 'HOSEClient', requestId: this.generateRequestId() }
    );
  }

  async getDerivativesList(): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/Modules/Listed/Web/Derivatives`;
        return this.makeRequest(url);
      },
      { source: 'HOSEClient', requestId: this.generateRequestId() }
    );
  }

  async getMarketNews(): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/Modules/Listed/Web/News`;
        return this.makeRequest(url);
      },
      { source: 'HOSEClient', requestId: this.generateRequestId() }
    );
  }

  async getRegulations(): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/Modules/Listed/Web/Regulations`;
        return this.makeRequest(url);
      },
      { source: 'HOSEClient', requestId: this.generateRequestId() }
    );
  }

  // Helper method to generate request ID
  protected generateRequestId(): string {
    return `hose_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
      'etf',
      'bonds',
      'derivatives',
      'marketNews',
      'regulations'
    ];
  }

  // Method to check if a feature is supported
  public supportsFeature(feature: string): boolean {
    return this.getSupportedFeatures().includes(feature);
  }
}

// Export singleton instance
export const hoseClient = new HOSEClient();
