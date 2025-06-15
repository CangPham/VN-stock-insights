/**
 * @fileOverview SSI API Client - Tích hợp với API chính thức của SSI Securities
 * Cung cấp dữ liệu chính thức từ công ty chứng khoán SSI
 */

import { z } from 'zod';
import { BaseApiClient, DataSourceType, ApiResponse } from '../base-client';
import { globalErrorHandler } from '../error-handler';
import { globalTransformationPipeline } from '../../transformation/data-transformer';
import type { StockInfo, StockPrice } from '@/types/stock';
import type { RealTimePrice, OrderBook, TradeTick, MarketIndex } from '@/types/market';
import type { ComprehensiveFinancialReport } from '@/types/financial';

// SSI specific response schemas
const SSIStockInfoSchema = z.object({
  symbol: z.string(),
  companyName: z.string(),
  exchange: z.string(),
  industry: z.string().optional(),
  listedShares: z.number().optional(),
  marketCap: z.number().optional(),
  freeFloat: z.number().optional()
});

const SSIRealTimePriceSchema = z.object({
  symbol: z.string(),
  price: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number().optional(),
  volume: z.number(),
  value: z.number(),
  change: z.number(),
  changePercent: z.number(),
  refPrice: z.number(),
  ceiling: z.number(),
  floor: z.number(),
  timestamp: z.number()
});

const SSIOrderBookSchema = z.object({
  symbol: z.string(),
  bidPrices: z.array(z.number()),
  bidVolumes: z.array(z.number()),
  askPrices: z.array(z.number()),
  askVolumes: z.array(z.number()),
  timestamp: z.number()
});

const SSITradeTickSchema = z.object({
  symbol: z.string(),
  price: z.number(),
  volume: z.number(),
  value: z.number(),
  side: z.enum(['B', 'S']).optional(),
  timestamp: z.number()
});

