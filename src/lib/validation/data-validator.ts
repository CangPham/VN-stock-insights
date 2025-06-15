/**
 * @fileOverview Data Validation Pipeline - Hệ thống xác thực dữ liệu toàn diện
 * Kiểm tra tính hợp lệ, toàn vẹn và chất lượng dữ liệu từ các nguồn khác nhau
 */

import { z } from 'zod';
import { StockInfoSchema, StockPriceSchema, IntradayDataSchema } from '@/types/stock';
import { RealTimePriceSchema, OrderBookSchema, TradeTickSchema, MarketIndexSchema } from '@/types/market';
import { BalanceSheetSchema, IncomeStatementSchema, CashFlowStatementSchema } from '@/types/financial';

// Enum cho loại validation
export enum ValidationType {
  SCHEMA = 'SCHEMA',           // Kiểm tra schema
  BUSINESS_RULE = 'BUSINESS_RULE', // Kiểm tra quy tắc nghiệp vụ
  DATA_QUALITY = 'DATA_QUALITY',   // Kiểm tra chất lượng dữ liệu
  CONSISTENCY = 'CONSISTENCY',     // Kiểm tra tính nhất quán
  COMPLETENESS = 'COMPLETENESS'    // Kiểm tra tính đầy đủ
}

// Enum cho mức độ nghiêm trọng của lỗi validation
export enum ValidationSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

// Interface cho kết quả validation
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata: {
    validationType: ValidationType;
    timestamp: Date;
    dataSource: string;
    recordCount?: number;
  };
}

// Interface cho lỗi validation
export interface ValidationError {
  type: ValidationType;
  severity: ValidationSeverity;
  field?: string;
  message: string;
  value?: any;
  expectedValue?: any;
  rule?: string;
}

// Interface cho cảnh báo validation
export interface ValidationWarning {
  type: ValidationType;
  field?: string;
  message: string;
  value?: any;
  suggestion?: string;
}

// Abstract base validator
export abstract class BaseValidator<T> {
  protected schema: z.ZodSchema<T>;
  protected businessRules: Array<(data: T) => ValidationError[]> = [];
  protected qualityChecks: Array<(data: T) => ValidationWarning[]> = [];

  constructor(schema: z.ZodSchema<T>) {
    this.schema = schema;
  }

  // Main validation method
  public async validate(data: any, dataSource: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 1. Schema validation
    const schemaResult = this.validateSchema(data);
    errors.push(...schemaResult.errors);
    warnings.push(...schemaResult.warnings);

    if (schemaResult.isValid) {
      // 2. Business rules validation
      const businessRulesErrors = this.validateBusinessRules(data);
      errors.push(...businessRulesErrors);

      // 3. Data quality checks
      const qualityWarnings = this.validateDataQuality(data);
      warnings.push(...qualityWarnings);

      // 4. Custom validations
      const customResult = await this.validateCustomRules(data);
      errors.push(...customResult.errors);
      warnings.push(...customResult.warnings);
    }

    return {
      isValid: errors.filter(e => e.severity === ValidationSeverity.ERROR || e.severity === ValidationSeverity.CRITICAL).length === 0,
      errors,
      warnings,
      metadata: {
        validationType: ValidationType.SCHEMA,
        timestamp: new Date(),
        dataSource,
        recordCount: Array.isArray(data) ? data.length : 1
      }
    };
  }

