/**
 * @fileOverview Volatility Indicators
 * Bollinger Bands and Average True Range implementations
 */

export interface BollingerBands {
  upper: number[];
  middle: number[];
  lower: number[];
}

export function bollingerBands(values: number[], period: number, multiplier = 2): BollingerBands {
  if (period <= 0) throw new Error('Period must be positive');
  const middle = simpleMovingAverage(values, period);
  const stdDev = movingStdDev(values, period);
  const upper = middle.map((m, i) => (isNaN(m) ? NaN : m + multiplier * stdDev[i]));
  const lower = middle.map((m, i) => (isNaN(m) ? NaN : m - multiplier * stdDev[i]));
  return { upper, middle, lower };
}

export function averageTrueRange(highs: number[], lows: number[], closes: number[], period: number): number[] {
  if (period <= 0) throw new Error('Period must be positive');
  const trs: number[] = [];
  for (let i = 0; i < highs.length; i++) {
    const high = highs[i];
    const low = lows[i];
    const prevClose = i === 0 ? closes[i] : closes[i - 1];
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trs.push(tr);
  }
  return exponentialMovingAverage(trs, period);
}

function simpleMovingAverage(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i + 1 < period) {
      result.push(NaN);
      continue;
    }
    const slice = values.slice(i + 1 - period, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / period);
  }
  return result;
}

function movingStdDev(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i + 1 < period) {
      result.push(NaN);
      continue;
    }
    const slice = values.slice(i + 1 - period, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / period;
    result.push(Math.sqrt(variance));
  }
  return result;
}

function exponentialMovingAverage(values: number[], period: number): number[] {
  const result: number[] = [];
  const k = 2 / (period + 1);
  for (let i = 0; i < values.length; i++) {
    if (i === 0) {
      result.push(values[i]);
    } else {
      const prev = result[i - 1];
      result.push(values[i] * k + prev * (1 - k));
    }
  }
  return result;
}
