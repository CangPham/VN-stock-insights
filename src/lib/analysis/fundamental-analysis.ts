/**
 * @fileOverview Fundamental Analysis Calculator
 * Tính toán các chỉ số phân tích cơ bản cho cổ phiếu
 */

// Interface cho dữ liệu tài chính
export interface FinancialData {
  // Income Statement
  revenue: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  ebitda: number;
  
  // Balance Sheet
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  currentAssets: number;
  currentLiabilities: number;
  longTermDebt: number;
  cash: number;
  
  // Market Data
  marketCap: number;
  sharesOutstanding: number;
  bookValue: number;
  
  // Per Share Data
  eps: number; // Earnings Per Share
  bvps: number; // Book Value Per Share
  
  // Period info
  period: string;
  year: number;
  quarter?: number;
}

// Interface cho kết quả phân tích cơ bản
export interface FundamentalAnalysisResult {
  // Valuation Ratios
  peRatio: number | null;
  pbRatio: number | null;
  psRatio: number | null;
  pegRatio: number | null;
  evEbitda: number | null;
  
  // Profitability Ratios
  roe: number | null; // Return on Equity
  roa: number | null; // Return on Assets
  roic: number | null; // Return on Invested Capital
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  
  // Liquidity Ratios
  currentRatio: number | null;
  quickRatio: number | null;
  cashRatio: number | null;
  
  // Leverage Ratios
  debtToEquity: number | null;
  debtToAssets: number | null;
  interestCoverage: number | null;
  
  // Efficiency Ratios
  assetTurnover: number | null;
  inventoryTurnover: number | null;
  receivablesTurnover: number | null;
  
  // Growth Metrics
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  bookValueGrowth: number | null;
  
  // Overall Scores
  valuationScore: number; // 0-100
  profitabilityScore: number; // 0-100
  liquidityScore: number; // 0-100
  leverageScore: number; // 0-100
  overallScore: number; // 0-100
  
  // Recommendations
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  riskLevel: 'low' | 'medium' | 'high';
  
  // Analysis Summary
  strengths: string[];
  weaknesses: string[];
  keyMetrics: Array<{
    name: string;
    value: number | string;
    benchmark: number | string;
    status: 'good' | 'average' | 'poor';
  }>;
}

// Fundamental Analysis Calculator Class
export class FundamentalAnalysis {
  
  // Calculate comprehensive fundamental analysis
  public static calculateFundamentalAnalysis(
    currentData: FinancialData,
    previousData?: FinancialData,
    currentPrice?: number,
    industryBenchmarks?: Partial<FundamentalAnalysisResult>
  ): FundamentalAnalysisResult {
    
    const result: FundamentalAnalysisResult = {
      // Valuation Ratios
      peRatio: this.calculatePERatio(currentPrice, currentData.eps),
      pbRatio: this.calculatePBRatio(currentPrice, currentData.bvps),
      psRatio: this.calculatePSRatio(currentData.marketCap, currentData.revenue),
      pegRatio: null, // Requires growth rate
      evEbitda: this.calculateEVEBITDA(currentData),
      
      // Profitability Ratios
      roe: this.calculateROE(currentData.netIncome, currentData.totalEquity),
      roa: this.calculateROA(currentData.netIncome, currentData.totalAssets),
      roic: this.calculateROIC(currentData),
      grossMargin: this.calculateGrossMargin(currentData.grossProfit, currentData.revenue),
      operatingMargin: this.calculateOperatingMargin(currentData.operatingIncome, currentData.revenue),
      netMargin: this.calculateNetMargin(currentData.netIncome, currentData.revenue),
      
      // Liquidity Ratios
      currentRatio: this.calculateCurrentRatio(currentData.currentAssets, currentData.currentLiabilities),
      quickRatio: this.calculateQuickRatio(currentData),
      cashRatio: this.calculateCashRatio(currentData.cash, currentData.currentLiabilities),
      
      // Leverage Ratios
      debtToEquity: this.calculateDebtToEquity(currentData.longTermDebt, currentData.totalEquity),
      debtToAssets: this.calculateDebtToAssets(currentData.longTermDebt, currentData.totalAssets),
      interestCoverage: null, // Requires interest expense data
      
      // Efficiency Ratios
      assetTurnover: this.calculateAssetTurnover(currentData.revenue, currentData.totalAssets),
      inventoryTurnover: null, // Requires inventory data
      receivablesTurnover: null, // Requires receivables data
      
      // Growth Metrics (requires previous period data)
      revenueGrowth: previousData ? this.calculateGrowthRate(currentData.revenue, previousData.revenue) : null,
      earningsGrowth: previousData ? this.calculateGrowthRate(currentData.netIncome, previousData.netIncome) : null,
      bookValueGrowth: previousData ? this.calculateGrowthRate(currentData.bookValue, previousData.bookValue) : null,
      
      // Scores (calculated below)
      valuationScore: 0,
      profitabilityScore: 0,
      liquidityScore: 0,
      leverageScore: 0,
      overallScore: 0,
      
      // Recommendations (calculated below)
      recommendation: 'hold',
      riskLevel: 'medium',
      
      // Analysis Summary (calculated below)
      strengths: [],
      weaknesses: [],
      keyMetrics: [],
    };

    // Calculate PEG ratio if we have earnings growth
    if (result.peRatio && result.earningsGrowth) {
      result.pegRatio = this.calculatePEGRatio(result.peRatio, result.earningsGrowth);
    }

    // Calculate scores
    result.valuationScore = this.calculateValuationScore(result, industryBenchmarks);
    result.profitabilityScore = this.calculateProfitabilityScore(result, industryBenchmarks);
    result.liquidityScore = this.calculateLiquidityScore(result, industryBenchmarks);
    result.leverageScore = this.calculateLeverageScore(result, industryBenchmarks);
    result.overallScore = this.calculateOverallScore(result);

    // Generate recommendations
    result.recommendation = this.generateRecommendation(result);
    result.riskLevel = this.assessRiskLevel(result);

    // Generate analysis summary
    result.strengths = this.identifyStrengths(result, industryBenchmarks);
    result.weaknesses = this.identifyWeaknesses(result, industryBenchmarks);
    result.keyMetrics = this.generateKeyMetrics(result, industryBenchmarks);

    return result;
  }

