import { z } from 'zod';
import { newRelicConfig } from '../new-relic/NewRelicConfig.js';

const MetricsConfigSchema = z.object({
  // Metrics Collection Settings
  METRICS_ENABLED: z.string().transform(val => val === 'true').default(true),
  METRICS_BUFFER_SIZE: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(10).max(1000)).default(100),
  METRICS_FLUSH_INTERVAL: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1000).max(300000)).default(60000), // 1 minute
  
  // New Relic Integration
  METRICS_NEW_RELIC_ENABLED: z.string().transform(val => val === 'true').default(true),
  METRICS_NEW_RELIC_BUFFER_SIZE: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(10).max(1000)).default(50),
  
  // Metrics Endpoints
  METRICS_ENDPOINT_ENABLED: z.string().transform(val => val === 'true').default(true),
  METRICS_ENDPOINT_AUTH_REQUIRED: z.string().transform(val => val === 'true').default(true),
  METRICS_ENDPOINT_PATH: z.string().default('/metrics'),
  METRICS_SUMMARY_PATH: z.string().default('/metrics/summary'),
  METRICS_HEALTH_PATH: z.string().default('/metrics/health'),
  
  // Metrics Middleware
  METRICS_MIDDLEWARE_ENABLED: z.string().transform(val => val === 'true').default(true),
  METRICS_MIDDLEWARE_TRACK_REQUESTS: z.string().transform(val => val === 'true').default(true),
  METRICS_MIDDLEWARE_TRACK_USER_ACTIVITY: z.string().transform(val => val === 'true').default(true),
  METRICS_MIDDLEWARE_TRACK_PERFORMANCE: z.string().transform(val => val === 'true').default(true),
  
  // Storage Metrics
  METRICS_STORAGE_TRACK_OPERATIONS: z.string().transform(val => val === 'true').default(true),
  METRICS_STORAGE_TRACK_ERRORS: z.string().transform(val => val === 'true').default(true),
  METRICS_STORAGE_TRACK_PERFORMANCE: z.string().transform(val => val === 'true').default(true),
  
  // User Activity Metrics
  METRICS_USER_ACTIVITY_TRACK_AUTH: z.string().transform(val => val === 'true').default(true),
  METRICS_USER_ACTIVITY_TRACK_DOCUMENTS: z.string().transform(val => val === 'true').default(true),
  METRICS_USER_ACTIVITY_ANONYMIZE: z.string().transform(val => val === 'true').default(true),
  
  // Performance Thresholds (in milliseconds)
  METRICS_PERFORMANCE_WARNING_THRESHOLD: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(100).max(10000)).default(1000),
  METRICS_PERFORMANCE_CRITICAL_THRESHOLD: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(500).max(30000)).default(5000),
  
  // Error Rate Thresholds (in percentage)
  METRICS_ERROR_RATE_WARNING_THRESHOLD: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0).max(100)).default(5.0),
  METRICS_ERROR_RATE_CRITICAL_THRESHOLD: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0).max(100)).default(20.0),
  
  // Success Rate Thresholds (as decimal)
  METRICS_SUCCESS_RATE_WARNING_THRESHOLD: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0).max(1)).default(0.95),
  METRICS_SUCCESS_RATE_CRITICAL_THRESHOLD: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0).max(1)).default(0.80),
  
  // User Activity Thresholds (in percentage)
  METRICS_USER_ACTIVITY_WARNING_THRESHOLD: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0).max(100)).default(1.0),
  METRICS_USER_ACTIVITY_CRITICAL_THRESHOLD: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0).max(100)).default(0.1),
  
  // Logging
  METRICS_LOGGING_ENABLED: z.string().transform(val => val === 'true').default(true),
  METRICS_LOGGING_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // Development and Testing
  METRICS_DEV_MODE: z.string().transform(val => val === 'true').default(false),
  METRICS_TEST_MODE: z.string().transform(val => val === 'true').default(false),
});

export type MetricsConfig = z.infer<typeof MetricsConfigSchema>;

/**
 * Metrics Configuration Manager
 * Handles environment variable loading, validation, and configuration management
 */
