# New Relic Emulator Guide

This guide covers how to use New Relic features locally for development and testing without sending data to the actual New Relic service.

## Quick Start

For local development without sending data to New Relic:

```bash
# Set in your .env file
NEW_RELIC_ENABLED=false
NEW_RELIC_APP_NAME=local-dms
NEW_RELIC_LICENSE_KEY=local-dev-key
```

## Local Development Setup

### Environment Configuration

The system automatically detects when to use emulation mode based on these conditions:

```bash
# Disable New Relic completely
NEW_RELIC_ENABLED=false

# Use local app name
NEW_RELIC_APP_NAME=local-dms

# Use dummy license key
NEW_RELIC_LICENSE_KEY=local-dev-key

# Disable specific features
NEW_RELIC_DISTRIBUTED_TRACING_ENABLED=false
NEW_RELIC_LOG_ENRICHMENT_ENABLED=false
NEW_RELIC_ATTRIBUTES_INCLUDE=*
```

### Mock Configuration

When New Relic is disabled, the system provides:

- **Mock Metrics**: Local metric collection without external transmission
- **Mock Tracing**: Distributed tracing simulation
- **Mock Health Checks**: Local health monitoring
- **Mock Middleware**: Performance tracking without external dependencies

## Testing Observability Features

### Even with Emulation, You Can:

#### 1. Test Metric Collection
```typescript
import { newRelicMetrics } from '@shared/observability';

// This will work locally without sending to New Relic
await newRelicMetrics.trackStorageMetrics({
  strategy: 'local',
  operation: 'upload',
  duration: 100,
  success: true,
  fileSize: 1024
});
```

#### 2. Verify Performance Monitoring
```typescript
import { performanceMonitor } from '@shared/observability';

// Performance monitoring works locally
const timer = performanceMonitor.createTimer();
// ... perform operation ...
timer.endStorageOperation({
  operation: 'download',
  strategy: 's3',
  success: true,
  fileSize: 2048
});
```

#### 3. Check Health Endpoints
```bash
# Health check endpoint works locally
curl http://localhost:3000/health/newrelic

# Performance monitoring endpoints
curl http://localhost:3000/performance/health
curl http://localhost:3000/performance/status
```

#### 4. Validate Configuration
```typescript
import { newRelicConfig } from '@shared/observability';

// Check if New Relic is enabled
const isEnabled = newRelicConfig.isEnabled(); // false in local mode

// Get configuration status
const status = newRelicConfig.getInitializationStatus();
```

## Emulation Modes

### 1. Complete Disabled Mode
```bash
NEW_RELIC_ENABLED=false
```
- No external network calls
- All metrics stored locally in memory
- Health checks return "disabled" status
- Performance monitoring works independently

### 2. Mock Mode
```bash
NEW_RELIC_ENABLED=true
NEW_RELIC_LICENSE_KEY=invalid-key
```
- Attempts to connect but fails gracefully
- Falls back to local metric storage
- Health checks return "degraded" status
- Useful for testing error handling

### 3. Development Mode
```bash
NEW_RELIC_ENABLED=true
NEW_RELIC_LICENSE_KEY=valid-dev-key
NEW_RELIC_APP_NAME=dms-dev
```
- Connects to New Relic development environment
- Sends real metrics for development tracking
- Health checks return "healthy" status
- Use for integration testing

## Local Testing Scenarios

### Testing Metric Collection
```typescript
import { newRelicMetrics } from '@shared/observability';

describe('Metrics Collection', () => {
  it('should collect storage metrics locally', async () => {
    const result = await newRelicMetrics.trackStorageMetrics({
      strategy: 'local',
      operation: 'upload',
      duration: 100,
      success: true,
      fileSize: 1024
    });
    
    expect(result.isOk()).to.be.true;
  });
});
```

### Testing Performance Monitoring
```typescript
import { performanceMonitor } from '@shared/observability';

describe('Performance Monitoring', () => {
  it('should track operations locally', () => {
    const monitor = performanceMonitor.getInstance();
    const timer = monitor.createTimer();
    
    const result = timer.endStorageOperation({
      operation: 'download',
      strategy: 's3',
      success: true,
      fileSize: 2048
    });
    
    expect(result.isOk()).to.be.true;
  });
});
```

