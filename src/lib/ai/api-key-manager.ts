/**
 * @fileOverview API Key Management and Validation
 * Quản lý và xác thực API key cho các nhà cung cấp AI
 */

import { AIProvider, APIKeyConfig } from './types';
import { AIConfigManager } from './config-manager';

// Interface cho API key validator
interface APIKeyValidator {
  validateKey(apiKey: string): Promise<{ isValid: boolean; error?: string }>;
}

// Google Gemini API key validator
class GeminiAPIKeyValidator implements APIKeyValidator {
  async validateKey(apiKey: string): Promise<{ isValid: boolean; error?: string }> {
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
        headers: {
          'x-goog-api-key': apiKey,
        },
      });

      if (response.ok) {
        return { isValid: true };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return { 
          isValid: false, 
          error: errorData.error?.message || `HTTP ${response.status}: ${response.statusText}` 
        };
      }
    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      };
    }
  }
}

// OpenAI API key validator
class OpenAIAPIKeyValidator implements APIKeyValidator {
  async validateKey(apiKey: string): Promise<{ isValid: boolean; error?: string }> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return { isValid: true };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return { 
          isValid: false, 
          error: errorData.error?.message || `HTTP ${response.status}: ${response.statusText}` 
        };
      }
    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      };
    }
  }
}

// Perplexity API key validator
class PerplexityAPIKeyValidator implements APIKeyValidator {
  async validateKey(apiKey: string): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Perplexity doesn't have a models endpoint, so we'll do a minimal chat completion
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
        }),
      });

      if (response.ok || response.status === 400) {
        // 400 might be expected for minimal request, but auth should be OK
        return { isValid: true };
      } else if (response.status === 401 || response.status === 403) {
        return { isValid: false, error: 'Invalid API key' };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return { 
          isValid: false, 
          error: errorData.error?.message || `HTTP ${response.status}: ${response.statusText}` 
        };
      }
    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      };
    }
  }
}

// Anthropic Claude API key validator
class ClaudeAPIKeyValidator implements APIKeyValidator {
  async validateKey(apiKey: string): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Claude doesn't have a models endpoint, so we'll do a minimal message
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }],
        }),
      });

      if (response.ok || response.status === 400) {
        // 400 might be expected for minimal request, but auth should be OK
        return { isValid: true };
      } else if (response.status === 401 || response.status === 403) {
        return { isValid: false, error: 'Invalid API key' };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return { 
          isValid: false, 
          error: errorData.error?.message || `HTTP ${response.status}: ${response.statusText}` 
        };
      }
    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      };
    }
  }
}

// API Key Manager
export class APIKeyManager {
  private static instance: APIKeyManager;
  private configManager: AIConfigManager;
  private validators: Map<AIProvider, APIKeyValidator>;

  private constructor() {
    this.configManager = AIConfigManager.getInstance();
    this.validators = new Map([
      [AIProvider.GOOGLE_GEMINI, new GeminiAPIKeyValidator()],
      [AIProvider.OPENAI_GPT, new OpenAIAPIKeyValidator()],
      [AIProvider.PERPLEXITY, new PerplexityAPIKeyValidator()],
      [AIProvider.ANTHROPIC_CLAUDE, new ClaudeAPIKeyValidator()],
    ]);
  }

  public static getInstance(): APIKeyManager {
    if (!APIKeyManager.instance) {
      APIKeyManager.instance = new APIKeyManager();
    }
    return APIKeyManager.instance;
  }

  // Validate API key cho một provider
  public async validateApiKey(provider: AIProvider, apiKey: string): Promise<{ isValid: boolean; error?: string }> {
    const validator = this.validators.get(provider);
    if (!validator) {
      return { isValid: false, error: `No validator found for provider: ${provider}` };
    }

    try {
      const result = await validator.validateKey(apiKey);
      
      // Cập nhật kết quả validation vào config
      this.configManager.updateApiKeyValidation(provider, result.isValid, result.error);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      this.configManager.updateApiKeyValidation(provider, false, errorMessage);
      return { isValid: false, error: errorMessage };
    }
  }

  // Validate tất cả API keys đã cấu hình
  public async validateAllApiKeys(): Promise<Map<AIProvider, { isValid: boolean; error?: string }>> {
    const results = new Map<AIProvider, { isValid: boolean; error?: string }>();
    const config = this.configManager.getConfig();

    const validationPromises = Object.entries(config.apiKeys).map(async ([provider, keyConfig]) => {
      if (keyConfig.apiKey) {
        const result = await this.validateApiKey(provider as AIProvider, keyConfig.apiKey);
        results.set(provider as AIProvider, result);
      }
    });

    await Promise.all(validationPromises);
    return results;
  }

