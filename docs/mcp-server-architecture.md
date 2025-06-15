# MCP Server Architecture Design for VN Stock Insights

## Overview

This document details the architectural design for the Model Context Protocol (MCP) server implementation in the Vietnamese Stock Market Insights project. The architecture leverages existing patterns while introducing MCP-specific components for seamless integration with AI assistants and external tools.

## Core Architecture Components

### 1. MCP Protocol Layer

#### Protocol Handler
```typescript
interface MCPProtocolHandler {
  // Core protocol methods
  handleInitialize(params: InitializeParams): Promise<InitializeResult>
  handleListResources(): Promise<ListResourcesResult>
  handleReadResource(uri: string): Promise<ReadResourceResult>
  handleListTools(): Promise<ListToolsResult>
  handleCallTool(name: string, args: any): Promise<CallToolResult>
  
  // Notification handlers
  handleResourceSubscription(uri: string): void
  handleResourceUnsubscription(uri: string): void
  
  // Error handling
  handleError(error: MCPError): void
}
```

#### Message Router
```typescript
class MCPMessageRouter {
  private handlers: Map<string, RequestHandler>
  private notificationHandlers: Map<string, NotificationHandler>
  
  route(message: JSONRPCMessage): Promise<JSONRPCResponse | void>
  registerHandler(method: string, handler: RequestHandler): void
  registerNotificationHandler(method: string, handler: NotificationHandler): void
}
```

### 2. Resource Management System

#### Resource Registry
```typescript
interface ResourceRegistry {
  // Resource lifecycle
  registerResource(resource: ResourceDefinition): void
  unregisterResource(uri: string): void
  updateResource(uri: string, content: ResourceContent): void
  
  // Resource discovery
  listResources(): Promise<Resource[]>
  getResource(uri: string): Promise<ResourceContent>
  
  // Subscription management
  subscribe(uri: string, callback: ResourceUpdateCallback): void
  unsubscribe(uri: string, callback: ResourceUpdateCallback): void
  notifySubscribers(uri: string, content: ResourceContent): void
}
```

#### Vietnamese Stock Resource Types
```typescript
enum VNStockResourceType {
  STOCK_INFO = 'stock',
  MARKET_DATA = 'market',
  FINANCIAL_REPORT = 'financial',
  NEWS = 'news',
  ANALYSIS = 'analysis',
  SECTOR = 'sector'
}

interface StockResourceDefinition {
  type: VNStockResourceType
  symbol?: string
  exchange?: 'HOSE' | 'HNX' | 'UPCOM'
  timeframe?: string
  provider?: DataSourceType
}
```

### 3. Tool Registry and Execution

#### Tool Registry
```typescript
interface ToolRegistry {
  // Tool management
  registerTool(tool: ToolDefinition): void
  unregisterTool(name: string): void
  updateTool(name: string, definition: ToolDefinition): void
  
  // Tool discovery and execution
  listTools(): Promise<Tool[]>
  getTool(name: string): Promise<ToolDefinition>
  executeTool(name: string, args: any): Promise<ToolResult>
  
  // Validation
  validateToolArgs(name: string, args: any): ValidationResult
}
```

#### Vietnamese Stock Tools
```typescript
interface VNStockToolDefinition extends ToolDefinition {
  name: string
  description: string
  inputSchema: JSONSchema
  handler: ToolHandler
  requiredProviders?: DataSourceType[]
  rateLimit?: RateLimitConfig
  cacheConfig?: CacheConfig
}

// Core tool implementations
const STOCK_TOOLS: VNStockToolDefinition[] = [
  {
    name: 'get_stock_price',
    description: 'Get real-time stock price for Vietnamese stocks',
    inputSchema: GetStockPriceSchema,
    handler: getStockPriceHandler,
    requiredProviders: [DataSourceType.SSI, DataSourceType.VIETSTOCK]
  },
  {
    name: 'analyze_stock',
    description: 'Perform comprehensive stock analysis',
    inputSchema: AnalyzeStockSchema,
    handler: analyzeStockHandler,
    requiredProviders: [DataSourceType.SSI, DataSourceType.CAFEF]
  }
]
```

### 4. Data Provider Abstraction Layer

#### Provider Manager
```typescript
interface DataProviderManager {
  // Provider lifecycle
  registerProvider(provider: BaseApiClient): void
  getProvider(type: DataSourceType): BaseApiClient
  getAvailableProviders(): DataSourceType[]
  
  // Health monitoring
  checkProviderHealth(type: DataSourceType): Promise<HealthStatus>
  getProviderStats(type: DataSourceType): ApiStats
  
  // Failover management
  executeWithFailover<T>(
    operation: (provider: BaseApiClient) => Promise<T>,
    providers: DataSourceType[]
  ): Promise<T>
}
```

