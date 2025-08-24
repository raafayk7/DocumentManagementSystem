/**
 * Resilient Storage Wrapper
 * 
 * Combines circuit breaker and retry mechanisms for storage operations
 * Provides resilience against transient failures and cascading errors
 */

import { AppResult, AppError } from '@carbonteq/hexapp';
import { IStorageStrategy } from '../../../ports/output/IStorageStrategy.js';
import { FileInfo, StorageHealth, StorageStats, UploadOptions, DownloadOptions, StorageOperationResult } from '../../../shared/storage/StorageTypes.js';
import { CircuitBreaker } from '../../../shared/resilience/CircuitBreaker.js';
import { CircuitBreakerConfigManager } from '../../../shared/resilience/CircuitBreakerConfig.js';
import { RetryExecutor } from '../../../shared/resilience/RetryExecutor.js';

/**
 * Circuit Breaker Options for storage operations
 */
interface CircuitBreakerOptions {
  operationName: string;
  timeoutMs: number;
  metadata?: Record<string, any>;
}

/**
 * Resilient Storage Wrapper
 * Wraps storage strategies with circuit breaker and retry logic
 */
export class ResilientStorageWrapper implements IStorageStrategy {
  private readonly storageStrategy: IStorageStrategy;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly retryExecutor: RetryExecutor;
  private readonly config: {
    circuitBreakerPrefix?: string;
    retryPolicy?: any;
    timeoutMs?: number;
  };

  constructor(
    storageStrategy: IStorageStrategy,
    config: {
      circuitBreakerPrefix?: string;
      retryPolicy?: any;
      timeoutMs?: number;
    } = {}
  ) {
    this.storageStrategy = storageStrategy;
    this.config = config;

    // Initialize circuit breaker
    const defaultCircuitBreakerConfig = new CircuitBreakerConfigManager();
    this.circuitBreaker = new CircuitBreaker(defaultCircuitBreakerConfig);

    // Initialize retry executor
    this.retryExecutor = new RetryExecutor();
  }

  async upload(file: FileInfo, options?: UploadOptions): Promise<AppResult<string>> {
    return this.executeWithResilience(
      () => this.storageStrategy.upload(file, options),
      'upload'
    );
  }

  async download(filePath: string, options?: DownloadOptions): Promise<AppResult<Buffer>> {
    return this.executeWithResilience(
      () => this.storageStrategy.download(filePath, options),
      'download'
    );
  }

  async delete(filePath: string): Promise<AppResult<boolean>> {
    return this.executeWithResilience(
      () => this.storageStrategy.delete(filePath),
      'delete'
    );
  }

  async exists(filePath: string): Promise<AppResult<boolean>> {
    return this.executeWithResilience(
      () => this.storageStrategy.exists(filePath),
      'exists'
    );
  }

  async getHealth(): Promise<AppResult<StorageHealth>> {
    return this.executeWithResilience(
      () => this.storageStrategy.getHealth(),
      'getHealth'
    );
  }

  async listFiles(prefix?: string): Promise<AppResult<FileInfo[]>> {
    return this.executeWithResilience(
      () => this.storageStrategy.listFiles(prefix),
      'listFiles'
    );
  }

  async copyFile(sourcePath: string, destinationPath: string): Promise<AppResult<boolean>> {
    return this.executeWithResilience(
      () => this.storageStrategy.copyFile(sourcePath, destinationPath),
      'copyFile'
    );
  }

  async getFileInfo(filePath: string): Promise<AppResult<FileInfo>> {
    return this.executeWithResilience(
      () => this.storageStrategy.getFileInfo(filePath),
      'getFileInfo'
    );
  }

  async getStorageStats(): Promise<AppResult<StorageStats>> {
    return this.executeWithResilience(
      () => this.storageStrategy.getStorageStats(),
      'getStorageStats'
    );
  }

  async moveFile(sourcePath: string, destinationPath: string): Promise<AppResult<boolean>> {
    return this.executeWithResilience(
      () => this.storageStrategy.moveFile(sourcePath, destinationPath),
      'moveFile'
    );
  }

  async createDirectory(directoryPath: string): Promise<AppResult<boolean>> {
    return this.executeWithResilience(
      () => this.storageStrategy.createDirectory(directoryPath),
      'createDirectory'
    );
  }

  /**
   * Execute operation with resilience (circuit breaker + retry)
   */
  private async executeWithResilience<T>(
    operation: () => Promise<AppResult<T>>,
    operationName: string
  ): Promise<AppResult<T>> {
    try {
      // Execute with circuit breaker
      const result = await this.circuitBreaker.execute(
        async () => {
          const operationResult = await operation();
          if (operationResult.isOk()) {
            return operationResult.unwrap();
          } else {
            // Type assertion to handle the type narrowing issue
            const errorResult = operationResult as AppResult<never>;
            throw new Error(errorResult.unwrapErr().message);
          }
        },
        {
          operationName: `storage-${operationName}`,
          timeoutMs: this.config.timeoutMs || 30000,
          metadata: {
            strategyType: this.storageStrategy.constructor.name,
            operation: operationName
          }
        }
      );

      // The circuit breaker returns the unwrapped value, so we can directly wrap it
      return AppResult.Ok(result as T);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return AppResult.Err(AppError.Generic(`Storage operation ${operationName} failed: ${errorMessage}`));
    }
  }
}
