/**
 * Một số chỉ báo động lượng: RSI và MACD
 */
import { EMA } from './moving-averages';

export function RSI(data: number[], period = 14): number[] {
  if (period <= 0) throw new Error('Period must be greater than 0');
  if (data.length < period + 1) return Array(data.length).fill(NaN);

  const result: number[] = Array(data.length).fill(NaN);
  let gainSum = 0;
  let lossSum = 0;

  for (let i = 1; i <= period; i++) {
    const diff = data[i] - data[i - 1];
    if (diff >= 0) gainSum += diff; else lossSum -= diff;
  }

  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  result[period] = 100 - 100 / (1 + avgGain / (avgLoss || 1));

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = 100 - 100 / (1 + avgGain / (avgLoss || 1));
  }

  return result;
}

export interface MACDResult {
  macd: number[];
  signal: number[];
  histogram: number[];
}

export function MACD(data: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9): MACDResult {
  const fastEma = EMA(data, fastPeriod);
  const slowEma = EMA(data, slowPeriod);
  const macd: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const m = fastEma[i] - slowEma[i];
    macd.push(isNaN(m) ? NaN : m);
  }
  const signal = EMA(macd.map(v => (isNaN(v) ? 0 : v)), signalPeriod);
  const histogram = macd.map((m, idx) => (isNaN(m) || isNaN(signal[idx]) ? NaN : m - signal[idx]));
  return { macd, signal, histogram };
}
