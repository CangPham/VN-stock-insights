/**
 * @fileOverview Data Transformation Pipeline - Hệ thống chuyển đổi dữ liệu
 * Chuẩn hóa dữ liệu từ các nguồn khác nhau về format thống nhất
 */

import { z } from 'zod';
import type { StockInfo, StockPrice } from '@/types/stock';
import type { RealTimePrice, OrderBook, TradeTick, MarketIndex } from '@/types/market';
import type { BalanceSheet, IncomeStatement, CashFlowStatement } from '@/types/financial';
import { DataSourceType } from '@/lib/api/base-client';

// Enum cho loại transformation
export enum TransformationType {
  NORMALIZE = 'NORMALIZE',       // Chuẩn hóa format
  AGGREGATE = 'AGGREGATE',       // Tổng hợp dữ liệu
  ENRICH = 'ENRICH',            // Làm giàu dữ liệu
  CLEAN = 'CLEAN',              // Làm sạch dữ liệu
  CONVERT = 'CONVERT'           // Chuyển đổi đơn vị
}

// Interface cho metadata transformation
export interface TransformationMetadata {
  sourceType: DataSourceType;
  transformationType: TransformationType;
  timestamp: Date;
  version: string;
  rules: string[];
}

// Interface cho kết quả transformation
export interface TransformationResult<T> {
  data: T;
  metadata: TransformationMetadata;
  warnings: string[];
  originalData?: any;
}

// Abstract base transformer
export abstract class BaseTransformer<TInput, TOutput> {
  protected sourceType: DataSourceType;
  protected version: string;

  constructor(sourceType: DataSourceType, version: string = '1.0.0') {
    this.sourceType = sourceType;
    this.version = version;
  }

