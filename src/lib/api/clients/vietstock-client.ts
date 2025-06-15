/**
 * @fileOverview VietStock API Client - Tích hợp với vietstock.vn
 * Cung cấp phân tích kỹ thuật, thông tin cổ phiếu và báo cáo tài chính
 */

import { z } from 'zod';
import { BaseApiClient, DataSourceType, ApiResponse } from '../base-client';
import { globalErrorHandler } from '../error-handler';
import { globalTransformationPipeline } from '../../transformation/data-transformer';
import type { StockInfo, StockPrice } from '@/types/stock';
import type { RealTimePrice, OrderBook, TradeTick, MarketIndex } from '@/types/market';
import type { ComprehensiveFinancialReport } from '@/types/financial';

// VietStock specific response schemas
const VietStockStockInfoSchema = z.object({
  ticker: z.string(),
  companyName: z.string(),
  exchange: z.string(),
  industry: z.string().optional(),
  marketCap: z.number().optional(),
  outstandingShares: z.number().optional(),
  eps: z.number().optional(),
  pe: z.number().optional(),
  pb: z.number().optional()
});

const VietStockPriceSchema = z.object({
  ticker: z.string(),
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

const VietStockFinancialSchema = z.object({
  ticker: z.string(),
  year: z.number(),
  quarter: z.number().optional(),
  reportType: z.string(),
  balanceSheet: z.record(z.any()).optional(),
  incomeStatement: z.record(z.any()).optional(),
  cashFlow: z.record(z.any()).optional()
});

const VietStockTechnicalSchema = z.object({
  ticker: z.string(),
  indicators: z.record(z.any()),
  signals: z.array(z.string()).optional(),
  recommendation: z.string().optional(),
  supportLevels: z.array(z.number()).optional(),
  resistanceLevels: z.array(z.number()).optional()
});

export class VietStockClient extends BaseApiClient {
  constructor() {
    const config = {
      baseUrl: 'https://api.vietstock.vn',
      timeout: 35000,
      retryAttempts: 3,
      retryDelay: 2000,
      rateLimit: {
        requestsPerSecond: 5,
        requestsPerMinute: 300,
        requestsPerHour: 18000
      },
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'VN-Stock-Insights/1.0.0',
        'Content-Type': 'application/json'
      }
    };

    super(config, DataSourceType.VIETSTOCK);
  }

  async getStockInfo(stockCode: string): Promise<ApiResponse<StockInfo>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/finance/stock_info/${stockCode.toUpperCase()}`;
        const response = await this.makeRequest(url, {}, VietStockStockInfoSchema);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch stock info from VietStock');
        }

        // Transform VietStock data to our standard format
        const transformResult = await globalTransformationPipeline.transformData<StockInfo>(
          'vietstock_stock_info',
          response.data
        );

        return {
          ...response,
          data: transformResult.data
        };
      },
      { source: 'VietStockClient', requestId: this.generateRequestId() }
    );
  }

  async getRealTimePrice(stockCode: string): Promise<ApiResponse<RealTimePrice>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/finance/sip_realtime/${stockCode.toUpperCase()}`;
        const response = await this.makeRequest(url);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch real-time price from VietStock');
        }

        // Transform to standard format
        const transformResult = await globalTransformationPipeline.transformData<RealTimePrice>(
          'vietstock_realtime_price',
          response.data
        );

        return {
          ...response,
          data: transformResult.data
        };
      },
      { source: 'VietStockClient', requestId: this.generateRequestId() }
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
        const url = `${this.config.baseUrl}/finance/historical_price/${stockCode.toUpperCase()}?startDate=${start}&endDate=${end}`;
        
        const response = await this.makeRequest(url);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch historical prices from VietStock');
        }

        // Transform array of price data
        const transformedData: StockPrice[] = [];
        for (const item of response.data) {
          const transformResult = await globalTransformationPipeline.transformData<StockPrice>(
            'vietstock_stock_price',
            item
          );
          transformedData.push(transformResult.data);
        }

        return {
          ...response,
          data: transformedData
        };
      },
      { source: 'VietStockClient', requestId: this.generateRequestId() }
    );
  }

  async getOrderBook(stockCode: string): Promise<ApiResponse<OrderBook>> {
    // VietStock doesn't provide order book data
    throw new Error('Order book data not available from VietStock');
  }

  async getTradeTicks(stockCode: string, limit?: number): Promise<ApiResponse<TradeTick[]>> {
    // VietStock doesn't provide trade tick data
    throw new Error('Trade tick data not available from VietStock');
  }

  async getFinancialReport(
    stockCode: string, 
    year: number, 
    quarter?: number
  ): Promise<ApiResponse<ComprehensiveFinancialReport>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        let url = `${this.config.baseUrl}/finance/financial_statement/${stockCode.toUpperCase()}?year=${year}`;
        if (quarter) {
          url += `&quarter=${quarter}`;
        }
        
        const response = await this.makeRequest(url, {}, VietStockFinancialSchema);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch financial report from VietStock');
        }

        // Transform financial data
        const transformResult = await globalTransformationPipeline.transformData<ComprehensiveFinancialReport>(
          'vietstock_financial',
          response.data
        );

        return {
          ...response,
          data: transformResult.data
        };
      },
      { source: 'VietStockClient', requestId: this.generateRequestId() }
    );
  }

  async getMarketIndex(indexCode: string): Promise<ApiResponse<MarketIndex>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/finance/market_index/${indexCode.toUpperCase()}`;
        const response = await this.makeRequest(url);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch market index from VietStock');
        }

        // Transform index data
        const transformResult = await globalTransformationPipeline.transformData<MarketIndex>(
          'vietstock_market_index',
          response.data
        );

        return {
          ...response,
          data: transformResult.data
        };
      },
      { source: 'VietStockClient', requestId: this.generateRequestId() }
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

  // VietStock specific methods
  async getTechnicalAnalysis(stockCode: string): Promise<ApiResponse<any>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/finance/technical_analysis/${stockCode.toUpperCase()}`;
        return this.makeRequest(url, {}, VietStockTechnicalSchema);
      },
      { source: 'VietStockClient', requestId: this.generateRequestId() }
    );
  }

  async getFinancialRatios(stockCode: string): Promise<ApiResponse<any>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/finance/financial_ratios/${stockCode.toUpperCase()}`;
        return this.makeRequest(url);
      },
      { source: 'VietStockClient', requestId: this.generateRequestId() }
    );
  }

  async getValuation(stockCode: string): Promise<ApiResponse<any>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/finance/valuation/${stockCode.toUpperCase()}`;
        return this.makeRequest(url);
      },
      { source: 'VietStockClient', requestId: this.generateRequestId() }
    );
  }

  async getNews(stockCode: string, limit: number = 20): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/finance/news/${stockCode.toUpperCase()}?limit=${limit}`;
        return this.makeRequest(url);
      },
      { source: 'VietStockClient', requestId: this.generateRequestId() }
    );
  }

  async getIndustryAnalysis(industryCode: string): Promise<ApiResponse<any>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/finance/industry_analysis/${industryCode}`;
        return this.makeRequest(url);
      },
      { source: 'VietStockClient', requestId: this.generateRequestId() }
    );
  }

  async getPeerComparison(stockCode: string): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/finance/peer_comparison/${stockCode.toUpperCase()}`;
        return this.makeRequest(url);
      },
      { source: 'VietStockClient', requestId: this.generateRequestId() }
    );
  }

  async getOwnershipStructure(stockCode: string): Promise<ApiResponse<any>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/finance/ownership/${stockCode.toUpperCase()}`;
        return this.makeRequest(url);
      },
      { source: 'VietStockClient', requestId: this.generateRequestId() }
    );
  }

  async getDividendHistory(stockCode: string): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/finance/dividend_history/${stockCode.toUpperCase()}`;
        return this.makeRequest(url);
      },
      { source: 'VietStockClient', requestId: this.generateRequestId() }
    );
  }

  async getScreener(criteria: Record<string, any>): Promise<ApiResponse<any[]>> {
    return globalErrorHandler.handleWithRetry(
      async () => {
        const url = `${this.config.baseUrl}/finance/screener`;
        const response = await this.makeRequest(url, {
          method: 'POST',
          body: JSON.stringify(criteria)
        });
        return response;
      },
      { source: 'VietStockClient', requestId: this.generateRequestId() }
    );
  }

  // Helper method to generate request ID
  protected generateRequestId(): string {
    return `vietstock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Method to get supported features
  public getSupportedFeatures(): string[] {
    return [
      'stockInfo',
      'realTimePrice',
      'historicalPrice',
      'financialReports',
      'marketIndex',
      'technicalAnalysis',
      'financialRatios',
      'valuation',
      'news',
      'industryAnalysis',
      'peerComparison',
      'ownershipStructure',
      'dividendHistory',
      'screener'
    ];
  }

  // Method to check if a feature is supported
  public supportsFeature(feature: string): boolean {
    return this.getSupportedFeatures().includes(feature);
  }
}

// Export singleton instance
export const vietStockClient = new VietStockClient();
