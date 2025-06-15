/**
 * @fileOverview Google Custom Search Provider
 * Implementation cho Google Custom Search API
 */

import { 
  SearchProvider, 
  SearchResult, 
  SearchConfig, 
  ISearchProvider,
  SearchError,
  SearchRateLimitError,
  SearchQuotaExceededError 
} from '../types';

export class GoogleSearchProvider implements ISearchProvider {
  public readonly provider = SearchProvider.GOOGLE;
  private baseUrl = 'https://www.googleapis.com/customsearch/v1';
  private searchEngineId: string;

  constructor(private apiKey: string, searchEngineId: string) {
    this.searchEngineId = searchEngineId;
  }

  public async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}?key=${apiKey}&cx=${this.searchEngineId}&q=test&num=1`
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  public async search(query: string, config: SearchConfig): Promise<SearchResult[]> {
    const params = this.buildSearchParams(query, config);
    const url = `${this.baseUrl}?${params.toString()}`;

    try {
      const response = await this.makeRequest(url);
      const data = await response.json();

      if (!response.ok) {
        this.handleError(response.status, data);
      }

      return this.parseSearchResults(data);
    } catch (error) {
      if (error instanceof SearchError) {
        throw error;
      }
      throw new SearchError(
        `Google Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.provider
      );
    }
  }

  public async searchNews(query: string, config: SearchConfig): Promise<SearchResult[]> {
    // Google Custom Search với news filter
    const newsQuery = `${query} site:cafef.vn OR site:vietstock.vn OR site:ndh.vn OR site:vneconomy.vn`;
    
    const params = this.buildSearchParams(newsQuery, config);
    params.set('sort', 'date'); // Sort by date for news
    
    const url = `${this.baseUrl}?${params.toString()}`;

    try {
      const response = await this.makeRequest(url);
      const data = await response.json();

      if (!response.ok) {
        this.handleError(response.status, data);
      }

      const results = this.parseSearchResults(data);
      
      // Mark as news type
      return results.map(result => ({
        ...result,
        type: 'news' as const,
      }));
    } catch (error) {
      if (error instanceof SearchError) {
        throw error;
      }
      throw new SearchError(
        `Google News Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.provider
      );
    }
  }

  public async searchImages(query: string, config: SearchConfig): Promise<SearchResult[]> {
    const params = this.buildSearchParams(query, config);
    params.set('searchType', 'image');
    
    const url = `${this.baseUrl}?${params.toString()}`;

    try {
      const response = await this.makeRequest(url);
      const data = await response.json();

      if (!response.ok) {
        this.handleError(response.status, data);
      }

      const results = this.parseSearchResults(data);
      
      // Mark as image type
      return results.map(result => ({
        ...result,
        type: 'image' as const,
      }));
    } catch (error) {
      if (error instanceof SearchError) {
        throw error;
      }
      throw new SearchError(
        `Google Image Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.provider
      );
    }
  }

  // Private methods

  private buildSearchParams(query: string, config: SearchConfig): URLSearchParams {
    const params = new URLSearchParams({
      key: this.apiKey,
      cx: this.searchEngineId,
      q: query,
      num: Math.min(config.maxResults, 10).toString(), // Google max 10 per request
      lr: `lang_${config.language}`,
      gl: config.region,
      safe: this.mapSafeSearch(config.safeSearch),
    });

    // Add date filter if specified
    if (config.freshness !== 'all') {
      params.set('dateRestrict', this.mapFreshness(config.freshness));
    }

    return params;
  }

  private mapSafeSearch(safeSearch: string): string {
    switch (safeSearch) {
      case 'off': return 'off';
      case 'moderate': return 'medium';
      case 'strict': return 'high';
      default: return 'medium';
    }
  }

  private mapFreshness(freshness: string): string {
    switch (freshness) {
      case 'day': return 'd1';
      case 'week': return 'w1';
      case 'month': return 'm1';
      case 'year': return 'y1';
      default: return '';
    }
  }

  private async makeRequest(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'VN-Stock-Insights/1.0',
        },
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private handleError(statusCode: number, data: any): never {
    switch (statusCode) {
      case 429:
        throw new SearchRateLimitError(this.provider);
      
      case 403:
        if (data.error?.message?.includes('quota')) {
          throw new SearchQuotaExceededError(this.provider);
        }
        throw new SearchError(
          data.error?.message || 'Access forbidden',
          this.provider,
          statusCode
        );
      
      case 400:
        throw new SearchError(
          data.error?.message || 'Bad request',
          this.provider,
          statusCode
        );
      
      default:
        throw new SearchError(
          data.error?.message || `HTTP ${statusCode}`,
          this.provider,
          statusCode
        );
    }
  }

  private parseSearchResults(data: any): SearchResult[] {
    if (!data.items || !Array.isArray(data.items)) {
      return [];
    }

    return data.items.map((item: any, index: number) => {
      const result: SearchResult = {
        title: item.title || '',
        url: item.link || '',
        snippet: item.snippet || '',
        displayUrl: item.displayLink || item.link || '',
        source: this.extractSource(item.link || ''),
        relevanceScore: Math.max(0, 1 - (index * 0.1)), // Decrease relevance by position
        type: 'web',
      };

      // Add date if available
      if (item.pagemap?.metatags?.[0]?.['article:published_time']) {
        result.date = new Date(item.pagemap.metatags[0]['article:published_time']);
      }

      // Add image if available
      if (item.pagemap?.cse_image?.[0]?.src) {
        result.imageUrl = item.pagemap.cse_image[0].src;
      }

      return result;
    });
  }

  private extractSource(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'Unknown';
    }
  }

  // Utility methods for Vietnamese financial search

  public async searchVietnameseStock(stockCode: string, config: SearchConfig): Promise<SearchResult[]> {
    const query = `"${stockCode}" cổ phiếu chứng khoán (site:cafef.vn OR site:vietstock.vn OR site:ndh.vn)`;
    return this.search(query, config);
  }

  public async searchFinancialNews(
    stockCode: string, 
    timeframe: string,
    config: SearchConfig
  ): Promise<SearchResult[]> {
    let query = `"${stockCode}" tin tức tài chính`;
    
    // Add timeframe to query
    if (timeframe !== 'all') {
      const timeMap: Record<string, string> = {
        '1d': 'hôm nay',
        '7d': 'tuần này',
        '30d': 'tháng này',
      };
      
      if (timeMap[timeframe]) {
        query += ` ${timeMap[timeframe]}`;
      }
    }

    // Restrict to Vietnamese financial sites
    query += ' (site:cafef.vn OR site:vietstock.vn OR site:ndh.vn OR site:vneconomy.vn OR site:baodautu.vn)';

    return this.searchNews(query, config);
  }

  public async searchCompanyInfo(companyName: string, config: SearchConfig): Promise<SearchResult[]> {
    const query = `"${companyName}" thông tin công ty báo cáo tài chính (site:cafef.vn OR site:vietstock.vn)`;
    return this.search(query, config);
  }

  public async searchSectorAnalysis(sector: string, config: SearchConfig): Promise<SearchResult[]> {
    const query = `"${sector}" phân tích ngành (site:cafef.vn OR site:vietstock.vn OR site:ndh.vn)`;
    return this.search(query, config);
  }

  // Batch search for multiple queries
  public async batchSearch(queries: string[], config: SearchConfig): Promise<SearchResult[][]> {
    const searchPromises = queries.map(query => 
      this.search(query, config).catch(error => {
        console.error(`Batch search failed for query "${query}":`, error);
        return [];
      })
    );

    return Promise.all(searchPromises);
  }

  // Get search suggestions (if available)
  public async getSearchSuggestions(query: string): Promise<string[]> {
    // Google Custom Search doesn't provide suggestions directly
    // This would need to use Google Suggest API or similar
    return [];
  }
}
