# Custom Metrics System - Usage Guide

## Overview

The Custom Metrics System provides comprehensive business metrics tracking for your Document Management System, including:

1. **Storage Backend Utilization** - Track which storage strategies are being used and their performance
2. **Document Operation Performance** - Monitor upload/download performance across storage types  
3. **Error Rates by Storage Type** - Track errors per storage strategy for alerting
4. **User Activity Patterns** - Monitor user behavior and system usage patterns

## Quick Start

### 1. Basic Usage

```typescript
import { MetricsService } from './shared/observability/metrics.service.js';

// Get the metrics service instance
const metricsService = MetricsService.getInstance();

// Track a storage operation
metricsService.trackStorageOperation({
  strategy: 's3',
  operation: 'upload',
  duration: 150,
  success: true,
  fileSize: 1024 * 1024, // 1MB
  timestamp: new Date()
});

// Track performance metrics
metricsService.trackPerformance({
  operation: 'download',
  storageStrategy: 'local',
  duration: 50,
  fileSize: 512 * 1024, // 512KB
  success: true,
  timestamp: new Date()
});

// Track errors
metricsService.trackError({
  storageStrategy: 'azure',
  errorType: 'NetworkError',
  errorMessage: 'Connection timeout',
  timestamp: new Date()
});

// Track user activity
metricsService.trackUserActivity({
  userId: 'user123',
  action: 'document_upload',
  resource: 'document',
  timestamp: new Date(),
  userRole: 'admin',
  success: true
});
```

### 2. Using Decorators

```typescript
import { TrackStorageMetrics, TrackUserActivity } from './shared/observability/metrics.decorator.js';

class DocumentService {
  @TrackStorageMetrics('s3', 'upload_document')
  async uploadDocument(file: Buffer, userId: string): Promise<string> {
    // Your upload logic here
    // Metrics are automatically tracked
    return 'document_id';
  }

  @TrackUserActivity('document')
  async deleteDocument(documentId: string, userId: string): Promise<void> {
    // Your delete logic here
    // User activity is automatically tracked
  }
}
```

### 3. HTTP Middleware Integration

```typescript
import { MetricsMiddleware } from './shared/observability/metrics.middleware.js';
import { FastifyInstance } from 'fastify';

export function setupMetricsMiddleware(app: FastifyInstance) {
  const metricsMiddleware = MetricsMiddleware.create({
    trackRequestMetrics: true,
    trackUserActivity: true,
    trackPerformance: true,
    excludePaths: ['/health', '/ping']
  });

  // Add pre-handler hook
  app.addHook('preHandler', metricsMiddleware.preHandler());
  
  // Add on-response hook
  app.addHook('onResponse', metricsMiddleware.onResponse());
  
  // Add on-error hook
  app.addHook('onError', metricsMiddleware.onError());
}
```

### 4. Metrics Endpoints

```typescript
import { MetricsEndpoint } from './shared/observability/metrics.endpoint.js';
import { FastifyInstance } from 'fastify';

export function setupMetricsEndpoints(app: FastifyInstance) {
  const metricsEndpoint = MetricsEndpoint.create({
    requireAuth: true,
    includeNewRelicStatus: true,
    includeSystemMetrics: true
  });

  // Metrics endpoints
  app.get('/metrics', metricsEndpoint.getMetrics.bind(metricsEndpoint));
  app.get('/metrics/summary', metricsEndpoint.getMetricsSummary.bind(metricsEndpoint));
  app.get('/metrics/health', metricsEndpoint.getHealthMetrics.bind(metricsEndpoint));
}
```

## Integration Examples

### Storage Strategy Integration

```typescript
import { MetricsService } from './shared/observability/metrics.service.js';

class S3StorageStrategy {
  private metricsService = MetricsService.getInstance();

  async upload(file: Buffer, key: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Your S3 upload logic here
      await this.s3Client.upload({ Bucket: 'my-bucket', Key: key, Body: file }).promise();
      
      // Track successful operation
      this.metricsService.trackStorageOperation({
        strategy: 's3',
        operation: 'upload',
        duration: Date.now() - startTime,
        success: true,
        fileSize: file.length,
        timestamp: new Date()
      });
      
    } catch (error) {
      // Track failed operation
      this.metricsService.trackStorageOperation({
        strategy: 's3',
        operation: 'upload',
        duration: Date.now() - startTime,
        success: false,
        errorType: error.constructor.name,
        fileSize: file.length,
        timestamp: new Date()
      });
      
      throw error;
    }
  }
}
```

### Document Service Integration

