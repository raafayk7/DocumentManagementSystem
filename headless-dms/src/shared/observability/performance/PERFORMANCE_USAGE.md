# Performance Monitoring System Usage Guide

## Overview

The Performance Monitoring System provides comprehensive instrumentation for tracking performance across all layers of the application:

- **Storage Operation Timing** - Upload/download performance tracking
- **API Response Times** - Request/response timing and size tracking
- **Database Query Performance** - Query execution time and slow query detection
- **File Upload/Download Metrics** - File operation performance analysis

## Quick Start

### 1. Basic Performance Monitoring

```typescript
import { performanceMonitor } from './shared/observability/index.js';

// Create a timer for any operation
const timer = performanceMonitor.createTimer();

// Perform your operation
const result = await someOperation();

// Track the operation
timer.endStorageOperation({
  operation: 'upload',
  strategy: 's3',
  success: true,
  fileSize: 1024,
  fileType: 'application/pdf'
});
```

### 2. Database Performance Monitoring

```typescript
import { databaseMonitor } from './shared/observability/index.js';

// Monitor database operations
const result = await databaseMonitor.monitorOperation(
  { operation: 'select', table: 'documents' },
  () => db.select().from(documents).execute()
);

// For operations returning Result types
const result = await databaseMonitor.monitorResultOperation(
  { operation: 'insert', table: 'documents' },
  () => documentRepository.insert(document)
);
```

### 3. File Operation Monitoring

```typescript
import { fileMonitor } from './shared/observability/index.js';

// Monitor file uploads
const result = await fileMonitor.monitorUpload(
  'application/pdf',
  file.size,
  ['validation', 'compression', 'upload'],
  () => uploadFile(file)
);

// Monitor file downloads
const result = await fileMonitor.monitorDownload(
  'application/pdf',
  file.size,
  () => downloadFile(fileId)
);
```

## Advanced Usage

### 1. Performance Decorators

Use decorators for automatic performance monitoring:

```typescript
import { MonitorDatabase, MonitorFile } from './shared/observability/index.js';

class DocumentService {
  @MonitorDatabase({ operation: 'select', table: 'documents' })
  async getDocuments(): Promise<Document[]> {
    return this.repository.findAll();
  }

  @MonitorFile({ operation: 'upload', fileType: 'application/pdf' })
  async uploadDocument(file: File): Promise<string> {
    return this.storageStrategy.upload(file);
  }
}
```

### 2. Performance Middleware

The performance middleware automatically tracks HTTP request/response performance:

```typescript
import { PerformanceMiddleware } from './shared/observability/index.js';

// Create middleware with custom options
const performanceMiddleware = PerformanceMiddleware.create({
  trackRequestSize: true,
  trackResponseSize: true,
  trackUserContext: true,
  slowRequestThreshold: 3000
});

// Register on Fastify instance
performanceMiddleware.register(fastify);
```

### 3. Custom Performance Tracking

Create custom performance tracking for specific use cases:

```typescript
import { PerformanceTimer } from './shared/observability/index.js';

class CustomService {
  async processWithMetrics(data: any): Promise<any> {
    const timer = performanceMonitor.createTimer();
    
    try {
      // Step 1: Validation
      const validationTimer = performanceMonitor.createTimer();
      const validatedData = await this.validate(data);
      validationTimer.endFileOperation({
        operation: 'process',
        fileSize: JSON.stringify(validatedData).length,
        fileType: 'json',
        success: true,
        processingSteps: ['validation']
      });

      // Step 2: Processing
      const processingTimer = performanceMonitor.createTimer();
      const processedData = await this.process(validatedData);
      processingTimer.endFileOperation({
        operation: 'process',
        fileSize: JSON.stringify(processedData).length,
        fileType: 'json',
        success: true,
        processingSteps: ['processing']
      });

      // Overall operation
      timer.endFileOperation({
        operation: 'process',
        fileSize: JSON.stringify(processedData).length,
        fileType: 'json',
        success: true,
        processingSteps: ['validation', 'processing']
      });

      return processedData;
    } catch (error) {
      timer.endFileOperation({
        operation: 'process',
        fileSize: JSON.stringify(data).length,
        fileType: 'json',
        success: false,
        errorType: error.constructor.name
      });
      throw error;
    }
  }
}
```

