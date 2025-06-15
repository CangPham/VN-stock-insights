/**
 * @fileOverview Support/Resistance Detection
 * Phát hiện các mức hỗ trợ và kháng cự đơn giản
 */

export interface SupportResistanceLevel {
  index: number;
  level: number;
  type: 'support' | 'resistance';
}

export function detectSupportResistance(values: number[], lookback = 5): SupportResistanceLevel[] {
  const levels: SupportResistanceLevel[] = [];

  for (let i = lookback; i < values.length - lookback; i++) {
    const slice = values.slice(i - lookback, i + lookback + 1);
    const current = values[i];
    const isSupport = current === Math.min(...slice);
    const isResistance = current === Math.max(...slice);
    if (isSupport) levels.push({ index: i, level: current, type: 'support' });
    if (isResistance) levels.push({ index: i, level: current, type: 'resistance' });
  }

  return levels;
}