  // Valuation Ratios
  private static calculatePERatio(price?: number, eps?: number): number | null {
    if (!price || !eps || eps <= 0) return null;
    return price / eps;
  }

  private static calculatePBRatio(price?: number, bvps?: number): number | null {
    if (!price || !bvps || bvps <= 0) return null;
    return price / bvps;
  }

  private static calculatePSRatio(marketCap: number, revenue: number): number | null {
    if (!marketCap || !revenue || revenue <= 0) return null;
    return marketCap / revenue;
  }

  private static calculatePEGRatio(peRatio: number, growthRate: number): number | null {
    if (!peRatio || !growthRate || growthRate <= 0) return null;
    return peRatio / growthRate;
  }

  private static calculateEVEBITDA(data: FinancialData): number | null {
    if (!data.ebitda || data.ebitda <= 0) return null;
    const enterpriseValue = data.marketCap + data.longTermDebt - data.cash;
    return enterpriseValue / data.ebitda;
  }

  // Profitability Ratios
  private static calculateROE(netIncome: number, totalEquity: number): number | null {
    if (!totalEquity || totalEquity <= 0) return null;
    return (netIncome / totalEquity) * 100;
  }

  private static calculateROA(netIncome: number, totalAssets: number): number | null {
    if (!totalAssets || totalAssets <= 0) return null;
    return (netIncome / totalAssets) * 100;
  }

  private static calculateROIC(data: FinancialData): number | null {
    const investedCapital = data.totalEquity + data.longTermDebt;
    if (!investedCapital || investedCapital <= 0) return null;
    return (data.operatingIncome / investedCapital) * 100;
  }

  private static calculateGrossMargin(grossProfit: number, revenue: number): number | null {
    if (!revenue || revenue <= 0) return null;
    return (grossProfit / revenue) * 100;
  }

  private static calculateOperatingMargin(operatingIncome: number, revenue: number): number | null {
    if (!revenue || revenue <= 0) return null;
    return (operatingIncome / revenue) * 100;
  }

  private static calculateNetMargin(netIncome: number, revenue: number): number | null {
    if (!revenue || revenue <= 0) return null;
    return (netIncome / revenue) * 100;
  }

  // Liquidity Ratios
  private static calculateCurrentRatio(currentAssets: number, currentLiabilities: number): number | null {
    if (!currentLiabilities || currentLiabilities <= 0) return null;
    return currentAssets / currentLiabilities;
  }