## Configuration

### Environment Variables

The system is configured through environment variables. See `env.performance.example` for all available options:

```bash
# Enable performance monitoring
PERFORMANCE_MONITORING_ENABLED=true

# Set sample rate (0.0 to 1.0)
PERFORMANCE_MONITORING_SAMPLE_RATE=1.0

# Configure thresholds
PERFORMANCE_MONITORING_SLOW_STORAGE_THRESHOLD=5000
PERFORMANCE_MONITORING_SLOW_API_THRESHOLD=2000
PERFORMANCE_MONITORING_SLOW_QUERY_THRESHOLD=1000

# Enable/disable specific monitoring
PERFORMANCE_MONITORING_STORAGE=true
PERFORMANCE_MONITORING_API=true
PERFORMANCE_MONITORING_DATABASE=true
PERFORMANCE_MONITORING_FILES=true
```

### Runtime Configuration

Update configuration at runtime:

```typescript
import { performanceConfiguration } from './shared/observability/index.js';

// Update thresholds
performanceConfiguration.updateConfig({
  slowStorageThreshold: 3000,
  slowApiThreshold: 1500
});

// Check current configuration
const config = performanceConfiguration.getAllConfig();
console.log('Current config:', config);
```

## Integration Patterns

### 1. Storage Strategy Integration

Integrate performance monitoring with storage strategies:

```typescript
import { performanceMonitor } from './shared/observability/index.js';

class MonitoredStorageStrategy implements IStorageStrategy {
  constructor(private strategy: IStorageStrategy) {}

  async upload(file: FileInfo, options?: UploadOptions): Promise<AppResult<string>> {
    const timer = performanceMonitor.createTimer();
    
    try {
      const result = await this.strategy.upload(file, options);
      
      timer.endStorageOperation({
        operation: 'upload',
        strategy: 's3', // or get from strategy
        success: result.isOk(),
        fileSize: file.size,
        fileType: file.mimeType
      });

      return result;
    } catch (error) {
      timer.endStorageOperation({
        operation: 'upload',
        strategy: 's3',
        success: false,
        errorType: error.constructor.name,
        fileSize: file.size,
        fileType: file.mimeType
      });
      throw error;
    }
  }
}
```

### 2. Repository Layer Integration

Add performance monitoring to repository operations:

```typescript
import { databaseMonitor } from './shared/observability/index.js';

class MonitoredDocumentRepository implements IDocumentRepository {
  async findById(id: string): Promise<AppResult<Document>> {
    return databaseMonitor.monitorResultOperation(
      { operation: 'select', table: 'documents' },
      () => this.repository.findById(id)
    );
  }

  async insert(document: Document): Promise<AppResult<Document>> {
    return databaseMonitor.monitorResultOperation(
      { operation: 'insert', table: 'documents' },
      () => this.repository.insert(document)
    );
  }
}
```

### 3. HTTP Handler Integration

Add performance monitoring to HTTP handlers:

```typescript
import { performanceMonitor } from './shared/observability/index.js';

export async function handleUploadDocument(req: IHttpRequest, res: IHttpResponse): Promise<void> {
  const timer = performanceMonitor.createTimer();
  
  try {
    const file = req.files?.document;
    if (!file) {
      res.status(400).send({ error: 'No file provided' });
      return;
    }

    const result = await uploadDocumentUseCase.execute({
      file: file,
      metadata: req.body
    });

    if (result.isErr()) {
      timer.endApiResponse({
        method: req.method,
        url: req.url,
        statusCode: 400,
        requestSize: file.size,
        responseSize: JSON.stringify({ error: result.unwrapErr().message }).length
      });

      res.status(400).send({ error: result.unwrapErr().message });
      return;
    }

    timer.endApiResponse({
      method: req.method,
      url: req.url,
      statusCode: 200,
      requestSize: file.size,
      responseSize: JSON.stringify(result.unwrap()).length
    });

    res.status(200).send(result.unwrap());
  } catch (error) {
    timer.endApiResponse({
      method: req.method,
      url: req.url,
      statusCode: 500,
      requestSize: req.files?.document?.size || 0,
      responseSize: JSON.stringify({ error: 'Internal server error' }).length
    });

    res.status(500).send({ error: 'Internal server error' });
  }
}
```