export class SSIClient extends BaseApiClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    const config = {
      baseUrl: 'https://iboard.ssi.com.vn',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      rateLimit: {
        requestsPerSecond: 15,
        requestsPerMinute: 900,
        requestsPerHour: 54000
      },
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'VN-Stock-Insights/1.0.0',
        'Content-Type': 'application/json'
      }
    };

    super(config, DataSourceType.SSI);
    this.apiKey = apiKey || process.env.SSI_API_KEY || '';
    
    if (this.apiKey) {
      this.config.headers = {
        ...this.config.headers,
        'Authorization': `Bearer ${this.apiKey}`
      };
    }
  }

  async getStockInfo(stockCode: string): Promise<ApiResponse<StockInfo>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/api/v1/stock-info/${stockCode.toUpperCase()}`;
        const response = await this.makeRequest(url, {}, SSIStockInfoSchema);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch stock info from SSI');
        }

        // Transform SSI data to our standard format
        const transformResult = await globalTransformationPipeline.transformData<StockInfo>(
          'ssi_stock_info',
          response.data
        );

        return {
          ...response,
          data: transformResult.data
        };
      },
      { source: 'SSIClient', requestId: this.generateRequestId() }
    );
  }

  async getRealTimePrice(stockCode: string): Promise<ApiResponse<RealTimePrice>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/api/v1/realtime/${stockCode.toUpperCase()}`;
        const response = await this.makeRequest(url, {}, SSIRealTimePriceSchema);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch real-time price from SSI');
        }

        // Transform to standard format
        const transformResult = await globalTransformationPipeline.transformData<RealTimePrice>(
          'ssi_realtime_price',
          response.data
        );

        return {
          ...response,
          data: transformResult.data
        };
      },
      { source: 'SSIClient', requestId: this.generateRequestId() }
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
        const url = `${this.config.baseUrl}/api/v1/historical/${stockCode.toUpperCase()}?from=${start}&to=${end}`;
        
        const response = await this.makeRequest(url);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch historical prices from SSI');
        }

        // Transform array of price data
        const transformedData: StockPrice[] = [];
        for (const item of response.data) {
          const transformResult = await globalTransformationPipeline.transformData<StockPrice>(
            'ssi_stock_price',
            item
          );
          transformedData.push(transformResult.data);
        }

        return {
          ...response,
          data: transformedData
        };
      },
      { source: 'SSIClient', requestId: this.generateRequestId() }
    );
  }

  async getOrderBook(stockCode: string): Promise<ApiResponse<OrderBook>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/api/v1/orderbook/${stockCode.toUpperCase()}`;
        const response = await this.makeRequest(url, {}, SSIOrderBookSchema);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch order book from SSI');
        }

        // Transform to standard format
        const transformResult = await globalTransformationPipeline.transformData<OrderBook>(
          'ssi_order_book',
          response.data
        );

        return {
          ...response,
          data: transformResult.data
        };
      },
      { source: 'SSIClient', requestId: this.generateRequestId() }
    );
  }

  async getTradeTicks(stockCode: string, limit: number = 100): Promise<ApiResponse<TradeTick[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/api/v1/trades/${stockCode.toUpperCase()}?limit=${limit}`;
        const response = await this.makeRequest(url);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch trade ticks from SSI');
        }

        // Transform array of trade tick data
        const transformedData: TradeTick[] = [];
        for (const item of response.data) {
          const transformResult = await globalTransformationPipeline.transformData<TradeTick>(
            'ssi_trade_tick',
            item
          );
          transformedData.push(transformResult.data);
        }

        return {
          ...response,
          data: transformedData
        };
      },
      { source: 'SSIClient', requestId: this.generateRequestId() }
    );
  }

  async getFinancialReport(
    stockCode: string, 
    year: number, 
    quarter?: number
  ): Promise<ApiResponse<ComprehensiveFinancialReport>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        let url = `${this.config.baseUrl}/api/v1/financial/${stockCode.toUpperCase()}?year=${year}`;
        if (quarter) {
          url += `&quarter=${quarter}`;
        }
        
        const response = await this.makeRequest(url);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch financial report from SSI');
        }

        // Transform financial data
        const transformResult = await globalTransformationPipeline.transformData<ComprehensiveFinancialReport>(
          'ssi_financial',
          response.data
        );

        return {
          ...response,
          data: transformResult.data
        };
      },
      { source: 'SSIClient', requestId: this.generateRequestId() }
    );
  }

  async getMarketIndex(indexCode: string): Promise<ApiResponse<MarketIndex>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/api/v1/index/${indexCode.toUpperCase()}`;
        const response = await this.makeRequest(url);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch market index from SSI');
        }

        // Transform index data
        const transformResult = await globalTransformationPipeline.transformData<MarketIndex>(
          'ssi_market_index',
          response.data
        );

        return {
          ...response,
          data: transformResult.data
        };
      },
      { source: 'SSIClient', requestId: this.generateRequestId() }
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

  // SSI specific methods
  async getMarketOverview(): Promise<ApiResponse<any>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/api/v1/market/overview`;
        return this.makeRequest(url);
      },
      { source: 'SSIClient', requestId: this.generateRequestId() }
    );
  }

  async getTopMovers(type: 'gainers' | 'losers' | 'volume'): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/api/v1/market/top-movers?type=${type}`;
        return this.makeRequest(url);
      },
      { source: 'SSIClient', requestId: this.generateRequestId() }
    );
  }

  async getForeignTradingData(stockCode?: string): Promise<ApiResponse<any>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        let url = `${this.config.baseUrl}/api/v1/foreign-trading`;
        if (stockCode) {
          url += `/${stockCode.toUpperCase()}`;
        }
        return this.makeRequest(url);
      },
      { source: 'SSIClient', requestId: this.generateRequestId() }
    );
  }

  async getDerivativesData(): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/api/v1/derivatives`;
        return this.makeRequest(url);
      },
      { source: 'SSIClient', requestId: this.generateRequestId() }
    );
  }

  async getBondData(): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/api/v1/bonds`;
        return this.makeRequest(url);
      },
      { source: 'SSIClient', requestId: this.generateRequestId() }
    );
  }

  async getWarrantData(): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/api/v1/warrants`;
        return this.makeRequest(url);
      },
      { source: 'SSIClient', requestId: this.generateRequestId() }
    );
  }

  async getETFData(): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/api/v1/etf`;
        return this.makeRequest(url);
      },
      { source: 'SSIClient', requestId: this.generateRequestId() }
    );
  }

  async getIndustryData(): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/api/v1/industries`;
        return this.makeRequest(url);
      },
      { source: 'SSIClient', requestId: this.generateRequestId() }
    );
  }

  // Helper method to generate request ID
  private generateRequestId(): string {
    return `ssi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Method to get supported features
  public getSupportedFeatures(): string[] {
    return [
      'stockInfo',
      'realTimePrice',
      'historicalPrice',
      'orderBook',
      'tradeTicks',
      'financialReports',
      'marketIndex',
      'marketOverview',
      'topMovers',
      'foreignTrading',
      'derivatives',
      'bonds',
      'warrants',
      'etf',
      'industries'
    ];
  }

  // Method to check if a feature is supported
  public supportsFeature(feature: string): boolean {
    return this.getSupportedFeatures().includes(feature);
  }

  // Method to update API key
  public updateApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.config.headers = {
      ...this.config.headers,
      'Authorization': `Bearer ${apiKey}`
    };
  }
}

// Export singleton instance
export const ssiClient = new SSIClient();