  private static calculateQuickRatio(data: FinancialData): number | null {
    if (!data.currentLiabilities || data.currentLiabilities <= 0) return null;
    // Assuming quick assets = current assets - inventory (simplified)
    const quickAssets = data.currentAssets * 0.8; // Rough estimate
    return quickAssets / data.currentLiabilities;
  }

  private static calculateCashRatio(cash: number, currentLiabilities: number): number | null {
    if (!currentLiabilities || currentLiabilities <= 0) return null;
    return cash / currentLiabilities;
  }

  // Leverage Ratios
  private static calculateDebtToEquity(longTermDebt: number, totalEquity: number): number | null {
    if (!totalEquity || totalEquity <= 0) return null;
    return longTermDebt / totalEquity;
  }

  private static calculateDebtToAssets(longTermDebt: number, totalAssets: number): number | null {
    if (!totalAssets || totalAssets <= 0) return null;
    return longTermDebt / totalAssets;
  }

  // Efficiency Ratios
  private static calculateAssetTurnover(revenue: number, totalAssets: number): number | null {
    if (!totalAssets || totalAssets <= 0) return null;
    return revenue / totalAssets;
  }

  // Growth Calculations
  private static calculateGrowthRate(current: number, previous: number): number | null {
    if (!previous || previous <= 0) return null;
    return ((current - previous) / previous) * 100;
  }

