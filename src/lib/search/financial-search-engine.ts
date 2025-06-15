/**
 * @fileOverview Financial Search Engine
 * Engine tìm kiếm chuyên biệt cho thông tin tài chính Việt Nam
 */

import {
  SearchProvider,
  SearchResult,
  SearchConfig,
  FinancialNewsSearch,
  MarketDataSearch,
  NewsSentimentResult,
  MarketDataValidation,
  IFinancialSearchEngine,
  SearchQueryBuilder,
} from './types';
import { GoogleSearchProvider } from './providers/google-search';
import { envLoader } from '../ai/env-loader';

export class FinancialSearchEngine implements IFinancialSearchEngine {
  private searchProviders: Map<SearchProvider, any> = new Map();
  private defaultConfig: SearchConfig;

  constructor() {
    this.defaultConfig = {
      provider: SearchProvider.GOOGLE,
      apiKey: '',
      maxResults: 10,
      language: 'vi',
      region: 'vn',
      safeSearch: 'moderate',
      freshness: 'all',
      includeImages: false,
      includeNews: true,
      includeVideos: false,
      timeout: 10000,
    };

    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize Google Search if available
    const googleApiKey = envLoader.getWebSearchApiKey('google');
    const googleEngineId = envLoader.getGoogleSearchEngineId();
    
    if (googleApiKey && googleEngineId) {
      this.searchProviders.set(
        SearchProvider.GOOGLE,
        new GoogleSearchProvider(googleApiKey, googleEngineId)
      );
    }

    // TODO: Initialize other providers (Bing, Serper, Tavily)
  }

  public async searchFinancialNews(params: FinancialNewsSearch): Promise<SearchResult[]> {
    const query = SearchQueryBuilder.buildFinancialNewsQuery(params);
    
    const config: SearchConfig = {
      ...this.defaultConfig,
      freshness: this.mapTimeframeToFreshness(params.timeframe),
      maxResults: 20, // More results for news
    };

    const results = await this.searchWithFallback(query, config);
    
    // Filter and enhance results for financial news
    return this.enhanceFinancialNewsResults(results, params);
  }

  public async searchMarketData(params: MarketDataSearch): Promise<any> {
    const query = SearchQueryBuilder.buildMarketDataQuery(params);
    
    const config: SearchConfig = {
      ...this.defaultConfig,
      freshness: this.mapTimeframeToFreshness(params.timeframe),
      maxResults: 15,
    };

    const results = await this.searchWithFallback(query, config);
    
    // Extract and structure market data
    return this.extractMarketData(results, params);
  }

  public async searchCompanyInfo(stockCode: string): Promise<any> {
    const queries = [
      `"${stockCode}" thông tin công ty`,
      `"${stockCode}" báo cáo tài chính`,
      `"${stockCode}" hoạt động kinh doanh`,
      `"${stockCode}" lãnh đạo công ty`,
    ];

    const searchPromises = queries.map(query => 
      this.searchWithFallback(query, this.defaultConfig)
    );

    const allResults = await Promise.all(searchPromises);
    const flatResults = allResults.flat();

    return this.extractCompanyInfo(flatResults, stockCode);
  }

  public async searchSectorNews(sector: string): Promise<SearchResult[]> {
    const query = `"${sector}" ngành phân tích xu hướng (site:cafef.vn OR site:vietstock.vn OR site:ndh.vn)`;
    
    const config: SearchConfig = {
      ...this.defaultConfig,
      freshness: 'month',
      maxResults: 15,
    };

    return this.searchWithFallback(query, config);
  }

  public async searchAnalystReports(stockCode: string): Promise<SearchResult[]> {
    const query = `"${stockCode}" báo cáo phân tích khuyến nghị (site:vietstock.vn OR site:ndh.vn OR site:fpts.com.vn)`;
    
    const config: SearchConfig = {
      ...this.defaultConfig,
      freshness: 'month',
      maxResults: 10,
    };

    return this.searchWithFallback(query, config);
  }

