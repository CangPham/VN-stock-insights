/**
 * @fileOverview Base AI Provider Implementation
 * Lớp cơ sở cho tất cả AI providers
 */

import { AIProvider, AIModel, AIModelConfig, IAIProvider, WebSearchConfig } from '../types';

// Base class cho tất cả AI providers
export abstract class BaseAIProvider implements IAIProvider {
  public abstract readonly provider: AIProvider;
  public abstract readonly supportedModels: AIModel[];

  protected apiKey: string;
  protected baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  // Abstract methods phải được implement bởi subclasses
  public abstract validateApiKey(apiKey: string): Promise<boolean>;
  public abstract generateResponse(prompt: string, config: AIModelConfig): Promise<string>;
  public abstract generateStreamResponse(prompt: string, config: AIModelConfig): AsyncGenerator<string>;
  public abstract supportsWebSearch(): boolean;

  // Optional web search method
  public async searchWeb?(query: string, config: WebSearchConfig): Promise<any[]>;

  // Helper method để tạo headers chung
  protected getCommonHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'User-Agent': 'VN-Stock-Insights/1.0',
    };
  }

  // Helper method để xử lý HTTP errors
  protected async handleHttpError(response: Response): Promise<never> {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    try {
      const errorData = await response.json();
      if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // Ignore JSON parsing errors
    }

    throw new Error(errorMessage);
  }

  // Helper method để retry requests
  protected async retryRequest<T>(
    requestFn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
      }
    }

    throw lastError!;
  }

  // Helper method để validate model config
  protected validateModelConfig(config: AIModelConfig): void {
    if (config.provider !== this.provider) {
      throw new Error(`Model config provider mismatch. Expected ${this.provider}, got ${config.provider}`);
    }

    if (!this.supportedModels.includes(config.model)) {
      throw new Error(`Model ${config.model} is not supported by provider ${this.provider}`);
    }
  }

  // Helper method để chuẩn bị request body chung
  protected prepareRequestBody(prompt: string, config: AIModelConfig): Record<string, any> {
    return {
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      top_p: config.topP,
    };
  }

  // Helper method để extract text từ response
  protected extractTextFromResponse(response: any): string {
    // Mỗi provider sẽ override method này theo format riêng
    return response.text || response.content || '';
  }

  // Helper method để log requests (chỉ trong development)
  protected logRequest(method: string, url: string, body?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${this.provider}] ${method} ${url}`);
      if (body) {
        console.log(`[${this.provider}] Request body:`, JSON.stringify(body, null, 2));
      }
    }
  }

  // Helper method để log responses (chỉ trong development)
  protected logResponse(response: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${this.provider}] Response:`, JSON.stringify(response, null, 2));
    }
  }

  // Helper method để tạo timeout cho requests
  protected createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  // Helper method để thực hiện request với timeout
  protected async requestWithTimeout<T>(
    requestPromise: Promise<T>,
    timeoutMs: number = 30000
  ): Promise<T> {
    return Promise.race([
      requestPromise,
      this.createTimeoutPromise(timeoutMs)
    ]);
  }

  // Helper method để sanitize prompt
  protected sanitizePrompt(prompt: string): string {
    // Loại bỏ các ký tự không mong muốn và giới hạn độ dài
    return prompt
      .trim()
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .substring(0, 50000); // Limit length
  }

  // Helper method để format Vietnamese prompt
  protected formatVietnamesePrompt(prompt: string): string {
    const vietnameseContext = `Bạn là một chuyên gia phân tích tài chính chuyên về thị trường chứng khoán Việt Nam. 
Hãy trả lời bằng tiếng Việt một cách chuyên nghiệp và chi tiết.

${prompt}`;

    return this.sanitizePrompt(vietnameseContext);
  }

  // Helper method để parse streaming response
  protected async* parseStreamingResponse(
    response: Response
  ): AsyncGenerator<string> {
    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.trim() === '') continue;
          
          try {
            // Mỗi provider sẽ có format khác nhau, override method này
            const text = this.parseStreamingLine(line);
            if (text) {
              yield text;
            }
          } catch (error) {
            // Ignore parsing errors for individual lines
            console.warn(`Failed to parse streaming line: ${line}`, error);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // Abstract method để parse từng line trong streaming response
  protected abstract parseStreamingLine(line: string): string | null;

  // Helper method để tính cost estimate
  public estimateCost(inputTokens: number, outputTokens: number, model: AIModel): number {
    const config = this.getModelConfig(model);
    if (!config || !config.costPer1kTokens) {
      return 0;
    }

    const totalTokens = inputTokens + outputTokens;
    return (totalTokens / 1000) * config.costPer1kTokens;
  }

  // Helper method để lấy model config
  protected getModelConfig(model: AIModel): AIModelConfig | undefined {
    // Import động để tránh circular dependency
    const { getModelConfig } = require('../model-configs');
    return getModelConfig(model);
  }

  // Helper method để count tokens (approximation)
  protected estimateTokenCount(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English, 2-3 for Vietnamese
    const avgCharsPerToken = 3; // Adjusted for Vietnamese
    return Math.ceil(text.length / avgCharsPerToken);
  }

  // Helper method để validate response
  protected validateResponse(response: any): void {
    if (!response) {
      throw new Error('Empty response from AI provider');
    }

    // Mỗi provider có thể override để validate format riêng
  }

  // Helper method để format error messages
  protected formatError(error: any): Error {
    if (error instanceof Error) {
      return error;
    }

    if (typeof error === 'string') {
      return new Error(error);
    }

    if (error && typeof error === 'object') {
      const message = error.message || error.error || JSON.stringify(error);
      return new Error(message);
    }

    return new Error('Unknown error occurred');
  }
}
