import {
  DataSourceType,
  StockData,
  MarketData,
  CompanyInfo,
  FinancialData,
  AnalysisRequest,
  AnalysisResult,
  ProviderHealth
} from "../types/index.js";
import type { BaseApiClient } from "@/lib/api/base-client.js";
import { ssiClient } from "@/lib/api/clients/ssi-client.js";
import { vietStockClient } from "@/lib/api/clients/vietstock-client.js";
import { cafeFClient } from "@/lib/api/clients/cafef-client.js";
import { fireAntClient } from "@/lib/api/clients/fireant-client.js";
import { ConfigManager } from "./config-manager.js";
import { CacheManager } from "./cache-manager.js";

export class DataProviderManager {
  private configManager: ConfigManager;
  private cacheManager: CacheManager;
  private providerHealth: Map<DataSourceType, ProviderHealth> = new Map();
  private rateLimiters: Map<DataSourceType, RateLimiter> = new Map();
  private apiClients: Map<DataSourceType, BaseApiClient> = new Map();

  constructor(configManager: ConfigManager, cacheManager: CacheManager) {
    this.configManager = configManager;
    this.cacheManager = cacheManager;
    this.initializeProviders();
  }

  private initializeProviders(): void {
    const providers = this.configManager.getAllDataProviderConfigs();

    for (const provider of providers) {
      // Initialize rate limiter for each provider
      this.rateLimiters.set(provider.type, new RateLimiter(provider.rateLimit));

      // Map provider type to existing API client
      switch (provider.type) {
        case DataSourceType.SSI:
          this.apiClients.set(provider.type, ssiClient);
          break;
        case DataSourceType.VIETSTOCK:
          this.apiClients.set(provider.type, vietStockClient);
          break;
        case DataSourceType.CAFEF:
          this.apiClients.set(provider.type, cafeFClient);
          break;
        case DataSourceType.FIREANT:
          this.apiClients.set(provider.type, fireAntClient);
          break;
        default:
          break;
      }

      // Initialize health status
      this.providerHealth.set(provider.type, {
        status: 'healthy',
        responseTime: 0,
        errorRate: 0,
        lastCheck: new Date(),
        consecutiveFailures: 0
      });
    }
  }

  async getStockData(symbol: string): Promise<StockData> {
    // Check cache first
    const cached = await this.cacheManager.getStockPrice(symbol);
    if (cached) {
      return cached;
    }

    // Try providers in priority order with failover
    const providers = this.getHealthyProviders();
    
    for (const providerType of providers) {
      try {
        await this.checkRateLimit(providerType);
        
        const startTime = Date.now();
        const data = await this.fetchStockDataFromProvider(symbol, providerType);
        const responseTime = Date.now() - startTime;
        
        // Update provider health
        this.updateProviderHealth(providerType, true, responseTime);
        
        // Cache the result
        await this.cacheManager.setStockPrice(symbol, data);
        
        return data;
      } catch (error) {
        console.warn(`Provider ${providerType} failed for stock ${symbol}:`, error.message);
        this.updateProviderHealth(providerType, false);
        continue;
      }
    }

    throw new Error(`Failed to fetch stock data for ${symbol} from all providers`);
  }

  async getFinancialData(symbol: string, period?: string): Promise<FinancialData> {
    // Check cache first
    const cached = await this.cacheManager.getFinancialData(symbol, period);
    if (cached) {
      return cached;
    }

    const providers = this.getHealthyProviders();
    
    for (const providerType of providers) {
      try {
        await this.checkRateLimit(providerType);
        
        const data = await this.fetchFinancialDataFromProvider(symbol, providerType, period);
        
        // Cache the result
        await this.cacheManager.setFinancialData(symbol, data, period);
        
        return data;
      } catch (error) {
        console.warn(`Provider ${providerType} failed for financial data ${symbol}:`, error.message);
        continue;
      }
    }

    throw new Error(`Failed to fetch financial data for ${symbol} from all providers`);
  }

  async getMarketData(index: string): Promise<MarketData> {
    // Check cache first
    const cached = await this.cacheManager.getMarketData(index);
    if (cached) {
      return cached;
    }

    const providers = this.getHealthyProviders();
    
    for (const providerType of providers) {
      try {
        await this.checkRateLimit(providerType);
        
        const data = await this.fetchMarketDataFromProvider(index, providerType);
        
        // Cache the result
        await this.cacheManager.setMarketData(index, data);
        
        return data;
      } catch (error) {
        console.warn(`Provider ${providerType} failed for market data ${index}:`, error.message);
        continue;
      }
    }

    throw new Error(`Failed to fetch market data for ${index} from all providers`);
  }

  async getStockNews(symbol: string, limit: number = 10): Promise<any[]> {
    // Check cache first
    const cached = await this.cacheManager.getNews(symbol, 'company');
    if (cached) {
      return cached;
    }

    const providers = this.getHealthyProviders();
    
    for (const providerType of providers) {
      try {
        await this.checkRateLimit(providerType);
        
        const data = await this.fetchNewsFromProvider(symbol, providerType, limit);
        
        // Cache the result
        await this.cacheManager.setNews(data, symbol, 'company');
        
        return data;
      } catch (error) {
        console.warn(`Provider ${providerType} failed for news ${symbol}:`, error.message);
        continue;
      }
    }

    throw new Error(`Failed to fetch news for ${symbol} from all providers`);
  }

