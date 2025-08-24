import { AppResult, AppError } from '@carbonteq/hexapp';
import { newRelicMetrics } from '../new-relic/NewRelicMetrics.js';
import { newRelicConfig } from '../new-relic/NewRelicConfig.js';

/**
 * Performance monitoring configuration
 */
export interface PerformanceMonitorConfig {
  enabled: boolean;
  trackStorageOperations: boolean;
  trackApiResponses: boolean;
  trackDatabaseQueries: boolean;
  trackFileOperations: boolean;
  sampleRate: number; // 0.0 to 1.0, percentage of operations to track
  slowQueryThreshold: number; // milliseconds
  slowApiThreshold: number; // milliseconds
  slowStorageThreshold: number; // milliseconds
}

/**
 * Storage operation performance metrics
 */
export interface StoragePerformanceMetrics {
  operation: 'upload' | 'download' | 'delete' | 'exists' | 'list' | 'copy' | 'move' | 'createDirectory';
  strategy: 'local' | 's3' | 'azure';
  duration: number;
  fileSize?: number;
  fileType?: string;
  success: boolean;
  errorType?: string;
  retryCount?: number;
  fallbackUsed?: boolean;
  timestamp: Date;
}

/**
 * API response performance metrics
 */
export interface ApiPerformanceMetrics {
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  requestSize?: number;
  responseSize?: number;
  userId?: string;
  userRole?: string;
  userAgent?: string;
  timestamp: Date;
}

/**
 * Database query performance metrics
 */
export interface DatabasePerformanceMetrics {
  operation: 'select' | 'insert' | 'update' | 'delete' | 'raw';
  table?: string;
  duration: number;
  rowCount?: number;
  success: boolean;
  errorType?: string;
  query?: string;
  parameters?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * File operation performance metrics
 */
export interface FileOperationMetrics {
  operation: 'upload' | 'download' | 'delete' | 'process';
  fileSize: number;
  fileType: string;
  duration: number;
  success: boolean;
  errorType?: string;
  processingSteps?: string[];
  timestamp: Date;
}

/**
 * Comprehensive performance monitoring service
 * Tracks storage operations, API responses, database queries, and file operations
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private config: PerformanceMonitorConfig;
  private metricsBuffer: Map<string, number> = new Map();
  private slowOperationThresholds: Map<string, number> = new Map();

  private constructor() {
    this.config = this.loadConfig();
    this.initializeThresholds();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Load configuration from environment variables
   */
  private loadConfig(): PerformanceMonitorConfig {
    return {
      enabled: process.env.PERFORMANCE_MONITORING_ENABLED === 'true',
      trackStorageOperations: process.env.PERFORMANCE_MONITORING_STORAGE !== 'false',
      trackApiResponses: process.env.PERFORMANCE_MONITORING_API !== 'false',
      trackDatabaseQueries: process.env.PERFORMANCE_MONITORING_DATABASE !== 'false',
      trackFileOperations: process.env.PERFORMANCE_MONITORING_FILES !== 'false',
      sampleRate: parseFloat(process.env.PERFORMANCE_MONITORING_SAMPLE_RATE || '1.0'),
      slowQueryThreshold: parseInt(process.env.PERFORMANCE_MONITORING_SLOW_QUERY_THRESHOLD || '1000'),
      slowApiThreshold: parseInt(process.env.PERFORMANCE_MONITORING_SLOW_API_THRESHOLD || '2000'),
      slowStorageThreshold: parseInt(process.env.PERFORMANCE_MONITORING_SLOW_STORAGE_THRESHOLD || '5000'),
    };
  }

  /**
   * Initialize performance thresholds
   */
  private initializeThresholds(): void {
    this.slowOperationThresholds.set('database', this.config.slowQueryThreshold);
    this.slowOperationThresholds.set('api', this.config.slowApiThreshold);
    this.slowOperationThresholds.set('storage', this.config.slowStorageThreshold);
  }

  /**
   * Check if performance monitoring is enabled
   */
  private isEnabled(): boolean {
    return this.config.enabled && newRelicConfig.isEnabled();
  }

  /**
   * Check if operation should be sampled
   */
  private shouldSample(): boolean {
    return Math.random() <= this.config.sampleRate;
  }

