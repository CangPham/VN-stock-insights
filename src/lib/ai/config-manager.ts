/**
 * @fileOverview AI Configuration Manager
 * Quản lý cấu hình AI đa nhà cung cấp với lưu trữ và validation
 */

import { 
  AIConfig, 
  AIProvider, 
  AIModel, 
  APIKeyConfig, 
  AIModelConfig,
  WebSearchConfig,
  StockAnalysisConfig,
  AIConfigSchema 
} from './types';
import { 
  ALL_MODEL_CONFIGS, 
  getModelConfig, 
  getProviderModels, 
  getDefaultModel 
} from './model-configs';

// Singleton pattern cho AI Configuration Manager
export class AIConfigManager {
  private static instance: AIConfigManager;
  private config: AIConfig;
  private configKey = 'ai_config';
  private listeners: Array<(config: AIConfig) => void> = [];

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): AIConfigManager {
    if (!AIConfigManager.instance) {
      AIConfigManager.instance = new AIConfigManager();
    }
    return AIConfigManager.instance;
  }

  // Load configuration từ localStorage hoặc tạo mới
  private loadConfig(): AIConfig {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(this.configKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Validate và merge với default config
          return this.mergeWithDefaults(parsed);
        }
      }
    } catch (error) {
      console.warn('Failed to load AI config from localStorage:', error);
    }
    
    return this.getDefaultConfig();
  }

  // Lưu configuration vào localStorage
  private saveConfig(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.configKey, JSON.stringify(this.config));
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Failed to save AI config to localStorage:', error);
    }
  }

  // Merge với default configuration
  private mergeWithDefaults(partialConfig: Partial<AIConfig>): AIConfig {
    const defaultConfig = this.getDefaultConfig();
    
    try {
      const merged = {
        ...defaultConfig,
        ...partialConfig,
        apiKeys: { ...defaultConfig.apiKeys, ...partialConfig.apiKeys },
        modelConfigs: { ...defaultConfig.modelConfigs, ...partialConfig.modelConfigs },
        webSearch: { ...defaultConfig.webSearch, ...partialConfig.webSearch },
        stockAnalysis: { ...defaultConfig.stockAnalysis, ...partialConfig.stockAnalysis },
        general: { ...defaultConfig.general, ...partialConfig.general },
      };
      
      // Validate merged config
      return AIConfigSchema.parse(merged);
    } catch (error) {
      console.warn('Invalid config format, using defaults:', error);
      return defaultConfig;
    }
  }

  // Tạo default configuration
  private getDefaultConfig(): AIConfig {
    return AIConfigSchema.parse({
      currentProvider: AIProvider.GOOGLE_GEMINI,
      currentModel: AIModel.GEMINI_2_0_FLASH,
      apiKeys: {},
      modelConfigs: ALL_MODEL_CONFIGS,
      webSearch: {
        enabled: false,
        provider: 'google',
        maxResults: 10,
        includeImages: false,
        includeNews: true,
        freshness: 'week',
        safeSearch: 'moderate',
        region: 'vn',
        language: 'vi',
      },
      stockAnalysis: {
        technicalIndicators: {
          enabled: true,
          rsi: { enabled: true, period: 14, overbought: 70, oversold: 30 },
          macd: { enabled: true, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
          movingAverages: { enabled: true, periods: [20, 50, 200] },
          bollingerBands: { enabled: true, period: 20, standardDeviations: 2 },
        },
        fundamentalAnalysis: {
          enabled: true,
          peRatio: { enabled: true, lowThreshold: 10, highThreshold: 25 },
          roe: { enabled: true, minThreshold: 15 },
          debtToEquity: { enabled: true, maxThreshold: 1.5 },
          revenueGrowth: { enabled: true, minThreshold: 10 },
        },
        sentimentAnalysis: {
          enabled: true,
          sources: ['news', 'analyst_reports'],
          timeframe: '30d',
          weight: 0.3,
        },
        riskAssessment: {
          enabled: true,
          volatilityWeight: 0.4,
          liquidityWeight: 0.3,
          marketCapWeight: 0.3,
          riskTolerance: 'moderate',
        },
        recommendation: {
          confidenceThreshold: 0.7,
          includeTargetPrice: true,
          includeStopLoss: true,
          timeHorizon: 'medium',
        },
      },
      general: {
        language: 'vi',
        timezone: 'Asia/Ho_Chi_Minh',
        currency: 'VND',
        enableLogging: true,
        enableCaching: true,
        cacheTimeout: 300000,
      },
    });
  }

  // Thêm listener cho config changes
  public addListener(listener: (config: AIConfig) => void): void {
    this.listeners.push(listener);
  }

  // Xóa listener
  public removeListener(listener: (config: AIConfig) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  // Notify tất cả listeners
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.config));
  }

  // Getters
  public getConfig(): AIConfig {
    return { ...this.config };
  }

  public getCurrentProvider(): AIProvider {
    return this.config.currentProvider;
  }

  public getCurrentModel(): AIModel {
    return this.config.currentModel;
  }

  public getCurrentModelConfig(): AIModelConfig | undefined {
    return getModelConfig(this.config.currentModel);
  }

  public getApiKey(provider: AIProvider): string | undefined {
    return this.config.apiKeys[provider]?.apiKey;
  }

  public getWebSearchConfig(): WebSearchConfig {
    return this.config.webSearch;
  }

  public getStockAnalysisConfig(): StockAnalysisConfig {
    return this.config.stockAnalysis;
  }

  // Setters
  public setCurrentProvider(provider: AIProvider): void {
    const availableModels = getProviderModels(provider);
    if (availableModels.length === 0) {
      throw new Error(`No models available for provider: ${provider}`);
    }

    this.config.currentProvider = provider;
    
    // Nếu model hiện tại không thuộc provider mới, chuyển sang model mặc định
    if (!availableModels.includes(this.config.currentModel)) {
      this.config.currentModel = getDefaultModel(provider);
    }
    
    this.saveConfig();
  }

  public setCurrentModel(model: AIModel): void {
    const modelConfig = getModelConfig(model);
    if (!modelConfig) {
      throw new Error(`Model not found: ${model}`);
    }

    this.config.currentModel = model;
    this.config.currentProvider = modelConfig.provider;
    this.saveConfig();
  }

  public setApiKey(provider: AIProvider, apiKey: string): void {
    if (!this.config.apiKeys[provider]) {
      this.config.apiKeys[provider] = {
        provider,
        apiKey,
        isValid: false,
      };
    } else {
      this.config.apiKeys[provider].apiKey = apiKey;
      this.config.apiKeys[provider].isValid = false; // Reset validation status
    }
    this.saveConfig();
  }

  public updateApiKeyValidation(provider: AIProvider, isValid: boolean, errorMessage?: string): void {
    if (this.config.apiKeys[provider]) {
      this.config.apiKeys[provider].isValid = isValid;
      this.config.apiKeys[provider].lastValidated = new Date();
      this.config.apiKeys[provider].errorMessage = errorMessage;
      this.saveConfig();
    }
  }

  public updateWebSearchConfig(updates: Partial<WebSearchConfig>): void {
    this.config.webSearch = { ...this.config.webSearch, ...updates };
    this.saveConfig();
  }

  public updateStockAnalysisConfig(updates: Partial<StockAnalysisConfig>): void {
    this.config.stockAnalysis = { ...this.config.stockAnalysis, ...updates };
    this.saveConfig();
  }

  public updateModelConfig(model: AIModel, updates: Partial<AIModelConfig>): void {
    if (this.config.modelConfigs[model]) {
      this.config.modelConfigs[model] = { ...this.config.modelConfigs[model], ...updates };
      this.saveConfig();
    }
  }

  // Validation methods
  public isProviderConfigured(provider: AIProvider): boolean {
    const apiKey = this.getApiKey(provider);
    return !!apiKey && apiKey.length > 0;
  }

  public isCurrentProviderValid(): boolean {
    const apiKeyConfig = this.config.apiKeys[this.config.currentProvider];
    return !!apiKeyConfig && apiKeyConfig.isValid;
  }

  public getConfiguredProviders(): AIProvider[] {
    return Object.keys(this.config.apiKeys)
      .filter(provider => this.isProviderConfigured(provider as AIProvider))
      .map(provider => provider as AIProvider);
  }

  // Reset methods
  public resetToDefaults(): void {
    this.config = this.getDefaultConfig();
    this.saveConfig();
  }

  public resetProviderConfig(provider: AIProvider): void {
    delete this.config.apiKeys[provider];
    
    // Nếu đang sử dụng provider này, chuyển sang provider khác
    if (this.config.currentProvider === provider) {
      const configuredProviders = this.getConfiguredProviders();
      if (configuredProviders.length > 0) {
        this.setCurrentProvider(configuredProviders[0]);
      } else {
        this.config.currentProvider = AIProvider.GOOGLE_GEMINI;
        this.config.currentModel = AIModel.GEMINI_2_0_FLASH;
      }
    }
    
    this.saveConfig();
  }

  // Export/Import methods
  public exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  public importConfig(configJson: string): void {
    try {
      const imported = JSON.parse(configJson);
      this.config = this.mergeWithDefaults(imported);
      this.saveConfig();
    } catch (error) {
      throw new Error('Invalid configuration format');
    }
  }
}