## Performance Endpoints

The system provides HTTP endpoints for monitoring and configuration:

```typescript
import { PerformanceEndpoint } from './shared/observability/index.js';

// Create endpoint
const performanceEndpoint = PerformanceEndpoint.create({
  includeNewRelicStatus: true,
  includeConfiguration: true,
  includeHealthChecks: true
});

// Register routes
performanceEndpoint.registerRoutes(fastify);
```

Available endpoints:

- `GET /performance/metrics` - Performance metrics summary
- `GET /performance/config` - Current configuration
- `PUT /performance/config` - Update configuration
- `GET /performance/health` - Health status
- `GET /performance/status` - System status

## Monitoring and Alerting

### 1. Slow Operation Detection

The system automatically detects slow operations based on configurable thresholds:

```typescript
// Operations exceeding thresholds are flagged
if (duration > threshold) {
  newRelicMetrics.recordMetric('operation.slow', 1, {
    operation: 'upload',
    duration: duration,
    threshold: threshold
  });
}
```

### 2. Performance Dashboards

Use New Relic to create performance dashboards:

- **Storage Performance**: Track upload/download times by strategy
- **API Performance**: Monitor response times by endpoint
- **Database Performance**: Track query execution times
- **File Operations**: Monitor file processing performance

### 3. Alerting

Configure alerts for performance issues:

- Slow storage operations (> 5 seconds)
- Slow API responses (> 2 seconds)
- Slow database queries (> 1 second)
- High error rates
- Performance degradation trends

## Best Practices

### 1. Sampling Strategy

Use sampling for high-volume operations:

```bash
# Sample 10% of operations in production
PERFORMANCE_MONITORING_SAMPLE_RATE=0.1

# Sample 100% in development
PERFORMANCE_MONITORING_SAMPLE_RATE=1.0
```

### 2. Threshold Configuration

Set appropriate thresholds for your environment:

```bash
# Development - lower thresholds for early detection
PERFORMANCE_MONITORING_SLOW_STORAGE_THRESHOLD=2000
PERFORMANCE_MONITORING_SLOW_API_THRESHOLD=1000

# Production - higher thresholds to avoid noise
PERFORMANCE_MONITORING_SLOW_STORAGE_THRESHOLD=10000
PERFORMANCE_MONITORING_SLOW_API_THRESHOLD=5000
```

### 3. Error Handling

Always handle errors gracefully in performance monitoring:

```typescript
try {
  // Track successful operation
  timer.endStorageOperation({ ... });
} catch (error) {
  // Track failed operation
  timer.endStorageOperation({
    ...,
    success: false,
    errorType: error.constructor.name
  });
  throw error;
}
```

### 4. Performance Impact

Minimize the performance impact of monitoring:

- Use sampling for high-volume operations
- Buffer metrics for batch processing
- Avoid blocking operations in monitoring code
- Use async/await for non-blocking operations

## Troubleshooting

### Common Issues

1. **Performance monitoring not working**
   - Check `PERFORMANCE_MONITORING_ENABLED=true`
   - Verify New Relic configuration
   - Check environment variable names

2. **High memory usage**
   - Reduce sample rate
   - Increase metrics aggregation interval
   - Check for memory leaks in custom monitoring code

3. **Missing metrics**
   - Verify New Relic connection
   - Check sample rate configuration
   - Ensure monitoring is enabled for specific operations

### Debug Mode

Enable debug logging for troubleshooting:

```typescript
// Add debug logging to custom monitoring code
console.log('Performance monitoring:', {
  enabled: performanceConfiguration.isEnabled(),
  sampleRate: performanceConfiguration.getSampleRate(),
  thresholds: {
    storage: performanceConfiguration.getSlowStorageThreshold(),
    api: performanceConfiguration.getSlowApiThreshold(),
    database: performanceConfiguration.getSlowQueryThreshold()
  }
});
```

## Conclusion

The Performance Monitoring System provides comprehensive instrumentation for tracking application performance across all layers. By following the patterns and best practices outlined in this guide, you can effectively monitor and optimize your application's performance while maintaining minimal overhead.

For additional configuration options and advanced usage patterns, refer to the individual component documentation and the example environment file.
