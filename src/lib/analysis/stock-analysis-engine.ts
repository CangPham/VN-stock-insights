/**
 * @fileOverview Comprehensive Stock Analysis Engine
 * Engine phân tích cổ phiếu toàn diện kết hợp technical, fundamental và sentiment analysis
 */

import { 
  StockAnalysisResult, 
  StockRecommendation, 
  CompanyInfo,
  StockAnalysisConfig,
  IStockAnalysisEngine 
} from '../ai/types';
import { TechnicalIndicators, PriceData, RSIResult, MACDResult, BollingerBandsResult } from './technical-indicators';
import { FundamentalAnalysis, FinancialData, FundamentalAnalysisResult } from './fundamental-analysis';
import { FinancialSearchEngine } from '../search/financial-search-engine';
import { aiProviderManager } from '../ai/provider-factory';

// Interface cho dữ liệu đầu vào
export interface StockAnalysisInput {
  stockCode: string;
  priceData?: PriceData[];
  financialData?: FinancialData;
  previousFinancialData?: FinancialData;
  currentPrice?: number;
  marketData?: any;
}

// Comprehensive Stock Analysis Engine
export class StockAnalysisEngine implements IStockAnalysisEngine {
  private searchEngine: FinancialSearchEngine;

  constructor() {
    this.searchEngine = new FinancialSearchEngine();
  }

