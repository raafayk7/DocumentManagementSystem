/**
 * Resilient Storage Wrapper
 * 
 * Combines circuit breaker and retry mechanisms for storage operations
 * Provides resilience against transient failures and cascading errors
 */

import { Result } from '@carbonteq/fp';
import { AppError } from '@carbonteq/hexapp';
import type { IStorageStrategy } from '../../ports/output/IStorageStrategy';
import type { FileInfo } from '../../../shared/types/FileInfo';
import type { StorageConfig } from '../../../shared/storage/StorageConfig';
import {
  CircuitBreaker,
  defaultCircuitBreakerConfig,
  type CircuitBreakerOptions
} from '../../../shared/resilience/CircuitBreaker.js';
import {
  RetryExecutor,
  defaultRetryPolicyConfig,
  type RetryOptions
} from '../../../shared/resilience/RetryExecutor.js';
import {
  BackoffStrategyFactory,
  type IBackoffStrategy
} from '../../../shared/resilience/ExponentialBackoff.js';

/**
 * Resilient Storage Wrapper Configuration
 * Combines circuit breaker and retry configurations
 */
export interface ResilientStorageConfig {
  readonly circuitBreakerPrefix?: string;
  readonly retryPolicyPrefix?: string;
  readonly backoffStrategy?: string;
  readonly enableCircuitBreaker?: boolean;
  readonly enableRetry?: boolean;
  readonly customRetryableErrors?: (error: Error) => boolean;
  readonly onRetry?: (operation: string, attempt: number, error: Error, delayMs: number) => void;
  readonly onCircuitBreakerOpen?: (operation: string) => void;
  readonly onCircuitBreakerClose?: (operation: string) => void;
}

/**
 * Resilient Storage Wrapper
 * Wraps storage operations with circuit breaker and retry mechanisms
 */
export class ResilientStorageWrapper implements IStorageStrategy {
  private readonly storageStrategy: IStorageStrategy;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly retryExecutor: RetryExecutor;
  private readonly config: ResilientStorageConfig;

  constructor(
    storageStrategy: IStorageStrategy,
    config: ResilientStorageConfig = {}
  ) {
    this.storageStrategy = storageStrategy;
    this.config = config;

    // Initialize circuit breaker
    const circuitBreakerConfig = config.circuitBreakerPrefix 
      ? defaultCircuitBreakerConfig.getConfig()
      : defaultCircuitBreakerConfig.getConfig();
    
    const circuitBreakerOptions: CircuitBreakerOptions = {
      name: `storage-${storageStrategy.constructor.name}`,
      config: circuitBreakerConfig,
      onStateChange: (fromState, toState) => {
        if (toState === 'open' && this.config.onCircuitBreakerOpen) {
          this.config.onCircuitBreakerOpen('storage-operation');
        } else if (toState === 'closed' && this.config.onCircuitBreakerClose) {
          this.config.onCircuitBreakerClose('storage-operation');
        }
      }
    };

    this.circuitBreaker = new CircuitBreaker(circuitBreakerOptions);

    // Initialize retry executor
    const retryPolicyConfig = config.retryPolicyPrefix
      ? defaultRetryPolicyConfig.getConfig()
      : defaultRetryPolicyConfig.getConfig();

    const retryOptions: RetryOptions = {
      policy: retryPolicyConfig,
      backoffStrategy: config.backoffStrategy 
        ? BackoffStrategyFactory.create(config.backoffStrategy)
        : BackoffStrategyFactory.getDefault(),
      retryableErrors: config.customRetryableErrors,
      onRetry: (attempt, error, delayMs) => {
        if (this.config.onRetry) {
          this.config.onRetry('storage-operation', attempt, error, delayMs);
        }
      }
    };

    this.retryExecutor = new RetryExecutor();
  }

  /**
   * Execute storage operation with resilience
   * @param operation Storage operation to execute
   * @param operationName Name of the operation for logging
   * @returns Promise with operation result
   */
  private async executeWithResilience<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    // Check if circuit breaker is enabled
    if (this.config.enableCircuitBreaker !== false) {
      // Execute through circuit breaker
      const circuitBreakerResult = await this.circuitBreaker.execute(operation);
      
      if (circuitBreakerResult.isErr()) {
        throw circuitBreakerResult.error;
      }
      
      return circuitBreakerResult.value;
    }

