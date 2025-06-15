# Vietnamese Stock Data Provider Integration Plan

## Overview

This document outlines the comprehensive integration strategy for Vietnamese stock market data providers within the MCP server architecture. The plan covers authentication, rate limiting, data normalization, and failover mechanisms for multiple data sources.

## Data Provider Analysis

### 1. SSI (Saigon Securities Inc.) - Primary Provider

#### Current Integration Status
- **Status**: Already implemented in existing codebase
- **API Type**: REST API with potential WebSocket support
- **Authentication**: Bearer token authentication
- **Base URL**: `https://iboard.ssi.com.vn`

#### Capabilities
- Real-time stock prices
- Historical price data
- Order book information
- Trade ticks
- Financial reports
- Market indices
- Derivatives data
- Foreign trading data
- Industry analysis

#### Rate Limits
- **Current Config**: 15 requests/second, 900/minute, 54,000/hour
- **Enhancement Needed**: Dynamic rate limiting based on subscription tier

#### MCP Integration Strategy
```typescript
interface SSIMCPClient extends BaseApiClient {
  // Enhanced methods for MCP
  getRealtimeStream(symbols: string[]): WebSocketConnection
  getMarketDepth(symbol: string, levels: number): Promise<OrderBookDepth>
  getIntradayChart(symbol: string, interval: string): Promise<ChartData>
  
  // Subscription management
  subscribeToPrice(symbol: string, callback: PriceUpdateCallback): void
  subscribeToNews(symbol: string, callback: NewsUpdateCallback): void
}
```

### 2. vnstock - Python Library Integration

#### Current Status
- **Status**: Not integrated (Python library)
- **Integration Method**: HTTP API wrapper or Python subprocess
- **Data Sources**: TCBS, SSI, VCI
- **Authentication**: No API key required (uses public endpoints)

#### Capabilities
- Historical stock data
- Company financial information
- Market indices
- Fundamental analysis data
- Technical indicators
- Stock screening
- International market data

#### Integration Approach
```typescript
interface VnStockAdapter {
  // Wrapper for vnstock Python library
  executeVnStockCommand(command: string, params: any): Promise<any>
  
  // Core methods
  getHistoricalData(symbol: string, period: string): Promise<HistoricalData>
  getCompanyInfo(symbol: string): Promise<CompanyProfile>
  getFinancialRatios(symbol: string): Promise<FinancialRatios>
  screenStocks(criteria: ScreeningCriteria): Promise<StockList>
}
```

#### Implementation Strategy
1. **Option A**: HTTP API Bridge
   - Create Express.js service that wraps vnstock Python library
   - Deploy as microservice with REST endpoints
   - Handle Python environment and dependencies

2. **Option B**: Direct Integration
   - Use child_process to execute Python scripts
   - Parse JSON output from vnstock commands
   - Handle error cases and timeouts

### 3. APEC Investment Corporation APIs

#### Research Findings
- **Status**: Limited public API information available
- **Company**: Asia-Pacific Investment Joint Stock Company
- **Focus**: Real estate development and investment data
- **Integration**: Requires direct contact for API access

#### Potential Capabilities
- Investment analysis data
- Market research reports
- Real estate market insights
- Economic indicators
- Investment recommendations

#### Integration Plan
```typescript
interface APECClient extends BaseApiClient {
  // Investment data
  getInvestmentAnalysis(symbol: string): Promise<InvestmentAnalysis>
  getMarketResearch(sector: string): Promise<ResearchReport>
  getEconomicIndicators(): Promise<EconomicData>
  
  // Research reports
  getAnalystRecommendations(symbol: string): Promise<AnalystReport[]>
  getIndustryAnalysis(industry: string): Promise<IndustryReport>
}
```

### 4. Additional Vietnamese Data Providers

#### VietStock (Enhanced Integration)
- **Current**: Basic implementation exists
- **Enhancement**: Add real-time features, technical analysis
- **API**: REST API with potential premium features

#### CafeF (Enhanced Integration)
- **Current**: News and market data integration exists
- **Enhancement**: Add more comprehensive financial data
- **API**: Web scraping with potential API access

