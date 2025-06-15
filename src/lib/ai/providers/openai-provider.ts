/**
 * @fileOverview OpenAI GPT Provider
 * Implementation cho OpenAI API
 */

import { AIProvider, AIModel, AIModelConfig } from '../types';
import { BaseAIProvider } from './base-provider';

export class OpenAIProvider extends BaseAIProvider {
  public readonly provider = AIProvider.OPENAI_GPT;
  public readonly supportedModels = [
    AIModel.GPT_4O,
    AIModel.GPT_4O_MINI,
    AIModel.GPT_4_TURBO,
  ];

  constructor(apiKey: string) {
    super(apiKey, 'https://api.openai.com');
  }

  public async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  public async generateResponse(prompt: string, config: AIModelConfig): Promise<string> {
    this.validateModelConfig(config);
    
    const formattedPrompt = this.formatVietnamesePrompt(prompt);
    const requestBody = this.prepareOpenAIRequestBody(formattedPrompt, config);
    
    const url = `${this.baseUrl}/v1/chat/completions`;
    
    this.logRequest('POST', url, requestBody);

    const response = await this.requestWithTimeout(
      fetch(url, {
        method: 'POST',
        headers: {
          ...this.getCommonHeaders(),
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      })
    );

    if (!response.ok) {
      await this.handleHttpError(response);
    }

    const data = await response.json();
    this.logResponse(data);

    return this.extractOpenAIResponse(data);
  }

  public async* generateStreamResponse(prompt: string, config: AIModelConfig): AsyncGenerator<string> {
    this.validateModelConfig(config);
    
    const formattedPrompt = this.formatVietnamesePrompt(prompt);
    const requestBody = {
      ...this.prepareOpenAIRequestBody(formattedPrompt, config),
      stream: true,
    };
    
    const url = `${this.baseUrl}/v1/chat/completions`;
    
    this.logRequest('POST', url, requestBody);

    const response = await this.requestWithTimeout(
      fetch(url, {
        method: 'POST',
        headers: {
          ...this.getCommonHeaders(),
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      })
    );

    if (!response.ok) {
      await this.handleHttpError(response);
    }

    yield* this.parseStreamingResponse(response);
  }

  public supportsWebSearch(): boolean {
    return false; // OpenAI không có built-in web search
  }

  // OpenAI-specific methods

  private getOpenAIModelName(model: AIModel): string {
    switch (model) {
      case AIModel.GPT_4O:
        return 'gpt-4o';
      case AIModel.GPT_4O_MINI:
        return 'gpt-4o-mini';
      case AIModel.GPT_4_TURBO:
        return 'gpt-4-turbo';
      default:
        throw new Error(`Unsupported OpenAI model: ${model}`);
    }
  }

  private prepareOpenAIRequestBody(prompt: string, config: AIModelConfig): any {
    return {
      model: this.getOpenAIModelName(config.model),
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      top_p: config.topP,
      frequency_penalty: config.frequencyPenalty,
      presence_penalty: config.presencePenalty,
      stream: false,
    };
  }

  private extractOpenAIResponse(data: any): string {
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No choices in OpenAI response');
    }

    const choice = data.choices[0];
    
    if (choice.finish_reason === 'content_filter') {
      throw new Error('Response blocked by OpenAI content filter');
    }

    if (!choice.message || !choice.message.content) {
      throw new Error('No content in OpenAI response');
    }

    const text = choice.message.content.trim();

    if (!text) {
      throw new Error('Empty text in OpenAI response');
    }

    return text;
  }

  protected parseStreamingLine(line: string): string | null {
    if (!line.startsWith('data: ')) {
      return null;
    }

    const jsonStr = line.substring(6);
    if (jsonStr === '[DONE]') {
      return null;
    }

    try {
      const data = JSON.parse(jsonStr);
      
      if (!data.choices || data.choices.length === 0) {
        return null;
      }

      const choice = data.choices[0];
      
      if (choice.finish_reason === 'content_filter') {
        throw new Error('Response blocked by OpenAI content filter');
      }

      if (!choice.delta || !choice.delta.content) {
        return null;
      }

      return choice.delta.content;
    } catch (error) {
      console.warn('Failed to parse OpenAI streaming line:', error);
      return null;
    }
  }

  // OpenAI-specific utility methods

  public async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data?.map((model: any) => model.id) || [];
    } catch (error) {
      console.error('Failed to list OpenAI models:', error);
      return [];
    }
  }

  public async getModelInfo(model: AIModel): Promise<any> {
    try {
      const modelName = this.getOpenAIModelName(model);
      const response = await fetch(`${this.baseUrl}/v1/models/${modelName}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get model info: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get OpenAI model info:', error);
      return null;
    }
  }

  // Method để sử dụng OpenAI tools/functions
  public async generateWithTools(
    prompt: string, 
    config: AIModelConfig, 
    tools: any[]
  ): Promise<string> {
    this.validateModelConfig(config);
    
    const formattedPrompt = this.formatVietnamesePrompt(prompt);
    const requestBody = {
      ...this.prepareOpenAIRequestBody(formattedPrompt, config),
      tools: tools,
      tool_choice: 'auto',
    };
    
    const url = `${this.baseUrl}/v1/chat/completions`;
    
    const response = await this.requestWithTimeout(
      fetch(url, {
        method: 'POST',
        headers: {
          ...this.getCommonHeaders(),
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      })
    );

    if (!response.ok) {
      await this.handleHttpError(response);
    }

    const data = await response.json();
    return this.extractOpenAIResponse(data);
  }

  // Method để sử dụng OpenAI vision capabilities
  public async generateWithVision(
    prompt: string,
    imageUrl: string,
    config: AIModelConfig
  ): Promise<string> {
    this.validateModelConfig(config);
    
    // Chỉ hỗ trợ vision cho GPT-4o models
    if (!config.supportsVision) {
      throw new Error(`Model ${config.model} does not support vision`);
    }

    const requestBody = {
      model: this.getOpenAIModelName(config.model),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: this.formatVietnamesePrompt(prompt),
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    };
    
    const url = `${this.baseUrl}/v1/chat/completions`;
    
    const response = await this.requestWithTimeout(
      fetch(url, {
        method: 'POST',
        headers: {
          ...this.getCommonHeaders(),
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      })
    );

    if (!response.ok) {
      await this.handleHttpError(response);
    }

    const data = await response.json();
    return this.extractOpenAIResponse(data);
  }

  // Override để tối ưu token counting cho OpenAI
  protected estimateTokenCount(text: string): number {
    // OpenAI sử dụng tiktoken, ước tính: 1 token ≈ 4 ký tự cho tiếng Anh, 3 cho tiếng Việt
    return Math.ceil(text.length / 3);
  }

  // Method để lấy usage statistics
  public extractUsageStats(response: any): {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null {
    if (!response.usage) {
      return null;
    }

    return {
      promptTokens: response.usage.prompt_tokens || 0,
      completionTokens: response.usage.completion_tokens || 0,
      totalTokens: response.usage.total_tokens || 0,
    };
  }
}