    // Execute directly if circuit breaker is disabled
    return operation();
  }

  /**
   * Execute storage operation with retry
   * @param operation Storage operation to execute
   * @param operationName Name of the operation for logging
   * @returns Promise with operation result
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    // Check if retry is enabled
    if (this.config.enableRetry !== false) {
      const retryPolicyConfig = defaultRetryPolicyConfig.getConfig();
      
      const retryOptions: RetryOptions = {
        policy: retryPolicyConfig,
        backoffStrategy: this.config.backoffStrategy 
          ? BackoffStrategyFactory.create(this.config.backoffStrategy)
          : BackoffStrategyFactory.getDefault(),
        retryableErrors: this.config.customRetryableErrors,
        onRetry: (attempt, error, delayMs) => {
          if (this.config.onRetry) {
            this.config.onRetry(operationName, attempt, error, delayMs);
          }
        }
      };

      const retryResult = await this.retryExecutor.execute(operation, retryOptions);
      
      if (retryResult.isErr()) {
        throw retryResult.error;
      }
      
      return retryResult.value;
    }

    // Execute directly if retry is disabled
    return operation();
  }

  /**
   * Execute storage operation with full resilience (circuit breaker + retry)
   * @param operation Storage operation to execute
   * @param operationName Name of the operation for logging
   * @returns Promise with operation result
   */
  private async executeWithFullResilience<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    // First apply retry mechanism
    const retryOperation = () => this.executeWithRetry(operation, operationName);
    
    // Then apply circuit breaker
    return this.executeWithResilience(retryOperation, operationName);
  }

  // IStorageStrategy Implementation with Resilience

  async upload(file: Buffer, filename: string, mimeType: string): Promise<Result<FileInfo, AppError>> {
    return this.executeWithFullResilience(
      () => this.storageStrategy.upload(file, filename, mimeType),
      'upload'
    );
  }

  async download(filename: string): Promise<Result<Buffer, AppError>> {
    return this.executeWithFullResilience(
      () => this.storageStrategy.download(filename),
      'download'
    );
  }

  async delete(filename: string): Promise<Result<void, AppError>> {
    return this.executeWithFullResilience(
      () => this.storageStrategy.delete(filename),
      'delete'
    );
  }

  async exists(filename: string): Promise<Result<boolean, AppError>> {
    return this.executeWithFullResilience(
      () => this.storageStrategy.exists(filename),
      'exists'
    );
  }

  async listFiles(): Promise<Result<FileInfo[], AppError>> {
    return this.executeWithFullResilience(
      () => this.storageStrategy.listFiles(),
      'listFiles'
    );
  }

  async getFileInfo(filename: string): Promise<Result<FileInfo, AppError>> {
    return this.executeWithFullResilience(
      () => this.storageStrategy.getFileInfo(filename),
      'getFileInfo'
    );
  }

  async getStorageConfig(): Promise<Result<StorageConfig, AppError>> {
    return this.executeWithFullResilience(
      () => this.storageStrategy.getStorageConfig(),
      'getStorageConfig'
    );
  }

  async healthCheck(): Promise<Result<boolean, AppError>> {
    return this.executeWithFullResilience(
      () => this.storageStrategy.healthCheck(),
      'healthCheck'
    );
  }

  // Resilience-specific methods

  /**
   * Get circuit breaker state
   */
  getCircuitBreakerState(): string {
    return this.circuitBreaker.getState();
  }

  /**
   * Get circuit breaker metrics
   */
  getCircuitBreakerMetrics() {
    return this.circuitBreaker.getMetrics();
  }

  /**
   * Reset circuit breaker (force close)
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }

  /**
   * Get retry policy configuration
   */
  getRetryPolicyConfig() {
    return defaultRetryPolicyConfig.getConfig();
  }

  /**
   * Get resilience configuration summary
   */
  getResilienceConfig(): Record<string, unknown> {
    return {
      circuitBreaker: {
        enabled: this.config.enableCircuitBreaker !== false,
        state: this.getCircuitBreakerState(),
        config: defaultCircuitBreakerConfig.getConfigSummary()
      },
      retry: {
        enabled: this.config.enableRetry !== false,
        config: defaultRetryPolicyConfig.getConfigSummary(),
        backoffStrategy: this.config.backoffStrategy || 'exponential'
      }
    };
  }

  /**
   * Create resilient storage wrapper with default configuration
   */
  static create(
    storageStrategy: IStorageStrategy,
    config: ResilientStorageConfig = {}
  ): ResilientStorageWrapper {
    return new ResilientStorageWrapper(storageStrategy, config);
  }

  /**
   * Create resilient storage wrapper with custom circuit breaker prefix
   */
  static createWithCustomCircuitBreaker(
    storageStrategy: IStorageStrategy,
    circuitBreakerPrefix: string,
    config: ResilientStorageConfig = {}
  ): ResilientStorageWrapper {
    return new ResilientStorageWrapper(storageStrategy, {
      ...config,
      circuitBreakerPrefix
    });
  }

  /**
   * Create resilient storage wrapper with custom retry policy prefix
   */
  static createWithCustomRetryPolicy(
    storageStrategy: IStorageStrategy,
    retryPolicyPrefix: string,
    config: ResilientStorageConfig = {}
  ): ResilientStorageWrapper {
    return new ResilientStorageWrapper(storageStrategy, {
      ...config,
      retryPolicyPrefix
    });
  }
}
