// New Relic Configuration
export { 
  NewRelicConfigManager, 
  newRelicConfig,
  type NewRelicConfig 
} from './new-relic/NewRelicConfig.js';

// New Relic Metrics
export { 
  NewRelicMetrics, 
  newRelicMetrics,
  type BusinessMetrics,
  type StorageMetrics as NewRelicStorageMetrics,
  type PerformanceMetrics as NewRelicPerformanceMetrics
} from './new-relic/NewRelicMetrics.js';

// New Relic Tracer
export { 
  NewRelicTracer, 
  newRelicTracer,
  type TraceContext,
  type TransactionContext,
  type PerformanceContext
} from './new-relic/NewRelicTracer.js';

// New Relic Integration
export { 
  NewRelicIntegration, 
  newRelicIntegration 
} from './new-relic/NewRelicIntegration.js';

// New Relic Health Check
export { 
  NewRelicHealthCheck, 
  newRelicHealthCheck 
} from './new-relic/NewRelicHealthCheck.js';

// New Relic Middleware
export { 
  NewRelicMiddleware 
} from './new-relic/NewRelicMiddleware.js';

// New Relic Decorator
export { 
  NewRelicDecorator 
} from './new-relic/NewRelicDecorator.js';

// Custom Metrics System
export { MetricsService } from './metrics/metrics.service.js';
export { MetricsMiddleware } from './metrics/metrics.middleware.js';
export { MetricsEndpoint } from './metrics/metrics.endpoint.js';
export { TrackMetrics, TrackStorageMetrics, TrackUserActivity, TrackPerformance, TrackAllMetrics } from './metrics/metrics.decorator.js';
export { MetricsConfiguration } from './metrics/metrics.config.js';

// Performance Monitoring System
export { PerformanceMonitor, PerformanceTimer } from './performance/performance.monitor.js';
export { PerformanceMiddleware, createPerformanceMiddleware } from './performance/performance.middleware.js';
export { DatabaseMonitor, MonitorDatabase, MonitorDatabaseResult } from './performance/database.monitor.js';
export { FileMonitor, MonitorFile, MonitorFileResult } from './performance/file.monitor.js';
export { PerformanceConfiguration } from './performance/performance.config.js';
export { PerformanceEndpoint, createPerformanceEndpoint } from './performance/performance.endpoint.js';

// Custom Metrics Types
export type {
  StorageMetrics,
  UserActivityMetrics,
  PerformanceMetrics,
  ErrorMetrics,
  MetricsSummary
} from './metrics/metrics.service.js';

// Performance Monitoring Types
export type {
  PerformanceMonitorConfig,
  StoragePerformanceMetrics,
  ApiPerformanceMetrics,
  DatabasePerformanceMetrics,
  FileOperationMetrics
} from './performance/performance.monitor.js';

export type {
  PerformanceMiddlewareOptions
} from './performance/performance.middleware.js';

export type {
  DatabaseQueryInfo
} from './performance/database.monitor.js';

export type {
  FileOperationInfo
} from './performance/file.monitor.js';

export type {
  PerformanceConfig
} from './performance/performance.config.js';

export type {
  PerformanceEndpointOptions
} from './performance/performance.endpoint.js';

export type {
  MetricsOptions,
  MetricsMiddlewareOptions,
  MetricsEndpointOptions
} from './metrics/metrics.middleware.js';


// Re-export main observability instance for convenience
import { newRelicConfig } from './new-relic/NewRelicConfig.js';
import { newRelicMetrics } from './new-relic/NewRelicMetrics.js';
import { newRelicTracer } from './new-relic/NewRelicTracer.js';
import { newRelicIntegration } from './new-relic/NewRelicIntegration.js';
import { newRelicHealthCheck } from './new-relic/NewRelicHealthCheck.js';
import { NewRelicMiddleware } from './new-relic/NewRelicMiddleware.js';
import { NewRelicDecorator } from './new-relic/NewRelicDecorator.js';
import { MetricsService } from './metrics/metrics.service.js';
import { MetricsMiddleware } from './metrics/metrics.middleware.js';
import { MetricsEndpoint } from './metrics/metrics.endpoint.js';
import { MetricsConfiguration } from './metrics/metrics.config.js';
import { PerformanceMonitor } from './performance/performance.monitor.js';
import { PerformanceMiddleware } from './performance/performance.middleware.js';
import { DatabaseMonitor } from './performance/database.monitor.js';
import { FileMonitor } from './performance/file.monitor.js';
import { PerformanceConfiguration } from './performance/performance.config.js';
import { PerformanceEndpoint } from './performance/performance.endpoint.js';


export const observability = {
  config: newRelicConfig,
  metrics: newRelicMetrics,
  tracer: newRelicTracer,
  integration: newRelicIntegration,
  healthCheck: newRelicHealthCheck,
  middleware: NewRelicMiddleware,
  decorator: NewRelicDecorator,
  // Add custom metrics to observability instance
  customMetrics: {
    service: MetricsService,
    middleware: MetricsMiddleware,
    endpoint: MetricsEndpoint,
    config: MetricsConfiguration
  },
  // Add performance monitoring to observability instance
  performance: {
    monitor: PerformanceMonitor,
    middleware: PerformanceMiddleware,
    database: DatabaseMonitor,
    file: FileMonitor,
    config: PerformanceConfiguration,
    endpoint: PerformanceEndpoint
  }
};
