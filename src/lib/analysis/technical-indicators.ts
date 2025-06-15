/**
 * @fileOverview Technical Indicators Calculator
 * Tính toán các chỉ số kỹ thuật cho phân tích cổ phiếu
 */

// Interface cho dữ liệu giá
export interface PriceData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Interface cho kết quả RSI
export interface RSIResult {
  value: number;
  signal: 'overbought' | 'oversold' | 'neutral';
  strength: 'strong' | 'moderate' | 'weak';
}

// Interface cho kết quả MACD
export interface MACDResult {
  macd: number;
  signal: number;
  histogram: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  crossover: 'bullish_crossover' | 'bearish_crossover' | 'none';
}

// Interface cho Moving Averages
export interface MovingAverageResult {
  period: number;
  value: number;
  trend: 'upward' | 'downward' | 'sideways';
  position: 'above' | 'below' | 'at';
}

// Interface cho Bollinger Bands
export interface BollingerBandsResult {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
  position: 'above_upper' | 'below_lower' | 'within_bands';
  squeeze: boolean;
}

// Technical Indicators Calculator Class
export class TechnicalIndicators {
  
  // Calculate RSI (Relative Strength Index)
  public static calculateRSI(
    prices: number[], 
    period: number = 14,
    overboughtLevel: number = 70,
    oversoldLevel: number = 30
  ): RSIResult | null {
    if (prices.length < period + 1) {
      return null;
    }

    const gains: number[] = [];
    const losses: number[] = [];

    // Calculate price changes
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    // Calculate initial average gain and loss
    let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

    // Calculate RSI for subsequent periods using smoothed averages
    for (let i = period; i < gains.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    }

    if (avgLoss === 0) {
      return { value: 100, signal: 'overbought', strength: 'strong' };
    }

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    // Determine signal
    let signal: 'overbought' | 'oversold' | 'neutral' = 'neutral';
    let strength: 'strong' | 'moderate' | 'weak' = 'weak';

    if (rsi >= overboughtLevel) {
      signal = 'overbought';
      strength = rsi >= 80 ? 'strong' : 'moderate';
    } else if (rsi <= oversoldLevel) {
      signal = 'oversold';
      strength = rsi <= 20 ? 'strong' : 'moderate';
    }

    return { value: rsi, signal, strength };
  }

  // Calculate MACD (Moving Average Convergence Divergence)
  public static calculateMACD(
    prices: number[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
  ): MACDResult | null {
    if (prices.length < slowPeriod + signalPeriod) {
      return null;
    }

    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);

    if (!fastEMA || !slowEMA) {
      return null;
    }

    // Calculate MACD line
    const macdLine: number[] = [];
    const startIndex = slowPeriod - 1;

    for (let i = startIndex; i < fastEMA.length; i++) {
      macdLine.push(fastEMA[i] - slowEMA[i - startIndex]);
    }

    // Calculate Signal line (EMA of MACD)
    const signalLine = this.calculateEMA(macdLine, signalPeriod);
    
    if (!signalLine || signalLine.length === 0) {
      return null;
    }

    const macd = macdLine[macdLine.length - 1];
    const signal = signalLine[signalLine.length - 1];
    const histogram = macd - signal;

    // Determine trend and crossover
    let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let crossover: 'bullish_crossover' | 'bearish_crossover' | 'none' = 'none';

    if (macd > signal) {
      trend = 'bullish';
    } else if (macd < signal) {
      trend = 'bearish';
    }

    // Check for crossover (simplified - would need previous values for accurate detection)
    if (signalLine.length >= 2) {
      const prevMACD = macdLine[macdLine.length - 2];
      const prevSignal = signalLine[signalLine.length - 2];

      if (prevMACD <= prevSignal && macd > signal) {
        crossover = 'bullish_crossover';
      } else if (prevMACD >= prevSignal && macd < signal) {
        crossover = 'bearish_crossover';
      }
    }

    return { macd, signal, histogram, trend, crossover };
  }

  // Calculate Simple Moving Average
  public static calculateSMA(prices: number[], period: number): number[] | null {
    if (prices.length < period) {
      return null;
    }

    const sma: number[] = [];
    
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((acc, price) => acc + price, 0);
      sma.push(sum / period);
    }

