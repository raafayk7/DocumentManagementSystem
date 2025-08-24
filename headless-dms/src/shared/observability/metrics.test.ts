import { describe, it } from 'mocha';
import { expect } from 'chai';
import { MetricsService } from './metrics.service.js';
import { MetricsMiddleware } from './metrics.middleware.js';
import { MetricsEndpoint } from './metrics.endpoint.js';
import { TrackMetrics } from './metrics.decorator.js';
import { MetricsConfiguration } from './metrics.config.js';

// Simple test to verify the metrics system compiles and works
describe('Metrics System', () => {
  it('should create MetricsService instance', () => {
    const metricsService = MetricsService.getInstance();
    expect(metricsService).to.exist;
    expect(metricsService).to.be.instanceOf(MetricsService);
  });

  it('should create MetricsMiddleware instance', () => {
    const middleware = new MetricsMiddleware();
    expect(middleware).to.exist;
    expect(middleware).to.be.instanceOf(MetricsMiddleware);
  });

  it('should create MetricsEndpoint instance', () => {
    const endpoint = new MetricsEndpoint();
    expect(endpoint).to.exist;
    expect(endpoint).to.be.instanceOf(MetricsEndpoint);
  });

  it('should create MetricsConfiguration instance', () => {
    const config = MetricsConfiguration.getInstance();
    expect(config).to.exist;
    expect(config).to.be.instanceOf(MetricsConfiguration);
  });

  it('should track storage metrics', () => {
    const metricsService = MetricsService.getInstance();
    
    metricsService.trackStorageOperation({
      strategy: 'local',
      operation: 'upload',
      duration: 100,
      success: true,
      fileSize: 1024,
      timestamp: new Date()
    });

    const summary = metricsService.getMetricsSummary();
    expect(summary.storageUtilization.local).to.exist;
    expect(summary.storageUtilization.local.totalOperations).to.equal(1);
  });

  it('should track performance metrics', () => {
    const metricsService = MetricsService.getInstance();
    
    metricsService.trackPerformance({
      operation: 'download',
      storageStrategy: 's3',
      duration: 200,
      fileSize: 2048,
      success: true,
      timestamp: new Date()
    });

    const summary = metricsService.getMetricsSummary();
    expect(summary.storageUtilization.s3).to.exist;
  });

  it('should track error metrics', () => {
    const metricsService = MetricsService.getInstance();
    
    metricsService.trackError({
      storageStrategy: 'azure',
      errorType: 'NetworkError',
      errorMessage: 'Connection timeout',
      timestamp: new Date()
    });

    const summary = metricsService.getMetricsSummary();
    expect(summary.errorRates.azure).to.exist;
    expect(summary.errorRates.azure.NetworkError).to.equal(1);
  });

  it('should track user activity metrics', () => {
    const metricsService = MetricsService.getInstance();
    
    metricsService.trackUserActivity({
      userId: 'user123',
      action: 'login',
      resource: 'auth',
      timestamp: new Date(),
      userRole: 'admin',
      success: true
    });

    const summary = metricsService.getMetricsSummary();
    expect(summary.userActivity.totalUsers).to.be.greaterThan(0);
  });

  it('should use decorator correctly', () => {
    class TestService {
      @TrackMetrics({ trackPerformance: true, storageStrategy: 'test' })
      async testMethod() {
        return 'success';
      }
    }

    const service = new TestService();
    expect(service.testMethod).to.exist;
  });
});
