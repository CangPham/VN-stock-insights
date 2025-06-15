/**
 * @fileOverview Volatility Indicators
 * Bao gồm Bollinger Bands và Average True Range
 */

import { simpleMovingAverage } from './moving-average';

export interface BollingerBands {
  upper: number[];
  middle: number[];
  lower: number[];
}

export function bollingerBands(
  values: number[],
  period = 20,
  stdDev = 2
): BollingerBands {
  if (period <= 0) throw new Error('Period must be positive');
  const middle = simpleMovingAverage(values, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < values.length; i++) {
    if (i + 1 < period) {
      upper.push(NaN);
      lower.push(NaN);
      continue;
    }
    const slice = values.slice(i + 1 - period, i + 1);
    const mean = middle[i];
    const variance = slice.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / period;
    const dev = Math.sqrt(variance) * stdDev;
    upper.push(mean + dev);
    lower.push(mean - dev);
  }

  return { upper, middle, lower };
}

export function averageTrueRange(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14
): number[] {
  if (period <= 0) throw new Error('Period must be positive');
  const trs: number[] = [];

  for (let i = 0; i < highs.length; i++) {
    const high = highs[i];
    const low = lows[i];
    const prevClose = i > 0 ? closes[i - 1] : closes[i];
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trs.push(tr);
  }

  const atr = simpleMovingAverage(trs, period);
  return atr;
}