  // Scoring Methods
  private static calculateValuationScore(result: FundamentalAnalysisResult, benchmarks?: Partial<FundamentalAnalysisResult>): number {
    let score = 50; // Base score

    // P/E Ratio scoring
    if (result.peRatio) {
      if (result.peRatio < 15) score += 20;
      else if (result.peRatio < 25) score += 10;
      else if (result.peRatio > 40) score -= 20;
      else if (result.peRatio > 30) score -= 10;
    }

    // P/B Ratio scoring
    if (result.pbRatio) {
      if (result.pbRatio < 1) score += 15;
      else if (result.pbRatio < 2) score += 10;
      else if (result.pbRatio > 5) score -= 15;
      else if (result.pbRatio > 3) score -= 10;
    }

    // PEG Ratio scoring
    if (result.pegRatio) {
      if (result.pegRatio < 1) score += 15;
      else if (result.pegRatio > 2) score -= 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  private static calculateProfitabilityScore(result: FundamentalAnalysisResult, benchmarks?: Partial<FundamentalAnalysisResult>): number {
    let score = 50; // Base score

    // ROE scoring
    if (result.roe) {
      if (result.roe > 20) score += 20;
      else if (result.roe > 15) score += 15;
      else if (result.roe > 10) score += 10;
      else if (result.roe < 5) score -= 15;
    }

    // ROA scoring
    if (result.roa) {
      if (result.roa > 10) score += 15;
      else if (result.roa > 5) score += 10;
      else if (result.roa < 2) score -= 10;
    }

    // Net Margin scoring
    if (result.netMargin) {
      if (result.netMargin > 15) score += 15;
      else if (result.netMargin > 10) score += 10;
      else if (result.netMargin < 5) score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  private static calculateLiquidityScore(result: FundamentalAnalysisResult, benchmarks?: Partial<FundamentalAnalysisResult>): number {
    let score = 50; // Base score

    // Current Ratio scoring
    if (result.currentRatio) {
      if (result.currentRatio > 2) score += 20;
      else if (result.currentRatio > 1.5) score += 15;
      else if (result.currentRatio > 1) score += 10;
      else score -= 20;
    }

    // Quick Ratio scoring
    if (result.quickRatio) {
      if (result.quickRatio > 1) score += 15;
      else if (result.quickRatio > 0.5) score += 10;
      else score -= 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  private static calculateLeverageScore(result: FundamentalAnalysisResult, benchmarks?: Partial<FundamentalAnalysisResult>): number {
    let score = 50; // Base score

    // Debt to Equity scoring (lower is better)
    if (result.debtToEquity !== null) {
      if (result.debtToEquity < 0.3) score += 20;
      else if (result.debtToEquity < 0.6) score += 10;
      else if (result.debtToEquity > 1.5) score -= 20;
      else if (result.debtToEquity > 1) score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  private static calculateOverallScore(result: FundamentalAnalysisResult): number {
    const weights = {
      valuation: 0.3,
      profitability: 0.3,
      liquidity: 0.2,
      leverage: 0.2,
    };

    return (
      result.valuationScore * weights.valuation +
      result.profitabilityScore * weights.profitability +
      result.liquidityScore * weights.liquidity +
      result.leverageScore * weights.leverage
    );
  }

  // Recommendation Generation
  private static generateRecommendation(result: FundamentalAnalysisResult): 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell' {
    if (result.overallScore >= 80) return 'strong_buy';
    if (result.overallScore >= 65) return 'buy';
    if (result.overallScore >= 35) return 'hold';
    if (result.overallScore >= 20) return 'sell';
    return 'strong_sell';
  }

  private static assessRiskLevel(result: FundamentalAnalysisResult): 'low' | 'medium' | 'high' {
    let riskFactors = 0;

    if (result.debtToEquity && result.debtToEquity > 1) riskFactors++;
    if (result.currentRatio && result.currentRatio < 1) riskFactors++;
    if (result.roe && result.roe < 5) riskFactors++;
    if (result.peRatio && result.peRatio > 40) riskFactors++;

    if (riskFactors >= 3) return 'high';
    if (riskFactors >= 1) return 'medium';
    return 'low';
  }

  // Analysis Summary Generation
  private static identifyStrengths(result: FundamentalAnalysisResult, benchmarks?: Partial<FundamentalAnalysisResult>): string[] {
    const strengths: string[] = [];

    if (result.roe && result.roe > 15) strengths.push('ROE cao cho thấy hiệu quả sử dụng vốn tốt');
    if (result.currentRatio && result.currentRatio > 2) strengths.push('Tỷ số thanh khoản hiện tại tốt');
    if (result.debtToEquity && result.debtToEquity < 0.5) strengths.push('Tỷ số nợ/vốn chủ sở hữu thấp, rủi ro tài chính thấp');
    if (result.netMargin && result.netMargin > 10) strengths.push('Biên lợi nhuận ròng cao');
    if (result.revenueGrowth && result.revenueGrowth > 10) strengths.push('Tăng trưởng doanh thu tích cực');

    return strengths;
  }

  private static identifyWeaknesses(result: FundamentalAnalysisResult, benchmarks?: Partial<FundamentalAnalysisResult>): string[] {
    const weaknesses: string[] = [];

    if (result.roe && result.roe < 5) weaknesses.push('ROE thấp, hiệu quả sử dụng vốn kém');
    if (result.currentRatio && result.currentRatio < 1) weaknesses.push('Tỷ số thanh khoản hiện tại thấp, có thể gặp khó khăn thanh toán');
    if (result.debtToEquity && result.debtToEquity > 1.5) weaknesses.push('Tỷ số nợ/vốn cao, rủi ro tài chính cao');
    if (result.peRatio && result.peRatio > 40) weaknesses.push('P/E ratio cao, có thể bị định giá quá cao');
    if (result.revenueGrowth && result.revenueGrowth < 0) weaknesses.push('Doanh thu giảm, xu hướng kinh doanh tiêu cực');

    return weaknesses;
  }

  private static generateKeyMetrics(result: FundamentalAnalysisResult, benchmarks?: Partial<FundamentalAnalysisResult>): Array<{
    name: string;
    value: number | string;
    benchmark: number | string;
    status: 'good' | 'average' | 'poor';
  }> {
    const metrics = [];

    if (result.peRatio) {
      metrics.push({
        name: 'P/E Ratio',
        value: result.peRatio.toFixed(2),
        benchmark: '15-25',
        status: result.peRatio < 25 ? 'good' : result.peRatio < 35 ? 'average' : 'poor',
      });
    }

    if (result.roe) {
      metrics.push({
        name: 'ROE (%)',
        value: result.roe.toFixed(2),
        benchmark: '>15%',
        status: result.roe > 15 ? 'good' : result.roe > 10 ? 'average' : 'poor',
      });
    }

    if (result.debtToEquity !== null) {
      metrics.push({
        name: 'Debt/Equity',
        value: result.debtToEquity.toFixed(2),
        benchmark: '<0.6',
        status: result.debtToEquity < 0.6 ? 'good' : result.debtToEquity < 1 ? 'average' : 'poor',
      });
    }

    return metrics;
  }
}
