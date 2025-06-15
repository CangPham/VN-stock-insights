/**
 * @fileOverview Environment Variable Loader for AI Providers
 * Tải và quản lý biến môi trường cho các nhà cung cấp AI
 */

import { AIProvider } from './types';

// Mapping từ AI Provider đến environment variable names
const PROVIDER_ENV_KEYS: Record<AIProvider, string[]> = {
  [AIProvider.GOOGLE_GEMINI]: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
  [AIProvider.OPENAI_GPT]: ['OPENAI_API_KEY'],
  [AIProvider.PERPLEXITY]: ['PERPLEXITY_API_KEY'],
  [AIProvider.ANTHROPIC_CLAUDE]: ['ANTHROPIC_API_KEY'],
};

// Web search provider environment keys
const WEB_SEARCH_ENV_KEYS = {
  google: {
    apiKey: 'GOOGLE_SEARCH_API_KEY',
    engineId: 'GOOGLE_SEARCH_ENGINE_ID',
  },
  bing: {
    apiKey: 'BING_SEARCH_API_KEY',
  },
  serper: {
    apiKey: 'SERPER_API_KEY',
  },
  tavily: {
    apiKey: 'TAVILY_API_KEY',
  },
};

// Environment variable loader class
export class EnvironmentLoader {
  private static instance: EnvironmentLoader;
  private envVars: Map<string, string> = new Map();

  private constructor() {
    this.loadEnvironmentVariables();
  }

  public static getInstance(): EnvironmentLoader {
    if (!EnvironmentLoader.instance) {
      EnvironmentLoader.instance = new EnvironmentLoader();
    }
    return EnvironmentLoader.instance;
  }

  // Load tất cả environment variables
  private loadEnvironmentVariables(): void {
    // Load từ process.env
    Object.entries(process.env).forEach(([key, value]) => {
      if (value) {
        this.envVars.set(key, value);
      }
    });

    // Nếu đang chạy trong browser, load từ Next.js public env vars
    if (typeof window !== 'undefined') {
      // Chỉ load các public env vars (NEXT_PUBLIC_*)
      Object.entries(process.env).forEach(([key, value]) => {
        if (key.startsWith('NEXT_PUBLIC_') && value) {
          this.envVars.set(key, value);
        }
      });
    }
  }

  // Lấy API key cho một provider từ environment variables
  public getProviderApiKey(provider: AIProvider): string | null {
    const possibleKeys = PROVIDER_ENV_KEYS[provider];
    if (!possibleKeys) {
      return null;
    }

    for (const key of possibleKeys) {
      const value = this.envVars.get(key);
      if (value && value.trim().length > 0) {
        return value.trim();
      }
    }

    return null;
  }

  // Lấy web search API key
  public getWebSearchApiKey(provider: 'google' | 'bing' | 'serper' | 'tavily'): string | null {
    const config = WEB_SEARCH_ENV_KEYS[provider];
    if (!config) {
      return null;
    }

    const value = this.envVars.get(config.apiKey);
    return value && value.trim().length > 0 ? value.trim() : null;
  }

  // Lấy Google Search Engine ID
  public getGoogleSearchEngineId(): string | null {
    const value = this.envVars.get(WEB_SEARCH_ENV_KEYS.google.engineId);
    return value && value.trim().length > 0 ? value.trim() : null;
  }

  // Kiểm tra xem provider có được cấu hình trong env vars không
  public isProviderConfiguredInEnv(provider: AIProvider): boolean {
    return this.getProviderApiKey(provider) !== null;
  }

  // Kiểm tra xem web search provider có được cấu hình không
  public isWebSearchProviderConfigured(provider: 'google' | 'bing' | 'serper' | 'tavily'): boolean {
    const apiKey = this.getWebSearchApiKey(provider);
    if (!apiKey) return false;

    // Google cần thêm search engine ID
    if (provider === 'google') {
      return this.getGoogleSearchEngineId() !== null;
    }

    return true;
  }

  // Lấy danh sách providers được cấu hình trong env
  public getConfiguredProviders(): AIProvider[] {
    return Object.values(AIProvider).filter(provider => 
      this.isProviderConfiguredInEnv(provider)
    );
  }

