import { AppResult, AppError } from '@carbonteq/hexapp';
import { newRelicConfig } from './NewRelicConfig.js';
import { newRelicMetrics } from './NewRelicMetrics.js';
import { newRelicTracer } from './NewRelicTracer.js';

/**
 * New Relic integration service
 * Provides easy integration with existing hexagonal architecture
 */
export class NewRelicIntegration {
  private static instance: NewRelicIntegration;
  private isInitialized = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): NewRelicIntegration {
    if (!NewRelicIntegration.instance) {
      NewRelicIntegration.instance = new NewRelicIntegration();
    }
    return NewRelicIntegration.instance;
  }

  /**
   * Initialize New Relic integration
   */
  async initialize(): Promise<AppResult<void>> {
    try {
      if (this.isInitialized) {
        return AppResult.Ok(undefined);
      }

      // Validate configuration
      const configValidation = newRelicConfig.validateConfig();
      if (configValidation.isErr()) {
        return AppResult.Err(configValidation.unwrapErr());
      }

      // Load configuration
      const config = newRelicConfig.loadConfig();
      if (config.isErr()) {
        return AppResult.Err(config.unwrapErr());
      }

      // Log configuration summary
      const configSummary = newRelicConfig.getConfigSummary();
      if (configSummary.isOk()) {
        console.log(`[New Relic] ${configSummary.unwrap()}`);
      }

      // Initialize New Relic agent
      if (newRelicConfig.isEnabled()) {
        try {
          // Require New Relic at the top level
          require('newrelic');
          console.log('[New Relic] Agent initialized successfully');
        } catch (error) {
          console.warn('[New Relic] Failed to initialize agent:', error);
          // Continue without agent - metrics and tracing will still work
        }
      }

      this.isInitialized = true;
      return AppResult.Ok(undefined);
    } catch (error) {
      return AppResult.Err(AppError.Generic(`Failed to initialize New Relic integration: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Check if integration is initialized
   */
  getInitializationStatus(): boolean {
    return this.isInitialized;
  }

  /**
   * Create HTTP middleware for request tracking
   */
  createRequestMiddleware() {
    return (request: any, reply: any, next: any) => {
      if (!newRelicConfig.isEnabled()) {
        return next();
      }

      try {
        // Start transaction for this request
        const transactionId = newRelicTracer.startTransaction(
          `${request.method} ${request.url}`,
          {
            method: request.method,
            url: request.url,
            userAgent: request.headers['user-agent'],
            ip: request.ip,
            timestamp: new Date().toISOString(),
          }
        );

        if (transactionId.isOk()) {
          // Store transaction ID in request for later use
          (request as any).newRelicTransactionId = transactionId.unwrap();
        }

        // Record request metric
        newRelicMetrics.recordMetric('http.request.count', 1, {
          method: request.method,
          url: request.url,
          status: 'started',
        });

        // Add response hook to end transaction
        reply.addHook('onResponse', (request: any, reply: any) => {
          try {
            const transactionId = (request as any).newRelicTransactionId;
            if (transactionId && transactionId !== 'disabled') {
              const success = reply.statusCode < 400;
              newRelicTracer.endTransaction(transactionId, success);

              // Record response metric
              newRelicMetrics.recordMetric('http.response.count', 1, {
                method: request.method,
                url: request.url,
                statusCode: reply.statusCode,
                success,
                duration: Date.now() - request.startTime,
              });
            }
          } catch (error) {
            console.warn('[New Relic] Failed to end transaction:', error);
          }
        });

        // Add request start time
        (request as any).startTime = Date.now();

        next();
      } catch (error) {
        console.warn('[New Relic] Failed to create request middleware:', error);
        next();
      }
    };
  }

  /**
   * Create error handling middleware
   */
  createErrorMiddleware() {
    return (error: any, request: any, reply: any) => {
      if (!newRelicConfig.isEnabled()) {
        return;
      }

      try {
        // Record error metric
        newRelicMetrics.recordError(error, {
          method: request.method,
          url: request.url,
          statusCode: reply.statusCode,
          userAgent: request.headers['user-agent'],
          ip: request.ip,
        });

        // End transaction if exists
        const transactionId = (request as any).newRelicTransactionId;
        if (transactionId && transactionId !== 'disabled') {
          newRelicTracer.endTransaction(transactionId, false, error);
        }
      } catch (err) {
        console.warn('[New Relic] Failed to handle error:', err);
      }
    };
  }

  /**
   * Create performance monitoring wrapper for functions
   */
  createPerformanceWrapper<T extends (...args: any[]) => any>(
    operationName: string,
    fn: T,
    metadata?: Record<string, unknown>
  ): T {
    return ((...args: Parameters<T>): ReturnType<T> => {
      if (!newRelicConfig.isEnabled()) {
        return fn(...args);
      }

      const startTime = Date.now();
      let success = true;
      let error: Error | undefined;

      try {
        const result = fn(...args);
        
        // Handle async functions
        if (result instanceof Promise) {
          return result
            .then((value) => {
              const duration = Date.now() - startTime;
              newRelicMetrics.recordPerformanceMetrics({
                operationName,
                duration,
                success: true,
                metadata: {
                  'start.time': startTime,
                  'end.time': startTime + duration,
                  ...metadata,
                },
              });
              return value;
            })
            .catch((err) => {
              success = false;
              error = err instanceof Error ? err : new Error(String(err));
              const duration = Date.now() - startTime;
              
              newRelicMetrics.recordPerformanceMetrics({
                operationName,
                duration,
                success: false,
                metadata: {
                  'start.time': startTime,
                  'end.time': startTime + duration,
                  ...metadata,
                },
              });

              if (error) {
                newRelicMetrics.recordError(error, {
                  'operation.name': operationName,
                  'duration': duration,
                  ...metadata,
                });
              }

              throw err;
            }) as ReturnType<T>;
        }

        // Handle sync functions
        const duration = Date.now() - startTime;
        newRelicMetrics.recordPerformanceMetrics({
          operationName,
          duration,
          success: true,
          metadata: {
            'start.time': startTime,
            'end.time': startTime + duration,
            ...metadata,
          },
        });

        return result;
      } catch (err) {
        success = false;
        error = err instanceof Error ? err : new Error(String(err));
        const duration = Date.now() - startTime;

        newRelicMetrics.recordPerformanceMetrics({
          operationName,
          duration,
          success: false,
          metadata: {
            'start.time': startTime,
            'end.time': startTime + duration,
            ...metadata,
          },
        });

        if (error) {
          newRelicMetrics.recordError(error, {
            'operation.name': operationName,
            'duration': duration,
            ...metadata,
          });
        }

        throw err;
      }
    }) as T;
  }

  /**
   * Create storage operation wrapper
   */
  createStorageWrapper<T extends (...args: any[]) => any>(
    backendType: 'local' | 's3' | 'azure',
    operationType: 'upload' | 'download' | 'delete' | 'exists' | 'list',
    fn: T,
    metadata?: Record<string, unknown>
  ): T {
    return ((...args: Parameters<T>): ReturnType<T> => {
      if (!newRelicConfig.isEnabled()) {
        return fn(...args);
      }

      const startTime = Date.now();
      let success = true;
      let error: Error | undefined;

      try {
        const result = fn(...args);
        
        // Handle async functions
        if (result instanceof Promise) {
          return result
            .then((value) => {
              const duration = Date.now() - startTime;
              newRelicMetrics.recordStorageMetrics({
                backendType,
                operationType,
                duration,
                success: true,
                ...metadata,
              });
              return value;
            })
            .catch((err) => {
              success = false;
              error = err instanceof Error ? err : new Error(String(err));
              const duration = Date.now() - startTime;
              
              newRelicMetrics.recordStorageMetrics({
                backendType,
                operationType,
                duration,
                success: false,
                errorType: error.name,
                ...metadata,
              });

              throw err;
            }) as ReturnType<T>;
        }

        // Handle sync functions
        const duration = Date.now() - startTime;
        newRelicMetrics.recordStorageMetrics({
          backendType,
          operationType,
          duration,
          success: true,
          ...metadata,
        });

        return result;
      } catch (err) {
        success = false;
        error = err instanceof Error ? err : new Error(String(err));
        const duration = Date.now() - startTime;

        newRelicMetrics.recordStorageMetrics({
          backendType,
          operationType,
          duration,
          success: false,
          errorType: error.name,
          ...metadata,
        });

        throw err;
      }
    }) as T;
  }

  /**
   * Get health status of New Relic integration
   */
  getHealthStatus(): AppResult<{
    enabled: boolean;
    initialized: boolean;
    configValid: boolean;
    metricsEnabled: boolean;
    tracingEnabled: boolean;
  }> {
    try {
      const configValid = newRelicConfig.validateConfig().isOk();
      const enabled = newRelicConfig.isEnabled();
      const metricsEnabled = enabled;
      const tracingEnabled = enabled;

      return AppResult.Ok({
        enabled,
        initialized: this.getInitializationStatus(),
        configValid,
        metricsEnabled,
        tracingEnabled,
      });
    } catch (error) {
      return AppResult.Err(AppError.Generic(`Failed to get health status: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Flush all metrics and traces
   */
  flush(): AppResult<void> {
    try {
      if (!newRelicConfig.isEnabled()) {
        return AppResult.Ok(undefined);
      }

      // Flush metrics
      newRelicMetrics.flushMetrics();

      // Clear traces
      newRelicTracer.clearAllTraces();

      console.log('[New Relic] All data flushed successfully');
      return AppResult.Ok(undefined);
    } catch (error) {
      return AppResult.Err(AppError.Generic(`Failed to flush data: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Get integration summary
   */
  getSummary(): AppResult<string> {
    try {
      const health = this.getHealthStatus();
      if (health.isErr()) {
        return AppResult.Err(health.unwrapErr());
      }

      const h = health.unwrap();
      const config = newRelicConfig.getConfig();
      const configSummary = config.isOk() ? config.unwrap().appName : 'Unknown';

      return AppResult.Ok(
        `New Relic Integration: App=${configSummary}, Enabled=${h.enabled}, Initialized=${h.initialized}, ConfigValid=${h.configValid}`
      );
    } catch (error) {
      return AppResult.Err(AppError.Generic(`Failed to get summary: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
}

/**
 * Export singleton instance
 */
export const newRelicIntegration = NewRelicIntegration.getInstance();
