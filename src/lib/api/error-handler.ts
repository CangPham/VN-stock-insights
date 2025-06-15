/**
 * @fileOverview Error Handling System - Hệ thống xử lý lỗi toàn diện
 * Bao gồm error types, retry logic, circuit breaker pattern, và logging
 */

import { z } from 'zod';

// Enum cho các loại lỗi
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  CIRCUIT_BREAKER_OPEN = 'CIRCUIT_BREAKER_OPEN',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Enum cho mức độ nghiêm trọng
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// Interface cho custom error
export interface ApiError {
  type: ErrorType;
  message: string;
  code?: string | number;
  severity: ErrorSeverity;
  source: string;
  timestamp: Date;
  requestId?: string;
  retryable: boolean;
  details?: Record<string, any>;
  originalError?: Error;
}

// Schema cho error response
export const ErrorResponseSchema = z.object({
  error: z.object({
    type: z.nativeEnum(ErrorType),
    message: z.string(),
    code: z.union([z.string(), z.number()]).optional(),
    details: z.record(z.any()).optional()
  }),
  timestamp: z.string(),
  requestId: z.string().optional()
});

// Custom Error Classes
export class ApiErrorClass extends Error implements ApiError {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly source: string;
  public readonly timestamp: Date;
  public readonly requestId?: string;
  public readonly retryable: boolean;
  public readonly details?: Record<string, any>;
  public readonly originalError?: Error;
  public readonly code?: string | number;

  constructor(
    type: ErrorType,
    message: string,
    options: {
      code?: string | number;
      severity?: ErrorSeverity;
      source: string;
      requestId?: string;
      retryable?: boolean;
      details?: Record<string, any>;
      originalError?: Error;
    }
  ) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
    this.message = message;
    this.code = options.code;
    this.severity = options.severity || ErrorSeverity.MEDIUM;
    this.source = options.source;
    this.timestamp = new Date();
    this.requestId = options.requestId;
    this.retryable = options.retryable ?? this.isRetryableByDefault(type);
    this.details = options.details;
    this.originalError = options.originalError;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiErrorClass);
    }
  }

  private isRetryableByDefault(type: ErrorType): boolean {
    const retryableTypes = [
      ErrorType.NETWORK_ERROR,
      ErrorType.TIMEOUT_ERROR,
      ErrorType.RATE_LIMIT_ERROR,
      ErrorType.SERVER_ERROR,
      ErrorType.SERVICE_UNAVAILABLE
    ];
    return retryableTypes.includes(type);
  }

  public toJSON(): Record<string, any> {
    return {
      type: this.type,
      message: this.message,
      code: this.code,
      severity: this.severity,
      source: this.source,
      timestamp: this.timestamp.toISOString(),
      requestId: this.requestId,
      retryable: this.retryable,
      details: this.details
    };
  }
}

