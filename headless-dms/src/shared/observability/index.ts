// New Relic Configuration
export { 
  NewRelicConfigManager, 
  newRelicConfig,
  type NewRelicConfig 
} from './NewRelicConfig.js';

// New Relic Metrics
export { 
  NewRelicMetrics, 
  newRelicMetrics,
  type BusinessMetrics,
  type StorageMetrics as NewRelicStorageMetrics,
  type PerformanceMetrics as NewRelicPerformanceMetrics
} from './NewRelicMetrics.js';

// New Relic Tracer
export { 
  NewRelicTracer, 
  newRelicTracer,
  type TraceContext,
  type TransactionContext,
  type PerformanceContext
} from './NewRelicTracer.js';

// New Relic Integration
export { 
  NewRelicIntegration, 
  newRelicIntegration 
} from './NewRelicIntegration.js';

// New Relic Health Check
export { 
  NewRelicHealthCheck, 
  newRelicHealthCheck 
} from './NewRelicHealthCheck.js';

// New Relic Middleware
export { 
  NewRelicMiddleware 
} from './NewRelicMiddleware.js';

// New Relic Decorator
export { 
  NewRelicDecorator 
} from './NewRelicDecorator.js';

// Custom Metrics System
export { MetricsService } from './metrics.service.js';
export { MetricsMiddleware } from './metrics.middleware.js';
export { MetricsEndpoint } from './metrics.endpoint.js';
export { TrackMetrics, TrackStorageMetrics, TrackUserActivity, TrackPerformance, TrackAllMetrics } from './metrics.decorator.js';
export { MetricsConfiguration } from './metrics.config.js';

// Custom Metrics Types
export type {
  StorageMetrics,
  UserActivityMetrics,
  PerformanceMetrics,
  ErrorMetrics,
  MetricsSummary
} from './metrics.service.js';

export type {
  MetricsOptions,
  MetricsMiddlewareOptions,
  MetricsEndpointOptions
} from './metrics.middleware.js';


// Re-export main observability instance for convenience
import { newRelicConfig } from './NewRelicConfig.js';
import { newRelicMetrics } from './NewRelicMetrics.js';
import { newRelicTracer } from './NewRelicTracer.js';
import { newRelicIntegration } from './NewRelicIntegration.js';
import { newRelicHealthCheck } from './NewRelicHealthCheck.js';
import { NewRelicMiddleware } from './NewRelicMiddleware.js';
import { NewRelicDecorator } from './NewRelicDecorator.js';
import { MetricsService } from './metrics.service.js';
import { MetricsMiddleware } from './metrics.middleware.js';
import { MetricsEndpoint } from './metrics.endpoint.js';
import { MetricsConfiguration } from './metrics.config.js';


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
  }
};
