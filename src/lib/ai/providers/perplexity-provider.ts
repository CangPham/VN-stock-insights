/**
 * @fileOverview Perplexity AI Provider
 * Implementation cho Perplexity API với khả năng tìm kiếm web
 */

import { AIProvider, AIModel, AIModelConfig, WebSearchConfig } from '../types';
import { BaseAIProvider } from './base-provider';

export class PerplexityProvider extends BaseAIProvider {
  public readonly provider = AIProvider.PERPLEXITY;
  public readonly supportedModels = [
    AIModel.PERPLEXITY_SONAR_LARGE,
    AIModel.PERPLEXITY_SONAR_SMALL,
  ];

  constructor(apiKey: string) {
    super(apiKey, 'https://api.perplexity.ai');
  }

  public async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      // Perplexity không có models endpoint, thử một request nhỏ
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
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

      // 400 có thể là expected cho request minimal, nhưng auth OK
      return response.ok || response.status === 400;
    } catch {
      return false;
    }
  }

  public async generateResponse(prompt: string, config: AIModelConfig): Promise<string> {
    this.validateModelConfig(config);
    
    const formattedPrompt = this.formatVietnamesePrompt(prompt);
    const requestBody = this.preparePerplexityRequestBody(formattedPrompt, config);
    
    const url = `${this.baseUrl}/chat/completions`;
    
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

    return this.extractPerplexityResponse(data);
  }

  public async* generateStreamResponse(prompt: string, config: AIModelConfig): AsyncGenerator<string> {
    this.validateModelConfig(config);
    
    const formattedPrompt = this.formatVietnamesePrompt(prompt);
    const requestBody = {
      ...this.preparePerplexityRequestBody(formattedPrompt, config),
      stream: true,
    };
    
    const url = `${this.baseUrl}/chat/completions`;
    
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
    return true; // Perplexity có built-in web search
  }

  public async searchWeb(query: string, config: WebSearchConfig): Promise<any[]> {
    // Perplexity tự động tìm kiếm web khi sử dụng online models
    // Chúng ta có thể tạo một prompt đặc biệt để tìm kiếm
    const searchPrompt = `Tìm kiếm thông tin mới nhất về: ${query}. 
    Hãy cung cấp thông tin từ các nguồn đáng tin cậy và cập nhật.
    Tập trung vào thông tin tài chính và thị trường chứng khoán Việt Nam nếu có liên quan.`;

    const modelConfig = this.getModelConfig(AIModel.PERPLEXITY_SONAR_SMALL);
    if (!modelConfig) {
      throw new Error('Model config not found for Perplexity search');
    }

    const response = await this.generateResponse(searchPrompt, modelConfig);
    
    // Parse response để extract sources nếu có
    return this.extractSearchResults(response);
  }

  // Perplexity-specific methods

  private getPerplexityModelName(model: AIModel): string {
    switch (model) {
      case AIModel.PERPLEXITY_SONAR_LARGE:
        return 'llama-3.1-sonar-large-128k-online';
      case AIModel.PERPLEXITY_SONAR_SMALL:
        return 'llama-3.1-sonar-small-128k-online';
      default:
        throw new Error(`Unsupported Perplexity model: ${model}`);
    }
  }

  private preparePerplexityRequestBody(prompt: string, config: AIModelConfig): any {
    return {
      model: this.getPerplexityModelName(config.model),
      messages: [
        {
          role: 'system',
          content: 'Bạn là một chuyên gia phân tích tài chính Việt Nam. Hãy cung cấp thông tin chính xác và cập nhật từ các nguồn đáng tin cậy.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      top_p: config.topP,
      stream: false,
      return_citations: true, // Perplexity feature để trả về citations
      return_images: false,
    };
  }

  private extractPerplexityResponse(data: any): string {
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No choices in Perplexity response');
    }

    const choice = data.choices[0];
    
    if (!choice.message || !choice.message.content) {
      throw new Error('No content in Perplexity response');
    }

    let text = choice.message.content.trim();

    // Thêm citations nếu có
    if (data.citations && data.citations.length > 0) {
      text += '\n\n**Nguồn tham khảo:**\n';
      data.citations.forEach((citation: any, index: number) => {
        text += `${index + 1}. ${citation.title || citation.url}\n`;
      });
    }

    if (!text) {
      throw new Error('Empty text in Perplexity response');
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
      
      if (!choice.delta || !choice.delta.content) {
        return null;
      }

      return choice.delta.content;
    } catch (error) {
      console.warn('Failed to parse Perplexity streaming line:', error);
      return null;
    }
  }

  // Extract search results từ Perplexity response
  private extractSearchResults(response: string): any[] {
    const results: any[] = [];
    
    // Tìm các URL trong response
    const urlRegex = /https?:\/\/[^\s\)]+/g;
    const urls = response.match(urlRegex) || [];
    
    // Tìm các citations
    const citationRegex = /\[(\d+)\]/g;
    const citations = response.match(citationRegex) || [];
    
    urls.forEach((url, index) => {
      results.push({
        title: `Nguồn ${index + 1}`,
        url: url,
        snippet: '', // Perplexity không cung cấp snippet riêng
        relevance: 1 - (index * 0.1), // Giảm dần relevance
      });
    });

    return results;
  }

  // Override để tối ưu cho Vietnamese financial queries
  protected formatVietnamesePrompt(prompt: string): string {
    const vietnameseContext = `Bạn là một chuyên gia phân tích tài chính hàng đầu tại Việt Nam với khả năng truy cập thông tin thời gian thực.

Nhiệm vụ của bạn:
- Tìm kiếm và phân tích thông tin mới nhất từ internet
- Đưa ra phân tích dựa trên dữ liệu cập nhật
- Trích dẫn nguồn thông tin đáng tin cậy
- Sử dụng thuật ngữ tài chính Việt Nam chính xác

Hãy trả lời bằng tiếng Việt một cách chuyên nghiệp và cung cấp nguồn tham khảo:

${prompt}`;

    return this.sanitizePrompt(vietnameseContext);
  }

  // Method để tìm kiếm tin tức tài chính cụ thể
  public async searchFinancialNews(
    stockCode: string, 
    timeframe: '1d' | '7d' | '30d' = '7d'
  ): Promise<any[]> {
    const timeframeText = {
      '1d': 'hôm nay',
      '7d': '7 ngày qua',
      '30d': '30 ngày qua',
    }[timeframe];

    const searchPrompt = `Tìm kiếm tin tức mới nhất về cổ phiếu ${stockCode} trong ${timeframeText}. 
    Bao gồm:
    - Tin tức công ty
    - Báo cáo tài chính
    - Phân tích của chuyên gia
    - Biến động giá cổ phiếu
    - Các sự kiện quan trọng
    
    Hãy cung cấp thông tin từ các nguồn đáng tin cậy như CafeF, VietStock, Đầu tư Chứng khoán, v.v.`;

    const modelConfig = this.getModelConfig(AIModel.PERPLEXITY_SONAR_SMALL);
    if (!modelConfig) {
      throw new Error('Model config not found for financial news search');
    }

    const response = await this.generateResponse(searchPrompt, modelConfig);
    return this.extractSearchResults(response);
  }

  // Method để phân tích sentiment từ web search
  public async analyzeSentiment(stockCode: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
    summary: string;
    sources: string[];
  }> {
    const sentimentPrompt = `Phân tích tình cảm thị trường về cổ phiếu ${stockCode} dựa trên:
    - Tin tức gần đây
    - Ý kiến chuyên gia
    - Phản ứng của nhà đầu tư
    - Xu hướng thảo luận trên mạng xã hội
    
    Đánh giá tình cảm: tích cực, tiêu cực, hoặc trung tính
    Mức độ tin cậy: từ 0-100%
    Tóm tắt lý do và nguồn thông tin.`;

    const modelConfig = this.getModelConfig(AIModel.PERPLEXITY_SONAR_LARGE);
    if (!modelConfig) {
      throw new Error('Model config not found for sentiment analysis');
    }

    const response = await this.generateResponse(sentimentPrompt, modelConfig);
    
    // Parse response để extract sentiment data
    return this.parseSentimentResponse(response);
  }

  private parseSentimentResponse(response: string): {
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
    summary: string;
    sources: string[];
  } {
    // Simple parsing logic - có thể cải thiện với regex phức tạp hơn
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    let confidence = 50;

    if (response.toLowerCase().includes('tích cực') || response.toLowerCase().includes('positive')) {
      sentiment = 'positive';
    } else if (response.toLowerCase().includes('tiêu cực') || response.toLowerCase().includes('negative')) {
      sentiment = 'negative';
    }

    // Extract confidence từ response
    const confidenceMatch = response.match(/(\d+)%/);
    if (confidenceMatch) {
      confidence = parseInt(confidenceMatch[1]);
    }

    // Extract sources
    const sources = this.extractSearchResults(response).map(result => result.url);

    return {
      sentiment,
      confidence,
      summary: response,
      sources,
    };
  }
}