#### FireAnt (Enhanced Integration)
- **Current**: Financial reports integration exists
- **Enhancement**: Add real-time market data
- **API**: REST API for financial data

#### New Providers to Consider
1. **FiinTrade**: Professional trading platform
2. **StockBiz**: Market analysis and data
3. **VnDirect**: Securities company API
4. **HSC (Ho Chi Minh Securities)**: Trading and data API

## Data Normalization Strategy

### Unified Data Schema

#### Stock Price Data
```typescript
interface NormalizedStockPrice {
  symbol: string
  exchange: 'HOSE' | 'HNX' | 'UPCOM'
  price: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  value: number
  change: number
  changePercent: number
  timestamp: Date
  source: DataSourceType
}
```

#### Company Information
```typescript
interface NormalizedCompanyInfo {
  symbol: string
  companyName: string
  englishName?: string
  exchange: string
  industry: string
  sector: string
  marketCap: number
  listedShares: number
  freeFloat?: number
  establishedDate?: Date
  listingDate?: Date
  website?: string
  description?: string
  source: DataSourceType
}
```

#### Financial Data
```typescript
interface NormalizedFinancialData {
  symbol: string
  period: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'FY'
  year: number
  revenue: number
  netIncome: number
  totalAssets: number
  totalEquity: number
  eps: number
  roe: number
  roa: number
  debtToEquity: number
  currentRatio: number
  source: DataSourceType
  reportDate: Date
}
```

### Data Transformation Pipeline

```typescript
class VietnameseDataTransformer {
  // Provider-specific transformers
  private transformers: Map<DataSourceType, DataTransformer>
  
  constructor() {
    this.transformers.set(DataSourceType.SSI, new SSITransformer())
    this.transformers.set(DataSourceType.VNSTOCK, new VnStockTransformer())
    this.transformers.set(DataSourceType.APEC, new APECTransformer())
    this.transformers.set(DataSourceType.VIETSTOCK, new VietStockTransformer())
    this.transformers.set(DataSourceType.CAFEF, new CafeFTransformer())
  }
  
  async transform<T>(
    data: any, 
    source: DataSourceType, 
    targetType: string
  ): Promise<T> {
    const transformer = this.transformers.get(source)
    if (!transformer) {
      throw new Error(`No transformer found for source: ${source}`)
    }
    
    return transformer.transform(data, targetType)
  }
}
```

## Authentication Strategy

### API Key Management
```typescript
interface ProviderCredentials {
  ssi: {
    apiKey?: string
    username?: string
    password?: string
    subscriptionTier?: 'basic' | 'premium' | 'enterprise'
  }
  vnstock: {
    // No authentication required
  }
  apec: {
    apiKey?: string
    clientId?: string
    clientSecret?: string
  }
  vietstock: {
    apiKey?: string
    subscriptionLevel?: string
  }
  cafef: {
    // Web scraping - no auth
  }
}
```

### Secure Credential Storage
```typescript
class CredentialManager {
  private encryptionKey: string
  
  async storeCredentials(
    provider: DataSourceType, 
    credentials: any
  ): Promise<void> {
    const encrypted = await this.encrypt(JSON.stringify(credentials))
    await this.storage.set(`credentials:${provider}`, encrypted)
  }
  
  async getCredentials(provider: DataSourceType): Promise<any> {
    const encrypted = await this.storage.get(`credentials:${provider}`)
    if (!encrypted) return null
    
    const decrypted = await this.decrypt(encrypted)
    return JSON.parse(decrypted)
  }
  
  private async encrypt(data: string): Promise<string> {
    // Implementation using crypto module
  }
  
  private async decrypt(data: string): Promise<string> {
    // Implementation using crypto module
  }
}
```

## Rate Limiting Strategy

