/**
 * @fileOverview Tests for AI Configuration System
 * Comprehensive tests for the multi-AI provider configuration system
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AIProvider, AIModel, AIConfig } from '../types';
import { AIConfigManager } from '../config-manager';
import { APIKeyManager } from '../api-key-manager';
import { AIProviderFactory } from '../provider-factory';
import { envLoader } from '../env-loader';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock fetch for API key validation
global.fetch = jest.fn();

describe('AI Configuration System', () => {
  let configManager: AIConfigManager;
  let apiKeyManager: APIKeyManager;
  let providerFactory: AIProviderFactory;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Get fresh instances
    configManager = AIConfigManager.getInstance();
    apiKeyManager = APIKeyManager.getInstance();
    providerFactory = AIProviderFactory.getInstance();
  });

  afterEach(() => {
    // Clear any cached instances
    providerFactory.clearCache();
  });

  describe('AIConfigManager', () => {
    it('should create default configuration', () => {
      const config = configManager.getConfig();
      
      expect(config).toBeDefined();
      expect(config.currentProvider).toBe(AIProvider.GOOGLE_GEMINI);
      expect(config.currentModel).toBe(AIModel.GEMINI_2_0_FLASH);
      expect(config.general.language).toBe('vi');
      expect(config.general.currency).toBe('VND');
    });

    it('should update current provider', () => {
      configManager.setCurrentProvider(AIProvider.OPENAI_GPT);
      const config = configManager.getConfig();
      
      expect(config.currentProvider).toBe(AIProvider.OPENAI_GPT);
      expect(config.currentModel).toBe(AIModel.GPT_4O_MINI); // Should switch to default model for provider
    });

    it('should update current model', () => {
      configManager.setCurrentModel(AIModel.GEMINI_1_5_PRO);
      const config = configManager.getConfig();
      
      expect(config.currentModel).toBe(AIModel.GEMINI_1_5_PRO);
      expect(config.currentProvider).toBe(AIProvider.GOOGLE_GEMINI); // Should match model's provider
    });

    it('should save and load configuration from localStorage', () => {
      const testConfig = {
        currentProvider: AIProvider.OPENAI_GPT,
        currentModel: AIModel.GPT_4O,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(testConfig));
      
      // Create new instance to trigger loading
      const newConfigManager = AIConfigManager.getInstance();
      const config = newConfigManager.getConfig();
      
      expect(config.currentProvider).toBe(AIProvider.OPENAI_GPT);
      expect(config.currentModel).toBe(AIModel.GPT_4O);
    });

    it('should handle invalid localStorage data gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      const newConfigManager = AIConfigManager.getInstance();
      const config = newConfigManager.getConfig();
      
      // Should fall back to defaults
      expect(config.currentProvider).toBe(AIProvider.GOOGLE_GEMINI);
    });

    it('should update stock analysis configuration', () => {
      const updates = {
        technicalIndicators: {
          enabled: false,
          rsi: { enabled: false, period: 21, overbought: 80, oversold: 20 },
          macd: { enabled: false, fastPeriod: 10, slowPeriod: 20, signalPeriod: 8 },
          movingAverages: { enabled: false, periods: [10, 30, 100] },
          bollingerBands: { enabled: false, period: 15, standardDeviations: 1.5 },
        },
      };

      configManager.updateStockAnalysisConfig(updates);
      const config = configManager.getStockAnalysisConfig();
      
      expect(config.technicalIndicators.enabled).toBe(false);
      expect(config.technicalIndicators.rsi.period).toBe(21);
    });
  });

  describe('APIKeyManager', () => {
    beforeEach(() => {
      // Mock successful API validation
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    it('should validate API key format', () => {
      const geminiResult = apiKeyManager.validateApiKeyFormat(AIProvider.GOOGLE_GEMINI, 'AIzaTest123');
      expect(geminiResult.isValid).toBe(true);

      const openaiResult = apiKeyManager.validateApiKeyFormat(AIProvider.OPENAI_GPT, 'sk-test123');
      expect(openaiResult.isValid).toBe(true);

      const invalidResult = apiKeyManager.validateApiKeyFormat(AIProvider.GOOGLE_GEMINI, 'invalid');
      expect(invalidResult.isValid).toBe(false);
    });

    it('should set and validate API key', async () => {
      const result = await apiKeyManager.setApiKey(AIProvider.GOOGLE_GEMINI, 'AIzaTest123');
      
      expect(result.isValid).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-goog-api-key': 'AIzaTest123',
          }),
        })
      );
    });

    it('should handle API validation failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { message: 'Invalid API key' } }),
      });

      const result = await apiKeyManager.setApiKey(AIProvider.GOOGLE_GEMINI, 'AIzaInvalid');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid API key');
    });

    it('should mask API keys for display', () => {
      const masked = apiKeyManager.maskApiKey('AIzaTest123456789');
      expect(masked).toBe('AIza*********6789');
      
      const shortMasked = apiKeyManager.maskApiKey('short');
      expect(shortMasked).toBe('*****');
    });

    it('should get API key status', () => {
      const status = apiKeyManager.getApiKeyStatus(AIProvider.GOOGLE_GEMINI);
      expect(status).toHaveProperty('hasKey');
      expect(status).toHaveProperty('isValid');
    });

    it('should validate all API keys', async () => {
      await apiKeyManager.setApiKey(AIProvider.GOOGLE_GEMINI, 'AIzaTest123');
      await apiKeyManager.setApiKey(AIProvider.OPENAI_GPT, 'sk-test123');
      
      const results = await apiKeyManager.validateAllApiKeys();
      
      expect(results.size).toBeGreaterThan(0);
      expect(results.has(AIProvider.GOOGLE_GEMINI)).toBe(true);
    });
  });

  describe('AIProviderFactory', () => {
    beforeEach(() => {
      // Mock valid API keys
      jest.spyOn(apiKeyManager, 'getValidApiKey').mockImplementation((provider) => {
        switch (provider) {
          case AIProvider.GOOGLE_GEMINI:
            return 'AIzaTest123';
          case AIProvider.OPENAI_GPT:
            return 'sk-test123';
          default:
            return null;
        }
      });
    });

    it('should create provider instances', () => {
      const geminiProvider = providerFactory.createProvider(AIProvider.GOOGLE_GEMINI);
      expect(geminiProvider).toBeDefined();
      expect(geminiProvider.provider).toBe(AIProvider.GOOGLE_GEMINI);

      const openaiProvider = providerFactory.createProvider(AIProvider.OPENAI_GPT);
      expect(openaiProvider).toBeDefined();
      expect(openaiProvider.provider).toBe(AIProvider.OPENAI_GPT);
    });

    it('should throw error for missing API key', () => {
      jest.spyOn(apiKeyManager, 'getValidApiKey').mockReturnValue(null);
      jest.spyOn(envLoader, 'getProviderApiKey').mockReturnValue(null);

      expect(() => {
        providerFactory.createProvider(AIProvider.GOOGLE_GEMINI);
      }).toThrow('No valid API key found');
    });

    it('should cache provider instances', () => {
      const provider1 = providerFactory.getProvider(AIProvider.GOOGLE_GEMINI);
      const provider2 = providerFactory.getProvider(AIProvider.GOOGLE_GEMINI);
      
      expect(provider1).toBe(provider2); // Should be same instance
    });

    it('should clear cache when API key becomes invalid', () => {
      const provider1 = providerFactory.getProvider(AIProvider.GOOGLE_GEMINI);
      
      // Simulate API key becoming invalid
      jest.spyOn(apiKeyManager, 'isApiKeyValid').mockReturnValue(false);
      
      const provider2 = providerFactory.getProvider(AIProvider.GOOGLE_GEMINI);
      
      expect(provider1).not.toBe(provider2); // Should be different instance
    });

    it('should get available providers', () => {
      const available = providerFactory.getAvailableProviders();
      expect(available).toContain(AIProvider.GOOGLE_GEMINI);
      expect(available).toContain(AIProvider.OPENAI_GPT);
    });

    it('should validate all providers', async () => {
      const results = await providerFactory.validateAllProviders();
      expect(results).toBeInstanceOf(Map);
      expect(results.size).toBeGreaterThan(0);
    });
  });

  describe('Environment Loader', () => {
    it('should load provider API keys from environment', () => {
      // Mock process.env
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        GEMINI_API_KEY: 'AIzaEnvTest123',
        OPENAI_API_KEY: 'sk-envtest123',
      };

      const geminiKey = envLoader.getProviderApiKey(AIProvider.GOOGLE_GEMINI);
      const openaiKey = envLoader.getProviderApiKey(AIProvider.OPENAI_GPT);

      expect(geminiKey).toBe('AIzaEnvTest123');
      expect(openaiKey).toBe('sk-envtest123');

      // Restore original env
      process.env = originalEnv;
    });

    it('should validate environment setup', () => {
      const status = envLoader.validateEnvironmentSetup();
      expect(status).toHaveProperty('hasAnyProvider');
      expect(status).toHaveProperty('configuredProviders');
      expect(status).toHaveProperty('recommendations');
    });

    it('should generate environment template', () => {
      const template = envLoader.generateEnvTemplate();
      expect(template).toContain('GEMINI_API_KEY');
      expect(template).toContain('OPENAI_API_KEY');
      expect(template).toContain('GOOGLE_SEARCH_API_KEY');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete configuration workflow', async () => {
      // 1. Set API key
      const apiResult = await apiKeyManager.setApiKey(AIProvider.GOOGLE_GEMINI, 'AIzaTest123');
      expect(apiResult.isValid).toBe(true);

      // 2. Switch provider
      configManager.setCurrentProvider(AIProvider.GOOGLE_GEMINI);
      
      // 3. Create provider instance
      const provider = providerFactory.getProvider(AIProvider.GOOGLE_GEMINI);
      expect(provider).toBeDefined();

      // 4. Verify configuration
      const config = configManager.getConfig();
      expect(config.currentProvider).toBe(AIProvider.GOOGLE_GEMINI);
    });

    it('should handle provider switching with fallback', async () => {
      // Set up multiple providers
      await apiKeyManager.setApiKey(AIProvider.GOOGLE_GEMINI, 'AIzaTest123');
      await apiKeyManager.setApiKey(AIProvider.OPENAI_GPT, 'sk-test123');

      // Switch to OpenAI
      configManager.setCurrentProvider(AIProvider.OPENAI_GPT);
      let config = configManager.getConfig();
      expect(config.currentProvider).toBe(AIProvider.OPENAI_GPT);

      // Simulate OpenAI becoming unavailable
      jest.spyOn(apiKeyManager, 'isApiKeyValid').mockImplementation((provider) => {
        return provider !== AIProvider.OPENAI_GPT;
      });

      // Should be able to switch to available provider
      const switchResult = await providerFactory.autoSwitchToBestProvider();
      expect(switchResult).toBe(AIProvider.GOOGLE_GEMINI);
    });

    it('should export and import configuration', () => {
      // Set up configuration
      configManager.setCurrentProvider(AIProvider.OPENAI_GPT);
      configManager.updateStockAnalysisConfig({
        technicalIndicators: { enabled: false, rsi: { enabled: false, period: 21, overbought: 80, oversold: 20 }, macd: { enabled: false, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 }, movingAverages: { enabled: false, periods: [20, 50, 200] }, bollingerBands: { enabled: false, period: 20, standardDeviations: 2 } },
      });

      // Export configuration
      const exported = configManager.exportConfig();
      const exportedData = JSON.parse(exported);
      expect(exportedData.currentProvider).toBe(AIProvider.OPENAI_GPT);

      // Reset to defaults
      configManager.resetToDefaults();
      let config = configManager.getConfig();
      expect(config.currentProvider).toBe(AIProvider.GOOGLE_GEMINI);

      // Import configuration
      configManager.importConfig(exported);
      config = configManager.getConfig();
      expect(config.currentProvider).toBe(AIProvider.OPENAI_GPT);
    });
  });
});
