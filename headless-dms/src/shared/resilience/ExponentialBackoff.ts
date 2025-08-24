/**
 * Exponential Backoff Strategy
 * 
 * Implements exponential backoff with configurable jitter
 * Provides intelligent delay calculation for retry mechanisms
 */

import type { RetryPolicyConfig } from './RetryPolicy.js';

/**
 * Backoff Strategy Interface
 * Allows for different backoff implementations
 */
export interface IBackoffStrategy {
  /**
   * Calculate delay for the given attempt number
   * @param attempt Current attempt number (1-based)
   * @param config Retry policy configuration
   * @returns Delay in milliseconds
   */
  calculateDelay(attempt: number, config: RetryPolicyConfig): number;
  
  /**
   * Get strategy name for identification
   */
  getName(): string;
}

/**
 * Exponential Backoff Strategy
 * Implements exponential backoff with optional jitter
 */
export class ExponentialBackoffStrategy implements IBackoffStrategy {
  private readonly name: string;

  constructor(name: string = 'exponential') {
    this.name = name;
  }

  /**
   * Calculate exponential backoff delay with jitter
   * @param attempt Current attempt number (1-based)
   * @param config Retry policy configuration
   * @returns Delay in milliseconds
   */
  calculateDelay(attempt: number, config: RetryPolicyConfig): number {
    // Calculate base exponential delay
    const baseDelay = Math.min(
      config.BASE_DELAY_MS * Math.pow(config.BACKOFF_MULTIPLIER, attempt - 1),
      config.MAX_DELAY_MS
    );

    // Apply jitter if enabled
    if (config.JITTER_ENABLED && config.JITTER_FACTOR > 0) {
      return this.applyJitter(baseDelay, config.JITTER_FACTOR);
    }

    return baseDelay;
  }

  /**
   * Apply jitter to the delay to prevent thundering herd
   * @param baseDelay Base delay in milliseconds
   * @param jitterFactor Jitter factor (0.0 to 1.0)
   * @returns Jittered delay in milliseconds
   */
  private applyJitter(baseDelay: number, jitterFactor: number): number {
    // Calculate jitter range
    const jitterRange = baseDelay * jitterFactor;
    
    // Generate random jitter within the range
    const jitter = (Math.random() - 0.5) * jitterRange;
    
    // Apply jitter and ensure positive value
    return Math.max(0, baseDelay + jitter);
  }

  /**
   * Get strategy name
   */
  getName(): string {
    return this.name;
  }
}

/**
 * Linear Backoff Strategy
 * Alternative strategy with linear delay increase
 */
export class LinearBackoffStrategy implements IBackoffStrategy {
  private readonly name: string;

  constructor(name: string = 'linear') {
    this.name = name;
  }

  /**
   * Calculate linear backoff delay
   * @param attempt Current attempt number (1-based)
   * @param config Retry policy configuration
   * @returns Delay in milliseconds
   */
  calculateDelay(attempt: number, config: RetryPolicyConfig): number {
    const baseDelay = Math.min(
      config.BASE_DELAY_MS * attempt,
      config.MAX_DELAY_MS
    );

    if (config.JITTER_ENABLED && config.JITTER_FACTOR > 0) {
      return this.applyJitter(baseDelay, config.JITTER_FACTOR);
    }

    return baseDelay;
  }

  /**
   * Apply jitter to the delay
   */
  private applyJitter(baseDelay: number, jitterFactor: number): number {
    const jitterRange = baseDelay * jitterFactor;
    const jitter = (Math.random() - 0.5) * jitterRange;
    return Math.max(0, baseDelay + jitter);
  }

  /**
   * Get strategy name
   */
  getName(): string {
    return this.name;
  }
}

/**
 * Fixed Backoff Strategy
 * Strategy with constant delay between attempts
 */
export class FixedBackoffStrategy implements IBackoffStrategy {
  private readonly name: string;

  constructor(name: string = 'fixed') {
    this.name = name;
  }

  /**
   * Calculate fixed backoff delay
   * @param attempt Current attempt number (1-based)
   * @param config Retry policy configuration
   * @returns Delay in milliseconds
   */
  calculateDelay(attempt: number, config: RetryPolicyConfig): number {
    const baseDelay = config.BASE_DELAY_MS;

    if (config.JITTER_ENABLED && config.JITTER_FACTOR > 0) {
      return this.applyJitter(baseDelay, config.JITTER_FACTOR);
    }

    return baseDelay;
  }

  /**
   * Apply jitter to the delay
   */
  private applyJitter(baseDelay: number, jitterFactor: number): number {
    const jitterRange = baseDelay * jitterFactor;
    const jitter = (Math.random() - 0.5) * jitterRange;
    return Math.max(0, baseDelay + jitter);
  }

  /**
   * Get strategy name
   */
  getName(): string {
    return this.name;
  }
}

/**
 * Backoff Strategy Factory
 * Creates appropriate backoff strategy based on configuration
 */
export class BackoffStrategyFactory {
  /**
   * Create backoff strategy by name
   * @param strategyName Strategy name ('exponential', 'linear', 'fixed')
   * @returns Backoff strategy instance
   */
  static create(strategyName: string): IBackoffStrategy {
    switch (strategyName.toLowerCase()) {
      case 'exponential':
        return new ExponentialBackoffStrategy();
      case 'linear':
        return new LinearBackoffStrategy();
      case 'fixed':
        return new FixedBackoffStrategy();
      default:
        console.warn(`Unknown backoff strategy '${strategyName}', using exponential`);
        return new ExponentialBackoffStrategy();
    }
  }

  /**
   * Get default exponential backoff strategy
   */
  static getDefault(): IBackoffStrategy {
    return new ExponentialBackoffStrategy();
  }
}
