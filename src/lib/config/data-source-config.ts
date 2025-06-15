/**
 * @fileOverview Data Source Configuration Management
 * Quản lý cấu hình cho tất cả các nguồn dữ liệu tài chính Việt Nam
 */

import { z } from 'zod';
import { DataSourceType, ApiConfig } from '@/lib/api/base-client';

// Schema cho cấu hình nguồn dữ liệu
export const DataSourceConfigSchema = z.object({
  name: z.string().describe('Tên nguồn dữ liệu'),
  type: z.nativeEnum(DataSourceType).describe('Loại nguồn dữ liệu'),
  enabled: z.boolean().default(true).describe('Trạng thái kích hoạt'),
  priority: z.number().min(1).max(10).describe('Độ ưu tiên (1 = cao nhất)'),
  
  // API Configuration
  apiConfig: z.object({
    baseUrl: z.string().url().describe('URL cơ sở của API'),
    apiKey: z.string().optional().describe('API key (nếu cần)'),
    timeout: z.number().positive().default(30000).describe('Timeout (ms)'),
    retryAttempts: z.number().min(0).max(10).default(3).describe('Số lần thử lại'),
    retryDelay: z.number().positive().default(1000).describe('Độ trễ giữa các lần thử (ms)'),
    
    rateLimit: z.object({
      requestsPerSecond: z.number().positive().default(10),
      requestsPerMinute: z.number().positive().default(600),
      requestsPerHour: z.number().positive().default(36000)
    }).describe('Giới hạn tốc độ request'),
    
    headers: z.record(z.string()).optional().describe('Headers mặc định')
  }).describe('Cấu hình API'),
  
  // Data capabilities
  capabilities: z.object({
    stockInfo: z.boolean().default(false).describe('Hỗ trợ thông tin cổ phiếu'),
    realTimePrice: z.boolean().default(false).describe('Hỗ trợ giá thời gian thực'),
    historicalPrice: z.boolean().default(false).describe('Hỗ trợ giá lịch sử'),
    financialReports: z.boolean().default(false).describe('Hỗ trợ báo cáo tài chính'),
    news: z.boolean().default(false).describe('Hỗ trợ tin tức'),
    marketIndex: z.boolean().default(false).describe('Hỗ trợ chỉ số thị trường'),
    orderBook: z.boolean().default(false).describe('Hỗ trợ sổ lệnh'),
    tradeTicks: z.boolean().default(false).describe('Hỗ trợ tick giao dịch')
  }).describe('Khả năng cung cấp dữ liệu'),
  
  // Endpoint mappings
  endpoints: z.record(z.string()).optional().describe('Mapping các endpoint'),
  
  // Authentication
  authentication: z.object({
    type: z.enum(['none', 'apikey', 'bearer', 'basic']).default('none'),
    credentials: z.record(z.string()).optional()
  }).optional().describe('Cấu hình xác thực'),
  
  // Health check
  healthCheck: z.object({
    enabled: z.boolean().default(true),
    endpoint: z.string().optional(),
    interval: z.number().positive().default(300000) // 5 minutes
  }).optional().describe('Cấu hình health check'),
  
  // Metadata
  metadata: z.object({
    description: z.string().optional(),
    version: z.string().default('1.0.0'),
    maintainer: z.string().optional(),
    documentation: z.string().url().optional(),
    lastUpdated: z.date().default(() => new Date())
  }).optional().describe('Metadata')
});

export type DataSourceConfig = z.infer<typeof DataSourceConfigSchema>;