  // Lấy danh sách web search providers được cấu hình
  public getConfiguredWebSearchProviders(): Array<'google' | 'bing' | 'serper' | 'tavily'> {
    return (['google', 'bing', 'serper', 'tavily'] as const).filter(provider =>
      this.isWebSearchProviderConfigured(provider)
    );
  }

  // Lấy environment variable bất kỳ
  public getEnvVar(key: string): string | null {
    const value = this.envVars.get(key);
    return value && value.trim().length > 0 ? value.trim() : null;
  }

  // Set environment variable (chỉ trong runtime, không persist)
  public setEnvVar(key: string, value: string): void {
    this.envVars.set(key, value);
  }

  // Reload environment variables
  public reload(): void {
    this.envVars.clear();
    this.loadEnvironmentVariables();
  }

  // Validate environment setup
  public validateEnvironmentSetup(): {
    hasAnyProvider: boolean;
    configuredProviders: AIProvider[];
    missingProviders: AIProvider[];
    webSearchProviders: Array<'google' | 'bing' | 'serper' | 'tavily'>;
    recommendations: string[];
  } {
    const configuredProviders = this.getConfiguredProviders();
    const missingProviders = Object.values(AIProvider).filter(
      provider => !configuredProviders.includes(provider)
    );
    const webSearchProviders = this.getConfiguredWebSearchProviders();

    const recommendations: string[] = [];

    if (configuredProviders.length === 0) {
      recommendations.push('Cần cấu hình ít nhất một AI provider để sử dụng ứng dụng');
    }

    if (webSearchProviders.length === 0) {
      recommendations.push('Nên cấu hình ít nhất một web search provider để có thông tin thời gian thực');
    }

    if (!configuredProviders.includes(AIProvider.GOOGLE_GEMINI)) {
      recommendations.push('Google Gemini được khuyến nghị cho phân tích cổ phiếu Việt Nam');
    }

    if (!webSearchProviders.includes('google') && !webSearchProviders.includes('serper')) {
      recommendations.push('Google Search hoặc Serper được khuyến nghị cho tìm kiếm tin tức tài chính');
    }

    return {
      hasAnyProvider: configuredProviders.length > 0,
      configuredProviders,
      missingProviders,
      webSearchProviders,
      recommendations,
    };
  }

  // Tạo environment file template
  public generateEnvTemplate(): string {
    const template = `# AI Provider API Keys
# ===================

# Google Gemini API Key
# Get your API key from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_API_KEY=your_gemini_api_key_here

# OpenAI API Key
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here

# Perplexity API Key
# Get your API key from: https://www.perplexity.ai/settings/api
PERPLEXITY_API_KEY=your_perplexity_api_key_here

# Anthropic Claude API Key
# Get your API key from: https://console.anthropic.com/
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Web Search API Keys
# ===================

# Google Custom Search API
# Get your API key from: https://developers.google.com/custom-search/v1/introduction
GOOGLE_SEARCH_API_KEY=your_google_search_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here

# Bing Search API
# Get your API key from: https://www.microsoft.com/en-us/bing/apis/bing-web-search-api
BING_SEARCH_API_KEY=your_bing_search_api_key_here

# Serper API (Google Search alternative)
# Get your API key from: https://serper.dev/
SERPER_API_KEY=your_serper_api_key_here

# Tavily Search API
# Get your API key from: https://tavily.com/
TAVILY_API_KEY=your_tavily_api_key_here

# Application Settings
# ====================
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:9002`;

    return template;
  }

  // Log environment status (chỉ trong development)
  public logEnvironmentStatus(): void {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    const status = this.validateEnvironmentSetup();
    
    console.log('🔧 AI Environment Status:');
    console.log(`   Configured Providers: ${status.configuredProviders.join(', ') || 'None'}`);
    console.log(`   Web Search Providers: ${status.webSearchProviders.join(', ') || 'None'}`);
    
    if (status.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      status.recommendations.forEach(rec => console.log(`   - ${rec}`));
    }
  }
}

// Export singleton instance
export const envLoader = EnvironmentLoader.getInstance();
