/**
 * Circuit Breaker Configuration
 * 
 * Environment-driven configuration for circuit breaker behavior
 * Follows the existing StorageConfig pattern for consistency
 * 
 */

import * as dotenv from 'dotenv';
dotenv.config();
import { z } from 'zod';


/**
 * Circuit Breaker Configuration Schema
 * Validates and transforms environment variables
 */
export const CircuitBreakerConfigSchema = z.object({
  // Failure threshold before opening circuit
  FAILURE_THRESHOLD: z.union([
    z.string().transform(val => parseInt(val, 10)),
    z.number()
  ]).pipe(z.number().min(1).max(100))
    .default(5),
  
  // Timeout in milliseconds before attempting half-open
  TIMEOUT_MS: z.union([
    z.string().transform(val => parseInt(val, 10)),
    z.number()
  ]).pipe(z.number().min(1000).max(300000)) // 1 second to 5 minutes
    .default(30000),
  
  // Maximum calls allowed in half-open state
  HALF_OPEN_MAX_CALLS: z.union([
    z.string().transform(val => parseInt(val, 10)),
    z.number()
  ]).pipe(z.number().min(1).max(50))
    .default(3),
  
  // Required consecutive successes to close circuit
  SUCCESS_THRESHOLD: z.union([
    z.string().transform(val => parseInt(val, 10)),
    z.number()
  ]).pipe(z.number().min(1).max(20))
    .default(3),
  
  // Maximum history size for state transitions
  MAX_HISTORY_SIZE: z.union([
    z.string().transform(val => parseInt(val, 10)),
    z.number()
  ]).pipe(z.number().min(10).max(1000))
    .default(100),
  
  // Enable/disable circuit breaker
  ENABLED: z.union([
    z.string().transform(val => val.toLowerCase() === 'true'),
    z.boolean()
  ]).default(true),
  
  // Enable/disable metrics collection
  METRICS_ENABLED: z.union([
    z.string().transform(val => val.toLowerCase() === 'true'),
    z.boolean()
  ]).default(true),
  
  // Circuit breaker name for identification
  NAME: z.string()
    .min(1)
    .max(100)
    .default('default')
});

/**
 * Circuit Breaker Configuration Type
 */
export type CircuitBreakerConfig = z.infer<typeof CircuitBreakerConfigSchema>;

/**
 * Default Circuit Breaker Configuration
 * Sensible defaults when environment variables are not set
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  FAILURE_THRESHOLD: 5,
  TIMEOUT_MS: 30000,
  HALF_OPEN_MAX_CALLS: 3,
  SUCCESS_THRESHOLD: 3,
  MAX_HISTORY_SIZE: 100,
  ENABLED: true,
  METRICS_ENABLED: true,
  NAME: 'default'
};

/**
 * Circuit Breaker Configuration Manager
 * Loads and validates configuration from environment variables
 */
export class CircuitBreakerConfigManager {
  private config: CircuitBreakerConfig;
  private readonly prefix: string;

  constructor(prefix: string = 'CIRCUIT_BREAKER') {
    this.prefix = prefix;
    this.config = this.loadConfig();
  }

  /**
   * Load configuration from environment variables
   */
  private loadConfig(): CircuitBreakerConfig {
    try {
      // Extract environment variables with prefix
      const envVars = this.extractEnvVars();
      
      // If no environment variables found, use defaults
      if (Object.keys(envVars).length === 0) {
        console.log('No Circuit Breaker environment variables found, using defaults');
        return DEFAULT_CIRCUIT_BREAKER_CONFIG;
      }
      
      // Parse and validate configuration
      const result = CircuitBreakerConfigSchema.safeParse(envVars);
      
      if (result.success) {
        console.log('Circuit Breaker configuration loaded from environment variables');
        return result.data;
      }
      
      console.warn('Circuit Breaker configuration validation failed, using defaults:', result.error);
      return DEFAULT_CIRCUIT_BREAKER_CONFIG;
      
    } catch (error) {
      console.warn('Failed to load Circuit Breaker configuration, using defaults:', error);
      return DEFAULT_CIRCUIT_BREAKER_CONFIG;
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
  getConfig(): CircuitBreakerConfig {
    return { ...this.config };
  }

  /**
   * Get specific configuration value
   */
  get<K extends keyof CircuitBreakerConfig>(key: K): CircuitBreakerConfig[K] {
    return this.config[key];
  }

  /**
   * Check if circuit breaker is enabled
   */
  isEnabled(): boolean {
    return this.config.ENABLED;
  }

  /**
   * Check if metrics collection is enabled
   */
  isMetricsEnabled(): boolean {
    return this.config.METRICS_ENABLED;
  }

  /**
   * Get circuit breaker name
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
      failureThreshold: this.config.FAILURE_THRESHOLD,
      timeoutMs: this.config.TIMEOUT_MS,
      halfOpenMaxCalls: this.config.HALF_OPEN_MAX_CALLS,
      successThreshold: this.config.SUCCESS_THRESHOLD,
      maxHistorySize: this.config.MAX_HISTORY_SIZE,
      metricsEnabled: this.config.METRICS_ENABLED
    };
  }
}

/**
 * Create a circuit breaker configuration manager with custom prefix
 * Useful for multiple circuit breakers with different configurations
 */
export function createCircuitBreakerConfig(prefix: string): CircuitBreakerConfigManager {
  return new CircuitBreakerConfigManager(prefix);
}

/**
 * Default circuit breaker configuration manager instance
 */
export const defaultCircuitBreakerConfig = new CircuitBreakerConfigManager();
