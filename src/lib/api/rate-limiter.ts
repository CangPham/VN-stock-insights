/**
 * @fileOverview Rate Limiting System - Hệ thống giới hạn tốc độ request
 * Quản lý rate limiting cho tất cả các API clients để tuân thủ giới hạn của từng nguồn
 */

import { DataSourceType } from './base-client';

// Interface cho cấu hình rate limit
export interface RateLimitConfig {
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit?: number; // Cho phép burst requests
}

// Interface cho thống kê rate limit
export interface RateLimitStats {
  totalRequests: number;
  requestsInLastSecond: number;
  requestsInLastMinute: number;
  requestsInLastHour: number;
  lastRequestTime?: Date;
  isLimited: boolean;
  nextAvailableTime?: Date;
}

// Token bucket implementation cho rate limiting
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private capacity: number,
    private refillRate: number, // tokens per second
    private maxBurst: number = capacity
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  // Kiểm tra và consume tokens
  public consume(tokensRequested: number = 1): boolean {
    this.refill();
    
    if (this.tokens >= tokensRequested) {
      this.tokens -= tokensRequested;
      return true;
    }
    
    return false;
  }

  // Refill tokens based on time passed
  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // seconds
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  // Get current token count
  public getTokens(): number {
    this.refill();
    return this.tokens;
  }

  // Get time until next token is available
  public getTimeUntilNextToken(): number {
    this.refill();
    if (this.tokens >= 1) return 0;
    
    const tokensNeeded = 1 - this.tokens;
    return (tokensNeeded / this.refillRate) * 1000; // milliseconds
  }
}

// Sliding window rate limiter
class SlidingWindowRateLimiter {
  private requests: number[] = [];

  constructor(private windowSizeMs: number, private maxRequests: number) {}

  // Check if request is allowed
  public isAllowed(): boolean {
    const now = Date.now();
    this.cleanOldRequests(now);
    
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }
    
    return false;
  }

  // Get current request count in window
  public getCurrentCount(): number {
    this.cleanOldRequests(Date.now());
    return this.requests.length;
  }

  // Get time until window resets
  public getTimeUntilReset(): number {
    if (this.requests.length === 0) return 0;
    
    const oldestRequest = this.requests[0];
    const resetTime = oldestRequest + this.windowSizeMs;
    return Math.max(0, resetTime - Date.now());
  }

  // Remove requests outside the window
  private cleanOldRequests(now: number): void {
    const cutoff = now - this.windowSizeMs;
    this.requests = this.requests.filter(time => time > cutoff);
  }
}

// Main rate limiter class
export class RateLimiter {
  private tokenBuckets = new Map<DataSourceType, TokenBucket>();
  private slidingWindows = new Map<DataSourceType, {
    perSecond: SlidingWindowRateLimiter;
    perMinute: SlidingWindowRateLimiter;
    perHour: SlidingWindowRateLimiter;
  }>();
  private configs = new Map<DataSourceType, RateLimitConfig>();
  private stats = new Map<DataSourceType, RateLimitStats>();

  constructor() {
    this.initializeDefaultConfigs();
  }

  // Initialize default rate limit configs for each data source
  private initializeDefaultConfigs(): void {
    const defaultConfigs: Record<DataSourceType, RateLimitConfig> = {
      [DataSourceType.FIREANT]: {
        requestsPerSecond: 10,
        requestsPerMinute: 600,
        requestsPerHour: 36000,
        burstLimit: 20
      },
      [DataSourceType.CAFEF]: {
        requestsPerSecond: 8,
        requestsPerMinute: 480,
        requestsPerHour: 28800,
        burstLimit: 15
      },
      [DataSourceType.VIETSTOCK]: {
        requestsPerSecond: 5,
        requestsPerMinute: 300,
        requestsPerHour: 18000,
        burstLimit: 10
      },
      [DataSourceType.SSI]: {
        requestsPerSecond: 15,
        requestsPerMinute: 900,
        requestsPerHour: 54000,
        burstLimit: 30
      },
      [DataSourceType.VPS]: {
        requestsPerSecond: 12,
        requestsPerMinute: 720,
        requestsPerHour: 43200,
        burstLimit: 25
      },
      [DataSourceType.HOSE]: {
        requestsPerSecond: 3,
        requestsPerMinute: 180,
        requestsPerHour: 10800,
        burstLimit: 5
      },
      [DataSourceType.HNX]: {
        requestsPerSecond: 3,
        requestsPerMinute: 180,
        requestsPerHour: 10800,
        burstLimit: 5
      }
    };

    Object.entries(defaultConfigs).forEach(([source, config]) => {
      this.setRateLimitConfig(source as DataSourceType, config);
    });
  }

  // Set rate limit configuration for a data source
  public setRateLimitConfig(source: DataSourceType, config: RateLimitConfig): void {
    this.configs.set(source, config);
    
    // Initialize token bucket
    const burstLimit = config.burstLimit || config.requestsPerSecond;
    this.tokenBuckets.set(source, new TokenBucket(
      burstLimit,
      config.requestsPerSecond,
      burstLimit
    ));

    // Initialize sliding windows
    this.slidingWindows.set(source, {
      perSecond: new SlidingWindowRateLimiter(1000, config.requestsPerSecond),
      perMinute: new SlidingWindowRateLimiter(60000, config.requestsPerMinute),
      perHour: new SlidingWindowRateLimiter(3600000, config.requestsPerHour)
    });

    // Initialize stats
    this.stats.set(source, {
      totalRequests: 0,
      requestsInLastSecond: 0,
      requestsInLastMinute: 0,
      requestsInLastHour: 0,
      isLimited: false
    });
  }

