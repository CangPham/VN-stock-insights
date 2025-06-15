/**
 * @fileOverview Google Gemini AI Provider
 * Implementation cho Google Gemini API
 */

import { AIProvider, AIModel, AIModelConfig } from '../types';
import { BaseAIProvider } from './base-provider';

export class GeminiProvider extends BaseAIProvider {
  public readonly provider = AIProvider.GOOGLE_GEMINI;
  public readonly supportedModels = [
    AIModel.GEMINI_2_0_FLASH,
    AIModel.GEMINI_1_5_PRO,
    AIModel.GEMINI_1_5_FLASH,
  ];

  constructor(apiKey: string) {
    super(apiKey, 'https://generativelanguage.googleapis.com');
  }

  public async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/v1beta/models`, {
        headers: {
          'x-goog-api-key': apiKey,
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
    const requestBody = this.prepareGeminiRequestBody(formattedPrompt, config);
    
    const url = `${this.baseUrl}/v1beta/models/${this.getGeminiModelName(config.model)}:generateContent`;
    
    this.logRequest('POST', url, requestBody);

    const response = await this.requestWithTimeout(
      fetch(url, {
        method: 'POST',
        headers: {
          ...this.getCommonHeaders(),
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify(requestBody),
      })
    );

    if (!response.ok) {
      await this.handleHttpError(response);
    }

    const data = await response.json();
    this.logResponse(data);

    return this.extractGeminiResponse(data);
  }

  public async* generateStreamResponse(prompt: string, config: AIModelConfig): AsyncGenerator<string> {
    this.validateModelConfig(config);
    
    const formattedPrompt = this.formatVietnamesePrompt(prompt);
    const requestBody = this.prepareGeminiRequestBody(formattedPrompt, config);
    
    const url = `${this.baseUrl}/v1beta/models/${this.getGeminiModelName(config.model)}:streamGenerateContent`;
    
    this.logRequest('POST', url, requestBody);

    const response = await this.requestWithTimeout(
      fetch(url, {
        method: 'POST',
        headers: {
          ...this.getCommonHeaders(),
          'x-goog-api-key': this.apiKey,
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
    return false; // Gemini không có built-in web search
  }

  // Gemini-specific methods

  private getGeminiModelName(model: AIModel): string {
    switch (model) {
      case AIModel.GEMINI_2_0_FLASH:
        return 'gemini-2.0-flash-exp';
      case AIModel.GEMINI_1_5_PRO:
        return 'gemini-1.5-pro';
      case AIModel.GEMINI_1_5_FLASH:
        return 'gemini-1.5-flash';
      default:
        throw new Error(`Unsupported Gemini model: ${model}`);
    }
  }

  private prepareGeminiRequestBody(prompt: string, config: AIModelConfig): any {
    return {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: config.temperature,
        topP: config.topP,
        maxOutputTokens: config.maxTokens,
        candidateCount: 1,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
      ],
    };
  }

  private extractGeminiResponse(data: any): string {
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No candidates in Gemini response');
    }

    const candidate = data.candidates[0];
    
    if (candidate.finishReason === 'SAFETY') {
      throw new Error('Response blocked by Gemini safety filters');
    }

    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      throw new Error('No content in Gemini response');
    }

    const text = candidate.content.parts
      .map((part: any) => part.text || '')
      .join('')
      .trim();

    if (!text) {
      throw new Error('Empty text in Gemini response');
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
      
      if (!data.candidates || data.candidates.length === 0) {
        return null;
      }

      const candidate = data.candidates[0];
      
      if (candidate.finishReason === 'SAFETY') {
        throw new Error('Response blocked by Gemini safety filters');
      }

      if (!candidate.content || !candidate.content.parts) {
        return null;
      }

      return candidate.content.parts
        .map((part: any) => part.text || '')
        .join('');
    } catch (error) {
      console.warn('Failed to parse Gemini streaming line:', error);
      return null;
    }
  }

  // Gemini-specific utility methods

  public async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v1beta/models`, {
        headers: {
          'x-goog-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`);
      }

      const data = await response.json();
      return data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      console.error('Failed to list Gemini models:', error);
      return [];
    }
  }

  public async getModelInfo(model: AIModel): Promise<any> {
    try {
      const modelName = this.getGeminiModelName(model);
      const response = await fetch(`${this.baseUrl}/v1beta/models/${modelName}`, {
        headers: {
          'x-goog-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get model info: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get Gemini model info:', error);
      return null;
    }
  }

  // Override để tối ưu cho tiếng Việt
  protected formatVietnamesePrompt(prompt: string): string {
    const vietnameseContext = `Bạn là một chuyên gia phân tích tài chính hàng đầu tại Việt Nam với hơn 15 năm kinh nghiệm trong lĩnh vực chứng khoán và đầu tư. 

Nhiệm vụ của bạn:
- Phân tích chuyên sâu và khách quan
- Đưa ra khuyến nghị dựa trên dữ liệu thực tế
- Sử dụng thuật ngữ tài chính Việt Nam chính xác
- Cung cấp thông tin có giá trị cho nhà đầu tư

Hãy trả lời bằng tiếng Việt một cách chuyên nghiệp, chi tiết và dễ hiểu:

${prompt}`;

    return this.sanitizePrompt(vietnameseContext);
  }

  // Override để tối ưu token counting cho tiếng Việt
  protected estimateTokenCount(text: string): number {
    // Gemini có token counting tốt hơn cho tiếng Việt
    // Ước tính: 1 token ≈ 2.5 ký tự cho tiếng Việt
    return Math.ceil(text.length / 2.5);
  }

  // Method để sử dụng Gemini tools (nếu cần)
  public async generateWithTools(
    prompt: string, 
    config: AIModelConfig, 
    tools: any[]
  ): Promise<string> {
    this.validateModelConfig(config);
    
    const formattedPrompt = this.formatVietnamesePrompt(prompt);
    const requestBody = {
      ...this.prepareGeminiRequestBody(formattedPrompt, config),
      tools: tools,
    };
    
    const url = `${this.baseUrl}/v1beta/models/${this.getGeminiModelName(config.model)}:generateContent`;
    
    const response = await this.requestWithTimeout(
      fetch(url, {
        method: 'POST',
        headers: {
          ...this.getCommonHeaders(),
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify(requestBody),
      })
    );

    if (!response.ok) {
      await this.handleHttpError(response);
    }

    const data = await response.json();
    return this.extractGeminiResponse(data);
  }
}
