import { DataProviderConfig, DataSourceType, VNStockServerConfig } from "../types/index.js";
import * as dotenv from "dotenv";

export class ConfigManager {
  private config: Map<string, any> = new Map();
  private dataProviders: Map<DataSourceType, DataProviderConfig> = new Map();

  constructor() {
    dotenv.config();
    this.loadConfiguration();
  }

  private loadConfiguration(): void {
    // Load server configuration
    const serverConfig: VNStockServerConfig = {
      name: process.env.MCP_SERVER_NAME || "VN-Stock-Insights",
      version: process.env.MCP_SERVER_VERSION || "1.0.0",
      port: parseInt(process.env.MCP_SERVER_PORT || "3001"),
      host: process.env.MCP_SERVER_HOST || "localhost",
      transportType: (process.env.MCP_TRANSPORT_TYPE as 'stdio' | 'http') || 'stdio',
      capabilities: {
        resources: {
          subscribe: true,
          listChanged: true
        },
        tools: {
          listChanged: true
        },
        prompts: {
          listChanged: true
        }
      }
    };

    this.config.set('server', serverConfig);

    // Load data provider configurations
    this.loadDataProviderConfigs();

    // Load cache configuration
    this.config.set('cache', {
      ttlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || "300"),
      maxSize: parseInt(process.env.CACHE_MAX_SIZE || "1000"),
      enabled: process.env.CACHE_ENABLED === 'true'
    });

    // Load rate limiting configuration
    this.config.set('rateLimit', {
      requestsPerSecond: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_SECOND || "10"),
      requestsPerMinute: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || "600"),
      requestsPerHour: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_HOUR || "36000")
    });
  }

  private loadDataProviderConfigs(): void {
    // SSI Configuration
    this.dataProviders.set(DataSourceType.SSI, {
      type: DataSourceType.SSI,
      apiKey: process.env.SSI_API_KEY,
      apiSecret: process.env.SSI_API_SECRET,
      baseUrl: process.env.SSI_BASE_URL || "https://iboard.ssi.com.vn",
      rateLimit: {
        requestsPerSecond: 15,
        requestsPerMinute: 900,
        requestsPerHour: 54000
      },
      priority: 1,
      enabled: !!process.env.SSI_API_KEY
    });

    // VietStock Configuration
    this.dataProviders.set(DataSourceType.VIETSTOCK, {
      type: DataSourceType.VIETSTOCK,
      apiKey: process.env.VIETSTOCK_API_KEY,
      baseUrl: process.env.VIETSTOCK_BASE_URL || "https://api.vietstock.vn",
      rateLimit: {
        requestsPerSecond: 10,
        requestsPerMinute: 600,
        requestsPerHour: 36000
      },
      priority: 2,
      enabled: !!process.env.VIETSTOCK_API_KEY
    });

    // CafeF Configuration
    this.dataProviders.set(DataSourceType.CAFEF, {
      type: DataSourceType.CAFEF,
      apiKey: process.env.CAFEF_API_KEY,
      baseUrl: process.env.CAFEF_BASE_URL || "https://api.cafef.vn",
      rateLimit: {
        requestsPerSecond: 8,
        requestsPerMinute: 480,
        requestsPerHour: 28800
      },
      priority: 3,
      enabled: !!process.env.CAFEF_API_KEY
    });

    // FireAnt Configuration
    this.dataProviders.set(DataSourceType.FIREANT, {
      type: DataSourceType.FIREANT,
      apiKey: process.env.FIREANT_API_KEY,
      baseUrl: process.env.FIREANT_BASE_URL || "https://api.fireant.vn",
      rateLimit: {
        requestsPerSecond: 5,
        requestsPerMinute: 300,
        requestsPerHour: 18000
      },
      priority: 4,
      enabled: !!process.env.FIREANT_API_KEY
    });

    // APEC Investment Configuration
    this.dataProviders.set(DataSourceType.APEC, {
      type: DataSourceType.APEC,
      apiKey: process.env.APEC_API_KEY,
      apiSecret: process.env.APEC_API_SECRET,
      baseUrl: process.env.APEC_BASE_URL || "https://api.apec-investment.com",
      rateLimit: {
        requestsPerSecond: 3,
        requestsPerMinute: 180,
        requestsPerHour: 10800
      },
      priority: 5,
      enabled: !!process.env.APEC_API_KEY
    });

    // vnstock Configuration (Python library bridge)
    this.dataProviders.set(DataSourceType.VNSTOCK, {
      type: DataSourceType.VNSTOCK,
      baseUrl: "http://localhost:8000", // Local Python service
      rateLimit: {
        requestsPerSecond: 5,
        requestsPerMinute: 300,
        requestsPerHour: 18000
      },
      priority: 6,
      enabled: true // No API key required
    });
  }

  getServerConfig(): VNStockServerConfig {
    return this.config.get('server');
  }

  getDataProviderConfig(type: DataSourceType): DataProviderConfig | undefined {
    return this.dataProviders.get(type);
  }

  getAllDataProviderConfigs(): DataProviderConfig[] {
    return Array.from(this.dataProviders.values())
      .filter(config => config.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  getCacheConfig(): any {
    return this.config.get('cache');
  }

  getRateLimitConfig(): any {
    return this.config.get('rateLimit');
  }

  updateDataProviderConfig(type: DataSourceType, updates: Partial<DataProviderConfig>): void {
    const existing = this.dataProviders.get(type);
    if (existing) {
      this.dataProviders.set(type, { ...existing, ...updates });
    }
  }

  enableDataProvider(type: DataSourceType): void {
    this.updateDataProviderConfig(type, { enabled: true });
  }

  disableDataProvider(type: DataSourceType): void {
    this.updateDataProviderConfig(type, { enabled: false });
  }

  setDataProviderPriority(type: DataSourceType, priority: number): void {
    this.updateDataProviderConfig(type, { priority });
  }

  validateConfiguration(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if at least one data provider is enabled
    const enabledProviders = this.getAllDataProviderConfigs();
    if (enabledProviders.length === 0) {
      errors.push("No data providers are enabled");
    }

    // Validate server configuration
    const serverConfig = this.getServerConfig();
    if (!serverConfig.name || !serverConfig.version) {
      errors.push("Server name and version are required");
    }

    if (serverConfig.transportType === 'http' && (!serverConfig.port || !serverConfig.host)) {
      errors.push("HTTP transport requires port and host configuration");
    }

    // Validate data provider configurations
    for (const provider of enabledProviders) {
      if (!provider.baseUrl) {
        errors.push(`Base URL is required for ${provider.type} provider`);
      }

      if (provider.type !== DataSourceType.VNSTOCK && !provider.apiKey) {
        errors.push(`API key is required for ${provider.type} provider`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  exportConfiguration(): string {
    return JSON.stringify({
      server: this.getServerConfig(),
      dataProviders: Object.fromEntries(this.dataProviders),
      cache: this.getCacheConfig(),
      rateLimit: this.getRateLimitConfig()
    }, null, 2);
  }

  importConfiguration(configJson: string): void {
    try {
      const config = JSON.parse(configJson);
      
      if (config.server) {
        this.config.set('server', config.server);
      }

      if (config.dataProviders) {
        for (const [type, providerConfig] of Object.entries(config.dataProviders)) {
          this.dataProviders.set(type as DataSourceType, providerConfig as DataProviderConfig);
        }
      }

      if (config.cache) {
        this.config.set('cache', config.cache);
      }

      if (config.rateLimit) {
        this.config.set('rateLimit', config.rateLimit);
      }
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error.message}`);
    }
  }
}