  async getSectorData(sector: string): Promise<any> {
    const providers = this.getHealthyProviders();
    
    for (const providerType of providers) {
      try {
        await this.checkRateLimit(providerType);
        
        const data = await this.fetchSectorDataFromProvider(sector, providerType);
        return data;
      } catch (error) {
        console.warn(`Provider ${providerType} failed for sector ${sector}:`, error.message);
        continue;
      }
    }

    throw new Error(`Failed to fetch sector data for ${sector} from all providers`);
  }

  async getAnalysis(symbol: string, type: string): Promise<AnalysisResult> {
    // Check cache first
    const cached = await this.cacheManager.getAnalysis(symbol, type);
    if (cached) {
      return cached;
    }

    const providers = this.getHealthyProviders();
    
    for (const providerType of providers) {
      try {
        await this.checkRateLimit(providerType);
        
        const data = await this.fetchAnalysisFromProvider(symbol, type, providerType);
        
        // Cache the result
        await this.cacheManager.setAnalysis(symbol, type, data);
        
        return data;
      } catch (error) {
        console.warn(`Provider ${providerType} failed for analysis ${symbol}:`, error.message);
        continue;
      }
    }

    throw new Error(`Failed to fetch analysis for ${symbol} from all providers`);
  }

  private getHealthyProviders(): DataSourceType[] {
    return this.configManager.getAllDataProviderConfigs()
      .filter(config => {
        const health = this.providerHealth.get(config.type);
        return health && health.status !== 'unhealthy';
      })
      .sort((a, b) => {
        const healthA = this.providerHealth.get(a.type)!;
        const healthB = this.providerHealth.get(b.type)!;
        
        // Sort by health status first, then by priority
        if (healthA.status !== healthB.status) {
          const statusOrder = { 'healthy': 0, 'degraded': 1, 'unhealthy': 2 };
          return statusOrder[healthA.status] - statusOrder[healthB.status];
        }
        
        return a.priority - b.priority;
      })
      .map(config => config.type);
  }

  private async checkRateLimit(providerType: DataSourceType): Promise<void> {
    const rateLimiter = this.rateLimiters.get(providerType);
    if (rateLimiter && !rateLimiter.canMakeRequest()) {
      throw new Error(`Rate limit exceeded for provider ${providerType}`);
    }
  }

  private updateProviderHealth(
    providerType: DataSourceType, 
    success: boolean, 
    responseTime?: number
  ): void {
    const health = this.providerHealth.get(providerType);
    if (!health) return;

    if (success) {
      health.consecutiveFailures = 0;
      health.responseTime = responseTime || 0;
      health.status = responseTime && responseTime > 2000 ? 'degraded' : 'healthy';
    } else {
      health.consecutiveFailures++;
      if (health.consecutiveFailures >= 3) {
        health.status = 'unhealthy';
      } else if (health.consecutiveFailures >= 1) {
        health.status = 'degraded';
      }
    }

    health.lastCheck = new Date();
    this.providerHealth.set(providerType, health);
  }

  // Provider-specific data fetching methods (to be implemented)
  private async fetchStockDataFromProvider(symbol: string, provider: DataSourceType): Promise<StockData> {
    const client = this.apiClients.get(provider);
    if (!client || typeof (client as any).getRealTimePrice !== 'function') {
      throw new Error(`No client available for provider ${provider}`);
    }

    const response = await (client as any).getRealTimePrice(symbol);
    if (!response.success) {
      throw new Error(response.error || `Failed to fetch stock data from ${provider}`);
    }

    const price = response.data;

    return {
      symbol: price.stockCode,
      exchange: (price as any).exchange || 'HOSE',
      price: price.currentPrice,
      open: price.openPrice,
      high: price.highPrice,
      low: price.lowPrice,
      close: price.closePrice ?? price.currentPrice,
      volume: price.volume,
      value: price.value,
      change: price.priceChange,
      changePercent: price.priceChangePercent,
      timestamp: price.timestamp,
      source: provider
    };
  }

