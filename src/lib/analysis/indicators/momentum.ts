/**
 * @fileOverview Momentum Indicators
 * Bao gồm RSI, MACD và Stochastic Oscillator
 */

export function rsi(values: number[], period = 14): number[] {
  if (period <= 0) throw new Error('Period must be positive');
  const result: number[] = [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    if (i <= period) {
      if (change > 0) gains += change; else losses -= change;
      if (i === period) {
        const rs = gains / (losses || 1);
        result.push(100 - 100 / (1 + rs));
      } else {
        result.push(NaN);
      }
      continue;
    }

    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    gains = (gains * (period - 1) + gain) / period;
    losses = (losses * (period - 1) + loss) / period;
    const rs = gains / (losses || 1);
    result.push(100 - 100 / (1 + rs));
  }

  if (values.length > 0) result.unshift(NaN);
  return result;
}

export interface MACDResult {
  macd: number[];
  signal: number[];
  histogram: number[];
}

export function macd(
  values: number[],
  shortPeriod = 12,
  longPeriod = 26,
  signalPeriod = 9
): MACDResult {
  const emaShort = exponentialMovingAverage(values, shortPeriod);
  const emaLong = exponentialMovingAverage(values, longPeriod);
  const macdLine: number[] = [];
  for (let i = 0; i < values.length; i++) {
    macdLine.push(emaShort[i] - emaLong[i]);
  }
  const signalLine = exponentialMovingAverage(macdLine, signalPeriod);
  const histogram: number[] = [];
  for (let i = 0; i < values.length; i++) {
    histogram.push(macdLine[i] - signalLine[i]);
  }
  return { macd: macdLine, signal: signalLine, histogram };
}

export interface StochasticResult {
  k: number[];
  d: number[];
}

export function stochasticOscillator(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14,
  signalPeriod = 3
): StochasticResult {
  const k: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i + 1 < period) {
      k.push(NaN);
      continue;
    }
    const highSlice = highs.slice(i + 1 - period, i + 1);
    const lowSlice = lows.slice(i + 1 - period, i + 1);
    const highestHigh = Math.max(...highSlice);
    const lowestLow = Math.min(...lowSlice);
    k.push(((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100);
  }
  const d = simpleMovingAverage(k, signalPeriod);
  return { k, d };
}

import { exponentialMovingAverage, simpleMovingAverage } from './moving-average';
