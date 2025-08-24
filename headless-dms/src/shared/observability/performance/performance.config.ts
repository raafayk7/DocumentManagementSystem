import { z } from 'zod';

/**
 * Performance monitoring configuration schema
 */
const PerformanceConfigSchema = z.object({
  // Main performance monitoring settings
  PERFORMANCE_MONITORING_ENABLED: z.string().transform(val => val === 'true').default(true),
  PERFORMANCE_MONITORING_SAMPLE_RATE: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0.0).max(1.0)).default(1.0),
  
  // Storage operation monitoring
  PERFORMANCE_MONITORING_STORAGE: z.string().transform(val => val !== 'false').default(true),
  PERFORMANCE_MONITORING_SLOW_STORAGE_THRESHOLD: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(100).max(60000)).default(5000),
  
  // API response monitoring
  PERFORMANCE_MONITORING_API: z.string().transform(val => val !== 'false').default(true),
  PERFORMANCE_MONITORING_SLOW_API_THRESHOLD: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(100).max(60000)).default(2000),
  
  // Database query monitoring
  PERFORMANCE_MONITORING_DATABASE: z.string().transform(val => val !== 'false').default(true),
  PERFORMANCE_MONITORING_SLOW_QUERY_THRESHOLD: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(100).max(60000)).default(1000),
  
  // File operation monitoring
  PERFORMANCE_MONITORING_FILES: z.string().transform(val => val !== 'false').default(true),
  
  // Performance middleware settings
  PERFORMANCE_MIDDLEWARE_ENABLED: z.string().transform(val => val !== 'false').default(true),
  PERFORMANCE_MIDDLEWARE_TRACK_REQUEST_SIZE: z.string().transform(val => val !== 'false').default(true),
  PERFORMANCE_MIDDLEWARE_TRACK_RESPONSE_SIZE: z.string().transform(val => val !== 'false').default(true),
  PERFORMANCE_MIDDLEWARE_TRACK_USER_CONTEXT: z.string().transform(val => val !== 'false').default(true),
  
  // Alerting thresholds
  PERFORMANCE_ALERTING_ENABLED: z.string().transform(val => val === 'true').default(true),
  PERFORMANCE_ALERTING_SLOW_OPERATION_PERCENTILE: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(50).max(99)).default(95),
  
  // Metrics aggregation
  PERFORMANCE_METRICS_AGGREGATION_ENABLED: z.string().transform(val => val === 'true').default(true),
  PERFORMANCE_METRICS_AGGREGATION_INTERVAL: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1000).max(300000)).default(60000),
  
  // Performance dashboard
  PERFORMANCE_DASHBOARD_ENABLED: z.string().transform(val => val === 'true').default(true),
  PERFORMANCE_DASHBOARD_PORT: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1000).max(65535)).default(3001),
});

/**
 * Performance monitoring configuration type
 */
export type PerformanceConfig = z.infer<typeof PerformanceConfigSchema>;

/**
 * Performance monitoring configuration manager
 * Manages all performance monitoring settings with environment-based configuration
 */