```typescript
import { TrackAllMetrics } from './shared/observability/metrics.decorator.js';

class DocumentApplicationService {
  @TrackAllMetrics('storage', 'document', 'create_document')
  async createDocument(request: CreateDocumentRequest): Promise<Document> {
    // Your document creation logic here
    // All metrics are automatically tracked
    return document;
  }

  @TrackAllMetrics('storage', 'document', 'delete_document')
  async deleteDocument(request: DeleteDocumentRequest): Promise<void> {
    // Your document deletion logic here
    // All metrics are automatically tracked
  }
}
```

## Configuration

### Environment Variables

```bash
# Enable/disable metrics system
METRICS_ENABLED=true

# Buffer and flush settings
METRICS_BUFFER_SIZE=100
METRICS_FLUSH_INTERVAL=60000

# New Relic integration
METRICS_NEW_RELIC_ENABLED=true
METRICS_NEW_RELIC_BUFFER_SIZE=50

# Endpoints
METRICS_ENDPOINT_ENABLED=true
METRICS_ENDPOINT_AUTH_REQUIRED=true

# Middleware
METRICS_MIDDLEWARE_ENABLED=true
METRICS_MIDDLEWARE_TRACK_REQUESTS=true
METRICS_MIDDLEWARE_TRACK_USER_ACTIVITY=true
METRICS_MIDDLEWARE_TRACK_PERFORMANCE=true
```

### Configuration API

```typescript
import { MetricsConfiguration } from './shared/observability/metrics.config.js';

const config = MetricsConfiguration.getInstance();

if (config.isEnabled()) {
  console.log('Metrics system is enabled');
  console.log(`Buffer size: ${config.getBufferSize()}`);
  console.log(`Flush interval: ${config.getFlushInterval()}ms`);
}

if (config.isNewRelicEnabled()) {
  console.log('New Relic integration is enabled');
}
```

## Monitoring and Alerts

### Metrics Summary

```typescript
const metricsService = MetricsService.getInstance();
const summary = metricsService.getMetricsSummary();

// Check storage utilization
Object.entries(summary.storageUtilization).forEach(([strategy, metrics]) => {
  if (metrics.successRate < 0.95) {
    console.warn(`Low success rate for ${strategy}: ${metrics.successRate * 100}%`);
  }
  
  if (metrics.averageResponseTime > 1000) {
    console.warn(`Slow response time for ${strategy}: ${metrics.averageResponseTime}ms`);
  }
});

// Check error rates
Object.entries(summary.errorRates).forEach(([strategy, errorTypes]) => {
  Object.entries(errorTypes).forEach(([errorType, count]) => {
    if (count > 10) {
      console.error(`High error count for ${strategy}.${errorType}: ${count}`);
    }
  });
});
```

### Health Checks

```typescript
const endpoint = MetricsEndpoint.create();
const healthMetrics = await endpoint.getHealthMetrics();

// Check overall system health
const criticalIssues = Object.values(healthMetrics.storage)
  .filter((storage: any) => storage.health === 'critical');

if (criticalIssues.length > 0) {
  console.error('Critical storage issues detected:', criticalIssues);
  // Send alert
}
```

## Best Practices

### 1. Performance Considerations

- Use buffering for non-critical metrics
- Send critical metrics (errors, performance) immediately
- Batch user activity metrics
- Set appropriate buffer sizes and flush intervals

### 2. Privacy and Security

- Anonymize user IDs in metrics
- Don't log sensitive data
- Use authentication for metrics endpoints
- Sanitize error messages

### 3. Monitoring Strategy

- Set up alerts for critical thresholds
- Monitor storage strategy performance
- Track error patterns and trends
- Use New Relic dashboards for visualization

### 4. Testing

```typescript
// In your tests, you can verify metrics are tracked
it('should track storage operation metrics', () => {
  const metricsService = MetricsService.getInstance();
  
  // Perform operation
  await storageStrategy.upload(file, 'test-key');
  
  // Verify metrics were tracked
  const summary = metricsService.getMetricsSummary();
  expect(summary.storageUtilization.local.totalOperations).toBeGreaterThan(0);
});
```

## Troubleshooting

### Common Issues

1. **Metrics not being sent to New Relic**
   - Check `METRICS_NEW_RELIC_ENABLED` environment variable
   - Verify New Relic configuration is valid
   - Check network connectivity

2. **High memory usage**
   - Reduce buffer sizes
   - Increase flush intervals
   - Monitor buffer growth

3. **Performance impact**
   - Use async operations for metrics
   - Buffer non-critical metrics
   - Profile metrics collection overhead

### Debug Mode

```bash
METRICS_DEV_MODE=true
METRICS_LOGGING_LEVEL=debug
```

This will provide additional logging and relaxed thresholds for development.
