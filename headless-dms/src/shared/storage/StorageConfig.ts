import { z } from 'zod';
import type { StorageStrategyConfig } from './StorageTypes.js';

/**
 * StorageConfig - configuration for storage strategies
 * Environment variables and configuration for storage backend selection
 */

/**
 * Environment variable schema for storage configuration
 */
const StorageEnvSchema = z.object({
  // Storage backend selection
  STORAGE_BACKEND: z.enum(['local', 's3', 'azure', 'auto']).default('auto'),
  
  // Emulator configuration
  STORAGE_EMULATOR: z.string().transform(val => val === 'true').default(false),
  
  // Fallback configuration
  STORAGE_FALLBACK_ENABLED: z.string().transform(val => val === 'true').default(true),
  
  // Timeout configuration
  STORAGE_TIMEOUT_MS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1000).max(300000)).default(30000),
  
  // Retry configuration
  STORAGE_RETRY_ATTEMPTS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(10)).default(3),
  STORAGE_CIRCUIT_BREAKER_THRESHOLD: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(20)).default(5),
  
  // Health check configuration
  STORAGE_HEALTH_CHECK_INTERVAL: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(5000).max(300000)).default(30000),
  STORAGE_HEALTH_CHECK_TIMEOUT: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1000).max(60000)).default(10000),
  
  // S3 configuration
  S3_BUCKET_NAME: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().optional(), // For LocalStack emulator
  
  // Azure configuration
  AZURE_STORAGE_ACCOUNT: z.string().optional(),
  AZURE_STORAGE_KEY: z.string().optional(),
  AZURE_STORAGE_CONTAINER: z.string().optional(),
  AZURE_STORAGE_ENDPOINT: z.string().optional(), // For Azurite emulator
  
  // Local storage configuration
  LOCAL_STORAGE_PATH: z.string().default('./uploads'),
  LOCAL_STORAGE_MAX_SIZE: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1024 * 1024)).default(1024 * 1024 * 1024), // 1GB default
});

/**
 * Storage configuration class
 */
export class StorageConfig {
  private static instance: StorageConfig;
  private config: z.infer<typeof StorageEnvSchema>;

  private constructor() {
    this.config = StorageEnvSchema.parse(process.env);
  }

  /**
   * Get singleton instance of StorageConfig
   */
  static getInstance(): StorageConfig {
    if (!StorageConfig.instance) {
      StorageConfig.instance = new StorageConfig();
    }
    return StorageConfig.instance;
  }

  /**
   * Get the primary storage backend
   */
  get primaryBackend(): string {
    return this.config.STORAGE_BACKEND;
  }

  /**
   * Check if emulator mode is enabled
   */
  get isEmulatorEnabled(): boolean {
    return this.config.STORAGE_EMULATOR;
  }

  /**
   * Check if fallback is enabled
   */
  get isFallbackEnabled(): boolean {
    return this.config.STORAGE_FALLBACK_ENABLED;
  }

  /**
   * Get storage timeout in milliseconds
   */
  get timeoutMs(): number {
    return this.config.STORAGE_TIMEOUT_MS;
  }

  /**
   * Get retry attempts count
   */
  get retryAttempts(): number {
    return this.config.STORAGE_RETRY_ATTEMPTS;
  }

  /**
   * Get circuit breaker threshold
   */
  get circuitBreakerThreshold(): number {
    return this.config.STORAGE_CIRCUIT_BREAKER_THRESHOLD;
  }

  /**
   * Get health check interval in milliseconds
   */
  get healthCheckInterval(): number {
    return this.config.STORAGE_HEALTH_CHECK_INTERVAL;
  }

  /**
   * Get health check timeout in milliseconds
   */
  get healthCheckTimeout(): number {
    return this.config.STORAGE_HEALTH_CHECK_TIMEOUT;
  }

  /**
   * Get S3 configuration
   */
  get s3Config() {
    return {
      bucketName: this.config.S3_BUCKET_NAME,
      region: this.config.S3_REGION,
      accessKeyId: this.config.S3_ACCESS_KEY_ID,
      secretAccessKey: this.config.S3_SECRET_ACCESS_KEY,
      endpoint: this.config.S3_ENDPOINT,
    };
  }

