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
  type StorageMetrics,
  type PerformanceMetrics
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

// Re-export main observability instance for convenience
import { newRelicConfig } from './NewRelicConfig.js';
import { newRelicMetrics } from './NewRelicMetrics.js';
import { newRelicTracer } from './NewRelicTracer.js';
import { newRelicIntegration } from './NewRelicIntegration.js';
import { newRelicHealthCheck } from './NewRelicHealthCheck.js';
import { NewRelicMiddleware } from './NewRelicMiddleware.js';
import { NewRelicDecorator } from './NewRelicDecorator.js';

export const observability = {
  config: newRelicConfig,
  metrics: newRelicMetrics,
  tracer: newRelicTracer,
  integration: newRelicIntegration,
  healthCheck: newRelicHealthCheck,
  middleware: NewRelicMiddleware,
  decorator: NewRelicDecorator,
};