  // Check if request is allowed and consume rate limit
  public async checkAndConsume(source: DataSourceType): Promise<{
    allowed: boolean;
    waitTime: number;
    reason?: string;
  }> {
    const config = this.configs.get(source);
    const tokenBucket = this.tokenBuckets.get(source);
    const windows = this.slidingWindows.get(source);
    
    if (!config || !tokenBucket || !windows) {
      throw new Error(`Rate limiter not configured for source: ${source}`);
    }

    // Check token bucket (for burst control)
    if (!tokenBucket.consume()) {
      const waitTime = tokenBucket.getTimeUntilNextToken();
      return {
        allowed: false,
        waitTime,
        reason: 'Token bucket exhausted'
      };
    }

    // Check sliding windows
    if (!windows.perSecond.isAllowed()) {
      const waitTime = windows.perSecond.getTimeUntilReset();
      return {
        allowed: false,
        waitTime,
        reason: 'Per-second limit exceeded'
      };
    }

    if (!windows.perMinute.isAllowed()) {
      const waitTime = windows.perMinute.getTimeUntilReset();
      return {
        allowed: false,
        waitTime,
        reason: 'Per-minute limit exceeded'
      };
    }

    if (!windows.perHour.isAllowed()) {
      const waitTime = windows.perHour.getTimeUntilReset();
      return {
        allowed: false,
        waitTime,
        reason: 'Per-hour limit exceeded'
      };
    }

    // Update stats
    this.updateStats(source);

    return {
      allowed: true,
      waitTime: 0
    };
  }

  // Wait for rate limit to allow request
  public async waitForAvailability(source: DataSourceType): Promise<void> {
    const result = await this.checkAndConsume(source);
    
    if (!result.allowed && result.waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, result.waitTime));
      // Recursively wait if still not available
      return this.waitForAvailability(source);
    }
  }

  // Get current rate limit stats
  public getStats(source: DataSourceType): RateLimitStats | undefined {
    const windows = this.slidingWindows.get(source);
    const stats = this.stats.get(source);
    
    if (!windows || !stats) return undefined;

    return {
      ...stats,
      requestsInLastSecond: windows.perSecond.getCurrentCount(),
      requestsInLastMinute: windows.perMinute.getCurrentCount(),
      requestsInLastHour: windows.perHour.getCurrentCount(),
      isLimited: !this.isCurrentlyAllowed(source)
    };
  }

  // Get all stats
  public getAllStats(): Record<DataSourceType, RateLimitStats> {
    const allStats: Partial<Record<DataSourceType, RateLimitStats>> = {};
    
    this.configs.forEach((_, source) => {
      const stats = this.getStats(source);
      if (stats) {
        allStats[source] = stats;
      }
    });

    return allStats as Record<DataSourceType, RateLimitStats>;
  }

  // Check if source is currently allowed (without consuming)
  public isCurrentlyAllowed(source: DataSourceType): boolean {
    const tokenBucket = this.tokenBuckets.get(source);
    const windows = this.slidingWindows.get(source);
    
    if (!tokenBucket || !windows) return false;

    return tokenBucket.getTokens() >= 1 &&
           windows.perSecond.getCurrentCount() < this.configs.get(source)!.requestsPerSecond &&
           windows.perMinute.getCurrentCount() < this.configs.get(source)!.requestsPerMinute &&
           windows.perHour.getCurrentCount() < this.configs.get(source)!.requestsPerHour;
  }

  // Update statistics
  private updateStats(source: DataSourceType): void {
    const stats = this.stats.get(source);
    if (stats) {
      stats.totalRequests++;
      stats.lastRequestTime = new Date();
      this.stats.set(source, stats);
    }
  }

  // Reset rate limits for a source
  public resetRateLimit(source: DataSourceType): void {
    const config = this.configs.get(source);
    if (config) {
      this.setRateLimitConfig(source, config);
    }
  }

  // Reset all rate limits
  public resetAllRateLimits(): void {
    this.configs.forEach((config, source) => {
      this.setRateLimitConfig(source, config);
    });
  }

  // Get time until next request is allowed
  public getTimeUntilNextRequest(source: DataSourceType): number {
    const tokenBucket = this.tokenBuckets.get(source);
    const windows = this.slidingWindows.get(source);
    
    if (!tokenBucket || !windows) return 0;

    const tokenWait = tokenBucket.getTimeUntilNextToken();
    const secondWait = windows.perSecond.getTimeUntilReset();
    const minuteWait = windows.perMinute.getTimeUntilReset();
    const hourWait = windows.perHour.getTimeUntilReset();

    return Math.max(tokenWait, secondWait, minuteWait, hourWait);
  }
}

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter();

// Utility function to create rate limit decorator
export function withRateLimit(source: DataSourceType) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      await globalRateLimiter.waitForAvailability(source);
      return method.apply(this, args);
    };

    return descriptor;
  };
}
