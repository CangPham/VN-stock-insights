/**
 * Các hàm tính toán đường trung bình động cho phân tích kỹ thuật
 */
export function SMA(data: number[], period: number): number[] {
  if (period <= 0) throw new Error('Period must be greater than 0');
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i + 1 < period) {
      result.push(NaN);
      continue;
    }
    const slice = data.slice(i + 1 - period, i + 1);
    const sum = slice.reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
}

export function EMA(data: number[], period: number): number[] {
  if (period <= 0) throw new Error('Period must be greater than 0');
  const k = 2 / (period + 1);
  const result: number[] = [];
  let ema = data[0];
  for (let i = 0; i < data.length; i++) {
    ema = i === 0 ? data[0] : data[i] * k + ema * (1 - k);
    result.push(i + 1 < period ? NaN : ema);
  }
  return result;
}

export function WMA(data: number[], period: number): number[] {
  if (period <= 0) throw new Error('Period must be greater than 0');
  const result: number[] = [];
  const denom = (period * (period + 1)) / 2;
  for (let i = 0; i < data.length; i++) {
    if (i + 1 < period) {
      result.push(NaN);
      continue;
    }
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j] * (period - j);
    }
    result.push(sum / denom);
  }
  return result;
}