export class MetricsConfiguration {
  private static instance: MetricsConfiguration;
  private config: MetricsConfig | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): MetricsConfiguration {
    if (!MetricsConfiguration.instance) {
      MetricsConfiguration.instance = new MetricsConfiguration();
    }
    return MetricsConfiguration.instance;
  }

  /**
   * Load and validate configuration from environment variables
   */
  loadConfig(): MetricsConfig {
    try {
      const envConfig = {
        METRICS_ENABLED: process.env.METRICS_ENABLED,
        METRICS_BUFFER_SIZE: process.env.METRICS_BUFFER_SIZE,
        METRICS_FLUSH_INTERVAL: process.env.METRICS_FLUSH_INTERVAL,
        METRICS_NEW_RELIC_ENABLED: process.env.METRICS_NEW_RELIC_ENABLED,
        METRICS_NEW_RELIC_BUFFER_SIZE: process.env.METRICS_NEW_RELIC_BUFFER_SIZE,
        METRICS_ENDPOINT_ENABLED: process.env.METRICS_ENDPOINT_ENABLED,
        METRICS_ENDPOINT_AUTH_REQUIRED: process.env.METRICS_ENDPOINT_AUTH_REQUIRED,
        METRICS_ENDPOINT_PATH: process.env.METRICS_ENDPOINT_PATH,
        METRICS_SUMMARY_PATH: process.env.METRICS_SUMMARY_PATH,
        METRICS_HEALTH_PATH: process.env.METRICS_HEALTH_PATH,
        METRICS_MIDDLEWARE_ENABLED: process.env.METRICS_MIDDLEWARE_ENABLED,
        METRICS_MIDDLEWARE_TRACK_REQUESTS: process.env.METRICS_MIDDLEWARE_TRACK_REQUESTS,
        METRICS_MIDDLEWARE_TRACK_USER_ACTIVITY: process.env.METRICS_MIDDLEWARE_TRACK_USER_ACTIVITY,
        METRICS_MIDDLEWARE_TRACK_PERFORMANCE: process.env.METRICS_MIDDLEWARE_TRACK_PERFORMANCE,
        METRICS_STORAGE_TRACK_OPERATIONS: process.env.METRICS_STORAGE_TRACK_OPERATIONS,
        METRICS_STORAGE_TRACK_ERRORS: process.env.METRICS_STORAGE_TRACK_ERRORS,
        METRICS_STORAGE_TRACK_PERFORMANCE: process.env.METRICS_STORAGE_TRACK_PERFORMANCE,
        METRICS_USER_ACTIVITY_TRACK_AUTH: process.env.METRICS_USER_ACTIVITY_TRACK_AUTH,
        METRICS_USER_ACTIVITY_TRACK_DOCUMENTS: process.env.METRICS_USER_ACTIVITY_TRACK_DOCUMENTS,
        METRICS_USER_ACTIVITY_ANONYMIZE: process.env.METRICS_USER_ACTIVITY_ANONYMIZE,
        METRICS_PERFORMANCE_WARNING_THRESHOLD: process.env.METRICS_PERFORMANCE_WARNING_THRESHOLD,
        METRICS_PERFORMANCE_CRITICAL_THRESHOLD: process.env.METRICS_PERFORMANCE_CRITICAL_THRESHOLD,
        METRICS_ERROR_RATE_WARNING_THRESHOLD: process.env.METRICS_ERROR_RATE_WARNING_THRESHOLD,
        METRICS_ERROR_RATE_CRITICAL_THRESHOLD: process.env.METRICS_ERROR_RATE_CRITICAL_THRESHOLD,
        METRICS_SUCCESS_RATE_WARNING_THRESHOLD: process.env.METRICS_SUCCESS_RATE_WARNING_THRESHOLD,
        METRICS_SUCCESS_RATE_CRITICAL_THRESHOLD: process.env.METRICS_SUCCESS_RATE_CRITICAL_THRESHOLD,
        METRICS_USER_ACTIVITY_WARNING_THRESHOLD: process.env.METRICS_USER_ACTIVITY_WARNING_THRESHOLD,
        METRICS_USER_ACTIVITY_CRITICAL_THRESHOLD: process.env.METRICS_USER_ACTIVITY_CRITICAL_THRESHOLD,
        METRICS_LOGGING_ENABLED: process.env.METRICS_LOGGING_ENABLED,
        METRICS_LOGGING_LEVEL: process.env.METRICS_LOGGING_LEVEL,
        METRICS_DEV_MODE: process.env.METRICS_DEV_MODE,
        METRICS_TEST_MODE: process.env.METRICS_TEST_MODE,
      };

      // Filter out undefined values
      const filteredConfig = Object.fromEntries(
        Object.entries(envConfig).filter(([_, value]) => value !== undefined)
      );

      const result = MetricsConfigSchema.safeParse(filteredConfig);
      
      if (!result.success) {
        const errorMessage = result.error.issues.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ');
        throw new Error(`Metrics configuration validation failed: ${errorMessage}`);
      }

      this.config = result.data;
      return this.config;
    } catch (error) {
      console.warn('Failed to load metrics configuration, using defaults:', error);
      // Return default configuration
      return MetricsConfigSchema.parse({});
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): MetricsConfig {
    if (!this.config) {
      return this.loadConfig();
    }
    return this.config;
  }

  /**
   * Check if metrics are enabled
   */
  isEnabled(): boolean {
    const config = this.getConfig();
    return config.METRICS_ENABLED;
  }

  /**
   * Check if New Relic integration is enabled
   */
  isNewRelicEnabled(): boolean {
    const config = this.getConfig();
    return config.METRICS_NEW_RELIC_ENABLED && newRelicConfig.isEnabled();
  }

  /**
   * Get buffer size for metrics
   */
  getBufferSize(): number {
    const config = this.getConfig();
    return config.METRICS_BUFFER_SIZE;
  }

  /**
   * Get flush interval for metrics
   */
  getFlushInterval(): number {
    const config = this.getConfig();
    return config.METRICS_FLUSH_INTERVAL;
  }

  /**
   * Check if metrics endpoints are enabled
   */
  areEndpointsEnabled(): boolean {
    const config = this.getConfig();
    return config.METRICS_ENDPOINT_ENABLED;
  }

  /**
   * Check if metrics middleware is enabled
   */
  isMiddlewareEnabled(): boolean {
    const config = this.getConfig();
    return config.METRICS_MIDDLEWARE_ENABLED;
  }

  /**
   * Get performance warning threshold
   */
  getPerformanceWarningThreshold(): number {
    const config = this.getConfig();
    return config.METRICS_PERFORMANCE_WARNING_THRESHOLD;
  }

  /**
   * Get performance critical threshold
   */
  getPerformanceCriticalThreshold(): number {
    const config = this.getConfig();
    return config.METRICS_PERFORMANCE_CRITICAL_THRESHOLD;
  }

  /**
   * Get error rate warning threshold
   */
  getErrorRateWarningThreshold(): number {
    const config = this.getConfig();
    return config.METRICS_ERROR_RATE_WARNING_THRESHOLD;
  }

  /**
   * Get error rate critical threshold
   */
  getErrorRateCriticalThreshold(): number {
    const config = this.getConfig();
    return config.METRICS_ERROR_RATE_CRITICAL_THRESHOLD;
  }

  /**
   * Check if development mode is enabled
   */
  isDevMode(): boolean {
    const config = this.getConfig();
    return config.METRICS_DEV_MODE;
  }

  /**
   * Check if test mode is enabled
   */
  isTestMode(): boolean {
    const config = this.getConfig();
    return config.METRICS_TEST_MODE;
  }

  /**
   * Get configuration summary for logging
   */
  getConfigSummary(): string {
    const config = this.getConfig();
    return `Metrics Config: Enabled=${config.METRICS_ENABLED}, BufferSize=${config.METRICS_BUFFER_SIZE}, FlushInterval=${config.METRICS_FLUSH_INTERVAL}, NewRelic=${config.METRICS_NEW_RELIC_ENABLED}`;
  }
}

/**
 * Export singleton instance
 */
export const metricsConfiguration = MetricsConfiguration.getInstance();