// Circuit Breaker Implementation
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime?: Date;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly recoveryTimeout: number = 60000, // 1 minute
    private readonly monitoringPeriod: number = 300000 // 5 minutes
  ) {}

  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
      } else {
        throw new ApiErrorClass(
          ErrorType.CIRCUIT_BREAKER_OPEN,
          'Circuit breaker is open - service temporarily unavailable',
          {
            source: 'CircuitBreaker',
            severity: ErrorSeverity.HIGH,
            retryable: false,
            details: {
              failureCount: this.failureCount,
              lastFailureTime: this.lastFailureTime,
              nextRetryTime: this.getNextRetryTime()
            }
          }
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private shouldAttemptReset(): boolean {
    return this.lastFailureTime 
      ? Date.now() - this.lastFailureTime.getTime() >= this.recoveryTimeout
      : false;
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = undefined;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  private getNextRetryTime(): Date | null {
    return this.lastFailureTime 
      ? new Date(this.lastFailureTime.getTime() + this.recoveryTimeout)
      : null;
  }

  public getState(): { state: string; failureCount: number; lastFailureTime?: Date } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }

  public reset(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = undefined;
  }
}

// Retry Strategy Interface
export interface RetryStrategy {
  shouldRetry(error: ApiError, attempt: number): boolean;
  getDelay(attempt: number): number;
  getMaxAttempts(): number;
}

// Exponential Backoff Retry Strategy
export class ExponentialBackoffRetry implements RetryStrategy {
  constructor(
    private readonly maxAttempts: number = 3,
    private readonly baseDelay: number = 1000,
    private readonly maxDelay: number = 30000,
    private readonly backoffMultiplier: number = 2
  ) {}

  shouldRetry(error: ApiError, attempt: number): boolean {
    return error.retryable && attempt < this.maxAttempts;
  }

  getDelay(attempt: number): number {
    const delay = this.baseDelay * Math.pow(this.backoffMultiplier, attempt - 1);
    return Math.min(delay, this.maxDelay);
  }

  getMaxAttempts(): number {
    return this.maxAttempts;
  }
}

// Error Handler Class
export class ErrorHandler {
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private errorLog: ApiError[] = [];
  private readonly maxLogSize = 1000;

  constructor(
    private readonly retryStrategy: RetryStrategy = new ExponentialBackoffRetry()
  ) {}

  // Main error handling method
  public async handleWithRetry<T>(
    operation: () => Promise<T>,
    context: { source: string; requestId?: string }
  ): Promise<T> {
    const circuitBreaker = this.getCircuitBreaker(context.source);
    
    return circuitBreaker.execute(async () => {
      let lastError: ApiError | null = null;

      for (let attempt = 1; attempt <= this.retryStrategy.getMaxAttempts(); attempt++) {
        try {
          return await operation();
        } catch (error) {
          const apiError = this.normalizeError(error, context);
          lastError = apiError;
          
          this.logError(apiError);

          if (!this.retryStrategy.shouldRetry(apiError, attempt)) {
            throw apiError;
          }

          if (attempt < this.retryStrategy.getMaxAttempts()) {
            const delay = this.retryStrategy.getDelay(attempt);
            await this.delay(delay);
          }
        }
      }

      throw lastError!;
    });
  }

  // Normalize different error types to ApiError
  public normalizeError(error: any, context: { source: string; requestId?: string }): ApiError {
    if (error instanceof ApiErrorClass) {
      return error;
    }

    // Handle fetch/network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return new ApiErrorClass(
        ErrorType.NETWORK_ERROR,
        'Network connection failed',
        {
          source: context.source,
          requestId: context.requestId,
          originalError: error,
          severity: ErrorSeverity.HIGH
        }
      );
    }

    // Handle timeout errors
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return new ApiErrorClass(
        ErrorType.TIMEOUT_ERROR,
        'Request timeout',
        {
          source: context.source,
          requestId: context.requestId,
          originalError: error,
          severity: ErrorSeverity.MEDIUM
        }
      );
    }

    // Handle HTTP errors
    if (error.status) {
      const errorType = this.getErrorTypeFromStatus(error.status);
      return new ApiErrorClass(
        errorType,
        error.message || `HTTP ${error.status} error`,
        {
          code: error.status,
          source: context.source,
          requestId: context.requestId,
          originalError: error,
          severity: this.getSeverityFromStatus(error.status)
        }
      );
    }

    // Default unknown error
    return new ApiErrorClass(
      ErrorType.UNKNOWN_ERROR,
      error.message || 'Unknown error occurred',
      {
        source: context.source,
        requestId: context.requestId,
        originalError: error,
        severity: ErrorSeverity.MEDIUM
      }
    );
  }

  private getErrorTypeFromStatus(status: number): ErrorType {
    if (status === 401) return ErrorType.AUTHENTICATION_ERROR;
    if (status === 403) return ErrorType.AUTHORIZATION_ERROR;
    if (status === 404) return ErrorType.NOT_FOUND_ERROR;
    if (status === 429) return ErrorType.RATE_LIMIT_ERROR;
    if (status >= 500) return ErrorType.SERVER_ERROR;
    return ErrorType.UNKNOWN_ERROR;
  }

  private getSeverityFromStatus(status: number): ErrorSeverity {
    if (status >= 500) return ErrorSeverity.HIGH;
    if (status === 429) return ErrorSeverity.MEDIUM;
    if (status >= 400) return ErrorSeverity.LOW;
    return ErrorSeverity.MEDIUM;
  }

  private getCircuitBreaker(source: string): CircuitBreaker {
    if (!this.circuitBreakers.has(source)) {
      this.circuitBreakers.set(source, new CircuitBreaker());
    }
    return this.circuitBreakers.get(source)!;
  }

  private logError(error: ApiError): void {
    this.errorLog.push(error);
    
    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', error.toJSON());
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public methods for monitoring
  public getErrorStats(source?: string): {
    totalErrors: number;
    errorsByType: Record<ErrorType, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recentErrors: ApiError[];
  } {
    const filteredErrors = source 
      ? this.errorLog.filter(e => e.source === source)
      : this.errorLog;

    const errorsByType = {} as Record<ErrorType, number>;
    const errorsBySeverity = {} as Record<ErrorSeverity, number>;

    filteredErrors.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    });

    return {
      totalErrors: filteredErrors.length,
      errorsByType,
      errorsBySeverity,
      recentErrors: filteredErrors.slice(-10) // Last 10 errors
    };
  }

  public getCircuitBreakerStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    this.circuitBreakers.forEach((breaker, source) => {
      status[source] = breaker.getState();
    });
    return status;
  }

  public resetCircuitBreaker(source: string): void {
    const breaker = this.circuitBreakers.get(source);
    if (breaker) {
      breaker.reset();
    }
  }

  public clearErrorLog(): void {
    this.errorLog = [];
  }
}

// Global error handler instance
export const globalErrorHandler = new ErrorHandler();
