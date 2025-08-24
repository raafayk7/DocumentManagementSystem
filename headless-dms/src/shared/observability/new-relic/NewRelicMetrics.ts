import { AppResult, AppError } from '@carbonteq/hexapp';
import { newRelicConfig } from './NewRelicConfig.js';

/**
 * Custom business metrics for New Relic
 */
export interface BusinessMetrics {
  // Storage metrics
  storageOperationCount: number;
  storageOperationDuration: number;
  storageErrorCount: number;
  storageSuccessRate: number;
  
  // Document metrics
  documentUploadCount: number;
  documentDownloadCount: number;
  documentDeleteCount: number;
  documentOperationDuration: number;
  
  // User activity metrics
  userLoginCount: number;
  userOperationCount: number;
  activeUserCount: number;
  
  // API performance metrics
  apiRequestCount: number;
  apiResponseTime: number;
  apiErrorRate: number;
  
  // Circuit breaker metrics
  circuitBreakerOpenCount: number;
  circuitBreakerHalfOpenCount: number;
  circuitBreakerClosedCount: number;
}

/**
 * Storage-specific metrics
 */
export interface StorageMetrics {
  backendType: 'local' | 's3' | 'azure';
  operationType: 'upload' | 'download' | 'delete' | 'exists' | 'list';
  duration: number;
  success: boolean;
  errorType?: string;
  fileSize?: number;
  fileType?: string;
  retryCount?: number;
  fallbackUsed?: boolean;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  operationName: string;
  duration: number;
  success: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * New Relic metrics manager
 * Handles custom business metrics, storage performance, and error tracking
 */
export class NewRelicMetrics {
  private static instance: NewRelicMetrics;
  private metricsBuffer: Map<string, number> = new Map();
  private customAttributes: Map<string, unknown> = new Map();

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): NewRelicMetrics {
    if (!NewRelicMetrics.instance) {
      NewRelicMetrics.instance = new NewRelicMetrics();
    }
    return NewRelicMetrics.instance;
  }

  /**
   * Check if New Relic is enabled
   */
  private isEnabled(): boolean {
    return newRelicConfig.isEnabled();
  }

