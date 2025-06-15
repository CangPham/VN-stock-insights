/**
 * @fileOverview Volume Indicators
 * OBV implementation
 */

export function onBalanceVolume(closes: number[], volumes: number[]): number[] {
  if (closes.length !== volumes.length) throw new Error('Input lengths must match');
  const result: number[] = [];
  let obv = 0;
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) {
      obv += volumes[i];
    } else if (closes[i] < closes[i - 1]) {
      obv -= volumes[i];
    }
    result.push(obv);
  }
  result.unshift(0);
  return result;
}