  private async fetchFinancialDataFromProvider(
    symbol: string,
    provider: DataSourceType,
    period?: string
  ): Promise<FinancialData> {
    const client = this.apiClients.get(provider);
    if (!client || typeof (client as any).getFinancialReport !== 'function') {
      throw new Error(`No client available for provider ${provider}`);
    }

    const year = new Date().getFullYear();
    const quarter = period && period !== 'FY' ? parseInt(period.replace('Q', '')) : undefined;
    const response = await (client as any).getFinancialReport(symbol, year, quarter);

    if (!response.success) {
      throw new Error(response.error || `Failed to fetch financial data from ${provider}`);
    }

    const report = response.data;
    const income = report.incomeStatement || {};
    const balance = report.balanceSheet || {};

    const totalEquity = balance.totalEquity || 0;
    const totalAssets = balance.totalAssets || 0;
    const netIncome = income.netProfit || 0;

    return {
      symbol: report.stockCode,
      period: (period as any) || 'FY',
      year: report.year,
      revenue: income.revenue || 0,
      netIncome,
      totalAssets,
      totalEquity,
      eps: income.basicEPS || 0,
      roe: totalEquity ? netIncome / totalEquity : 0,
      roa: totalAssets ? netIncome / totalAssets : 0,
      debtToEquity: totalEquity ? (balance.totalLiabilities || 0) / totalEquity : 0,
      currentRatio: 0,
      source: provider,
      reportDate: report.updatedAt || new Date()
    };
  }

  private async fetchMarketDataFromProvider(index: string, provider: DataSourceType): Promise<MarketData> {
    const client = this.apiClients.get(provider);
    if (!client || typeof (client as any).getMarketIndex !== 'function') {
      throw new Error(`No client available for provider ${provider}`);
    }

    const response = await (client as any).getMarketIndex(index);
    if (!response.success) {
      throw new Error(response.error || `Failed to fetch market data from ${provider}`);
    }

    const data = response.data;

    return {
      index: data.indexCode,
      value: data.value,
      change: data.change,
      changePercent: data.changePercent,
      volume: data.totalVolume,
      timestamp: data.timestamp,
      source: provider
    };
  }

  private async fetchNewsFromProvider(symbol: string, provider: DataSourceType, limit: number): Promise<any[]> {
    const client = this.apiClients.get(provider);
    if (!client || typeof (client as any).getNews !== 'function') {
      throw new Error(`No client available for provider ${provider}`);
    }

    const response = await (client as any).getNews(symbol, limit);
    if (!response.success) {
      throw new Error(response.error || `Failed to fetch news from ${provider}`);
    }

    return response.data;
  }

  private async fetchSectorDataFromProvider(sector: string, provider: DataSourceType): Promise<any> {
    const client = this.apiClients.get(provider);
    if (!client || typeof (client as any).getIndustryAnalysis !== 'function') {
      throw new Error(`No client available for provider ${provider}`);
    }

    const response = await (client as any).getIndustryAnalysis(sector);
    if (!response.success) {
      throw new Error(response.error || `Failed to fetch sector data from ${provider}`);
    }

    return response.data;
  }

  private async fetchAnalysisFromProvider(
    symbol: string,
    type: string,
    provider: DataSourceType
  ): Promise<AnalysisResult> {
    const client = this.apiClients.get(provider);
    if (!client || typeof (client as any).getTechnicalAnalysis !== 'function') {
      throw new Error(`No client available for provider ${provider}`);
    }

    const response = await (client as any).getTechnicalAnalysis(symbol);
    if (!response.success) {
      throw new Error(response.error || `Failed to fetch analysis from ${provider}`);
    }

    const data = response.data;

    return {
      symbol,
      analysisType: type,
      recommendation: data.recommendation || 'HOLD',
      confidence: data.confidence || 0.5,
      summary: data.signals ? data.signals.join(', ') : '',
      details: data,
      timestamp: new Date(),
      sources: [provider]
    };
  }

  getProviderHealth(): Map<DataSourceType, ProviderHealth> {
    return new Map(this.providerHealth);
  }

  async healthCheck(): Promise<void> {
    const providers = this.configManager.getAllDataProviderConfigs();
    
    for (const provider of providers) {
      try {
        const startTime = Date.now();
        // Perform a lightweight health check request
        await this.performHealthCheck(provider.type);
        const responseTime = Date.now() - startTime;
        
        this.updateProviderHealth(provider.type, true, responseTime);
      } catch (error) {
        this.updateProviderHealth(provider.type, false);
      }
    }
  }

  private async performHealthCheck(provider: DataSourceType): Promise<void> {
    // Implement lightweight health check for each provider
    // For now, just simulate
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
  }
}

class RateLimiter {
  private requests: number[] = [];
  private requestsPerSecond: number;
  private requestsPerMinute: number;
  private requestsPerHour: number;

  constructor(config: { requestsPerSecond: number; requestsPerMinute: number; requestsPerHour: number }) {
    this.requestsPerSecond = config.requestsPerSecond;
    this.requestsPerMinute = config.requestsPerMinute;
    this.requestsPerHour = config.requestsPerHour;
  }

  canMakeRequest(): boolean {
    const now = Date.now();
    
    // Clean old requests
    this.requests = this.requests.filter(time => now - time < 3600000); // Keep last hour
    
    // Check limits
    const lastSecond = this.requests.filter(time => now - time < 1000).length;
    const lastMinute = this.requests.filter(time => now - time < 60000).length;
    const lastHour = this.requests.length;
    
    if (lastSecond >= this.requestsPerSecond ||
        lastMinute >= this.requestsPerMinute ||
        lastHour >= this.requestsPerHour) {
      return false;
    }
    
    this.requests.push(now);
    return true;
  }
}