  // Advanced search methods

  public async analyzeSentimentFromNews(stockCode: string, timeframe: string = '7d'): Promise<NewsSentimentResult> {
    const newsResults = await this.searchFinancialNews({
      stockCode,
      timeframe: timeframe as any,
    });

    return this.performSentimentAnalysis(newsResults, stockCode, timeframe);
  }

  public async validateMarketData(stockCode: string): Promise<MarketDataValidation> {
    const marketData = await this.searchMarketData({
      stockCode,
      dataTypes: ['price', 'volume', 'financials'],
      timeframe: '30d',
    });

    return this.performDataValidation(marketData, stockCode);
  }

  public async searchRealTimeNews(stockCode: string): Promise<SearchResult[]> {
    const query = `"${stockCode}" tin tức mới nhất hôm nay`;
    
    const config: SearchConfig = {
      ...this.defaultConfig,
      freshness: 'day',
      maxResults: 5,
    };

    return this.searchWithFallback(query, config);
  }

  public async searchPeerComparison(stockCode: string, sector: string): Promise<SearchResult[]> {
    const query = `"${stockCode}" so sánh "${sector}" cùng ngành`;
    
    const config: SearchConfig = {
      ...this.defaultConfig,
      maxResults: 10,
    };

    return this.searchWithFallback(query, config);
  }

  // Private helper methods

  private async searchWithFallback(query: string, config: SearchConfig): Promise<SearchResult[]> {
    const availableProviders = Array.from(this.searchProviders.keys());
    
    if (availableProviders.length === 0) {
      throw new Error('No search providers available');
    }

    // Try providers in order of preference
    for (const providerType of availableProviders) {
      try {
        const provider = this.searchProviders.get(providerType);
        if (provider) {
          const results = await provider.search(query, {
            ...config,
            provider: providerType,
            apiKey: this.getApiKeyForProvider(providerType),
          });
          
          if (results.length > 0) {
            return results;
          }
        }
      } catch (error) {
        console.warn(`Search failed with provider ${providerType}:`, error);
        // Continue to next provider
      }
    }

    return []; // Return empty if all providers fail
  }

  private getApiKeyForProvider(provider: SearchProvider): string {
    switch (provider) {
      case SearchProvider.GOOGLE:
        return envLoader.getWebSearchApiKey('google') || '';
      case SearchProvider.BING:
        return envLoader.getWebSearchApiKey('bing') || '';
      case SearchProvider.SERPER:
        return envLoader.getWebSearchApiKey('serper') || '';
      case SearchProvider.TAVILY:
        return envLoader.getWebSearchApiKey('tavily') || '';
      default:
        return '';
    }
  }

  private mapTimeframeToFreshness(timeframe: string): 'day' | 'week' | 'month' | 'year' | 'all' {
    switch (timeframe) {
      case '1h':
      case '6h':
      case '1d':
        return 'day';
      case '3d':
      case '7d':
        return 'week';
      case '30d':
        return 'month';
      case '90d':
        return 'year';
      default:
        return 'all';
    }
  }

  private enhanceFinancialNewsResults(results: SearchResult[], params: FinancialNewsSearch): SearchResult[] {
    return results
      .filter(result => this.isRelevantFinancialNews(result, params))
      .map(result => ({
        ...result,
        relevanceScore: this.calculateFinancialRelevance(result, params),
      }))
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }

  private isRelevantFinancialNews(result: SearchResult, params: FinancialNewsSearch): boolean {
    const title = result.title.toLowerCase();
    const snippet = result.snippet.toLowerCase();
    const content = `${title} ${snippet}`;

    // Check for stock code
    if (params.stockCode && !content.includes(params.stockCode.toLowerCase())) {
      return false;
    }

    // Check for financial keywords
    const financialKeywords = ['cổ phiếu', 'chứng khoán', 'tài chính', 'đầu tư', 'báo cáo', 'lợi nhuận'];
    const hasFinancialKeyword = financialKeywords.some(keyword => content.includes(keyword));

    return hasFinancialKeyword;
  }

