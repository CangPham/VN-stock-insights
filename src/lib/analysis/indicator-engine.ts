/**
 * @fileOverview Indicator Engine
 * Engine tính toán các chỉ báo kỹ thuật với caching đơn giản
 */

import {
  simpleMovingAverage,
  exponentialMovingAverage,
  weightedMovingAverage
} from './indicators/moving-average';
import { rsi, macd, stochasticOscillator } from './indicators/momentum';
import { bollingerBands, averageTrueRange } from './indicators/volatility';
import { onBalanceVolume } from './indicators/volume';
import { detectSupportResistance } from './indicators/support-resistance';

export class IndicatorEngine {
  private cache = new Map<string, any>();

  private getKey(name: string, args: any[]): string {
    return `${name}_${JSON.stringify(args)}`;
  }

  public sma(values: number[], period: number): number[] {
    const key = this.getKey('sma', [values, period]);
    if (!this.cache.has(key)) {
      this.cache.set(key, simpleMovingAverage(values, period));
    }
    return this.cache.get(key);
  }

  public ema(values: number[], period: number): number[] {
    const key = this.getKey('ema', [values, period]);
    if (!this.cache.has(key)) {
      this.cache.set(key, exponentialMovingAverage(values, period));
    }
    return this.cache.get(key);
  }

  public wma(values: number[], period: number): number[] {
    const key = this.getKey('wma', [values, period]);
    if (!this.cache.has(key)) {
      this.cache.set(key, weightedMovingAverage(values, period));
    }
    return this.cache.get(key);
  }

  public rsi(values: number[], period: number): number[] {
    const key = this.getKey('rsi', [values, period]);
    if (!this.cache.has(key)) {
      this.cache.set(key, rsi(values, period));
    }
    return this.cache.get(key);
  }

  public macd(values: number[], shortP?: number, longP?: number, signalP?: number) {
    const key = this.getKey('macd', [values, shortP, longP, signalP]);
    if (!this.cache.has(key)) {
      this.cache.set(key, macd(values, shortP, longP, signalP));
    }
    return this.cache.get(key);
  }

  public stochastic(
    highs: number[],
    lows: number[],
    closes: number[],
    period?: number,
    signal?: number
  ) {
    const key = this.getKey('stochastic', [highs, lows, closes, period, signal]);
    if (!this.cache.has(key)) {
      this.cache.set(key, stochasticOscillator(highs, lows, closes, period, signal));
    }
    return this.cache.get(key);
  }

  public bollinger(values: number[], period?: number, stdDev?: number) {
    const key = this.getKey('bollinger', [values, period, stdDev]);
    if (!this.cache.has(key)) {
      this.cache.set(key, bollingerBands(values, period, stdDev));
    }
    return this.cache.get(key);
  }

  public atr(highs: number[], lows: number[], closes: number[], period?: number) {
    const key = this.getKey('atr', [highs, lows, closes, period]);
    if (!this.cache.has(key)) {
      this.cache.set(key, averageTrueRange(highs, lows, closes, period));
    }
    return this.cache.get(key);
  }

  public obv(closes: number[], volumes: number[]) {
    const key = this.getKey('obv', [closes, volumes]);
    if (!this.cache.has(key)) {
      this.cache.set(key, onBalanceVolume(closes, volumes));
    }
    return this.cache.get(key);
  }

  public supportResistance(values: number[], lookback?: number) {
    const key = this.getKey('supportResistance', [values, lookback]);
    if (!this.cache.has(key)) {
      this.cache.set(key, detectSupportResistance(values, lookback));
    }
    return this.cache.get(key);
  }

  public clearCache(): void {
    this.cache.clear();
  }
}