### Testing Health Checks
```typescript
import { newRelicHealthCheck } from '@shared/observability';

describe('Health Checks', () => {
  it('should return disabled status in local mode', async () => {
    const health = await newRelicHealthCheck.checkHealth();
    
    expect(health.status).to.equal('disabled');
    expect(health.enabled).to.be.false;
  });
});
```

## Configuration Validation

### Environment Variable Testing
```bash
# Test with invalid configuration
NEW_RELIC_ENABLED=true
NEW_RELIC_LICENSE_KEY=
NEW_RELIC_APP_NAME=

# Test with partial configuration
NEW_RELIC_ENABLED=true
NEW_RELIC_LICENSE_KEY=valid-key
NEW_RELIC_APP_NAME=

# Test with complete configuration
NEW_RELIC_ENABLED=true
NEW_RELIC_LICENSE_KEY=valid-key
NEW_RELIC_APP_NAME=dms-prod
```

### Configuration Loading
```typescript
import { newRelicConfig } from '@shared/observability';

// Test configuration loading
const config = newRelicConfig.getConfig();
console.log('New Relic enabled:', config.enabled);
console.log('App name:', config.appName);
console.log('License key valid:', config.licenseKey ? 'yes' : 'no');
```

## Troubleshooting Local Mode

### Common Issues

#### 1. Metrics Not Being Collected
**Problem**: Metrics appear to be lost in local mode
**Solution**: Check that the metric collection methods are being called and returning `AppResult.Ok`

#### 2. Health Checks Failing
**Problem**: Health endpoints return errors
**Solution**: Ensure all required environment variables are set, even for local mode

#### 3. Performance Monitoring Not Working
**Problem**: Performance timers not functioning
**Solution**: Verify that `PerformanceMonitor` is properly initialized and `createTimer()` is being called

### Debug Mode

Enable debug logging for local development:

```bash
# Add to .env
DEBUG=newrelic:*
LOG_LEVEL=debug
```

### Verification Commands

```bash
# Check if New Relic is enabled
curl http://localhost:3000/health/newrelic

# Check performance monitoring status
curl http://localhost:3000/performance/status

# Check metrics endpoint
curl http://localhost:3000/metrics/health
```

## Integration with CI/CD

### Test Environment
```bash
# In your CI pipeline
NEW_RELIC_ENABLED=false
NEW_RELIC_APP_NAME=ci-test
NEW_RELIC_LICENSE_KEY=ci-key
```

### Staging Environment
```bash
# In staging
NEW_RELIC_ENABLED=true
NEW_RELIC_APP_NAME=dms-staging
NEW_RELIC_LICENSE_KEY=${STAGING_NR_KEY}
```

### Production Environment
```bash
# In production
NEW_RELIC_ENABLED=true
NEW_RELIC_APP_NAME=dms-production
NEW_RELIC_LICENSE_KEY=${PROD_NR_KEY}
```

## Best Practices

### Local Development
1. **Always use emulation** for local development
2. **Test all observability features** even in local mode
3. **Validate configuration loading** with different environment setups
4. **Use debug logging** when troubleshooting

### Testing
1. **Test metric collection** without external dependencies
2. **Verify performance monitoring** works independently
3. **Check health endpoints** return appropriate statuses
4. **Test error handling** with invalid configurations

### Production Preparation
1. **Gradually enable features** in staging
2. **Monitor metric transmission** before going live
3. **Validate license keys** and configuration
4. **Test health checks** in production environment

## Next Steps

- [Emulator Usage Guide](./EMULATOR_USAGE.md) - Local service emulators
- [Performance Monitoring](../shared/observability/PERFORMANCE_USAGE.md) - Performance tracking
- [Custom Metrics](../shared/observability/METRICS_USAGE.md) - Business metrics
- [Health Checks](../shared/observability/NewRelicHealthCheck.ts) - System health monitoring
