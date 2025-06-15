/**
 * @fileOverview Momentum Indicators
 * RSI, MACD, and Stochastic Oscillator implementations
 */

export function relativeStrengthIndex(values: number[], period: number): number[] {
  if (period <= 0) throw new Error('Period must be positive');
  const result: number[] = [];
  let gains = 0;
  let losses = 0;
  for (let i = 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    if (i <= period) {
      if (change > 0) gains += change; else losses -= change;
      if (i === period) {
        const rs = losses === 0 ? 100 : gains / losses;
        result.push(100 - 100 / (1 + rs));
      } else {
        result.push(NaN);
      }
    } else {
      const prevChange = values[i - period] - values[i - period - 1];
      if (prevChange > 0) gains -= prevChange; else losses += prevChange;
      if (change > 0) gains += change; else losses -= change;
      const rs = losses === 0 ? 100 : gains / losses;
      result.push(100 - 100 / (1 + rs));
    }
  }
  result.unshift(NaN); // first value has no change
  return result;
}

export interface MacdResult {
  macd: number[];
  signal: number[];
  histogram: number[];
}

export function movingAverage(values: number[], period: number): number[] {
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

export function macd(values: number[], fast = 12, slow = 26, signalPeriod = 9): MacdResult {
  const emaFast = exponentialMovingAverage(values, fast);
  const emaSlow = exponentialMovingAverage(values, slow);
  const macdLine = emaFast.map((val, i) => val - emaSlow[i]);
  const signalLine = exponentialMovingAverage(macdLine.slice(slow - 1), signalPeriod);
  const fullSignal = Array(slow - 1).fill(NaN).concat(signalLine);
  const histogram = macdLine.map((val, i) => val - (fullSignal[i] ?? NaN));
  return { macd: macdLine, signal: fullSignal, histogram };
}

export function stochasticOscillator(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i + 1 < period) {
      result.push(NaN);
      continue;
    }
    const slice = values.slice(i + 1 - period, i + 1);
    const high = Math.max(...slice);
    const low = Math.min(...slice);
    const current = values[i];
    result.push(((current - low) / (high - low)) * 100);
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