  // Lưu API key và validate
  public async setApiKey(provider: AIProvider, apiKey: string): Promise<{ isValid: boolean; error?: string }> {
    // Lưu API key trước
    this.configManager.setApiKey(provider, apiKey);
    
    // Sau đó validate
    return await this.validateApiKey(provider, apiKey);
  }

  // Xóa API key
  public removeApiKey(provider: AIProvider): void {
    this.configManager.resetProviderConfig(provider);
  }

  // Lấy API key (chỉ trả về nếu đã được validate)
  public getValidApiKey(provider: AIProvider): string | null {
    const config = this.configManager.getConfig();
    const keyConfig = config.apiKeys[provider];
    
    if (keyConfig && keyConfig.isValid && keyConfig.apiKey) {
      return keyConfig.apiKey;
    }
    
    return null;
  }

  // Kiểm tra xem API key có hợp lệ không
  public isApiKeyValid(provider: AIProvider): boolean {
    const config = this.configManager.getConfig();
    const keyConfig = config.apiKeys[provider];
    return !!keyConfig && keyConfig.isValid;
  }

  // Lấy thông tin trạng thái API key
  public getApiKeyStatus(provider: AIProvider): {
    hasKey: boolean;
    isValid: boolean;
    lastValidated?: Date;
    error?: string;
  } {
    const config = this.configManager.getConfig();
    const keyConfig = config.apiKeys[provider];

    if (!keyConfig || !keyConfig.apiKey) {
      return { hasKey: false, isValid: false };
    }

    return {
      hasKey: true,
      isValid: keyConfig.isValid,
      lastValidated: keyConfig.lastValidated,
      error: keyConfig.errorMessage,
    };
  }

  // Lấy danh sách providers đã cấu hình và hợp lệ
  public getValidProviders(): AIProvider[] {
    return Object.values(AIProvider).filter(provider => this.isApiKeyValid(provider));
  }

  // Kiểm tra xem có thể sử dụng provider hiện tại không
  public canUseCurrentProvider(): boolean {
    const currentProvider = this.configManager.getCurrentProvider();
    return this.isApiKeyValid(currentProvider);
  }

  // Tự động chuyển sang provider hợp lệ khác nếu provider hiện tại không hợp lệ
  public async switchToValidProvider(): Promise<AIProvider | null> {
    if (this.canUseCurrentProvider()) {
      return this.configManager.getCurrentProvider();
    }

    const validProviders = this.getValidProviders();
    if (validProviders.length > 0) {
      this.configManager.setCurrentProvider(validProviders[0]);
      return validProviders[0];
    }

    return null;
  }

  // Mask API key để hiển thị an toàn
  public maskApiKey(apiKey: string): string {
    if (apiKey.length <= 8) {
      return '*'.repeat(apiKey.length);
    }
    
    const start = apiKey.substring(0, 4);
    const end = apiKey.substring(apiKey.length - 4);
    const middle = '*'.repeat(apiKey.length - 8);
    
    return `${start}${middle}${end}`;
  }

  // Validate format của API key trước khi gửi request
  public validateApiKeyFormat(provider: AIProvider, apiKey: string): { isValid: boolean; error?: string } {
    if (!apiKey || apiKey.trim().length === 0) {
      return { isValid: false, error: 'API key không được để trống' };
    }

    switch (provider) {
      case AIProvider.GOOGLE_GEMINI:
        if (!apiKey.startsWith('AIza')) {
          return { isValid: false, error: 'Google API key phải bắt đầu bằng "AIza"' };
        }
        if (apiKey.length < 35) {
          return { isValid: false, error: 'Google API key quá ngắn' };
        }
        break;

      case AIProvider.OPENAI_GPT:
        if (!apiKey.startsWith('sk-')) {
          return { isValid: false, error: 'OpenAI API key phải bắt đầu bằng "sk-"' };
        }
        if (apiKey.length < 40) {
          return { isValid: false, error: 'OpenAI API key quá ngắn' };
        }
        break;

      case AIProvider.PERPLEXITY:
        if (!apiKey.startsWith('pplx-')) {
          return { isValid: false, error: 'Perplexity API key phải bắt đầu bằng "pplx-"' };
        }
        break;

      case AIProvider.ANTHROPIC_CLAUDE:
        if (!apiKey.startsWith('sk-ant-')) {
          return { isValid: false, error: 'Anthropic API key phải bắt đầu bằng "sk-ant-"' };
        }
        break;

      default:
        return { isValid: false, error: 'Provider không được hỗ trợ' };
    }

    return { isValid: true };
  }
}