  // Schema validation
  private validateSchema(data: any): { isValid: boolean; errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      this.schema.parse(data);
      return { isValid: true, errors, warnings };
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          errors.push({
            type: ValidationType.SCHEMA,
            severity: ValidationSeverity.ERROR,
            field: err.path.join('.'),
            message: err.message,
            value: (err as any).received,
            rule: err.code
          });
        });
      } else {
        errors.push({
          type: ValidationType.SCHEMA,
          severity: ValidationSeverity.CRITICAL,
          message: 'Unknown schema validation error',
          value: data
        });
      }
      return { isValid: false, errors, warnings };
    }
  }

  // Business rules validation
  private validateBusinessRules(data: T): ValidationError[] {
    const errors: ValidationError[] = [];
    
    this.businessRules.forEach(rule => {
      try {
        const ruleErrors = rule(data);
        errors.push(...ruleErrors);
      } catch (error) {
        errors.push({
          type: ValidationType.BUSINESS_RULE,
          severity: ValidationSeverity.ERROR,
          message: `Business rule validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    });

    return errors;
  }

  // Data quality validation
  private validateDataQuality(data: T): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    
    this.qualityChecks.forEach(check => {
      try {
        const qualityWarnings = check(data);
        warnings.push(...qualityWarnings);
      } catch (error) {
        warnings.push({
          type: ValidationType.DATA_QUALITY,
          message: `Data quality check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    });

    return warnings;
  }

  // Abstract method for custom validations
  protected abstract validateCustomRules(data: T): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }>;

  // Method to add business rules
  public addBusinessRule(rule: (data: T) => ValidationError[]): void {
    this.businessRules.push(rule);
  }

  // Method to add quality checks
  public addQualityCheck(check: (data: T) => ValidationWarning[]): void {
    this.qualityChecks.push(check);
  }
}

// Stock Price Validator
export class StockPriceValidator extends BaseValidator<any> {
  constructor() {
    super(StockPriceSchema);
    this.setupBusinessRules();
    this.setupQualityChecks();
  }

  private setupBusinessRules(): void {
    // Rule: High price >= Low price >= 0
    this.addBusinessRule((data) => {
      const errors: ValidationError[] = [];
      
      if (data.highPrice < data.lowPrice) {
        errors.push({
          type: ValidationType.BUSINESS_RULE,
          severity: ValidationSeverity.ERROR,
          field: 'highPrice',
          message: 'High price cannot be lower than low price',
          value: data.highPrice,
          expectedValue: `>= ${data.lowPrice}`
        });
      }

      if (data.openPrice < data.lowPrice || data.openPrice > data.highPrice) {
        errors.push({
          type: ValidationType.BUSINESS_RULE,
          severity: ValidationSeverity.ERROR,
          field: 'openPrice',
          message: 'Open price must be between low and high price',
          value: data.openPrice
        });
      }

      if (data.closePrice && (data.closePrice < data.lowPrice || data.closePrice > data.highPrice)) {
        errors.push({
          type: ValidationType.BUSINESS_RULE,
          severity: ValidationSeverity.ERROR,
          field: 'closePrice',
          message: 'Close price must be between low and high price',
          value: data.closePrice
        });
      }

      return errors;
    });

    // Rule: Volume and value consistency
    this.addBusinessRule((data) => {
      const errors: ValidationError[] = [];
      
      if (data.volume > 0 && data.value === 0) {
        errors.push({
          type: ValidationType.BUSINESS_RULE,
          severity: ValidationSeverity.WARNING,
          field: 'value',
          message: 'Trading value should not be zero when volume is positive',
          value: data.value
        });
      }

      return errors;
    });
  }

  private setupQualityChecks(): void {
    // Check for unusual price movements
    this.addQualityCheck((data) => {
      const warnings: ValidationWarning[] = [];
      
      const priceRange = data.highPrice - data.lowPrice;
      const priceRangePercent = (priceRange / data.lowPrice) * 100;
      
      if (priceRangePercent > 20) {
        warnings.push({
          type: ValidationType.DATA_QUALITY,
          field: 'priceRange',
          message: 'Unusual price volatility detected',
          value: `${priceRangePercent.toFixed(2)}%`,
          suggestion: 'Verify price data accuracy'
        });
      }

      // Check for zero volume
      if (data.volume === 0) {
        warnings.push({
          type: ValidationType.DATA_QUALITY,
          field: 'volume',
          message: 'Zero trading volume detected',
          value: data.volume,
          suggestion: 'Check if market was open'
        });
      }

      return warnings;
    });
  }

  protected async validateCustomRules(data: any): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Custom validation for stock price data
    // Check if stock code exists and is valid
    if (data.stockCode && !this.isValidStockCode(data.stockCode)) {
      errors.push({
        type: ValidationType.BUSINESS_RULE,
        severity: ValidationSeverity.ERROR,
        field: 'stockCode',
        message: 'Invalid stock code format',
        value: data.stockCode
      });
    }

    // Check trading date
    if (data.date && this.isWeekend(data.date)) {
      warnings.push({
        type: ValidationType.DATA_QUALITY,
        field: 'date',
        message: 'Trading data on weekend detected',
        value: data.date,
        suggestion: 'Verify if this is a special trading session'
      });
    }

    return { errors, warnings };
  }

  private isValidStockCode(stockCode: string): boolean {
    return /^[A-Z0-9]{2,10}$/.test(stockCode);
  }

  private isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
  }
}

