/**
 * @fileOverview Indicator Calculation Engine with basic in-memory cache
 */

import { relativeStrengthIndex, macd, stochasticOscillator } from './indicators/momentum';
import { bollingerBands, averageTrueRange } from './indicators/volatility';
import { onBalanceVolume } from './indicators/volume';
import { detectSupportResistance } from './indicators/support-resistance';
import { IndicatorCache } from './cache';

export interface IndicatorInputs {
  closes: number[];
  highs?: number[];
  lows?: number[];
  volumes?: number[];
}

export class IndicatorEngine {
  private cache = new IndicatorCache();

  constructor(private data: IndicatorInputs) {}

  public rsi(period: number): number[] {
    const key = `rsi_${period}`;
    return this.cache.getOrSet(key, () => relativeStrengthIndex(this.data.closes, period));
  }

  public macd(fast = 12, slow = 26, signal = 9) {
    const key = `macd_${fast}_${slow}_${signal}`;
    return this.cache.getOrSet(key, () => macd(this.data.closes, fast, slow, signal));
  }

  public stochastic(period: number): number[] {
    const key = `stoch_${period}`;
    return this.cache.getOrSet(key, () => stochasticOscillator(this.data.closes, period));
  }

  public bollinger(period: number, multiplier = 2) {
    const key = `bb_${period}_${multiplier}`;
    return this.cache.getOrSet(key, () => bollingerBands(this.data.closes, period, multiplier));
  }

  public atr(period: number): number[] {
    if (!this.data.highs || !this.data.lows) throw new Error('Highs and lows required');
    const key = `atr_${period}`;
    return this.cache.getOrSet(key, () => averageTrueRange(this.data.highs!, this.data.lows!, this.data.closes, period));
  }

  public obv(): number[] {
    if (!this.data.volumes) throw new Error('Volumes required');
    return this.cache.getOrSet('obv', () => onBalanceVolume(this.data.closes, this.data.volumes!));
  }

  public supportResistance(lookback = 5) {
    const key = `sr_${lookback}`;
    return this.cache.getOrSet(key, () => detectSupportResistance(this.data.closes, lookback));
  }
}
