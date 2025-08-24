/**
 * Retry Policy Configuration
 * 
 * Environment-driven configuration for retry behavior
 * Follows the existing configuration patterns for consistency
 */

import * as dotenv from 'dotenv';
dotenv.config();
import { z } from 'zod';

/**
 * Retry Policy Configuration Schema
 * Validates and transforms environment variables
 */
export const RetryPolicyConfigSchema = z.object({
  // Maximum number of retry attempts
  MAX_ATTEMPTS: z.union([
    z.string().transform(val => parseInt(val, 10)),
    z.number()
  ]).pipe(z.number().min(1).max(100))
    .default(3),
  
  // Base delay in milliseconds between retries
  BASE_DELAY_MS: z.union([
    z.string().transform(val => parseInt(val, 10)),
    z.number()
  ]).pipe(z.number().min(100).max(60000)) // 100ms to 1 minute
    .default(1000),
  
  // Maximum delay in milliseconds (caps exponential growth)
  MAX_DELAY_MS: z.union([
    z.string().transform(val => parseInt(val, 10)),
    z.number()
  ]).pipe(z.number().min(1000).max(300000)) // 1 second to 5 minutes
    .default(30000),
  
  // Exponential backoff multiplier
  BACKOFF_MULTIPLIER: z.union([
    z.string().transform(val => parseFloat(val)),
    z.number()
  ]).pipe(z.number().min(1.0).max(10.0))
    .default(2.0),
  
  // Jitter factor (0.0 = no jitter, 1.0 = full jitter)
  JITTER_FACTOR: z.union([
    z.string().transform(val => parseFloat(val)),
    z.number()
  ]).pipe(z.number().min(0.0).max(1.0))
    .default(0.1),
  
  // Timeout for each individual attempt
  ATTEMPT_TIMEOUT_MS: z.union([
    z.string().transform(val => parseInt(val, 10)),
    z.number()
  ]).pipe(z.number().min(100).max(300000)) // 100ms to 5 minutes
    .default(5000),
  
  // Total timeout for all retry attempts
  TOTAL_TIMEOUT_MS: z.union([
    z.string().transform(val => parseInt(val, 10)),
    z.number()
  ]).pipe(z.number().min(1000).max(600000)) // 1 second to 10 minutes
    .default(60000),
  
  // Enable/disable retry mechanism
  ENABLED: z.union([
    z.string().transform(val => val.toLowerCase() === 'true'),
    z.boolean()
  ]).default(true),
  
  // Enable/disable jitter
  JITTER_ENABLED: z.union([
    z.string().transform(val => val.toLowerCase() === 'true'),
    z.boolean()
  ]).default(true),
  
  // Retry policy name for identification
  NAME: z.string()
    .min(1)
    .max(100)
    .default('default')
});

/**
 * Retry Policy Configuration Type
 */
export type RetryPolicyConfig = z.infer<typeof RetryPolicyConfigSchema>;

/**
 * Default Retry Policy Configuration
 * Sensible defaults when environment variables are not set
 */
export const DEFAULT_RETRY_POLICY_CONFIG: RetryPolicyConfig = {
  MAX_ATTEMPTS: 3,
  BASE_DELAY_MS: 1000,
  MAX_DELAY_MS: 30000,
  BACKOFF_MULTIPLIER: 2.0,
  JITTER_FACTOR: 0.1,
  ATTEMPT_TIMEOUT_MS: 5000,
  TOTAL_TIMEOUT_MS: 60000,
  ENABLED: true,
  JITTER_ENABLED: true,
  NAME: 'default'
};

/**
 * Retry Policy Configuration Manager
 * Loads and validates configuration from environment variables
 */
export class RetryPolicyConfigManager {
  private config: RetryPolicyConfig;
  private readonly prefix: string;

  constructor(prefix: string = 'RETRY_POLICY') {
    this.prefix = prefix;
    this.config = this.loadConfig();
  }

  /**
   * Load configuration from environment variables
   */
  private loadConfig(): RetryPolicyConfig {
    try {
      // Extract environment variables with prefix
      const envVars = this.extractEnvVars();
      
      // If no environment variables found, use defaults
      if (Object.keys(envVars).length === 0) {
        console.log('No Retry Policy environment variables found, using defaults');
        return DEFAULT_RETRY_POLICY_CONFIG;
      }
      
      // Parse and validate configuration
      const result = RetryPolicyConfigSchema.safeParse(envVars);
      
      if (result.success) {
        console.log('Retry Policy configuration loaded from environment variables');
        return result.data;
      }
      
      console.warn('Retry Policy configuration validation failed, using defaults:', result.error);
      return DEFAULT_RETRY_POLICY_CONFIG;
      
    } catch (error) {
      console.warn('Failed to load Retry Policy configuration, using defaults:', error);
      return DEFAULT_RETRY_POLICY_CONFIG;
    }
  }

  /**
   * Extract environment variables with the specified prefix
   */
  private extractEnvVars(): Record<string, string> {
    const envVars: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(this.prefix + '_') && value !== undefined) {
        const configKey = key.substring(this.prefix.length + 1); // Remove prefix and underscore
        envVars[configKey] = value;
      }
    }
    
    return envVars;
  }

  /**
   * Get current configuration
   */
  getConfig(): RetryPolicyConfig {
    return { ...this.config };
  }

  /**
   * Get specific configuration value
   */
  get<K extends keyof RetryPolicyConfig>(key: K): RetryPolicyConfig[K] {
    return this.config[key];
  }

  /**
   * Check if retry mechanism is enabled
   */
  isEnabled(): boolean {
    return this.config.ENABLED;
  }

  /**
   * Check if jitter is enabled
   */
  isJitterEnabled(): boolean {
    return this.config.JITTER_ENABLED;
  }

  /**
   * Get retry policy name
   */
  getName(): string {
    return this.config.NAME;
  }

  /**
   * Reload configuration from environment variables
   * Useful for testing or dynamic configuration updates
   */
  reloadConfig(): void {
    this.config = this.loadConfig();
  }

  /**
   * Get configuration summary for logging/debugging
   */
  getConfigSummary(): Record<string, unknown> {
    return {
      name: this.config.NAME,
      enabled: this.config.ENABLED,
      maxAttempts: this.config.MAX_ATTEMPTS,
      baseDelayMs: this.config.BASE_DELAY_MS,
      maxDelayMs: this.config.MAX_DELAY_MS,
      backoffMultiplier: this.config.BACKOFF_MULTIPLIER,
      jitterFactor: this.config.JITTER_FACTOR,
      jitterEnabled: this.config.JITTER_ENABLED,
      attemptTimeoutMs: this.config.ATTEMPT_TIMEOUT_MS,
      totalTimeoutMs: this.config.TOTAL_TIMEOUT_MS
    };
  }
}

/**
 * Create a retry policy configuration manager with custom prefix
 * Useful for multiple retry policies with different configurations
 */
export function createRetryPolicyConfig(prefix: string): RetryPolicyConfigManager {
  return new RetryPolicyConfigManager(prefix);
}

/**
 * Default retry policy configuration manager instance
 */
export const defaultRetryPolicyConfig = new RetryPolicyConfigManager();