    return sma;
  }

  // Calculate Exponential Moving Average
  public static calculateEMA(prices: number[], period: number): number[] | null {
    if (prices.length < period) {
      return null;
    }

    const ema: number[] = [];
    const multiplier = 2 / (period + 1);

    // First EMA is SMA
    const firstSMA = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
    ema.push(firstSMA);

    // Calculate subsequent EMAs
    for (let i = period; i < prices.length; i++) {
      const currentEMA = (prices[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
      ema.push(currentEMA);
    }

    return ema;
  }

  // Calculate Moving Average with trend analysis
  public static calculateMovingAverageWithTrend(
    prices: number[],
    period: number,
    type: 'SMA' | 'EMA' = 'SMA'
  ): MovingAverageResult | null {
    const ma = type === 'SMA' 
      ? this.calculateSMA(prices, period)
      : this.calculateEMA(prices, period);

    if (!ma || ma.length < 2) {
      return null;
    }

    const currentMA = ma[ma.length - 1];
    const previousMA = ma[ma.length - 2];
    const currentPrice = prices[prices.length - 1];

    // Determine trend
    let trend: 'upward' | 'downward' | 'sideways' = 'sideways';
    const trendThreshold = currentMA * 0.001; // 0.1% threshold

    if (currentMA > previousMA + trendThreshold) {
      trend = 'upward';
    } else if (currentMA < previousMA - trendThreshold) {
      trend = 'downward';
    }

    // Determine price position relative to MA
    let position: 'above' | 'below' | 'at' = 'at';
    const positionThreshold = currentMA * 0.005; // 0.5% threshold

    if (currentPrice > currentMA + positionThreshold) {
      position = 'above';
    } else if (currentPrice < currentMA - positionThreshold) {
      position = 'below';
    }

    return {
      period,
      value: currentMA,
      trend,
      position,
    };
  }

  // Calculate Bollinger Bands
  public static calculateBollingerBands(
    prices: number[],
    period: number = 20,
    standardDeviations: number = 2
  ): BollingerBandsResult | null {
    if (prices.length < period) {
      return null;
    }

    const sma = this.calculateSMA(prices, period);
    if (!sma) {
      return null;
    }

    const currentSMA = sma[sma.length - 1];
    const recentPrices = prices.slice(-period);

    // Calculate standard deviation
    const variance = recentPrices.reduce((sum, price) => {
      return sum + Math.pow(price - currentSMA, 2);
    }, 0) / period;

    const stdDev = Math.sqrt(variance);

    const upper = currentSMA + (standardDeviations * stdDev);
    const lower = currentSMA - (standardDeviations * stdDev);
    const bandwidth = ((upper - lower) / currentSMA) * 100;

    const currentPrice = prices[prices.length - 1];

    // Determine position
    let position: 'above_upper' | 'below_lower' | 'within_bands' = 'within_bands';
    if (currentPrice > upper) {
      position = 'above_upper';
    } else if (currentPrice < lower) {
      position = 'below_lower';
    }

    // Detect squeeze (narrow bands)
    const squeeze = bandwidth < 10; // Threshold for squeeze detection

    return {
      upper,
      middle: currentSMA,
      lower,
      bandwidth,
      position,
      squeeze,
    };
  }

  // Calculate multiple moving averages
  public static calculateMultipleMovingAverages(
    prices: number[],
    periods: number[] = [20, 50, 200]
  ): MovingAverageResult[] {
    return periods
      .map(period => this.calculateMovingAverageWithTrend(prices, period))
      .filter((result): result is MovingAverageResult => result !== null);
  }

  // Calculate support and resistance levels
  public static calculateSupportResistance(
    priceData: PriceData[],
    lookbackPeriod: number = 20
  ): { support: number[]; resistance: number[] } {
    if (priceData.length < lookbackPeriod) {
      return { support: [], resistance: [] };
    }

    const recentData = priceData.slice(-lookbackPeriod);
    const highs = recentData.map(d => d.high);
    const lows = recentData.map(d => d.low);

    // Find local maxima (resistance) and minima (support)
    const resistance: number[] = [];
    const support: number[] = [];

    for (let i = 1; i < recentData.length - 1; i++) {
      const current = recentData[i];
      const prev = recentData[i - 1];
      const next = recentData[i + 1];

      // Local maximum (resistance)
      if (current.high > prev.high && current.high > next.high) {
        resistance.push(current.high);
      }

      // Local minimum (support)
      if (current.low < prev.low && current.low < next.low) {
        support.push(current.low);
      }
    }

    // Sort and return unique levels
    return {
      support: [...new Set(support)].sort((a, b) => b - a), // Descending
      resistance: [...new Set(resistance)].sort((a, b) => a - b), // Ascending
    };
  }

  // Calculate volatility
  public static calculateVolatility(
    prices: number[],
    period: number = 20
  ): number | null {
    if (prices.length < period + 1) {
      return null;
    }

    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }

    const recentReturns = returns.slice(-period);
    const meanReturn = recentReturns.reduce((sum, ret) => sum + ret, 0) / period;

    const variance = recentReturns.reduce((sum, ret) => {
      return sum + Math.pow(ret - meanReturn, 2);
    }, 0) / period;

    // Annualized volatility (assuming 252 trading days)
    return Math.sqrt(variance * 252) * 100;
  }
}
