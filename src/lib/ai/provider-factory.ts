/**
 * @fileOverview AI Provider Factory and Manager
 * Factory pattern để tạo và quản lý các AI providers
 */

import { AIProvider, AIModel, IAIProvider } from './types';
import { AIConfigManager } from './config-manager';
import { APIKeyManager } from './api-key-manager';
import { envLoader } from './env-loader';

// Import providers
import { GeminiProvider } from './providers/gemini-provider';
import { OpenAIProvider } from './providers/openai-provider';
import { PerplexityProvider } from './providers/perplexity-provider';

// Provider factory class
export class AIProviderFactory {
  private static instance: AIProviderFactory;
  private configManager: AIConfigManager;
  private apiKeyManager: APIKeyManager;
  private providerCache: Map<AIProvider, IAIProvider> = new Map();

  private constructor() {
    this.configManager = AIConfigManager.getInstance();
    this.apiKeyManager = APIKeyManager.getInstance();
  }

  public static getInstance(): AIProviderFactory {
    if (!AIProviderFactory.instance) {
      AIProviderFactory.instance = new AIProviderFactory();
    }
    return AIProviderFactory.instance;
  }

  // Tạo provider instance
  public createProvider(provider: AIProvider, apiKey?: string): IAIProvider {
    // Sử dụng API key được cung cấp hoặc lấy từ config/env
    const key = apiKey || 
                this.apiKeyManager.getValidApiKey(provider) || 
                envLoader.getProviderApiKey(provider);

    if (!key) {
      throw new Error(`No valid API key found for provider: ${provider}`);
    }

    switch (provider) {
      case AIProvider.GOOGLE_GEMINI:
        return new GeminiProvider(key);
      
      case AIProvider.OPENAI_GPT:
        return new OpenAIProvider(key);
      
      case AIProvider.PERPLEXITY:
        return new PerplexityProvider(key);
      
      case AIProvider.ANTHROPIC_CLAUDE:
        // TODO: Implement Claude provider
        throw new Error('Claude provider not yet implemented');
      
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  // Lấy provider với caching
  public getProvider(provider: AIProvider): IAIProvider {
    // Kiểm tra cache trước
    if (this.providerCache.has(provider)) {
      const cachedProvider = this.providerCache.get(provider)!;
      
      // Verify API key vẫn valid
      if (this.apiKeyManager.isApiKeyValid(provider)) {
        return cachedProvider;
      } else {
        // Remove invalid provider từ cache
        this.providerCache.delete(provider);
      }
    }

    // Tạo provider mới
    const newProvider = this.createProvider(provider);
    this.providerCache.set(provider, newProvider);
    
    return newProvider;
  }

  // Lấy current provider
  public getCurrentProvider(): IAIProvider {
    const currentProvider = this.configManager.getCurrentProvider();
    return this.getProvider(currentProvider);
  }

  // Kiểm tra xem provider có available không
  public isProviderAvailable(provider: AIProvider): boolean {
    try {
      const apiKey = this.apiKeyManager.getValidApiKey(provider) || 
                     envLoader.getProviderApiKey(provider);
      return !!apiKey;
    } catch {
      return false;
    }
  }

  // Lấy danh sách providers available
  public getAvailableProviders(): AIProvider[] {
    return Object.values(AIProvider).filter(provider => 
      this.isProviderAvailable(provider)
    );
  }

  // Validate tất cả providers
  public async validateAllProviders(): Promise<Map<AIProvider, boolean>> {
    const results = new Map<AIProvider, boolean>();
    
    const validationPromises = Object.values(AIProvider).map(async (provider) => {
      try {
        if (this.isProviderAvailable(provider)) {
          const providerInstance = this.getProvider(provider);
          const apiKey = this.apiKeyManager.getValidApiKey(provider) || 
                         envLoader.getProviderApiKey(provider);
          
          if (apiKey) {
            const isValid = await providerInstance.validateApiKey(apiKey);
            results.set(provider, isValid);
          } else {
            results.set(provider, false);
          }
        } else {
          results.set(provider, false);
        }
      } catch (error) {
        console.error(`Failed to validate provider ${provider}:`, error);
        results.set(provider, false);
      }
    });

    await Promise.all(validationPromises);
    return results;
  }

  // Clear cache
  public clearCache(): void {
    this.providerCache.clear();
  }

  // Clear cache cho một provider cụ thể
  public clearProviderCache(provider: AIProvider): void {
    this.providerCache.delete(provider);
  }

  // Switch provider và clear cache
  public switchProvider(provider: AIProvider): void {
    if (!this.isProviderAvailable(provider)) {
      throw new Error(`Provider ${provider} is not available`);
    }

    this.configManager.setCurrentProvider(provider);
    this.clearCache(); // Clear tất cả cache khi switch provider
  }

  // Auto-switch to best available provider
  public async autoSwitchToBestProvider(): Promise<AIProvider | null> {
    const validationResults = await this.validateAllProviders();
    
    // Priority order cho providers
    const priorityOrder = [
      AIProvider.GOOGLE_GEMINI,
      AIProvider.OPENAI_GPT,
      AIProvider.PERPLEXITY,
      AIProvider.ANTHROPIC_CLAUDE,
    ];

    for (const provider of priorityOrder) {
      if (validationResults.get(provider) === true) {
        this.switchProvider(provider);
        return provider;
      }
    }

    return null;
  }
}

// Provider manager để quản lý việc sử dụng providers
export class AIProviderManager {
  private static instance: AIProviderManager;
  private factory: AIProviderFactory;
  private configManager: AIConfigManager;

  private constructor() {
    this.factory = AIProviderFactory.getInstance();
    this.configManager = AIConfigManager.getInstance();
  }

  public static getInstance(): AIProviderManager {
    if (!AIProviderManager.instance) {
      AIProviderManager.instance = new AIProviderManager();
    }
    return AIProviderManager.instance;
  }

  // Generate response với current provider
  public async generateResponse(prompt: string): Promise<string> {
    const provider = this.factory.getCurrentProvider();
    const modelConfig = this.configManager.getCurrentModelConfig();
    
    if (!modelConfig) {
      throw new Error('No model configuration found');
    }

    return await provider.generateResponse(prompt, modelConfig);
  }

  // Generate streaming response với current provider
  public async* generateStreamResponse(prompt: string): AsyncGenerator<string> {
    const provider = this.factory.getCurrentProvider();
    const modelConfig = this.configManager.getCurrentModelConfig();
    
    if (!modelConfig) {
      throw new Error('No model configuration found');
    }

    yield* provider.generateStreamResponse(prompt, modelConfig);
  }

  // Generate response với provider cụ thể
  public async generateResponseWithProvider(
    prompt: string, 
    providerType: AIProvider,
    model?: AIModel
  ): Promise<string> {
    const provider = this.factory.getProvider(providerType);
    
    let modelConfig = this.configManager.getCurrentModelConfig();
    
    // Nếu chỉ định model khác, lấy config của model đó
    if (model) {
      const { getModelConfig } = require('./model-configs');
      modelConfig = getModelConfig(model);
    }
    
    if (!modelConfig) {
      throw new Error('No model configuration found');
    }

    return await provider.generateResponse(prompt, modelConfig);
  }

  // Web search với provider hỗ trợ
  public async searchWeb(query: string): Promise<any[]> {
    const currentProvider = this.factory.getCurrentProvider();
    
    if (currentProvider.supportsWebSearch() && currentProvider.searchWeb) {
      const webSearchConfig = this.configManager.getWebSearchConfig();
      return await currentProvider.searchWeb(query, webSearchConfig);
    }

    // Fallback: sử dụng Perplexity nếu available
    if (this.factory.isProviderAvailable(AIProvider.PERPLEXITY)) {
      const perplexityProvider = this.factory.getProvider(AIProvider.PERPLEXITY);
      const webSearchConfig = this.configManager.getWebSearchConfig();
      return await perplexityProvider.searchWeb!(query, webSearchConfig);
    }

    throw new Error('No web search capable provider available');
  }

  // Lấy provider status
  public async getProviderStatus(): Promise<{
    current: AIProvider;
    available: AIProvider[];
    validationResults: Map<AIProvider, boolean>;
  }> {
    const current = this.configManager.getCurrentProvider();
    const available = this.factory.getAvailableProviders();
    const validationResults = await this.factory.validateAllProviders();

    return {
      current,
      available,
      validationResults,
    };
  }

  // Health check cho current provider
  public async healthCheck(): Promise<{
    isHealthy: boolean;
    provider: AIProvider;
    model: AIModel;
    error?: string;
  }> {
    try {
      const provider = this.factory.getCurrentProvider();
      const currentProvider = this.configManager.getCurrentProvider();
      const currentModel = this.configManager.getCurrentModel();
      
      // Test với một prompt đơn giản
      const testPrompt = 'Xin chào';
      await provider.generateResponse(testPrompt, this.configManager.getCurrentModelConfig()!);
      
      return {
        isHealthy: true,
        provider: currentProvider,
        model: currentModel,
      };
    } catch (error) {
      return {
        isHealthy: false,
        provider: this.configManager.getCurrentProvider(),
        model: this.configManager.getCurrentModel(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instances
export const aiProviderFactory = AIProviderFactory.getInstance();
export const aiProviderManager = AIProviderManager.getInstance();