### Provider-Specific Rate Limits
```typescript
interface ProviderRateLimit {
  requestsPerSecond: number
  requestsPerMinute: number
  requestsPerHour: number
  requestsPerDay: number
  burstLimit?: number
  priority: number // For failover ordering
}

const PROVIDER_RATE_LIMITS: Record<DataSourceType, ProviderRateLimit> = {
  [DataSourceType.SSI]: {
    requestsPerSecond: 15,
    requestsPerMinute: 900,
    requestsPerHour: 54000,
    requestsPerDay: 1000000,
    priority: 1
  },
  [DataSourceType.VNSTOCK]: {
    requestsPerSecond: 5,
    requestsPerMinute: 300,
    requestsPerHour: 18000,
    requestsPerDay: 432000,
    priority: 2
  },
  [DataSourceType.VIETSTOCK]: {
    requestsPerSecond: 10,
    requestsPerMinute: 600,
    requestsPerHour: 36000,
    requestsPerDay: 864000,
    priority: 3
  }
}
```

### Intelligent Rate Limiting
```typescript
class IntelligentRateLimiter {
  private providerLimiters: Map<DataSourceType, RateLimiter>
  private requestQueue: PriorityQueue<QueuedRequest>
  
  async executeRequest<T>(
    provider: DataSourceType,
    request: () => Promise<T>,
    priority: number = 0
  ): Promise<T> {
    const limiter = this.providerLimiters.get(provider)
    
    // Check if we can execute immediately
    if (limiter.canExecute()) {
      return await this.executeWithLimiter(limiter, request)
    }
    
    // Queue the request
    return new Promise((resolve, reject) => {
      this.requestQueue.enqueue({
        provider,
        request,
        priority,
        resolve,
        reject
      })
    })
  }
  
  private async processQueue(): Promise<void> {
    // Process queued requests based on priority and rate limits
  }
}
```

## Failover and Redundancy

### Provider Health Monitoring
```typescript
interface ProviderHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime: number
  errorRate: number
  lastCheck: Date
  consecutiveFailures: number
}

class ProviderHealthMonitor {
  private healthStatus: Map<DataSourceType, ProviderHealth>
  
  async checkProviderHealth(provider: DataSourceType): Promise<ProviderHealth> {
    const client = this.getProviderClient(provider)
    const startTime = Date.now()
    
    try {
      await client.testConnection()
      const responseTime = Date.now() - startTime
      
      return {
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
        errorRate: 0,
        lastCheck: new Date(),
        consecutiveFailures: 0
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        errorRate: 1,
        lastCheck: new Date(),
        consecutiveFailures: this.getConsecutiveFailures(provider) + 1
      }
    }
  }
}
```

### Intelligent Failover
```typescript
class ProviderFailoverManager {
  async executeWithFailover<T>(
    operation: (client: BaseApiClient) => Promise<T>,
    requiredCapability: string
  ): Promise<T> {
    const availableProviders = this.getProvidersWithCapability(requiredCapability)
    const sortedProviders = this.sortProvidersByHealth(availableProviders)
    
    for (const provider of sortedProviders) {
      try {
        const client = this.getProviderClient(provider)
        const result = await operation(client)
        
        // Update success metrics
        this.updateProviderMetrics(provider, true)
        return result
        
      } catch (error) {
        // Update failure metrics
        this.updateProviderMetrics(provider, false)
        
        // Continue to next provider
        console.warn(`Provider ${provider} failed, trying next...`, error)
      }
    }
    
    throw new Error('All providers failed for the requested operation')
  }
}
```

## Implementation Timeline

### Phase 1: Enhanced SSI Integration (Week 1)
- Extend existing SSI client with MCP-specific features
- Add WebSocket support for real-time data
- Implement subscription management

### Phase 2: vnstock Integration (Week 2)
- Create HTTP API bridge for vnstock Python library
- Implement data transformation for vnstock responses
- Add error handling and timeout management

### Phase 3: Additional Providers (Week 3)
- Research and implement APEC Investment API
- Enhance VietStock and CafeF integrations
- Add new provider discovery

### Phase 4: Data Normalization (Week 4)
- Implement unified data schemas
- Create transformation pipeline
- Add data validation and quality checks

### Phase 5: Advanced Features (Week 5)
- Implement intelligent failover
- Add provider health monitoring
- Create performance optimization

This integration plan provides a robust foundation for connecting multiple Vietnamese stock data providers to the MCP server while ensuring data quality, reliability, and performance.
