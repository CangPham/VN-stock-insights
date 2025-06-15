/**
 * @fileOverview Simple in-memory cache for indicator calculations
 */

export class IndicatorCache {
  private store = new Map<string, any>();

  public getOrSet<T>(key: string, compute: () => T): T {
    if (this.store.has(key)) return this.store.get(key);
    const val = compute();
    this.store.set(key, val);
    return val;
  }

  public clear(): void {
    this.store.clear();
  }
}
