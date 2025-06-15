/**
 * @fileOverview Support and Resistance Detection
 * Simple pivot-based algorithm
 */

export interface SupportResistanceLevels {
  supports: number[];
  resistances: number[];
}

export function detectSupportResistance(values: number[], lookback = 5): SupportResistanceLevels {
  const supports: number[] = [];
  const resistances: number[] = [];

  for (let i = lookback; i < values.length - lookback; i++) {
    const slice = values.slice(i - lookback, i + lookback + 1);
    const current = values[i];
    if (current === Math.min(...slice)) {
      supports.push(current);
    }
    if (current === Math.max(...slice)) {
      resistances.push(current);
    }
  }

  return { supports, resistances };
}