  /**
   * Record a custom metric
   */
  recordMetric(metricName: string, value: number, attributes?: Record<string, unknown>): AppResult<void> {
    if (!this.isEnabled()) {
      return AppResult.Ok(undefined);
    }

    try {
      // Buffer metric for batch processing
      const key = this.buildMetricKey(metricName, attributes);
      this.metricsBuffer.set(key, value);

      // Add custom attributes
      if (attributes) {
        Object.entries(attributes).forEach(([key, value]) => {
          this.customAttributes.set(key, value);
        });
      }

      // In a real implementation, this would send to New Relic
      // For now, we'll log the metric
      console.log(`[New Relic] Metric: ${metricName} = ${value}`, attributes);

      return AppResult.Ok(undefined);
    } catch (error) {
      return AppResult.Err(AppError.Generic(`Failed to record metric ${metricName}: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Record storage operation metrics
   */
  recordStorageMetrics(metrics: StorageMetrics): AppResult<void> {
    if (!this.isEnabled()) {
      return AppResult.Ok(undefined);
    }

    try {
      const attributes = {
        'backend.type': metrics.backendType,
        'operation.type': metrics.operationType,
        'success': metrics.success,
        'error.type': metrics.errorType,
        'file.size': metrics.fileSize,
        'file.type': metrics.fileType,
        'retry.count': metrics.retryCount,
        'fallback.used': metrics.fallbackUsed,
      };

      // Record operation duration
      this.recordMetric('storage.operation.duration', metrics.duration, attributes);
      
      // Record operation count
      this.recordMetric('storage.operation.count', 1, attributes);
      
      // Record success/failure
      if (metrics.success) {
        this.recordMetric('storage.operation.success', 1, attributes);
      } else {
        this.recordMetric('storage.operation.error', 1, attributes);
      }

      // Record file size if available
      if (metrics.fileSize) {
        this.recordMetric('storage.file.size', metrics.fileSize, attributes);
      }

      return AppResult.Ok(undefined);
    } catch (error) {
      return AppResult.Err(AppError.Generic(`Failed to record storage metrics: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Record performance metrics
   */
  recordPerformanceMetrics(metrics: PerformanceMetrics): AppResult<void> {
    if (!this.isEnabled()) {
      return AppResult.Ok(undefined);
    }

    try {
      const attributes = {
        'operation.name': metrics.operationName,
        'success': metrics.success,
        ...metrics.metadata,
      };

      // Record operation duration
      this.recordMetric('performance.operation.duration', metrics.duration, attributes);
      
      // Record operation count
      this.recordMetric('performance.operation.count', 1, attributes);
      
      // Record success/failure
      if (metrics.success) {
        this.recordMetric('performance.operation.success', 1, attributes);
      } else {
        this.recordMetric('performance.operation.error', 1, attributes);
      }

      return AppResult.Ok(undefined);
    } catch (error) {
      return AppResult.Err(AppError.Generic(`Failed to record performance metrics: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Record business metrics
   */
  recordBusinessMetrics(metrics: Partial<BusinessMetrics>): AppResult<void> {
    if (!this.isEnabled()) {
      return AppResult.Ok(undefined);
    }

    try {
      Object.entries(metrics).forEach(([key, value]) => {
        if (typeof value === 'number') {
          this.recordMetric(`business.${key}`, value);
        }
      });

      return AppResult.Ok(undefined);
    } catch (error) {
      return AppResult.Err(AppError.Generic(`Failed to record business metrics: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Record error metrics
   */
  recordError(error: Error, context?: Record<string, unknown>): AppResult<void> {
    if (!this.isEnabled()) {
      return AppResult.Ok(undefined);
    }

    try {
      const attributes = {
        'error.name': error.name,
        'error.message': error.message,
        'error.stack': error.stack,
        ...context,
      };

      // Record error count
      this.recordMetric('error.count', 1, attributes);
      
      // Record error by type
      this.recordMetric(`error.${error.name.toLowerCase()}.count`, 1, attributes);

      return AppResult.Ok(undefined);
    } catch (err) {
      return AppResult.Err(AppError.Generic(`Failed to record error metrics: ${err instanceof Error ? err.message : 'Unknown error'}`));
    }
  }

  /**
   * Record circuit breaker state change
   */
  recordCircuitBreakerState(state: 'open' | 'half-open' | 'closed', backendType: string): AppResult<void> {
    if (!this.isEnabled()) {
      return AppResult.Ok(undefined);
    }

    try {
      const attributes = {
        'circuit.breaker.state': state,
        'backend.type': backendType,
      };

      // Record state change
      this.recordMetric('circuit.breaker.state.change', 1, attributes);
      
      // Record current state
      this.recordMetric(`circuit.breaker.${state}.count`, 1, attributes);

      return AppResult.Ok(undefined);
    } catch (error) {
      return AppResult.Err(AppError.Generic(`Failed to record circuit breaker metrics: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Record retry metrics
   */
  recordRetryMetrics(operationType: string, retryCount: number, success: boolean, backendType: string): AppResult<void> {
    if (!this.isEnabled()) {
      return AppResult.Ok(undefined);
    }

    try {
      const attributes = {
        'operation.type': operationType,
        'retry.count': retryCount,
        'success': success,
        'backend.type': backendType,
      };

      // Record retry count
      this.recordMetric('retry.count', retryCount, attributes);
      
      // Record retry success/failure
      if (success) {
        this.recordMetric('retry.success', 1, attributes);
      } else {
        this.recordMetric('retry.failure', 1, attributes);
      }

      return AppResult.Ok(undefined);
    } catch (error) {
      return AppResult.Err(AppError.Generic(`Failed to record retry metrics: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(): AppResult<Record<string, number>> {
    try {
      const summary: Record<string, number> = {};
      
      this.metricsBuffer.forEach((value, key) => {
        summary[key] = value;
      });

      return AppResult.Ok(summary);
    } catch (error) {
      return AppResult.Err(AppError.Generic(`Failed to get metrics summary: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Clear metrics buffer
   */
  clearMetricsBuffer(): AppResult<void> {
    try {
      this.metricsBuffer.clear();
      this.customAttributes.clear();
      return AppResult.Ok(undefined);
    } catch (error) {
      return AppResult.Err(AppError.Generic(`Failed to clear metrics buffer: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Build metric key from name and attributes
   */
  private buildMetricKey(metricName: string, attributes?: Record<string, unknown>): string {
    if (!attributes) {
      return metricName;
    }

    const sortedAttributes = Object.entries(attributes)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join(',');

    return `${metricName}[${sortedAttributes}]`;
  }

  /**
   * Flush metrics to New Relic (placeholder for real implementation)
   */
  flushMetrics(): AppResult<void> {
    if (!this.isEnabled()) {
      return AppResult.Ok(undefined);
    }

    try {
      // In a real implementation, this would send buffered metrics to New Relic
      const summary = this.getMetricsSummary();
      if (summary.isOk()) {
        console.log('[New Relic] Flushing metrics:', summary.unwrap());
        this.clearMetricsBuffer();
      }

      return AppResult.Ok(undefined);
    } catch (error) {
      return AppResult.Err(AppError.Generic(`Failed to flush metrics: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
}

/**
 * Export singleton instance
 */
export const newRelicMetrics = NewRelicMetrics.getInstance();