export class PerformanceConfiguration {
  private static instance: PerformanceConfiguration;
  private config: PerformanceConfig | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): PerformanceConfiguration {
    if (!PerformanceConfiguration.instance) {
      PerformanceConfiguration.instance = new PerformanceConfiguration();
    }
    return PerformanceConfiguration.instance;
  }

  /**
   * Load configuration from environment variables
   */
  private loadConfig(): PerformanceConfig {
    if (this.config) {
      return this.config;
    }

    try {
      this.config = PerformanceConfigSchema.parse(process.env);
      return this.config;
    } catch (error) {
      console.warn('Failed to parse performance monitoring configuration, using defaults:', error);
      this.config = PerformanceConfigSchema.parse({});
      return this.config;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): PerformanceConfig {
    return this.loadConfig();
  }

  /**
   * Check if performance monitoring is enabled
   */
  isEnabled(): boolean {
    return this.getConfig().PERFORMANCE_MONITORING_ENABLED;
  }

  /**
   * Check if storage monitoring is enabled
   */
  isStorageMonitoringEnabled(): boolean {
    return this.getConfig().PERFORMANCE_MONITORING_STORAGE;
  }

  /**
   * Check if API monitoring is enabled
   */
  isApiMonitoringEnabled(): boolean {
    return this.getConfig().PERFORMANCE_MONITORING_API;
  }

  /**
   * Check if database monitoring is enabled
   */
  isDatabaseMonitoringEnabled(): boolean {
    return this.getConfig().PERFORMANCE_MONITORING_DATABASE;
  }

  /**
   * Check if file monitoring is enabled
   */
  isFileMonitoringEnabled(): boolean {
    return this.getConfig().PERFORMANCE_MONITORING_FILES;
  }

  /**
   * Get sample rate for performance monitoring
   */
  getSampleRate(): number {
    return this.getConfig().PERFORMANCE_MONITORING_SAMPLE_RATE;
  }

  /**
   * Get slow storage operation threshold
   */
  getSlowStorageThreshold(): number {
    return this.getConfig().PERFORMANCE_MONITORING_SLOW_STORAGE_THRESHOLD;
  }

  /**
   * Get slow API response threshold
   */
  getSlowApiThreshold(): number {
    return this.getConfig().PERFORMANCE_MONITORING_SLOW_API_THRESHOLD;
  }

  /**
   * Get slow database query threshold
   */
  getSlowQueryThreshold(): number {
    return this.getConfig().PERFORMANCE_MONITORING_SLOW_QUERY_THRESHOLD;
  }

  /**
   * Check if performance middleware is enabled
   */
  isMiddlewareEnabled(): boolean {
    return this.getConfig().PERFORMANCE_MIDDLEWARE_ENABLED;
  }

  /**
   * Check if request size tracking is enabled
   */
  isRequestSizeTrackingEnabled(): boolean {
    return this.getConfig().PERFORMANCE_MIDDLEWARE_TRACK_REQUEST_SIZE;
  }

  /**
   * Check if response size tracking is enabled
   */
  isResponseSizeTrackingEnabled(): boolean {
    return this.getConfig().PERFORMANCE_MIDDLEWARE_TRACK_RESPONSE_SIZE;
  }

  /**
   * Check if user context tracking is enabled
   */
  isUserContextTrackingEnabled(): boolean {
    return this.getConfig().PERFORMANCE_MIDDLEWARE_TRACK_USER_CONTEXT;
  }

  /**
   * Check if performance alerting is enabled
   */
  isAlertingEnabled(): boolean {
    return this.getConfig().PERFORMANCE_ALERTING_ENABLED;
  }

  /**
   * Get slow operation percentile for alerting
   */
  getSlowOperationPercentile(): number {
    return this.getConfig().PERFORMANCE_ALERTING_SLOW_OPERATION_PERCENTILE;
  }

  /**
   * Check if metrics aggregation is enabled
   */
  isMetricsAggregationEnabled(): boolean {
    return this.getConfig().PERFORMANCE_METRICS_AGGREGATION_ENABLED;
  }

  /**
   * Get metrics aggregation interval
   */
  getMetricsAggregationInterval(): number {
    return this.getConfig().PERFORMANCE_METRICS_AGGREGATION_INTERVAL;
  }

  /**
   * Check if performance dashboard is enabled
   */
  isDashboardEnabled(): boolean {
    return this.getConfig().PERFORMANCE_DASHBOARD_ENABLED;
  }

  /**
   * Get performance dashboard port
   */
  getDashboardPort(): number {
    return this.getConfig().PERFORMANCE_DASHBOARD_PORT;
  }

  /**
   * Get all configuration as a plain object
   */
  getAllConfig(): Record<string, unknown> {
    const config = this.getConfig();
    return {
      enabled: config.PERFORMANCE_MONITORING_ENABLED,
      sampleRate: config.PERFORMANCE_MONITORING_SAMPLE_RATE,
      storage: {
        enabled: config.PERFORMANCE_MONITORING_STORAGE,
        slowThreshold: config.PERFORMANCE_MONITORING_SLOW_STORAGE_THRESHOLD
      },
      api: {
        enabled: config.PERFORMANCE_MONITORING_API,
        slowThreshold: config.PERFORMANCE_MONITORING_SLOW_API_THRESHOLD
      },
      database: {
        enabled: config.PERFORMANCE_MONITORING_DATABASE,
        slowThreshold: config.PERFORMANCE_MONITORING_SLOW_QUERY_THRESHOLD
      },
      files: {
        enabled: config.PERFORMANCE_MONITORING_FILES
      },
      middleware: {
        enabled: config.PERFORMANCE_MIDDLEWARE_ENABLED,
        trackRequestSize: config.PERFORMANCE_MIDDLEWARE_TRACK_REQUEST_SIZE,
        trackResponseSize: config.PERFORMANCE_MIDDLEWARE_TRACK_RESPONSE_SIZE,
        trackUserContext: config.PERFORMANCE_MIDDLEWARE_TRACK_USER_CONTEXT
      },
      alerting: {
        enabled: config.PERFORMANCE_ALERTING_ENABLED,
        slowOperationPercentile: config.PERFORMANCE_ALERTING_SLOW_OPERATION_PERCENTILE
      },
      metrics: {
        aggregationEnabled: config.PERFORMANCE_METRICS_AGGREGATION_ENABLED,
        aggregationInterval: config.PERFORMANCE_METRICS_AGGREGATION_INTERVAL
      },
      dashboard: {
        enabled: config.PERFORMANCE_DASHBOARD_ENABLED,
        port: config.PERFORMANCE_DASHBOARD_PORT
      }
    };
  }
}

// Export singleton instance
export const performanceConfiguration = PerformanceConfiguration.getInstance();
