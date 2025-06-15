import { CacheEntry } from "../types/index.js";

export class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private maxSize: number = 1000;
  private defaultTTL: number = 300000; // 5 minutes in milliseconds
  private enabled: boolean = true;

  constructor(maxSize?: number, defaultTTL?: number, enabled?: boolean) {
    this.maxSize = maxSize || 1000;
    this.defaultTTL = defaultTTL || 300000;
    this.enabled = enabled !== undefined ? enabled : true;
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    if (!this.enabled) {
      return null;
    }

    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return null;
    }

    return entry as CacheEntry<T>;
  }

  async set<T>(key: string, data: T, options?: { ttl?: number }): Promise<void> {
    if (!this.enabled) {
      return;
    }

    // Ensure cache doesn't exceed max size
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const ttl = options?.ttl || this.defaultTTL;
    const entry: CacheEntry<T> = {
      data,
      timestamp: new Date(),
      ttl,
      key
    };

    this.cache.set(key, entry);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  isExpired(entry: CacheEntry<any>): boolean {
    const now = Date.now();
    const entryTime = entry.timestamp.getTime();
    return (now - entryTime) > entry.ttl;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp.getTime() < oldestTime) {
        oldestTime = entry.timestamp.getTime();
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  // Cache strategies for different data types
  async getStockPrice(symbol: string): Promise<any | null> {
    const key = `stock:price:${symbol}`;
    const entry = await this.get(key);
    return entry?.data || null;
  }

  async setStockPrice(symbol: string, data: any): Promise<void> {
    const key = `stock:price:${symbol}`;
    // Stock prices have shorter TTL (1 minute)
    await this.set(key, data, { ttl: 60000 });
  }

  async getFinancialData(symbol: string, period?: string): Promise<any | null> {
    const key = `financial:${symbol}:${period || 'latest'}`;
    const entry = await this.get(key);
    return entry?.data || null;
  }

  async setFinancialData(symbol: string, data: any, period?: string): Promise<void> {
    const key = `financial:${symbol}:${period || 'latest'}`;
    // Financial data has longer TTL (1 hour)
    await this.set(key, data, { ttl: 3600000 });
  }

  async getMarketData(index: string): Promise<any | null> {
    const key = `market:${index}`;
    const entry = await this.get(key);
    return entry?.data || null;
  }

  async setMarketData(index: string, data: any): Promise<void> {
    const key = `market:${index}`;
    // Market data has medium TTL (5 minutes)
    await this.set(key, data, { ttl: 300000 });
  }

  async getNews(symbol?: string, category?: string): Promise<any | null> {
    const key = `news:${symbol || 'general'}:${category || 'all'}`;
    const entry = await this.get(key);
    return entry?.data || null;
  }

  async setNews(data: any, symbol?: string, category?: string): Promise<void> {
    const key = `news:${symbol || 'general'}:${category || 'all'}`;
    // News has medium TTL (10 minutes)
    await this.set(key, data, { ttl: 600000 });
  }

  async getAnalysis(symbol: string, type: string): Promise<any | null> {
    const key = `analysis:${symbol}:${type}`;
    const entry = await this.get(key);
    return entry?.data || null;
  }

  async setAnalysis(symbol: string, type: string, data: any): Promise<void> {
    const key = `analysis:${symbol}:${type}`;
    // Analysis has longer TTL (30 minutes)
    await this.set(key, data, { ttl: 1800000 });
  }

  // Cache invalidation patterns
  async invalidatePattern(pattern: string): Promise<void> {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (this.matchesPattern(key, pattern)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  private matchesPattern(key: string, pattern: string): boolean {
    // Simple pattern matching with wildcards
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(key);
  }

  async invalidateStock(symbol: string): Promise<void> {
    await this.invalidatePattern(`stock:*:${symbol}`);
    await this.invalidatePattern(`financial:${symbol}:*`);
    await this.invalidatePattern(`analysis:${symbol}:*`);
  }

  async invalidateMarket(): Promise<void> {
    await this.invalidatePattern('market:*');
  }

  // Cache statistics and monitoring
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    enabled: boolean;
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.calculateHitRate(),
      enabled: this.enabled
    };
  }

  private calculateHitRate(): number {
    // This would need to be implemented with hit/miss counters
    // For now, return a placeholder
    return 0.85; // 85% hit rate placeholder
  }

  // Cache warming strategies
  async warmCache(symbols: string[]): Promise<void> {
    // This would pre-populate cache with commonly requested data
    // Implementation would depend on data provider integration
    console.log(`Warming cache for symbols: ${symbols.join(', ')}`);
  }

  // Cleanup expired entries
  async cleanup(): Promise<void> {
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    console.log(`Cleaned up ${keysToDelete.length} expired cache entries`);
  }

  // Enable/disable caching
  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
    this.clear();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // Configuration updates
  updateConfig(config: { maxSize?: number; defaultTTL?: number; enabled?: boolean }): void {
    if (config.maxSize !== undefined) {
      this.maxSize = config.maxSize;
      
      // Evict entries if new max size is smaller
      while (this.cache.size > this.maxSize) {
        this.evictOldest();
      }
    }

    if (config.defaultTTL !== undefined) {
      this.defaultTTL = config.defaultTTL;
    }

    if (config.enabled !== undefined) {
      if (config.enabled) {
        this.enable();
      } else {
        this.disable();
      }
    }
  }
}