  /**
   * Track storage operation performance
   */
  trackStorageOperation(metrics: StoragePerformanceMetrics): AppResult<void> {
    if (!this.isEnabled() || !this.config.trackStorageOperations || !this.shouldSample()) {
      return AppResult.Ok(undefined);
    }

    try {
      // Record to New Relic
      newRelicMetrics.recordMetric('storage.operation.duration', metrics.duration, {
        operation: metrics.operation,
        strategy: metrics.strategy,
        success: metrics.success,
        errorType: metrics.errorType || 'none',
        fileSize: metrics.fileSize,
        fileType: metrics.fileType,
        retryCount: metrics.retryCount || 0,
        fallbackUsed: metrics.fallbackUsed || false,
        timestamp: metrics.timestamp.toISOString()
      });

      // Record operation count
      newRelicMetrics.recordMetric('storage.operation.count', 1, {
        operation: metrics.operation,
        strategy: metrics.strategy,
        success: metrics.success
      });

      // Check for slow operations
      if (metrics.duration > this.config.slowStorageThreshold) {
        newRelicMetrics.recordMetric('storage.operation.slow', 1, {
          operation: metrics.operation,
          strategy: metrics.strategy,
          duration: metrics.duration,
          threshold: this.config.slowStorageThreshold
        });
      }

      return AppResult.Ok(undefined);
    } catch (error) {
      return AppResult.Err(AppError.Generic(`Failed to track storage performance: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Track API response performance
   */
  trackApiResponse(metrics: ApiPerformanceMetrics): AppResult<void> {
    if (!this.isEnabled() || !this.config.trackApiResponses || !this.shouldSample()) {
      return AppResult.Ok(undefined);
    }

    try {
      // Record to New Relic
      newRelicMetrics.recordMetric('api.response.duration', metrics.duration, {
        method: metrics.method,
        url: metrics.url,
        statusCode: metrics.statusCode,
        requestSize: metrics.requestSize,
        responseSize: metrics.responseSize,
        userId: metrics.userId || 'anonymous',
        userRole: metrics.userRole || 'unknown',
        userAgent: metrics.userAgent,
        timestamp: metrics.timestamp.toISOString()
      });

      // Record response count
      newRelicMetrics.recordMetric('api.response.count', 1, {
        method: metrics.method,
        statusCode: metrics.statusCode
      });

      // Check for slow API responses
      if (metrics.duration > this.config.slowApiThreshold) {
        newRelicMetrics.recordMetric('api.response.slow', 1, {
          method: metrics.method,
          url: metrics.url,
          duration: metrics.duration,
          threshold: this.config.slowApiThreshold
        });
      }

      return AppResult.Ok(undefined);
    } catch (error) {
      return AppResult.Err(AppError.Generic(`Failed to track API performance: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Track database query performance
   */
  trackDatabaseQuery(metrics: DatabasePerformanceMetrics): AppResult<void> {
    if (!this.isEnabled() || !this.config.trackDatabaseQueries || !this.shouldSample()) {
      return AppResult.Ok(undefined);
    }

    try {
      // Record to New Relic
      newRelicMetrics.recordMetric('database.query.duration', metrics.duration, {
        operation: metrics.operation,
        table: metrics.table,
        rowCount: metrics.rowCount,
        success: metrics.success,
        errorType: metrics.errorType || 'none',
        timestamp: metrics.timestamp.toISOString()
      });

      // Record query count
      newRelicMetrics.recordMetric('database.query.count', 1, {
        operation: metrics.operation,
        table: metrics.table,
        success: metrics.success
      });

      // Check for slow queries
      if (metrics.duration > this.config.slowQueryThreshold) {
        newRelicMetrics.recordMetric('database.query.slow', 1, {
          operation: metrics.operation,
          table: metrics.table,
          duration: metrics.duration,
          threshold: this.config.slowQueryThreshold
        });
      }

      return AppResult.Ok(undefined);
    } catch (error) {
      return AppResult.Err(AppError.Generic(`Failed to track database performance: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Track file operation performance
   */
  trackFileOperation(metrics: FileOperationMetrics): AppResult<void> {
    if (!this.isEnabled() || !this.config.trackFileOperations || !this.shouldSample()) {
      return AppResult.Ok(undefined);
    }

    try {
      // Record to New Relic
      newRelicMetrics.recordMetric('file.operation.duration', metrics.duration, {
        operation: metrics.operation,
        fileSize: metrics.fileSize,
        fileType: metrics.fileType,
        success: metrics.success,
        errorType: metrics.errorType || 'none',
        processingSteps: metrics.processingSteps?.join(','),
        timestamp: metrics.timestamp.toISOString()
      });

      // Record file operation count
      newRelicMetrics.recordMetric('file.operation.count', 1, {
        operation: metrics.operation,
        fileType: metrics.fileType,
        success: metrics.success
      });

      // Record file size metrics
      newRelicMetrics.recordMetric('file.operation.size', metrics.fileSize, {
        operation: metrics.operation,
        fileType: metrics.fileType
      });

      return AppResult.Ok(undefined);
    } catch (error) {
      return AppResult.Err(AppError.Generic(`Failed to track file operation performance: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Create a performance timer for measuring operation duration
   */
  createTimer(): PerformanceTimer {
    return new PerformanceTimer(this);
  }

  /**
   * Get current configuration
   */
  getConfig(): PerformanceMonitorConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<PerformanceMonitorConfig>): void {
    this.config = { ...this.config, ...updates };
    this.initializeThresholds();
  }
}

/**
 * Performance timer utility for measuring operation duration
 */
export class PerformanceTimer {
  private startTime: number;
  private monitor: PerformanceMonitor;

  constructor(monitor: PerformanceMonitor) {
    this.startTime = Date.now();
    this.monitor = monitor;
  }

  /**
   * End timing and track storage operation
   */
  endStorageOperation(metrics: Omit<StoragePerformanceMetrics, 'duration' | 'timestamp'>): AppResult<void> {
    const duration = Date.now() - this.startTime;
    return this.monitor.trackStorageOperation({
      ...metrics,
      duration,
      timestamp: new Date()
    });
  }

  /**
   * End timing and track API response
   */
  endApiResponse(metrics: Omit<ApiPerformanceMetrics, 'duration' | 'timestamp'>): AppResult<void> {
    const duration = Date.now() - this.startTime;
    return this.monitor.trackApiResponse({
      ...metrics,
      duration,
      timestamp: new Date()
    });
  }

  /**
   * End timing and track database query
   */
  endDatabaseQuery(metrics: Omit<DatabasePerformanceMetrics, 'duration' | 'timestamp'>): AppResult<void> {
    const duration = Date.now() - this.startTime;
    return this.monitor.trackDatabaseQuery({
      ...metrics,
      duration,
      timestamp: new Date()
    });
  }

  /**
   * End timing and track file operation
   */
  endFileOperation(metrics: Omit<FileOperationMetrics, 'duration' | 'timestamp'>): AppResult<void> {
    const duration = Date.now() - this.startTime;
    return this.monitor.trackFileOperation({
      ...metrics,
      duration,
      timestamp: new Date()
    });
  }

  /**
   * Get elapsed time without ending the timer
   */
  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();