// Predefined configurations for Vietnamese financial data sources
export const DEFAULT_CONFIGS: Record<DataSourceType, Partial<DataSourceConfig>> = {
  [DataSourceType.FIREANT]: {
    name: 'FireAnt',
    type: DataSourceType.FIREANT,
    priority: 1,
    apiConfig: {
      baseUrl: 'https://restv2.fireant.vn',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      rateLimit: {
        requestsPerSecond: 10,
        requestsPerMinute: 600,
        requestsPerHour: 36000
      }
    },
    capabilities: {
      stockInfo: true,
      realTimePrice: true,
      historicalPrice: true,
      financialReports: true,
      news: false,
      marketIndex: true,
      orderBook: false,
      tradeTicks: false
    },
    endpoints: {
      stockInfo: '/symbols/{symbol}',
      realTimePrice: '/symbols/{symbol}/latest',
      historicalPrice: '/symbols/{symbol}/historical',
      financialReports: '/symbols/{symbol}/financial-reports',
      marketIndex: '/indices/{index}'
    },
    metadata: {
      description: 'FireAnt - Nguồn dữ liệu tài chính chính thức',
      documentation: 'https://docs.fireant.vn',
      version: '1.0.0',
      lastUpdated: new Date()
    }
  },

  [DataSourceType.CAFEF]: {
    name: 'CafeF',
    type: DataSourceType.CAFEF,
    priority: 2,
    apiConfig: {
      baseUrl: 'https://s.cafef.vn',
      timeout: 25000,
      retryAttempts: 2,
      retryDelay: 1500,
      rateLimit: {
        requestsPerSecond: 8,
        requestsPerMinute: 480,
        requestsPerHour: 28800
      }
    },
    capabilities: {
      stockInfo: true,
      realTimePrice: true,
      historicalPrice: true,
      financialReports: false,
      news: true,
      marketIndex: true,
      orderBook: true,
      tradeTicks: true
    },
    endpoints: {
      stockInfo: '/ajax/tktt.ashx?symbol={symbol}',
      realTimePrice: '/ajax/paging/stockinfo.ashx?symbol={symbol}',
      news: '/ajax/paging/news.ashx?symbol={symbol}',
      orderBook: '/ajax/orderbook.ashx?symbol={symbol}'
    },
    metadata: {
      description: 'CafeF - Tin tức và dữ liệu thị trường',
      documentation: 'https://cafef.vn',
      version: '1.0.0',
      lastUpdated: new Date()
    }
  },

  [DataSourceType.VIETSTOCK]: {
    name: 'VietStock',
    type: DataSourceType.VIETSTOCK,
    priority: 3,
    apiConfig: {
      baseUrl: 'https://api.vietstock.vn',
      timeout: 35000,
      retryAttempts: 3,
      retryDelay: 2000,
      rateLimit: {
        requestsPerSecond: 5,
        requestsPerMinute: 300,
        requestsPerHour: 18000
      }
    },
    capabilities: {
      stockInfo: true,
      realTimePrice: true,
      historicalPrice: true,
      financialReports: true,
      news: true,
      marketIndex: true,
      orderBook: false,
      tradeTicks: false
    },
    endpoints: {
      stockInfo: '/finance/stock_info/{symbol}',
      realTimePrice: '/finance/sip_realtime/{symbol}',
      financialReports: '/finance/financial_statement/{symbol}',
      news: '/finance/news/{symbol}'
    },
    metadata: {
      description: 'VietStock - Phân tích kỹ thuật và thông tin cổ phiếu',
      documentation: 'https://vietstock.vn',
      version: '1.0.0',
      lastUpdated: new Date()
    }
  },

  [DataSourceType.SSI]: {
    name: 'SSI Securities',
    type: DataSourceType.SSI,
    priority: 4,
    apiConfig: {
      baseUrl: 'https://iboard.ssi.com.vn',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      rateLimit: {
        requestsPerSecond: 15,
        requestsPerMinute: 900,
        requestsPerHour: 54000
      }
    },
    capabilities: {
      stockInfo: true,
      realTimePrice: true,
      historicalPrice: true,
      financialReports: true,
      news: false,
      marketIndex: true,
      orderBook: true,
      tradeTicks: true
    },
    authentication: {
      type: 'apikey',
      credentials: {}
    },
    metadata: {
      description: 'SSI - API chính thức từ công ty chứng khoán SSI',
      version: '1.0.0',
      lastUpdated: new Date()
    }
  },

  [DataSourceType.VPS]: {
    name: 'VPS Securities',
    type: DataSourceType.VPS,
    priority: 5,
    apiConfig: {
      baseUrl: 'https://api.vps.com.vn',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      rateLimit: {
        requestsPerSecond: 12,
        requestsPerMinute: 720,
        requestsPerHour: 43200
      }
    },
    capabilities: {
      stockInfo: true,
      realTimePrice: true,
      historicalPrice: true,
      financialReports: true,
      news: false,
      marketIndex: true,
      orderBook: false,
      tradeTicks: false
    },
    authentication: {
      type: 'bearer',
      credentials: {}
    },
    metadata: {
      description: 'VPS - API chính thức từ công ty chứng khoán VPS',
      version: '1.0.0',
      lastUpdated: new Date()
    }
  },

  [DataSourceType.HOSE]: {
    name: 'HOSE',
    type: DataSourceType.HOSE,
    priority: 6,
    apiConfig: {
      baseUrl: 'https://www.hsx.vn',
      timeout: 40000,
      retryAttempts: 2,
      retryDelay: 2000,
      rateLimit: {
        requestsPerSecond: 3,
        requestsPerMinute: 180,
        requestsPerHour: 10800
      }
    },
    capabilities: {
      stockInfo: true,
      realTimePrice: false,
      historicalPrice: true,
      financialReports: false,
      news: false,
      marketIndex: true,
      orderBook: false,
      tradeTicks: false
    },
    metadata: {
      description: 'HOSE - Sở Giao dịch Chứng khoán TP.HCM',
      version: '1.0.0',
      lastUpdated: new Date()
    }
  },

  [DataSourceType.HNX]: {
    name: 'HNX',
    type: DataSourceType.HNX,
    priority: 7,
    apiConfig: {
      baseUrl: 'https://www.hnx.vn',
      timeout: 40000,
      retryAttempts: 2,
      retryDelay: 2000,
      rateLimit: {
        requestsPerSecond: 3,
        requestsPerMinute: 180,
        requestsPerHour: 10800
      }
    },
    capabilities: {
      stockInfo: true,
      realTimePrice: false,
      historicalPrice: true,
      financialReports: false,
      news: false,
      marketIndex: true,
      orderBook: false,
      tradeTicks: false
    },
    metadata: {
      description: 'HNX - Sở Giao dịch Chứng khoán Hà Nội',
      version: '1.0.0',
      lastUpdated: new Date()
    }
  }
};

