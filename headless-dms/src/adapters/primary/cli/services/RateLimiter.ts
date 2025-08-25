import { injectable } from 'tsyringe';

/**
 * Rate limiting strategy types
 */
export enum RateLimitStrategy {
  FIXED_WINDOW = 'fixed_window',
  SLIDING_WINDOW = 'sliding_window',
  TOKEN_BUCKET = 'token_bucket',
  LEAKY_BUCKET = 'leaky_bucket'
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  strategy: RateLimitStrategy;
  maxRequests: number;
  windowMs: number;
  burstSize?: number;
  retryAfter?: number;
  enableBackoff?: boolean;
  backoffMultiplier?: number;
  maxBackoffDelay?: number;
}

/**
 * Rate limit status
 */
export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  backoffDelay?: number;
}

/**
 * Rate limit entry for tracking
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
  lastRequestTime: number;
  backoffCount: number;
}

/**
 * Provides configurable rate limiting with multiple strategies
 */
@injectable()
export class RateLimiter {
  private config: RateLimitConfig;
  private limits: Map<string, RateLimitEntry> = new Map();
  private tokenBucket: Map<string, { tokens: number; lastRefill: number }> = new Map();

  constructor() {
    this.config = {
      strategy: RateLimitStrategy.FIXED_WINDOW,
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
      burstSize: parseInt(process.env.RATE_LIMIT_BURST_SIZE || '10'),
      retryAfter: parseInt(process.env.RATE_LIMIT_RETRY_AFTER || '1000'),
      enableBackoff: process.env.RATE_LIMIT_ENABLE_BACKOFF === 'true',
      backoffMultiplier: parseFloat(process.env.RATE_LIMIT_BACKOFF_MULTIPLIER || '2.0'),
      maxBackoffDelay: parseInt(process.env.RATE_LIMIT_MAX_BACKOFF_DELAY || '30000')
    };
  }

  /**
   * Check if a request is allowed based on rate limiting
   */
  public isAllowed(key: string): RateLimitStatus {
    const now = Date.now();
    const entry = this.limits.get(key) || this.createNewEntry(now);

    // Clean up expired entries
    if (now > entry.resetTime) {
      this.limits.delete(key);
      return this.isAllowed(key);
    }

    switch (this.config.strategy) {
      case RateLimitStrategy.FIXED_WINDOW:
        return this.checkFixedWindow(key, entry, now);
      case RateLimitStrategy.SLIDING_WINDOW:
        return this.checkSlidingWindow(key, entry, now);
      case RateLimitStrategy.TOKEN_BUCKET:
        return this.checkTokenBucket(key, now);
      case RateLimitStrategy.LEAKY_BUCKET:
        return this.checkLeakyBucket(key, entry, now);
      default:
        return this.checkFixedWindow(key, entry, now);
    }
  }

  /**
   * Record a request and update rate limiting state
   */
  public recordRequest(key: string): void {
    const now = Date.now();
    const entry = this.limits.get(key) || this.createNewEntry(now);

    // Update request count
    entry.count++;
    entry.lastRequestTime = now;

    // Update token bucket if using that strategy
    if (this.config.strategy === RateLimitStrategy.TOKEN_BUCKET) {
      const bucket = this.tokenBucket.get(key);
      if (bucket && bucket.tokens > 0) {
        bucket.tokens--;
      }
    }

    this.limits.set(key, entry);
  }

  /**
   * Wait for rate limit to allow next request
   */
  public async waitForAllowance(key: string): Promise<void> {
    while (!this.isAllowed(key).allowed) {
      const status = this.isAllowed(key);
      const delay = status.retryAfter || this.config.retryAfter || 1000;
      await this.delay(delay);
    }
  }

  /**
   * Get current rate limit status for a key
   */
  public getStatus(key: string): RateLimitStatus {
    return this.isAllowed(key);
  }

  /**
   * Reset rate limiting for a specific key
   */
  public reset(key: string): void {
    this.limits.delete(key);
    this.tokenBucket.delete(key);
  }

  /**
   * Reset all rate limiting
   */
  public resetAll(): void {
    this.limits.clear();
    this.tokenBucket.clear();
  }

  /**
   * Update rate limiting configuration
   */
  public updateConfig(newConfig: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Reset all limits when configuration changes
    this.resetAll();
  }

  /**
   * Get current configuration
   */
  public getConfig(): RateLimitConfig {
    return { ...this.config };
  }

