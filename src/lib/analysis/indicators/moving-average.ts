/**
 * @fileOverview Moving Average Indicators
 * Triển khai các chỉ báo SMA, EMA và WMA
 */

export function simpleMovingAverage(values: number[], period: number): number[] {
  if (period <= 0) throw new Error('Period must be positive');
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i + 1 < period) {
      result.push(NaN);
      continue;
    }
    const slice = values.slice(i + 1 - period, i + 1);
    const sum = slice.reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
}

export function weightedMovingAverage(values: number[], period: number): number[] {
  if (period <= 0) throw new Error('Period must be positive');
  const result: number[] = [];
  const denominator = (period * (period + 1)) / 2;
  for (let i = 0; i < values.length; i++) {
    if (i + 1 < period) {
      result.push(NaN);
      continue;
    }
    let weightedSum = 0;
    for (let j = 0; j < period; j++) {
      weightedSum += values[i - j] * (period - j);
    }
    result.push(weightedSum / denominator);
  }
  return result;
}

export function exponentialMovingAverage(values: number[], period: number): number[] {
  if (period <= 0) throw new Error('Period must be positive');
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