// Configuration Manager Class
export class DataSourceConfigManager {
  private configs = new Map<DataSourceType, DataSourceConfig>();
  private activeConfigs = new Map<DataSourceType, DataSourceConfig>();

  constructor() {
    this.loadDefaultConfigs();
  }

  private loadDefaultConfigs(): void {
    Object.entries(DEFAULT_CONFIGS).forEach(([type, config]) => {
      const fullConfig = this.mergeWithDefaults(config);
      this.configs.set(type as DataSourceType, fullConfig);
      
      if (fullConfig.enabled) {
        this.activeConfigs.set(type as DataSourceType, fullConfig);
      }
    });
  }

  private mergeWithDefaults(partialConfig: Partial<DataSourceConfig>): DataSourceConfig {
    const defaultConfig: DataSourceConfig = {
      name: 'Unknown',
      type: DataSourceType.FIREANT,
      enabled: true,
      priority: 10,
      apiConfig: {
        baseUrl: '',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
        rateLimit: {
          requestsPerSecond: 10,
          requestsPerMinute: 600,
          requestsPerHour: 36000
        }
      },
      capabilities: {
        stockInfo: false,
        realTimePrice: false,
        historicalPrice: false,
        financialReports: false,
        news: false,
        marketIndex: false,
        orderBook: false,
        tradeTicks: false
      }
    };

    return { ...defaultConfig, ...partialConfig } as DataSourceConfig;
  }

  // Public methods
  public getConfig(sourceType: DataSourceType): DataSourceConfig | undefined {
    return this.configs.get(sourceType);
  }

  public getActiveConfigs(): DataSourceConfig[] {
    return Array.from(this.activeConfigs.values()).sort((a, b) => a.priority - b.priority);
  }

  public getConfigsByCapability(capability: keyof DataSourceConfig['capabilities']): DataSourceConfig[] {
    return this.getActiveConfigs().filter(config => config.capabilities[capability]);
  }

  public updateConfig(sourceType: DataSourceType, updates: Partial<DataSourceConfig>): void {
    const currentConfig = this.configs.get(sourceType);
    if (!currentConfig) {
      throw new Error(`Configuration not found for source type: ${sourceType}`);
    }

    const updatedConfig = { ...currentConfig, ...updates };
    
    // Validate updated config
    DataSourceConfigSchema.parse(updatedConfig);
    
    this.configs.set(sourceType, updatedConfig);
    
    // Update active configs
    if (updatedConfig.enabled) {
      this.activeConfigs.set(sourceType, updatedConfig);
    } else {
      this.activeConfigs.delete(sourceType);
    }
  }

  public enableSource(sourceType: DataSourceType): void {
    this.updateConfig(sourceType, { enabled: true });
  }

  public disableSource(sourceType: DataSourceType): void {
    this.updateConfig(sourceType, { enabled: false });
  }

  public setPriority(sourceType: DataSourceType, priority: number): void {
    this.updateConfig(sourceType, { priority });
  }

  public addCustomConfig(config: DataSourceConfig): void {
    // Validate config
    DataSourceConfigSchema.parse(config);
    
    this.configs.set(config.type, config);
    
    if (config.enabled) {
      this.activeConfigs.set(config.type, config);
    }
  }

  public removeConfig(sourceType: DataSourceType): void {
    this.configs.delete(sourceType);
    this.activeConfigs.delete(sourceType);
  }

  public getAllConfigs(): DataSourceConfig[] {
    return Array.from(this.configs.values());
  }

  public exportConfigs(): Record<string, DataSourceConfig> {
    const exported: Record<string, DataSourceConfig> = {};
    this.configs.forEach((config, type) => {
      exported[type] = config;
    });
    return exported;
  }

  public importConfigs(configs: Record<string, DataSourceConfig>): void {
    Object.entries(configs).forEach(([type, config]) => {
      DataSourceConfigSchema.parse(config);
      this.configs.set(type as DataSourceType, config);
      
      if (config.enabled) {
        this.activeConfigs.set(type as DataSourceType, config);
      }
    });
  }

  public validateAllConfigs(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    this.configs.forEach((config, type) => {
      try {
        DataSourceConfigSchema.parse(config);
      } catch (error) {
        if (error instanceof z.ZodError) {
          errors.push(`${type}: ${error.errors.map(e => e.message).join(', ')}`);
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Global configuration manager instance
export const globalDataSourceConfig = new DataSourceConfigManager();