  /**
   * Create a new rate limit entry
   */
  private createNewEntry(now: number): RateLimitEntry {
    return {
      count: 0,
      resetTime: now + this.config.windowMs,
      lastRequestTime: now,
      backoffCount: 0
    };
  }

  /**
   * Check fixed window rate limiting
   */
  private checkFixedWindow(key: string, entry: RateLimitEntry, now: number): RateLimitStatus {
    const remaining = Math.max(0, this.config.maxRequests - entry.count);
    const allowed = remaining > 0;

    if (allowed) {
      entry.backoffCount = 0;
    } else if (this.config.enableBackoff) {
      entry.backoffCount++;
    }

    return {
      allowed,
      remaining,
      resetTime: entry.resetTime,
      retryAfter: allowed ? undefined : this.calculateBackoffDelay(entry.backoffCount),
      backoffDelay: allowed ? undefined : this.calculateBackoffDelay(entry.backoffCount)
    };
  }

  /**
   * Check sliding window rate limiting
   */
  private checkSlidingWindow(key: string, entry: RateLimitEntry, now: number): RateLimitStatus {
    const windowStart = now - this.config.windowMs;
    
    // For sliding window, we need to track individual request times
    // This is a simplified implementation
    const remaining = Math.max(0, this.config.maxRequests - entry.count);
    const allowed = remaining > 0;

    if (allowed) {
      entry.backoffCount = 0;
    } else if (this.config.enableBackoff) {
      entry.backoffCount++;
    }

    return {
      allowed,
      remaining,
      resetTime: entry.resetTime,
      retryAfter: allowed ? undefined : this.calculateBackoffDelay(entry.backoffCount),
      backoffDelay: allowed ? undefined : this.calculateBackoffDelay(entry.backoffCount)
    };
  }

  /**
   * Check token bucket rate limiting
   */
  private checkTokenBucket(key: string, now: number): RateLimitStatus {
    let bucket = this.tokenBucket.get(key);
    
    if (!bucket) {
      bucket = {
        tokens: this.config.maxRequests,
        lastRefill: now
      };
      this.tokenBucket.set(key, bucket);
    }

    // Refill tokens based on time passed
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor(timePassed / this.config.windowMs) * this.config.maxRequests;
    
    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(this.config.maxRequests, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    const allowed = bucket.tokens > 0;
    const remaining = Math.max(0, bucket.tokens);

    return {
      allowed,
      remaining,
      resetTime: now + this.config.windowMs,
      retryAfter: allowed ? undefined : this.config.retryAfter,
      backoffDelay: allowed ? undefined : this.config.retryAfter
    };
  }

  /**
   * Check leaky bucket rate limiting
   */
  private checkLeakyBucket(key: string, entry: RateLimitEntry, now: number): RateLimitStatus {
    // Leaky bucket allows burst up to burst size, then leaks at constant rate
    const burstLimit = this.config.burstSize || this.config.maxRequests;
    const allowed = entry.count < burstLimit;
    const remaining = Math.max(0, burstLimit - entry.count);

    if (allowed) {
      entry.backoffCount = 0;
    } else if (this.config.enableBackoff) {
      entry.backoffCount++;
    }

    return {
      allowed,
      remaining,
      resetTime: entry.resetTime,
      retryAfter: allowed ? undefined : this.calculateBackoffDelay(entry.backoffCount),
      backoffDelay: allowed ? undefined : this.calculateBackoffDelay(entry.backoffCount)
    };
  }

  /**
   * Calculate backoff delay based on retry count
   */
  private calculateBackoffDelay(retryCount: number): number {
    if (!this.config.enableBackoff || retryCount === 0) {
      return this.config.retryAfter || 1000;
    }

    const backoffDelay = this.config.retryAfter! * Math.pow(this.config.backoffMultiplier!, retryCount);
    return Math.min(backoffDelay, this.config.maxBackoffDelay!);
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get rate limiting statistics
   */
  public getStats(): {
    totalKeys: number;
    activeKeys: number;
    strategy: RateLimitStrategy;
    config: RateLimitConfig;
  } {
    const now = Date.now();
    const activeKeys = Array.from(this.limits.entries())
      .filter(([_, entry]) => now <= entry.resetTime)
      .length;

    return {
      totalKeys: this.limits.size,
      activeKeys,
      strategy: this.config.strategy,
      config: this.getConfig()
    };
  }
}
