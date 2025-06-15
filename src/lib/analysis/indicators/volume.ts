/**
 * @fileOverview Volume Indicators
 * Bao gồm chỉ báo OBV
 */

export function onBalanceVolume(closes: number[], volumes: number[]): number[] {
  if (closes.length !== volumes.length)
    throw new Error('closes and volumes must have same length');

  const result: number[] = [];
  let obv = 0;
  result.push(obv);

  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) obv += volumes[i];
    else if (closes[i] < closes[i - 1]) obv -= volumes[i];
    result.push(obv);
  }

  return result;
}
