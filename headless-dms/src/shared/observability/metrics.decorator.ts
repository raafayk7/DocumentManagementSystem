import { MetricsService, StorageMetrics, PerformanceMetrics, ErrorMetrics, UserActivityMetrics } from './metrics.service.js';

export interface MetricsOptions {
  trackPerformance?: boolean;
  trackErrors?: boolean;
  trackUserActivity?: boolean;
  storageStrategy?: string;
  operationName?: string;
  resourceType?: string;
}

// Interface for classes that can use the metrics decorator
export interface MetricsContext {
  extractFileSize?: (args: any[]) => number;
  extractUserContext?: (args: any[]) => { userId: string; userRole: string } | null;
  sanitizeArgs?: (args: any[]) => any[];
}

export function TrackMetrics(options: MetricsOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (this: MetricsContext, ...args: any[]) {
      const metricsService = MetricsService.getInstance();
      const startTime = Date.now();
      const operationName = options.operationName || propertyName;
      const storageStrategy = options.storageStrategy || 'unknown';
      const resourceType = options.resourceType || 'unknown';
      
      try {
        // Execute the original method
        const result = await method.apply(this, args);
        
        // Track performance metrics
        if (options.trackPerformance) {
          const duration = Date.now() - startTime;
          const fileSize = this.extractFileSize?.(args) || 0;
          
          metricsService.trackPerformance({
            operation: operationName,
            storageStrategy,
            duration,
            fileSize,
            success: true,
            timestamp: new Date()
          });
        }
        
        // Track storage operation metrics
        if (options.trackPerformance) {
          const duration = Date.now() - startTime;
          const fileSize = this.extractFileSize?.(args) || 0;
          
          metricsService.trackStorageOperation({
            strategy: storageStrategy,
            operation: operationName,
            duration,
            success: true,
            fileSize,
            timestamp: new Date()
          });
        }
        
        // Track user activity if user context is available
        if (options.trackUserActivity && this.extractUserContext) {
          const userContext = this.extractUserContext(args);
          if (userContext) {
            metricsService.trackUserActivity({
              userId: userContext.userId,
              action: operationName,
              resource: resourceType,
              timestamp: new Date(),
              userRole: userContext.userRole,
              success: true
            });
          }
        }
        
        return result;
        
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Track error metrics
        if (options.trackErrors) {
          metricsService.trackError({
            storageStrategy,
            errorType,
            errorMessage,
            timestamp: new Date(),
            context: {
              operation: operationName,
              args: this.sanitizeArgs?.(args) || [],
              errorStack: error instanceof Error ? error.stack : undefined
            }
          });
        }
        
        // Track failed storage operation
        if (options.trackPerformance) {
          const fileSize = this.extractFileSize?.(args) || 0;
          
          metricsService.trackStorageOperation({
            strategy: storageStrategy,
            operation: operationName,
            duration,
            success: false,
            errorType,
            fileSize,
            timestamp: new Date()
          });
        }
        
        // Track failed performance metrics
        if (options.trackPerformance) {
          const fileSize = this.extractFileSize?.(args) || 0;
          
          metricsService.trackPerformance({
            operation: operationName,
            storageStrategy,
            duration,
            fileSize,
            success: false,
            timestamp: new Date()
          });
        }
        
        // Track failed user activity
        if (options.trackUserActivity && this.extractUserContext) {
          const userContext = this.extractUserContext(args);
          if (userContext) {
            metricsService.trackUserActivity({
              userId: userContext.userId,
              action: operationName,
              resource: resourceType,
              timestamp: new Date(),
              userRole: userContext.userRole,
              success: false
            });
          }
        }
        
        throw error;
      }
    };
    
    return descriptor;
  };
}

// Specialized decorators for common use cases
export function TrackStorageMetrics(strategy: string, operationName?: string) {
  return TrackMetrics({
    trackPerformance: true,
    trackErrors: true,
    storageStrategy: strategy,
    operationName
  });
}

export function TrackUserActivity(resourceType: string) {
  return TrackMetrics({
    trackUserActivity: true,
    resourceType
  });
}

export function TrackPerformance(operationName?: string) {
  return TrackMetrics({
    trackPerformance: true,
    operationName
  });
}

// Helper decorator for methods that need all metrics
export function TrackAllMetrics(strategy: string, resourceType: string, operationName?: string) {
  return TrackMetrics({
    trackPerformance: true,
    trackErrors: true,
    trackUserActivity: true,
    storageStrategy: strategy,
    resourceType,
    operationName
  });
}
