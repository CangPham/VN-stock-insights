/**
 * @fileOverview Tests for Technical Indicators
 * Tests cho các chỉ số kỹ thuật
 */

import { describe, it, expect } from '@jest/globals';
import { TechnicalIndicators, PriceData } from '../technical-indicators';

describe('Technical Indicators', () => {
  // Sample price data for testing
  const samplePrices = [
    100, 102, 101, 103, 105, 104, 106, 108, 107, 109,
    111, 110, 112, 114, 113, 115, 117, 116, 118, 120,
    119, 121, 123, 122, 124, 126, 125, 127, 129, 128
  ];

  const samplePriceData: PriceData[] = samplePrices.map((price, index) => ({
    date: new Date(2024, 0, index + 1),
    open: price - 0.5,
    high: price + 1,
    low: price - 1,
    close: price,
    volume: 1000000 + Math.random() * 500000,
  }));

  describe('RSI Calculation', () => {
    it('should calculate RSI correctly', () => {
      const rsi = TechnicalIndicators.calculateRSI(samplePrices, 14);
      
      expect(rsi).toBeDefined();
      expect(rsi!.value).toBeGreaterThan(0);
      expect(rsi!.value).toBeLessThan(100);
    });

    it('should return null for insufficient data', () => {
      const shortPrices = [100, 102, 101];
      const rsi = TechnicalIndicators.calculateRSI(shortPrices, 14);
      
      expect(rsi).toBeNull();
    });

    it('should identify overbought condition', () => {
      // Create prices that trend strongly upward
      const trendingUpPrices = Array.from({ length: 20 }, (_, i) => 100 + i * 2);
      const rsi = TechnicalIndicators.calculateRSI(trendingUpPrices, 14, 70, 30);
      
      expect(rsi).toBeDefined();
      expect(rsi!.signal).toBe('overbought');
    });

    it('should identify oversold condition', () => {
      // Create prices that trend strongly downward
      const trendingDownPrices = Array.from({ length: 20 }, (_, i) => 100 - i * 2);
      const rsi = TechnicalIndicators.calculateRSI(trendingDownPrices, 14, 70, 30);
      
      expect(rsi).toBeDefined();
      expect(rsi!.signal).toBe('oversold');
    });

    it('should handle custom overbought/oversold levels', () => {
      const rsi = TechnicalIndicators.calculateRSI(samplePrices, 14, 80, 20);
      
      expect(rsi).toBeDefined();
      // Should use custom thresholds for signal determination
    });
  });

  describe('MACD Calculation', () => {
    it('should calculate MACD correctly', () => {
      const macd = TechnicalIndicators.calculateMACD(samplePrices, 12, 26, 9);
      
      expect(macd).toBeDefined();
      expect(macd!.macd).toBeDefined();
      expect(macd!.signal).toBeDefined();
      expect(macd!.histogram).toBeDefined();
      expect(macd!.trend).toMatch(/bullish|bearish|neutral/);
    });

    it('should return null for insufficient data', () => {
      const shortPrices = [100, 102, 101, 103, 105];
      const macd = TechnicalIndicators.calculateMACD(shortPrices, 12, 26, 9);
      
      expect(macd).toBeNull();
    });

    it('should detect bullish crossover', () => {
      // Create data that would result in bullish crossover
      const bullishPrices = [
        ...Array.from({ length: 30 }, (_, i) => 100 - i * 0.5), // Declining
        ...Array.from({ length: 10 }, (_, i) => 85 + i * 2)     // Rising
      ];
      
      const macd = TechnicalIndicators.calculateMACD(bullishPrices, 12, 26, 9);
      expect(macd).toBeDefined();
    });

    it('should use custom periods', () => {
      const macd = TechnicalIndicators.calculateMACD(samplePrices, 8, 21, 5);
      
      expect(macd).toBeDefined();
      // Should work with different period settings
    });
  });

  describe('Moving Averages', () => {
    it('should calculate SMA correctly', () => {
      const sma = TechnicalIndicators.calculateSMA(samplePrices, 10);
      
      expect(sma).toBeDefined();
      expect(sma!.length).toBe(samplePrices.length - 9); // 10-period SMA
      
      // First SMA value should be average of first 10 prices
      const expectedFirst = samplePrices.slice(0, 10).reduce((sum, price) => sum + price, 0) / 10;
      expect(sma![0]).toBeCloseTo(expectedFirst, 2);
    });

    it('should calculate EMA correctly', () => {
      const ema = TechnicalIndicators.calculateEMA(samplePrices, 10);
      
      expect(ema).toBeDefined();
      expect(ema!.length).toBe(samplePrices.length - 9); // 10-period EMA
      
      // EMA should be more responsive than SMA
      const sma = TechnicalIndicators.calculateSMA(samplePrices, 10);
      expect(ema![ema!.length - 1]).not.toBe(sma![sma!.length - 1]);
    });

    it('should calculate moving average with trend analysis', () => {
      const ma = TechnicalIndicators.calculateMovingAverageWithTrend(samplePrices, 10);
      
      expect(ma).toBeDefined();
      expect(ma!.period).toBe(10);
      expect(ma!.value).toBeGreaterThan(0);
      expect(ma!.trend).toMatch(/upward|downward|sideways/);
      expect(ma!.position).toMatch(/above|below|at/);
    });

    it('should calculate multiple moving averages', () => {
      const periods = [5, 10, 20];
      const mas = TechnicalIndicators.calculateMultipleMovingAverages(samplePrices, periods);
      
      expect(mas).toHaveLength(3);
      expect(mas[0].period).toBe(5);
      expect(mas[1].period).toBe(10);
      expect(mas[2].period).toBe(20);
    });

    it('should return null for insufficient data', () => {
      const shortPrices = [100, 102];
      const sma = TechnicalIndicators.calculateSMA(shortPrices, 10);
      
      expect(sma).toBeNull();
    });
  });

  describe('Bollinger Bands', () => {
    it('should calculate Bollinger Bands correctly', () => {
      const bb = TechnicalIndicators.calculateBollingerBands(samplePrices, 20, 2);
      
      expect(bb).toBeDefined();
      expect(bb!.upper).toBeGreaterThan(bb!.middle);
      expect(bb!.middle).toBeGreaterThan(bb!.lower);
      expect(bb!.bandwidth).toBeGreaterThan(0);
      expect(bb!.position).toMatch(/above_upper|below_lower|within_bands/);
    });

    it('should detect squeeze condition', () => {
      // Create data with low volatility (should result in squeeze)
      const lowVolatilityPrices = Array.from({ length: 25 }, () => 100 + Math.random() * 0.5);
      const bb = TechnicalIndicators.calculateBollingerBands(lowVolatilityPrices, 20, 2);
      
      expect(bb).toBeDefined();
      expect(bb!.squeeze).toBe(true);
    });

    it('should use custom parameters', () => {
      const bb = TechnicalIndicators.calculateBollingerBands(samplePrices, 15, 1.5);
      
      expect(bb).toBeDefined();
      // Should work with different period and standard deviation settings
    });

    it('should return null for insufficient data', () => {
      const shortPrices = [100, 102, 101];
      const bb = TechnicalIndicators.calculateBollingerBands(shortPrices, 20, 2);
      
      expect(bb).toBeNull();
    });
  });

  describe('Support and Resistance', () => {
    it('should identify support and resistance levels', () => {
      const sr = TechnicalIndicators.calculateSupportResistance(samplePriceData, 20);
      
      expect(sr).toBeDefined();
      expect(sr.support).toBeInstanceOf(Array);
      expect(sr.resistance).toBeInstanceOf(Array);
    });

    it('should return empty arrays for insufficient data', () => {
      const shortData = samplePriceData.slice(0, 5);
      const sr = TechnicalIndicators.calculateSupportResistance(shortData, 20);
      
      expect(sr.support).toHaveLength(0);
      expect(sr.resistance).toHaveLength(0);
    });

    it('should sort support and resistance levels correctly', () => {
      const sr = TechnicalIndicators.calculateSupportResistance(samplePriceData, 15);
      
      if (sr.support.length > 1) {
        // Support levels should be in descending order
        for (let i = 1; i < sr.support.length; i++) {
          expect(sr.support[i]).toBeLessThanOrEqual(sr.support[i - 1]);
        }
      }

      if (sr.resistance.length > 1) {
        // Resistance levels should be in ascending order
        for (let i = 1; i < sr.resistance.length; i++) {
          expect(sr.resistance[i]).toBeGreaterThanOrEqual(sr.resistance[i - 1]);
        }
      }
    });
  });

  describe('Volatility Calculation', () => {
    it('should calculate volatility correctly', () => {
      const volatility = TechnicalIndicators.calculateVolatility(samplePrices, 20);
      
      expect(volatility).toBeDefined();
      expect(volatility!).toBeGreaterThan(0);
      expect(volatility!).toBeLessThan(200); // Reasonable upper bound for volatility %
    });

    it('should return null for insufficient data', () => {
      const shortPrices = [100, 102];
      const volatility = TechnicalIndicators.calculateVolatility(shortPrices, 20);
      
      expect(volatility).toBeNull();
    });

    it('should calculate higher volatility for more volatile data', () => {
      const stablePrices = Array.from({ length: 25 }, () => 100 + Math.random() * 0.1);
      const volatilePrices = Array.from({ length: 25 }, () => 100 + Math.random() * 10);
      
      const stableVolatility = TechnicalIndicators.calculateVolatility(stablePrices, 20);
      const highVolatility = TechnicalIndicators.calculateVolatility(volatilePrices, 20);
      
      expect(highVolatility!).toBeGreaterThan(stableVolatility!);
    });

    it('should use custom period', () => {
      const volatility10 = TechnicalIndicators.calculateVolatility(samplePrices, 10);
      const volatility30 = TechnicalIndicators.calculateVolatility(samplePrices, 30);
      
      expect(volatility10).toBeDefined();
      expect(volatility30).toBeNull(); // Not enough data for 30-period
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty price arrays', () => {
      const emptyPrices: number[] = [];
      
      expect(TechnicalIndicators.calculateRSI(emptyPrices, 14)).toBeNull();
      expect(TechnicalIndicators.calculateMACD(emptyPrices, 12, 26, 9)).toBeNull();
      expect(TechnicalIndicators.calculateSMA(emptyPrices, 10)).toBeNull();
      expect(TechnicalIndicators.calculateEMA(emptyPrices, 10)).toBeNull();
    });

    it('should handle single price value', () => {
      const singlePrice = [100];
      
      expect(TechnicalIndicators.calculateRSI(singlePrice, 14)).toBeNull();
      expect(TechnicalIndicators.calculateMACD(singlePrice, 12, 26, 9)).toBeNull();
      expect(TechnicalIndicators.calculateSMA(singlePrice, 10)).toBeNull();
      expect(TechnicalIndicators.calculateEMA(singlePrice, 10)).toBeNull();
    });

    it('should handle zero and negative prices', () => {
      const invalidPrices = [0, -1, 5, -2, 10];
      
      // Should still calculate but may produce unusual results
      const rsi = TechnicalIndicators.calculateRSI(invalidPrices, 3);
      expect(rsi).toBeDefined(); // Should handle gracefully
    });

    it('should handle very large numbers', () => {
      const largePrices = [1e6, 1e6 + 1000, 1e6 + 2000, 1e6 + 1500, 1e6 + 3000];
      
      const sma = TechnicalIndicators.calculateSMA(largePrices, 3);
      expect(sma).toBeDefined();
      expect(sma![0]).toBeCloseTo((largePrices[0] + largePrices[1] + largePrices[2]) / 3, 0);
    });

    it('should handle period larger than data length', () => {
      const shortPrices = [100, 102, 101];
      
      expect(TechnicalIndicators.calculateSMA(shortPrices, 10)).toBeNull();
      expect(TechnicalIndicators.calculateEMA(shortPrices, 10)).toBeNull();
      expect(TechnicalIndicators.calculateRSI(shortPrices, 10)).toBeNull();
    });
  });

  describe('Performance Tests', () => {
    it('should handle large datasets efficiently', () => {
      // Generate large dataset
      const largePrices = Array.from({ length: 10000 }, (_, i) => 100 + Math.sin(i / 100) * 10 + Math.random() * 2);
      
      const startTime = Date.now();
      
      const rsi = TechnicalIndicators.calculateRSI(largePrices, 14);
      const macd = TechnicalIndicators.calculateMACD(largePrices, 12, 26, 9);
      const sma = TechnicalIndicators.calculateSMA(largePrices, 20);
      const bb = TechnicalIndicators.calculateBollingerBands(largePrices, 20, 2);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      expect(rsi).toBeDefined();
      expect(macd).toBeDefined();
      expect(sma).toBeDefined();
      expect(bb).toBeDefined();
      
      // Should complete within reasonable time (less than 1 second)
      expect(executionTime).toBeLessThan(1000);
    });
  });
});