#### Enhanced Provider Integration
```typescript
class MCPDataProviderAdapter {
  constructor(
    private provider: BaseApiClient,
    private transformer: DataTransformer,
    private cache: CacheManager
  ) {}
  
  async getStockData(symbol: string): Promise<StockData> {
    // Check cache first
    const cached = await this.cache.get(`stock:${symbol}`)
    if (cached && !this.cache.isExpired(cached)) {
      return cached.data
    }
    
    // Fetch from provider
    const response = await this.provider.getStockInfo(symbol)
    if (!response.success) {
      throw new Error(response.error)
    }
    
    // Transform data
    const transformed = await this.transformer.transform(response.data)
    
    // Cache result
    await this.cache.set(`stock:${symbol}`, transformed, { ttl: 60000 })
    
    return transformed
  }
}
```

### 5. Configuration Management Integration

#### MCP Configuration Schema
```typescript
interface MCPServerConfig {
  // Server settings
  name: string
  version: string
  capabilities: ServerCapabilities
  
  // Transport configuration
  transport: {
    type: 'stdio' | 'http'
    port?: number
    host?: string
  }
  
  // Resource configuration
  resources: {
    enableSubscriptions: boolean
    cacheEnabled: boolean
    cacheTTL: number
  }
  
  // Tool configuration
  tools: {
    enabledTools: string[]
    rateLimits: Record<string, RateLimitConfig>
    timeouts: Record<string, number>
  }
  
  // Provider configuration
  providers: {
    primary: DataSourceType
    fallbacks: DataSourceType[]
    healthCheckInterval: number
  }
}
```

#### Configuration Manager Extension
```typescript
class MCPConfigManager extends AIConfigManager {
  private mcpConfig: MCPServerConfig
  
  getMCPConfig(): MCPServerConfig
  updateMCPConfig(config: Partial<MCPServerConfig>): void
  validateMCPConfig(config: MCPServerConfig): ValidationResult
  
  // Integration with existing config
  syncWithAIConfig(): void
  exportMCPConfig(): string
  importMCPConfig(configJson: string): void
}
```

### 6. Caching and Performance Layer

#### Intelligent Cache Manager
```typescript
interface MCPCacheManager {
  // Cache operations
  get<T>(key: string): Promise<CacheEntry<T> | null>
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
  
  // Cache strategies
  setStrategy(pattern: string, strategy: CacheStrategy): void
  invalidatePattern(pattern: string): Promise<void>
  
  // Performance monitoring
  getStats(): CacheStats
  getHitRate(): number
}

interface CacheStrategy {
  ttl: number
  maxSize?: number
  refreshThreshold?: number
  backgroundRefresh?: boolean
}
```

#### Performance Optimization
```typescript
class MCPPerformanceOptimizer {
  // Request batching
  batchRequests<T>(
    requests: Array<() => Promise<T>>,
    batchSize: number
  ): Promise<T[]>
  
  // Connection pooling
  getConnection(provider: DataSourceType): Promise<Connection>
  releaseConnection(connection: Connection): void
  
  // Rate limit coordination
  coordinateRateLimit(provider: DataSourceType): Promise<void>
  
  // Performance metrics
  recordMetric(name: string, value: number): void
  getMetrics(): PerformanceMetrics
}
```

## Integration with Existing Architecture

### Leveraging Current Patterns

1. **BaseApiClient Integration**: MCP server will use existing API clients through the data provider abstraction layer
2. **Error Handling**: Extend global error handler for MCP-specific errors
3. **Rate Limiting**: Coordinate with existing rate limiter for provider requests
4. **Data Transformation**: Utilize existing transformation pipeline for data normalization
5. **Configuration**: Extend current configuration system with MCP-specific settings

### New Components

1. **MCP Protocol Handler**: New component for JSON-RPC message handling
2. **Resource Registry**: New system for managing MCP resources
3. **Tool Registry**: New system for tool definition and execution
4. **MCP Cache Manager**: Enhanced caching specifically for MCP operations
5. **Performance Optimizer**: New component for MCP-specific optimizations

## Security and Compliance

### Security Measures
- API key encryption and secure storage
- Request validation and sanitization
- Rate limiting and abuse prevention
- Audit logging for all operations

### Vietnamese Market Compliance
- Adherence to SSC (State Securities Commission) regulations
- Data privacy compliance (Vietnamese data protection laws)
- Real-time data usage restrictions
- Proper attribution of data sources

## Deployment Architecture

### Development Environment
```typescript
// Development MCP server setup
const mcpServer = new MCPServer({
  name: 'VN-Stock-Insights-Dev',
  version: '1.0.0-dev',
  transport: { type: 'stdio' },
  providers: {
    primary: DataSourceType.SSI,
    fallbacks: [DataSourceType.VIETSTOCK, DataSourceType.CAFEF]
  }
})
```

### Production Environment
```typescript
// Production MCP server setup
const mcpServer = new MCPServer({
  name: 'VN-Stock-Insights',
  version: '1.0.0',
  transport: { 
    type: 'http',
    port: 3001,
    host: '0.0.0.0'
  },
  providers: {
    primary: DataSourceType.SSI,
    fallbacks: [DataSourceType.VIETSTOCK, DataSourceType.CAFEF, DataSourceType.FIREANT]
  }
})
```

This architecture provides a robust foundation for implementing the MCP server while leveraging existing infrastructure and maintaining compatibility with the current Vietnamese Stock Market Insights platform.
