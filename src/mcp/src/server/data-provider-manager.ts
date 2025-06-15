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
import { ConfigManager } from "./config-manager.js";
import { CacheManager } from "./cache-manager.js";

export class DataProviderManager {
  private configManager: ConfigManager;
  private cacheManager: CacheManager;
  private providerHealth: Map<DataSourceType, ProviderHealth> = new Map();
  private rateLimiters: Map<DataSourceType, RateLimiter> = new Map();

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
    // This would integrate with existing API clients
    // For now, return mock data
    return {
      symbol,
      exchange: 'HOSE',
      price: 100000,
      open: 98000,
      high: 102000,
      low: 97000,
      close: 100000,
      volume: 1000000,
      value: 100000000000,
      change: 2000,
      changePercent: 2.04,
      timestamp: new Date(),
      source: provider
    };
  }

  private async fetchFinancialDataFromProvider(
    symbol: string, 
    provider: DataSourceType, 
    period?: string
  ): Promise<FinancialData> {
    // Mock implementation
    return {
      symbol,
      period: (period as any) || 'Q4',
      year: 2024,
      revenue: 1000000000,
      netIncome: 100000000,
      totalAssets: 5000000000,
      totalEquity: 2000000000,
      eps: 5000,
      roe: 0.15,
      roa: 0.08,
      debtToEquity: 1.5,
      currentRatio: 1.2,
      source: provider,
      reportDate: new Date()
    };
  }

  private async fetchMarketDataFromProvider(index: string, provider: DataSourceType): Promise<MarketData> {
    // Mock implementation
    return {
      index,
      value: 1200,
      change: 15.5,
      changePercent: 1.31,
      volume: 500000000,
      timestamp: new Date(),
      source: provider
    };
  }

  private async fetchNewsFromProvider(symbol: string, provider: DataSourceType, limit: number): Promise<any[]> {
    // Mock implementation
    return [
      {
        title: `${symbol} reports strong quarterly results`,
        content: "Company shows strong performance...",
        timestamp: new Date(),
        source: provider
      }
    ];
  }

  private async fetchSectorDataFromProvider(sector: string, provider: DataSourceType): Promise<any> {
    // Mock implementation
    return {
      sector,
      performance: 2.5,
      topStocks: ['VCB', 'VIC', 'VHM'],
      source: provider
    };
  }

  private async fetchAnalysisFromProvider(
    symbol: string, 
    type: string, 
    provider: DataSourceType
  ): Promise<AnalysisResult> {
    // Mock implementation
    return {
      symbol,
      analysisType: type,
      recommendation: 'BUY',
      confidence: 0.85,
      summary: `${type} analysis suggests positive outlook for ${symbol}`,
      details: {
        technicalIndicators: {},
        fundamentalMetrics: {},
        marketSentiment: 'positive'
      },
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
