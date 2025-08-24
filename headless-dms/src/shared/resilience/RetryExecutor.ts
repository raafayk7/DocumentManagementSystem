/**
 * Retry Executor
 * 
 * Implements retry execution logic with timeout management
 * Handles retryable vs non-retryable errors
 */

import { Result } from '@carbonteq/fp';
import { AppError } from '@carbonteq/hexapp';
import type { RetryPolicyConfig } from './RetryPolicy.js';
import type { IBackoffStrategy } from './ExponentialBackoff.js';
import { BackoffStrategyFactory } from './ExponentialBackoff.js';

/**
 * Retry Result Interface
 * Contains information about the retry execution
 */
export interface RetryResult<T> {
  readonly data: T;
  readonly attempts: number;
  readonly totalTimeMs: number;
  readonly lastError?: Error;
  readonly backoffStrategy: string;
}

/**
 * Retry Error Types
 */
export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly totalTimeMs: number,
    public readonly lastError?: Error
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

export class RetryTimeoutError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly totalTimeMs: number
  ) {
    super(message);
    this.name = 'RetryTimeoutError';
  }
}

export class NonRetryableError extends Error {
  constructor(
    message: string,
    public readonly originalError: Error
  ) {
    super(message);
    this.name = 'NonRetryableError';
  }
}

/**
 * Retry Options Interface
 * Configurable options for retry execution
 */
export interface RetryOptions {
  readonly policy: RetryPolicyConfig;
  readonly backoffStrategy?: IBackoffStrategy;
  readonly retryableErrors?: (error: Error) => boolean;
  readonly onRetry?: (attempt: number, error: Error, delayMs: number) => void;
  readonly onSuccess?: (attempt: number, data: unknown) => void;
}

/**
 * Retry Executor
 * Manages retry execution with configurable policies and strategies
 */
export class RetryExecutor {
  private readonly defaultRetryableErrors: (error: Error) => boolean;

  constructor() {
    // Default retryable error types
    this.defaultRetryableErrors = (error: Error): boolean => {
      // Network/connection errors are typically retryable
      if (error.name === 'NetworkError' || 
          error.name === 'ConnectionError' ||
          error.name === 'TimeoutError') {
        return true;
      }
      
      // HTTP 5xx errors are usually retryable
      if (error.message.includes('500') || 
          error.message.includes('502') ||
          error.message.includes('503') ||
          error.message.includes('504')) {
        return true;
      }
      
      // Rate limiting errors are retryable
      if (error.message.includes('429') || 
          error.message.includes('rate limit') ||
          error.message.includes('throttle')) {
        return true;
      }
      
      // Default to non-retryable for safety
      return false;
    };
  }

  /**
   * Execute operation with retry logic
   * @param operation Function to execute
   * @param options Retry options
   * @returns Promise with retry result
   */
  async execute<T>(
    operation: () => Promise<T>,
    options: RetryOptions
  ): Promise<Result<T, RetryError>> {
    const startTime = Date.now();
    let lastError: Error | undefined;
    
    // Use provided backoff strategy or default
    const backoffStrategy = options.backoffStrategy || BackoffStrategyFactory.getDefault();
    
    // Use provided retryable error function or default
    const isRetryableError = options.retryableErrors || this.defaultRetryableErrors;
    
    for (let attempt = 1; attempt <= options.policy.MAX_ATTEMPTS; attempt++) {
      try {
        // Execute operation with timeout
        const data = await this.executeWithTimeout(
          operation,
          options.policy.ATTEMPT_TIMEOUT_MS
        );
        
        // Success - call success callback and return result
        if (options.onSuccess) {
          options.onSuccess(attempt, data);
        }
        
        const totalTimeMs = Date.now() - startTime;
        const result: RetryResult<T> = {
          data,
          attempts: attempt,
          totalTimeMs,
          backoffStrategy: backoffStrategy.getName()
        };
        
        return Result.Ok(result.data);
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if error is retryable
        if (!isRetryableError(lastError)) {
          throw new NonRetryableError(
            `Non-retryable error encountered: ${lastError.message}`,
            lastError
          );
        }
        
        // Check if we've reached max attempts
        if (attempt >= options.policy.MAX_ATTEMPTS) {
          const totalTimeMs = Date.now() - startTime;
          throw new RetryError(
            `Max retry attempts (${options.policy.MAX_ATTEMPTS}) exceeded: ${lastError.message}`,
            attempt,
            totalTimeMs,
            lastError
          );
        }
        
        // Check total timeout
        const totalTimeMs = Date.now() - startTime;
        if (totalTimeMs >= options.policy.TOTAL_TIMEOUT_MS) {
          throw new RetryTimeoutError(
            `Total retry timeout (${options.policy.TOTAL_TIMEOUT_MS}ms) exceeded: ${lastError.message}`,
            attempt,
            totalTimeMs
          );
        }
        
        // Calculate delay for next attempt
        const delayMs = backoffStrategy.calculateDelay(attempt, options.policy);
        
        // Call retry callback
        if (options.onRetry) {
          options.onRetry(attempt, lastError, delayMs);
        }
        
        // Wait before next attempt
        await this.delay(delayMs);
      }
    }
    
    // This should never be reached, but TypeScript requires it
    const totalTimeMs = Date.now() - startTime;
    throw new RetryError(
      'Unexpected retry execution end',
      options.policy.MAX_ATTEMPTS,
      totalTimeMs,
      lastError
    );
  }

  /**
   * Execute operation with timeout
   * @param operation Function to execute
   * @param timeoutMs Timeout in milliseconds
   * @returns Promise with operation result
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timeout after ${timeoutMs}ms`));
      }, timeoutMs);
      
      operation()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Delay execution for specified milliseconds
   * @param ms Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create retry executor with default options
   * @param policy Retry policy configuration
   * @returns Retry executor instance
   */
  static create(policy: RetryPolicyConfig): RetryExecutor {
    return new RetryExecutor();
  }

  /**
   * Create retry executor with custom options
   * @param options Retry options
   * @returns Retry executor instance
   */
  static createWithOptions(options: RetryOptions): RetryExecutor {
    return new RetryExecutor();
  }
}