  // Main transformation method
  public async transform(
    input: TInput,
    transformationType: TransformationType = TransformationType.NORMALIZE
  ): Promise<TransformationResult<TOutput>> {
    const warnings: string[] = [];
    
    try {
      // Pre-processing
      const preprocessed = await this.preProcess(input);
      
      // Main transformation
      const transformed = await this.doTransform(preprocessed);
      
      // Post-processing
      const postprocessed = await this.postProcess(transformed);
      
      // Validation
      const validated = await this.validateOutput(postprocessed);
      
      return {
        data: validated,
        metadata: {
          sourceType: this.sourceType,
          transformationType,
          timestamp: new Date(),
          version: this.version,
          rules: this.getAppliedRules()
        },
        warnings,
        originalData: input
      };
      
    } catch (error) {
      throw new Error(`Transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Abstract methods to be implemented by subclasses
  protected abstract doTransform(input: TInput): Promise<TOutput>;
  protected abstract validateOutput(output: TOutput): Promise<TOutput>;
  protected abstract getAppliedRules(): string[];

  // Default implementations for optional methods
  protected async preProcess(input: TInput): Promise<TInput> {
    return input;
  }

  protected async postProcess(output: TOutput): Promise<TOutput> {
    return output;
  }
}

// FireAnt Stock Price Transformer
export class FireAntStockPriceTransformer extends BaseTransformer<any, StockPrice> {
  constructor() {
    super(DataSourceType.FIREANT);
  }

  protected async doTransform(input: any): Promise<StockPrice> {
    // FireAnt specific transformation logic
    return {
      stockCode: this.normalizeStockCode(input.symbol || input.stockCode),
      date: this.parseDate(input.date || input.tradingDate),
      openPrice: this.parsePrice(input.open || input.openPrice),
      highPrice: this.parsePrice(input.high || input.highPrice),
      lowPrice: this.parsePrice(input.low || input.lowPrice),
      closePrice: this.parsePrice(input.close || input.closePrice),
      volume: this.parseVolume(input.volume || input.totalVolume),
      value: this.parseValue(input.value || input.totalValue),
      priceChange: this.parsePrice(input.change || input.priceChange || 0),
      priceChangePercent: this.parsePercent(input.changePercent || input.priceChangePercent || 0),
      averagePrice: input.averagePrice ? this.parsePrice(input.averagePrice) : undefined,
      foreignBuyVolume: input.foreignBuyVolume ? this.parseVolume(input.foreignBuyVolume) : undefined,
      foreignSellVolume: input.foreignSellVolume ? this.parseVolume(input.foreignSellVolume) : undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  protected async validateOutput(output: StockPrice): Promise<StockPrice> {
    // Validate business rules
    if (output.highPrice < output.lowPrice) {
      throw new Error('High price cannot be lower than low price');
    }
    
    if (output.openPrice < output.lowPrice || output.openPrice > output.highPrice) {
      throw new Error('Open price must be between low and high price');
    }
    
    return output;
  }

  protected getAppliedRules(): string[] {
    return [
      'normalize_stock_code',
      'parse_prices_to_vnd',
      'validate_price_range',
      'convert_volume_units'
    ];
  }

  // Helper methods
  private normalizeStockCode(code: string): string {
    return code.toUpperCase().trim();
  }

  private parseDate(dateInput: any): Date {
    if (dateInput instanceof Date) return dateInput;
    if (typeof dateInput === 'string') return new Date(dateInput);
    if (typeof dateInput === 'number') return new Date(dateInput);
    throw new Error(`Invalid date format: ${dateInput}`);
  }

  private parsePrice(priceInput: any): number {
    const price = typeof priceInput === 'string' ? parseFloat(priceInput) : Number(priceInput);
    if (isNaN(price) || price < 0) {
      throw new Error(`Invalid price: ${priceInput}`);
    }
    return price;
  }

  private parseVolume(volumeInput: any): number {
    const volume = typeof volumeInput === 'string' ? parseInt(volumeInput) : Number(volumeInput);
    if (isNaN(volume) || volume < 0) {
      throw new Error(`Invalid volume: ${volumeInput}`);
    }
    return volume;
  }

  private parseValue(valueInput: any): number {
    const value = typeof valueInput === 'string' ? parseFloat(valueInput) : Number(valueInput);
    if (isNaN(value) || value < 0) {
      throw new Error(`Invalid value: ${valueInput}`);
    }
    return value;
  }

  private parsePercent(percentInput: any): number {
    const percent = typeof percentInput === 'string' ? parseFloat(percentInput) : Number(percentInput);
    if (isNaN(percent)) {
      throw new Error(`Invalid percentage: ${percentInput}`);
    }
    return percent;
  }
}

// CafeF Real-time Price Transformer
export class CafeFRealTimePriceTransformer extends BaseTransformer<any, RealTimePrice> {
  constructor() {
    super(DataSourceType.CAFEF);
  }

  protected async doTransform(input: any): Promise<RealTimePrice> {
    return {
      stockCode: input.s || input.symbol,
      timestamp: new Date(input.t || input.timestamp || Date.now()),
      currentPrice: this.parsePrice(input.c || input.price || input.currentPrice),
      openPrice: this.parsePrice(input.o || input.open),
      highPrice: this.parsePrice(input.h || input.high),
      lowPrice: this.parsePrice(input.l || input.low),
      closePrice: input.pc ? this.parsePrice(input.pc) : undefined,
      priceChange: this.parsePrice(input.ch || input.change || 0),
      priceChangePercent: this.parsePercent(input.cp || input.changePercent || 0),
      trend: this.determineTrend(input.ch || input.change || 0),
      referencePrice: this.parsePrice(input.r || input.ref || input.referencePrice),
      ceilingPrice: this.parsePrice(input.ceil || input.ceiling),
      floorPrice: this.parsePrice(input.floor),
      volume: this.parseVolume(input.v || input.volume || 0),
      value: this.parseValue(input.val || input.value || 0),
      averagePrice: input.avg ? this.parsePrice(input.avg) : undefined,
      foreignBuyVolume: input.fb ? this.parseVolume(input.fb) : undefined,
      foreignSellVolume: input.fs ? this.parseVolume(input.fs) : undefined,
      foreignNetVolume: input.fn ? this.parseVolume(input.fn) : undefined,
      totalBidVolume: input.tbv ? this.parseVolume(input.tbv) : undefined,
      totalAskVolume: input.tav ? this.parseVolume(input.tav) : undefined,
      createdAt: new Date()
    };
  }

  protected async validateOutput(output: RealTimePrice): Promise<RealTimePrice> {
    // Validate price relationships
    if (output.currentPrice < output.floorPrice || output.currentPrice > output.ceilingPrice) {
      throw new Error('Current price is outside floor-ceiling range');
    }
    
    return output;
  }

  protected getAppliedRules(): string[] {
    return [
      'normalize_cafef_format',
      'determine_price_trend',
      'validate_price_limits',
      'calculate_foreign_net_volume'
    ];
  }

  private parsePrice(priceInput: any): number {
    const price = typeof priceInput === 'string' ? parseFloat(priceInput) : Number(priceInput);
    if (isNaN(price) || price < 0) {
      throw new Error(`Invalid price: ${priceInput}`);
    }
    return price;
  }

  private parseVolume(volumeInput: any): number {
    const volume = typeof volumeInput === 'string' ? parseInt(volumeInput) : Number(volumeInput);
    if (isNaN(volume) || volume < 0) {
      throw new Error(`Invalid volume: ${volumeInput}`);
    }
    return volume;
  }

  private parseValue(valueInput: any): number {
    const value = typeof valueInput === 'string' ? parseFloat(valueInput) : Number(valueInput);
    if (isNaN(value) || value < 0) {
      throw new Error(`Invalid value: ${valueInput}`);
    }
    return value;
  }

  private parsePercent(percentInput: any): number {
    const percent = typeof percentInput === 'string' ? parseFloat(percentInput) : Number(percentInput);
    if (isNaN(percent)) {
      throw new Error(`Invalid percentage: ${percentInput}`);
    }
    return percent;
  }

  private determineTrend(change: number): 'UP' | 'DOWN' | 'UNCHANGED' | 'CEILING' | 'FLOOR' {
    if (change > 0) return 'UP';
    if (change < 0) return 'DOWN';
    return 'UNCHANGED';
  }
}

// VietStock Financial Report Transformer
export class VietStockFinancialTransformer extends BaseTransformer<any, BalanceSheet> {
  constructor() {
    super(DataSourceType.VIETSTOCK);
  }

  protected async doTransform(input: any): Promise<BalanceSheet> {
    return {
      stockCode: input.ticker || input.stockCode,
      reportType: this.parseReportType(input.reportType || input.type),
      year: parseInt(input.year),
      quarter: input.quarter ? parseInt(input.quarter) : undefined,
      reportDate: new Date(input.reportDate || input.date),
      auditStatus: input.auditStatus || 'UNAUDITED',
      currencyUnit: input.unit || 'MILLION_VND',
      
      // Assets
      cash: this.parseFinancialValue(input.cash || input.tienVaTuongDuong),
      shortTermInvestments: this.parseFinancialValue(input.shortTermInvestments),
      shortTermReceivables: this.parseFinancialValue(input.shortTermReceivables),
      inventory: this.parseFinancialValue(input.inventory || input.hangTonKho),
      totalCurrentAssets: this.parseFinancialValue(input.totalCurrentAssets || input.tongTaiSanNganHan),
      
      fixedAssets: this.parseFinancialValue(input.fixedAssets || input.taiSanCoDinh),
      longTermInvestments: this.parseFinancialValue(input.longTermInvestments),
      totalLongTermAssets: this.parseFinancialValue(input.totalLongTermAssets),
      totalAssets: this.parseFinancialValue(input.totalAssets || input.tongTaiSan),
      
      // Liabilities
      shortTermDebt: this.parseFinancialValue(input.shortTermDebt),
      totalCurrentLiabilities: this.parseFinancialValue(input.totalCurrentLiabilities),
      longTermDebt: this.parseFinancialValue(input.longTermDebt),
      totalLiabilities: this.parseFinancialValue(input.totalLiabilities || input.tongNoPhaiTra),
      
      // Equity
      shareCapital: this.parseFinancialValue(input.shareCapital || input.vonGop),
      retainedEarnings: this.parseFinancialValue(input.retainedEarnings),
      totalEquity: this.parseFinancialValue(input.totalEquity || input.tongVonChuSoHuu),
      totalLiabilitiesAndEquity: this.parseFinancialValue(input.totalLiabilitiesAndEquity),
      
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  protected async validateOutput(output: BalanceSheet): Promise<BalanceSheet> {
    // Validate balance sheet equation
    if (output.totalAssets && output.totalLiabilities && output.totalEquity) {
      const calculatedTotal = output.totalLiabilities + output.totalEquity;
      const difference = Math.abs(output.totalAssets - calculatedTotal);
      const tolerance = output.totalAssets * 0.01; // 1% tolerance
      
      if (difference > tolerance) {
        throw new Error('Balance sheet equation not balanced');
      }
    }
    
    return output;
  }

  protected getAppliedRules(): string[] {
    return [
      'normalize_vietstock_format',
      'convert_vietnamese_field_names',
      'validate_balance_sheet_equation',
      'standardize_currency_units'
    ];
  }

  private parseReportType(type: string): 'QUARTERLY' | 'YEARLY' | 'SEMI_ANNUAL' {
    const normalizedType = type.toUpperCase();
    if (normalizedType.includes('QUY') || normalizedType.includes('QUARTER')) return 'QUARTERLY';
    if (normalizedType.includes('NAM') || normalizedType.includes('YEAR')) return 'YEARLY';
    if (normalizedType.includes('6T') || normalizedType.includes('SEMI')) return 'SEMI_ANNUAL';
    return 'QUARTERLY';
  }

  private parseFinancialValue(value: any): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
    return isNaN(numValue) ? undefined : numValue;
  }
}

// Transformation Pipeline Manager
export class TransformationPipelineManager {
  private transformers = new Map<string, BaseTransformer<any, any>>();

  constructor() {
    this.setupDefaultTransformers();
  }

  private setupDefaultTransformers(): void {
    this.transformers.set('fireant_stock_price', new FireAntStockPriceTransformer());
    this.transformers.set('cafef_realtime_price', new CafeFRealTimePriceTransformer());
    this.transformers.set('vietstock_financial', new VietStockFinancialTransformer());
  }

  public async transformData<T>(
    transformerKey: string,
    input: any,
    transformationType: TransformationType = TransformationType.NORMALIZE
  ): Promise<TransformationResult<T>> {
    const transformer = this.transformers.get(transformerKey);
    
    if (!transformer) {
      throw new Error(`No transformer found for key: ${transformerKey}`);
    }

    return transformer.transform(input, transformationType);
  }

  public registerTransformer(key: string, transformer: BaseTransformer<any, any>): void {
    this.transformers.set(key, transformer);
  }

  public getAvailableTransformers(): string[] {
    return Array.from(this.transformers.keys());
  }
}

// Global transformation pipeline instance
export const globalTransformationPipeline = new TransformationPipelineManager();