  private calculateFinancialRelevance(result: SearchResult, params: FinancialNewsSearch): number {
    let score = result.relevanceScore || 0.5;

    // Boost score for trusted financial sources
    const trustedSources = ['cafef.vn', 'vietstock.vn', 'ndh.vn', 'vneconomy.vn'];
    if (trustedSources.some(source => result.url.includes(source))) {
      score += 0.3;
    }

    // Boost score for recent content
    if (result.date) {
      const daysSincePublished = (Date.now() - result.date.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSincePublished <= 1) score += 0.2;
      else if (daysSincePublished <= 7) score += 0.1;
    }

    // Boost score for exact stock code match
    if (params.stockCode) {
      const stockCodeRegex = new RegExp(`\\b${params.stockCode}\\b`, 'gi');
      const matches = (result.title + ' ' + result.snippet).match(stockCodeRegex);
      if (matches) {
        score += matches.length * 0.1;
      }
    }

    return Math.min(score, 1); // Cap at 1.0
  }

  private extractMarketData(results: SearchResult[], params: MarketDataSearch): any {
    // Extract structured market data from search results
    // This would involve parsing the content for specific data points
    return {
      stockCode: params.stockCode,
      dataPoints: [],
      sources: results.map(r => r.source).filter(Boolean),
      lastUpdated: new Date(),
      searchResults: results,
    };
  }

  private extractCompanyInfo(results: SearchResult[], stockCode: string): any {
    // Extract company information from search results
    return {
      stockCode,
      companyName: '',
      sector: '',
      description: '',
      sources: results.map(r => r.source).filter(Boolean),
      searchResults: results,
    };
  }

  private performSentimentAnalysis(results: SearchResult[], stockCode: string, timeframe: string): NewsSentimentResult {
    // Perform basic sentiment analysis on news results
    // This is a simplified implementation - in production, you'd use proper NLP
    
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    results.forEach(result => {
      const content = `${result.title} ${result.snippet}`.toLowerCase();
      
      const positiveWords = ['tăng', 'tích cực', 'tốt', 'lợi nhuận', 'thành công', 'phát triển'];
      const negativeWords = ['giảm', 'tiêu cực', 'xấu', 'lỗ', 'thất bại', 'khó khăn'];
      
      const positiveScore = positiveWords.filter(word => content.includes(word)).length;
      const negativeScore = negativeWords.filter(word => content.includes(word)).length;
      
      if (positiveScore > negativeScore) positiveCount++;
      else if (negativeScore > positiveScore) negativeCount++;
      else neutralCount++;
    });

    const total = results.length;
    const sentimentScore = total > 0 ? (positiveCount - negativeCount) / total : 0;
    
    let overallSentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (sentimentScore > 0.2) overallSentiment = 'positive';
    else if (sentimentScore < -0.2) overallSentiment = 'negative';

    return {
      stockCode,
      overallSentiment,
      sentimentScore,
      confidence: Math.min(total / 10, 1), // Higher confidence with more articles
      articlesAnalyzed: total,
      timeframe,
      sentimentBreakdown: {
        positive: positiveCount,
        negative: negativeCount,
        neutral: neutralCount,
      },
      keyTopics: [], // Would extract from content analysis
      sources: [], // Would group by source
      recentNews: results.slice(0, 5), // Top 5 most recent
    };
  }

  private performDataValidation(marketData: any, stockCode: string): MarketDataValidation {
    // Validate market data consistency across sources
    return {
      stockCode,
      dataPoints: [],
      consistencyScore: 0.8, // Placeholder
      reliabilitySources: [],
      discrepancies: [],
      recommendation: 'reliable',
    };
  }
}