  /**
   * Get Azure configuration
   */
  get azureConfig() {
    return {
      account: this.config.AZURE_STORAGE_ACCOUNT,
      key: this.config.AZURE_STORAGE_KEY,
      container: this.config.AZURE_STORAGE_CONTAINER,
      endpoint: this.config.AZURE_STORAGE_ENDPOINT,
    };
  }

  /**
   * Get local storage configuration
   */
  get localConfig() {
    return {
      path: this.config.LOCAL_STORAGE_PATH,
      maxSize: this.config.LOCAL_STORAGE_MAX_SIZE,
    };
  }

  /**
   * Get default storage strategy configuration
   */
  getDefaultStrategyConfig(): StorageStrategyConfig[] {
    const configs: StorageStrategyConfig[] = [];

    // Local storage strategy (always available as fallback)
    configs.push({
      id: 'local',
      name: 'Local File System',
      type: 'local',
      enabled: true,
      priority: 100, // Lowest priority (fallback)
      allowFallback: true,
      config: this.localConfig,
      healthCheck: {
        enabled: true,
        interval: this.healthCheckInterval,
        timeout: this.healthCheckTimeout,
        failureThreshold: this.circuitBreakerThreshold,
      },
      retry: {
        enabled: false, // Local storage doesn't need retry
        maxAttempts: 1,
        backoffMultiplier: 1,
        maxBackoff: 0,
      },
    });

    // S3 storage strategy
    if (this.config.S3_BUCKET_NAME && this.config.S3_ACCESS_KEY_ID) {
      configs.push({
        id: 's3',
        name: 'AWS S3',
        type: 's3',
        enabled: true,
        priority: this.config.STORAGE_BACKEND === 's3' ? 1 : 10,
        allowFallback: this.isFallbackEnabled,
        config: this.s3Config,
        healthCheck: {
          enabled: true,
          interval: this.healthCheckInterval,
          timeout: this.healthCheckTimeout,
          failureThreshold: this.circuitBreakerThreshold,
        },
        retry: {
          enabled: true,
          maxAttempts: this.retryAttempts,
          backoffMultiplier: 2,
          maxBackoff: this.timeoutMs,
        },
      });
    }

    // Azure storage strategy
    if (this.config.AZURE_STORAGE_ACCOUNT && this.config.AZURE_STORAGE_KEY) {
      configs.push({
        id: 'azure',
        name: 'Azure Blob Storage',
        type: 'azure',
        enabled: true,
        priority: this.config.STORAGE_BACKEND === 'azure' ? 1 : 20,
        allowFallback: this.isFallbackEnabled,
        config: this.azureConfig,
        healthCheck: {
          enabled: true,
          interval: this.healthCheckInterval,
          timeout: this.healthCheckTimeout,
          failureThreshold: this.circuitBreakerThreshold,
        },
        retry: {
          enabled: true,
          maxAttempts: this.retryAttempts,
          backoffMultiplier: 2,
          maxBackoff: this.timeoutMs,
        },
      });
    }

    // Sort by priority (lower number = higher priority)
    return configs.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Validate that required configuration is present
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if at least one storage backend is configured
    const strategies = this.getDefaultStrategyConfig();
    if (strategies.length === 0) {
      errors.push('No storage backends configured');
    }

    // Check if primary backend is available
    if (this.config.STORAGE_BACKEND !== 'auto' && this.config.STORAGE_BACKEND !== 'local') {
      const primaryStrategy = strategies.find(s => s.type === this.config.STORAGE_BACKEND);
      if (!primaryStrategy) {
        errors.push(`Primary storage backend '${this.config.STORAGE_BACKEND}' is not configured`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get configuration summary for logging
   */
  getSummary(): Record<string, any> {
    return {
      primaryBackend: this.primaryBackend,
      emulatorEnabled: this.isEmulatorEnabled,
      fallbackEnabled: this.isFallbackEnabled,
      timeoutMs: this.timeoutMs,
      retryAttempts: this.retryAttempts,
      circuitBreakerThreshold: this.circuitBreakerThreshold,
      healthCheckInterval: this.healthCheckInterval,
      healthCheckTimeout: this.healthCheckTimeout,
      strategies: this.getDefaultStrategyConfig().map(s => ({
        id: s.id,
        type: s.type,
        enabled: s.enabled,
        priority: s.priority,
        allowFallback: s.allowFallback,
      })),
    };
  }
}

/**
 * Export singleton instance
 */
export const storageConfig = StorageConfig.getInstance();