// Financial Report Validator
export class FinancialReportValidator extends BaseValidator<any> {
  constructor() {
    super(BalanceSheetSchema.or(IncomeStatementSchema).or(CashFlowStatementSchema));
    this.setupBusinessRules();
    this.setupQualityChecks();
  }

  private setupBusinessRules(): void {
    // Balance sheet equation: Assets = Liabilities + Equity
    this.addBusinessRule((data) => {
      const errors: ValidationError[] = [];
      
      if (data.totalAssets && data.totalLiabilities && data.totalEquity) {
        const calculatedTotal = data.totalLiabilities + data.totalEquity;
        const difference = Math.abs(data.totalAssets - calculatedTotal);
        const tolerance = data.totalAssets * 0.01; // 1% tolerance
        
        if (difference > tolerance) {
          errors.push({
            type: ValidationType.BUSINESS_RULE,
            severity: ValidationSeverity.ERROR,
            message: 'Balance sheet equation not balanced',
            value: data.totalAssets,
            expectedValue: calculatedTotal
          });
        }
      }

      return errors;
    });
  }

  private setupQualityChecks(): void {
    // Check for negative values where they shouldn't be
    this.addQualityCheck((data) => {
      const warnings: ValidationWarning[] = [];
      
      const fieldsToCheck = ['totalAssets', 'revenue', 'cash'];
      fieldsToCheck.forEach(field => {
        if (data[field] && data[field] < 0) {
          warnings.push({
            type: ValidationType.DATA_QUALITY,
            field,
            message: `Negative value detected for ${field}`,
            value: data[field],
            suggestion: 'Verify data accuracy'
          });
        }
      });

      return warnings;
    });
  }

  protected async validateCustomRules(data: any): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Custom validation for financial reports
    // Check report period validity
    if (data.quarter && (data.quarter < 1 || data.quarter > 4)) {
      errors.push({
        type: ValidationType.BUSINESS_RULE,
        severity: ValidationSeverity.ERROR,
        field: 'quarter',
        message: 'Invalid quarter value',
        value: data.quarter,
        expectedValue: '1-4'
      });
    }

    return { errors, warnings };
  }
}

// Validation Pipeline Manager
export class ValidationPipelineManager {
  private validators = new Map<string, BaseValidator<any>>();

  constructor() {
    this.setupDefaultValidators();
  }

  private setupDefaultValidators(): void {
    this.validators.set('stockPrice', new StockPriceValidator());
    this.validators.set('financialReport', new FinancialReportValidator());
  }

  public async validateData(
    dataType: string,
    data: any,
    dataSource: string
  ): Promise<ValidationResult> {
    const validator = this.validators.get(dataType);
    
    if (!validator) {
      return {
        isValid: false,
        errors: [{
          type: ValidationType.SCHEMA,
          severity: ValidationSeverity.ERROR,
          message: `No validator found for data type: ${dataType}`
        }],
        warnings: [],
        metadata: {
          validationType: ValidationType.SCHEMA,
          timestamp: new Date(),
          dataSource
        }
      };
    }

    return validator.validate(data, dataSource);
  }

  public registerValidator(dataType: string, validator: BaseValidator<any>): void {
    this.validators.set(dataType, validator);
  }

  public getAvailableValidators(): string[] {
    return Array.from(this.validators.keys());
  }
}

// Global validation pipeline instance
export const globalValidationPipeline = new ValidationPipelineManager();