  public async analyzeStock(stockCode: string, config: StockAnalysisConfig): Promise<StockAnalysisResult> {
    try {
      // Gather all necessary data
      const input = await this.gatherStockData(stockCode, config);
      
      // Perform different types of analysis
      const technicalAnalysis = config.technicalIndicators.enabled 
        ? await this.performTechnicalAnalysis(input, config)
        : undefined;

      const fundamentalAnalysis = config.fundamentalAnalysis.enabled
        ? await this.performFundamentalAnalysis(input, config)
        : undefined;

      const sentimentAnalysis = config.sentimentAnalysis.enabled
        ? await this.performSentimentAnalysis(input, config)
        : undefined;

      const riskAssessment = config.riskAssessment.enabled
        ? await this.performRiskAssessment(input, config)
        : undefined;

      // Combine results
      const result: StockAnalysisResult = {
        stockCode: input.stockCode,
        companyName: await this.getCompanyName(stockCode),
        currentPrice: input.currentPrice || 0,
        currency: 'VND',
        lastUpdated: new Date(),
        technicalAnalysis,
        fundamentalAnalysis,
        sentimentAnalysis,
        riskAssessment,
      };

      return result;
    } catch (error) {
      console.error(`Stock analysis failed for ${stockCode}:`, error);
      throw new Error(`Không thể phân tích cổ phiếu ${stockCode}: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
    }
  }

  public async getRecommendation(stockCode: string, config: StockAnalysisConfig): Promise<StockRecommendation> {
    const analysis = await this.analyzeStock(stockCode, config);
    return this.generateRecommendation(analysis, config);
  }

  public async getCompanyInfo(stockCode: string, config: StockAnalysisConfig): Promise<CompanyInfo> {
    try {
      // Search for company information
      const companyData = await this.searchEngine.searchCompanyInfo(stockCode);
      
      // Get recent news
      const recentNews = await this.searchEngine.searchRealTimeNews(stockCode);
      
      // Use AI to extract and structure company information
      const aiAnalysis = await this.analyzeCompanyWithAI(stockCode, companyData);

      return {
        stockCode,
        companyName: aiAnalysis.companyName || stockCode,
        sector: aiAnalysis.sector || 'Không xác định',
        industry: aiAnalysis.industry || 'Không xác định',
        description: aiAnalysis.description || 'Thông tin mô tả chưa có sẵn',
        website: aiAnalysis.website,
        employees: aiAnalysis.employees,
        founded: aiAnalysis.founded,
        headquarters: aiAnalysis.headquarters,
        marketCap: aiAnalysis.marketCap,
        sharesOutstanding: aiAnalysis.sharesOutstanding,
        businessModel: aiAnalysis.businessModel || 'Thông tin mô hình kinh doanh chưa có sẵn',
        competitiveAdvantages: aiAnalysis.competitiveAdvantages || [],
        keyRisks: aiAnalysis.keyRisks || [],
        recentNews: recentNews.slice(0, 5).map(news => ({
          title: news.title,
          summary: news.snippet,
          date: news.date || new Date(),
          source: news.source || 'Không xác định',
          sentiment: this.analyzeSentimentFromText(news.title + ' ' + news.snippet),
        })),
      };
    } catch (error) {
      console.error(`Company info analysis failed for ${stockCode}:`, error);
      throw new Error(`Không thể nghiên cứu thông tin công ty ${stockCode}: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
    }
  }

  // Private methods for data gathering and analysis

  private async gatherStockData(stockCode: string, config: StockAnalysisConfig): Promise<StockAnalysisInput> {
    // In a real implementation, this would fetch data from various sources
    // For now, we'll return mock data structure
    return {
      stockCode,
      priceData: [], // Would fetch from financial data API
      financialData: undefined, // Would fetch from financial reports API
      currentPrice: undefined, // Would fetch from real-time price API
      marketData: undefined, // Would fetch from market data API
    };
  }

  private async performTechnicalAnalysis(
    input: StockAnalysisInput, 
    config: StockAnalysisConfig
  ): Promise<StockAnalysisResult['technicalAnalysis']> {
    if (!input.priceData || input.priceData.length === 0) {
      return undefined;
    }

    const prices = input.priceData.map(d => d.close);
    const result: NonNullable<StockAnalysisResult['technicalAnalysis']> = {
      trend: 'neutral',
      strength: 0.5,
    };

    // Calculate RSI
    if (config.technicalIndicators.rsi.enabled) {
      const rsi = TechnicalIndicators.calculateRSI(
        prices, 
        config.technicalIndicators.rsi.period,
        config.technicalIndicators.rsi.overbought,
        config.technicalIndicators.rsi.oversold
      );
      if (rsi) {
        result.rsi = rsi.value;
      }
    }

    // Calculate MACD
    if (config.technicalIndicators.macd.enabled) {
      const macd = TechnicalIndicators.calculateMACD(
        prices,
        config.technicalIndicators.macd.fastPeriod,
        config.technicalIndicators.macd.slowPeriod,
        config.technicalIndicators.macd.signalPeriod
      );
      if (macd) {
        result.macd = {
          value: macd.macd,
          signal: macd.signal,
          histogram: macd.histogram,
        };
      }
    }

    // Calculate Moving Averages
    if (config.technicalIndicators.movingAverages.enabled) {
      const movingAverages: Record<number, number> = {};
      for (const period of config.technicalIndicators.movingAverages.periods) {
        const ma = TechnicalIndicators.calculateMovingAverageWithTrend(prices, period);
        if (ma) {
          movingAverages[period] = ma.value;
        }
      }
      result.movingAverages = movingAverages;
    }

    // Calculate Bollinger Bands
    if (config.technicalIndicators.bollingerBands.enabled) {
      const bb = TechnicalIndicators.calculateBollingerBands(
        prices,
        config.technicalIndicators.bollingerBands.period,
        config.technicalIndicators.bollingerBands.standardDeviations
      );
      if (bb) {
        result.bollingerBands = {
          upper: bb.upper,
          middle: bb.middle,
          lower: bb.lower,
        };
      }
    }

    // Determine overall trend and strength
    const trendAnalysis = this.analyzeTechnicalTrend(result);
    result.trend = trendAnalysis.trend;
    result.strength = trendAnalysis.strength;

    return result;
  }

  private async performFundamentalAnalysis(
    input: StockAnalysisInput,
    config: StockAnalysisConfig
  ): Promise<StockAnalysisResult['fundamentalAnalysis']> {
    if (!input.financialData) {
      return undefined;
    }

    const analysis = FundamentalAnalysis.calculateFundamentalAnalysis(
      input.financialData,
      input.previousFinancialData,
      input.currentPrice
    );

    return {
      peRatio: analysis.peRatio,
      roe: analysis.roe,
      debtToEquity: analysis.debtToEquity,
      revenueGrowth: analysis.revenueGrowth,
      marketCap: input.financialData.marketCap,
      bookValue: input.financialData.bookValue,
      eps: input.financialData.eps,
      score: analysis.overallScore / 100,
    };
  }

  private async performSentimentAnalysis(
    input: StockAnalysisInput,
    config: StockAnalysisConfig
  ): Promise<StockAnalysisResult['sentimentAnalysis']> {
    try {
      const sentimentResult = await this.searchEngine.analyzeSentimentFromNews(
        input.stockCode,
        config.sentimentAnalysis.timeframe
      );

      return {
        score: sentimentResult.sentimentScore,
        sources: sentimentResult.sources.map(source => ({
          type: 'news' as const,
          sentiment: sentimentResult.sentimentScore,
          confidence: sentimentResult.confidence,
          summary: `Phân tích từ ${source.source}: ${source.articles} bài viết`,
        })),
      };
    } catch (error) {
      console.warn('Sentiment analysis failed:', error);
      return undefined;
    }
  }

  private async performRiskAssessment(
    input: StockAnalysisInput,
    config: StockAnalysisConfig
  ): Promise<StockAnalysisResult['riskAssessment']> {
    // Calculate volatility if price data is available
    let volatility = 0.5;
    if (input.priceData && input.priceData.length > 20) {
      const prices = input.priceData.map(d => d.close);
      const calculatedVolatility = TechnicalIndicators.calculateVolatility(prices);
      if (calculatedVolatility) {
        volatility = Math.min(calculatedVolatility / 100, 1); // Normalize to 0-1
      }
    }

    // Simple risk assessment based on available data
    const liquidity = 0.7; // Would calculate from volume data
    const marketCapRisk = input.financialData?.marketCap ? 
      Math.max(0, 1 - (input.financialData.marketCap / 10000000000)) : 0.5; // Larger cap = lower risk

    const overallRiskScore = (
      volatility * config.riskAssessment.volatilityWeight +
      (1 - liquidity) * config.riskAssessment.liquidityWeight +
      marketCapRisk * config.riskAssessment.marketCapWeight
    );

    let overallRisk: 'low' | 'medium' | 'high' = 'medium';
    if (overallRiskScore < 0.3) overallRisk = 'low';
    else if (overallRiskScore > 0.7) overallRisk = 'high';

    return {
      volatility,
      liquidity,
      marketCapRisk,
      overallRisk,
      score: 1 - overallRiskScore, // Higher score = lower risk
    };
  }

  private generateRecommendation(
    analysis: StockAnalysisResult,
    config: StockAnalysisConfig
  ): StockRecommendation {
    // Combine scores from different analyses
    let overallScore = 0.5;
    let confidence = 0.5;

    if (analysis.technicalAnalysis) {
      overallScore += analysis.technicalAnalysis.strength * 0.3;
    }

    if (analysis.fundamentalAnalysis) {
      overallScore += analysis.fundamentalAnalysis.score * 0.4;
    }

    if (analysis.sentimentAnalysis) {
      overallScore += (analysis.sentimentAnalysis.score + 1) / 2 * 0.2; // Normalize -1,1 to 0,1
    }

    if (analysis.riskAssessment) {
      overallScore += analysis.riskAssessment.score * 0.1;
    }

    // Determine recommendation
    let recommendation: StockRecommendation['recommendation'] = 'hold';
    if (overallScore >= 0.8) recommendation = 'strong_buy';
    else if (overallScore >= 0.65) recommendation = 'buy';
    else if (overallScore <= 0.2) recommendation = 'strong_sell';
    else if (overallScore <= 0.35) recommendation = 'sell';

    // Calculate confidence
    confidence = Math.min(
      Math.abs(overallScore - 0.5) * 2, // Distance from neutral
      config.recommendation.confidenceThreshold
    );

    return {
      stockCode: analysis.stockCode,
      recommendation,
      confidence,
      targetPrice: config.recommendation.includeTargetPrice ? 
        this.calculateTargetPrice(analysis) : undefined,
      stopLoss: config.recommendation.includeStopLoss ?
        this.calculateStopLoss(analysis) : undefined,
      timeHorizon: config.recommendation.timeHorizon,
      rationale: this.generateRationale(analysis, recommendation),
      keyFactors: this.extractKeyFactors(analysis),
      risks: this.extractRisks(analysis),
      opportunities: this.extractOpportunities(analysis),
    };
  }

  // Helper methods

  private async getCompanyName(stockCode: string): Promise<string> {
    // Would fetch from company database or API
    return stockCode; // Placeholder
  }

  private async analyzeCompanyWithAI(stockCode: string, companyData: any): Promise<any> {
    try {
      const prompt = `Phân tích thông tin công ty cho mã cổ phiếu ${stockCode} dựa trên dữ liệu sau:
      ${JSON.stringify(companyData, null, 2)}
      
      Hãy trích xuất và cấu trúc thông tin theo format JSON với các trường:
      - companyName: Tên công ty
      - sector: Ngành
      - industry: Lĩnh vực cụ thể
      - description: Mô tả hoạt động kinh doanh
      - businessModel: Mô hình kinh doanh
      - competitiveAdvantages: Mảng các lợi thế cạnh tranh
      - keyRisks: Mảng các rủi ro chính`;

      const response = await aiProviderManager.generateResponse(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.warn('AI company analysis failed:', error);
      return {};
    }
  }

  private analyzeSentimentFromText(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['tăng', 'tích cực', 'tốt', 'lợi nhuận', 'thành công'];
    const negativeWords = ['giảm', 'tiêu cực', 'xấu', 'lỗ', 'thất bại'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private analyzeTechnicalTrend(technical: NonNullable<StockAnalysisResult['technicalAnalysis']>): {
    trend: 'bullish' | 'bearish' | 'neutral';
    strength: number;
  } {
    let bullishSignals = 0;
    let bearishSignals = 0;
    let totalSignals = 0;

    // RSI analysis
    if (technical.rsi !== undefined) {
      totalSignals++;
      if (technical.rsi < 30) bullishSignals++; // Oversold
      else if (technical.rsi > 70) bearishSignals++; // Overbought
    }

    // MACD analysis
    if (technical.macd) {
      totalSignals++;
      if (technical.macd.value > technical.macd.signal) bullishSignals++;
      else bearishSignals++;
    }

    // Moving averages analysis
    if (technical.movingAverages) {
      const periods = Object.keys(technical.movingAverages).map(Number).sort((a, b) => a - b);
      for (let i = 1; i < periods.length; i++) {
        totalSignals++;
        if (technical.movingAverages[periods[i-1]] > technical.movingAverages[periods[i]]) {
          bullishSignals++; // Shorter MA above longer MA
        } else {
          bearishSignals++;
        }
      }
    }

    const strength = totalSignals > 0 ? Math.abs(bullishSignals - bearishSignals) / totalSignals : 0;
    
    let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (bullishSignals > bearishSignals) trend = 'bullish';
    else if (bearishSignals > bullishSignals) trend = 'bearish';

    return { trend, strength };
  }

  private calculateTargetPrice(analysis: StockAnalysisResult): number | undefined {
    // Simple target price calculation based on current price and analysis
    if (!analysis.currentPrice) return undefined;
    
    let multiplier = 1;
    if (analysis.fundamentalAnalysis?.score) {
      multiplier += (analysis.fundamentalAnalysis.score - 0.5) * 0.2;
    }
    
    return analysis.currentPrice * multiplier;
  }

  private calculateStopLoss(analysis: StockAnalysisResult): number | undefined {
    // Simple stop loss calculation (5-15% below current price based on risk)
    if (!analysis.currentPrice) return undefined;
    
    let stopLossPercent = 0.1; // Default 10%
    if (analysis.riskAssessment) {
      if (analysis.riskAssessment.overallRisk === 'high') stopLossPercent = 0.15;
      else if (analysis.riskAssessment.overallRisk === 'low') stopLossPercent = 0.05;
    }
    
    return analysis.currentPrice * (1 - stopLossPercent);
  }

  private generateRationale(analysis: StockAnalysisResult, recommendation: string): string {
    const factors = [];
    
    if (analysis.technicalAnalysis) {
      factors.push(`Phân tích kỹ thuật cho thấy xu hướng ${analysis.technicalAnalysis.trend}`);
    }
    
    if (analysis.fundamentalAnalysis) {
      factors.push(`Các chỉ số cơ bản có điểm số ${(analysis.fundamentalAnalysis.score * 100).toFixed(0)}/100`);
    }
    
    if (analysis.sentimentAnalysis) {
      const sentiment = analysis.sentimentAnalysis.score > 0 ? 'tích cực' : 'tiêu cực';
      factors.push(`Tình cảm thị trường ${sentiment}`);
    }
    
    return `Khuyến nghị ${recommendation} dựa trên: ${factors.join(', ')}.`;
  }

  private extractKeyFactors(analysis: StockAnalysisResult): string[] {
    const factors = [];
    
    if (analysis.fundamentalAnalysis?.roe && analysis.fundamentalAnalysis.roe > 15) {
      factors.push('ROE cao cho thấy hiệu quả sử dụng vốn tốt');
    }
    
    if (analysis.technicalAnalysis?.trend === 'bullish') {
      factors.push('Xu hướng kỹ thuật tích cực');
    }
    
    if (analysis.sentimentAnalysis?.score && analysis.sentimentAnalysis.score > 0.2) {
      factors.push('Tình cảm thị trường tích cực');
    }
    
    return factors;
  }

  private extractRisks(analysis: StockAnalysisResult): string[] {
    const risks = [];
    
    if (analysis.riskAssessment?.overallRisk === 'high') {
      risks.push('Mức độ rủi ro tổng thể cao');
    }
    
    if (analysis.fundamentalAnalysis?.debtToEquity && analysis.fundamentalAnalysis.debtToEquity > 1) {
      risks.push('Tỷ số nợ/vốn chủ sở hữu cao');
    }
    
    if (analysis.technicalAnalysis?.rsi && analysis.technicalAnalysis.rsi > 70) {
      risks.push('RSI cho thấy có thể bị mua quá mức');
    }
    
    return risks;
  }

  private extractOpportunities(analysis: StockAnalysisResult): string[] {
    const opportunities = [];
    
    if (analysis.fundamentalAnalysis?.revenueGrowth && analysis.fundamentalAnalysis.revenueGrowth > 10) {
      opportunities.push('Tăng trưởng doanh thu mạnh');
    }
    
    if (analysis.technicalAnalysis?.rsi && analysis.technicalAnalysis.rsi < 30) {
      opportunities.push('RSI cho thấy có thể bị bán quá mức, cơ hội mua vào');
    }
    
    if (analysis.sentimentAnalysis?.score && analysis.sentimentAnalysis.score < -0.2) {
      opportunities.push('Tình cảm thị trường tiêu cực có thể tạo cơ hội mua với giá tốt');
    }
    
    return opportunities;
  }
}
