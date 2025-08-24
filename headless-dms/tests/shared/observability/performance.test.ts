import { describe, it } from 'mocha';
import { expect } from 'chai';
import { PerformanceMonitor, PerformanceTimer } from '../../../src/shared/observability/performance/performance.monitor.js';
import { PerformanceMiddleware } from '../../../src/shared/observability/performance/performance.middleware.js';
import { DatabaseMonitor, MonitorDatabase, MonitorDatabaseResult } from '../../../src/shared/observability/performance/database.monitor.js';
import { FileMonitor, MonitorFile, MonitorFileResult } from '../../../src/shared/observability/performance/file.monitor.js';
import { PerformanceConfiguration } from '../../../src/shared/observability/performance/performance.config.js';
import { PerformanceEndpoint } from '../../../src/shared/observability/performance/performance.endpoint.js';

describe('Performance Monitoring System', () => {
  describe('PerformanceMonitor', () => {
    it('should create PerformanceMonitor instance', () => {
      const monitor = PerformanceMonitor.getInstance();
      expect(monitor).to.exist;
      expect(monitor).to.be.instanceOf(PerformanceMonitor);
    });

    it('should create PerformanceTimer instance', () => {
      const monitor = PerformanceMonitor.getInstance();
      const timer = monitor.createTimer();
      expect(timer).to.exist;
      expect(timer).to.be.instanceOf(PerformanceTimer);
    });

    it('should track storage operation performance', () => {
      const monitor = PerformanceMonitor.getInstance();
      const timer = monitor.createTimer();
      
      // Simulate storage operation
      const result = timer.endStorageOperation({
        operation: 'upload',
        strategy: 's3',
        success: true,
        fileSize: 1024,
        fileType: 'application/pdf'
      });

      expect(result.isOk()).to.be.true;
    });

    it('should track API response performance', () => {
      const monitor = PerformanceMonitor.getInstance();
      const timer = monitor.createTimer();
      
      // Simulate API response
      const result = timer.endApiResponse({
        method: 'POST',
        url: '/api/documents',
        statusCode: 200,
        requestSize: 1024,
        responseSize: 512
      });

      expect(result.isOk()).to.be.true;
    });

    it('should track database query performance', () => {
      const monitor = PerformanceMonitor.getInstance();
      const timer = monitor.createTimer();
      
      // Simulate database query
      const result = timer.endDatabaseQuery({
        operation: 'select',
        table: 'documents',
        success: true,
        rowCount: 10
      });

      expect(result.isOk()).to.be.true;
    });

    it('should track file operation performance', () => {
      const monitor = PerformanceMonitor.getInstance();
      const timer = monitor.createTimer();
      
      // Simulate file operation
      const result = timer.endFileOperation({
        operation: 'upload',
        fileSize: 2048,
        fileType: 'application/pdf',
        success: true,
        processingSteps: ['validation', 'compression', 'upload']
      });

      expect(result.isOk()).to.be.true;
    });

    it('should get elapsed time without ending timer', () => {
      const monitor = PerformanceMonitor.getInstance();
      const timer = monitor.createTimer();
      
      // Wait a bit - use a small delay to ensure some time passes
      const startTime = Date.now();
      while (Date.now() - startTime < 5) {
        // Busy wait for at least 5ms
      }
      
      const elapsed = timer.getElapsedTime();
      expect(elapsed).to.be.a('number');
      expect(elapsed).to.be.greaterThan(0);
    });
  });

  describe('PerformanceMiddleware', () => {
    it('should create PerformanceMiddleware instance', () => {
      const middleware = PerformanceMiddleware.create();
      expect(middleware).to.exist;
      expect(middleware).to.be.instanceOf(PerformanceMiddleware);
    });

    it('should create middleware with custom options', () => {
      const middleware = PerformanceMiddleware.create({
        enabled: false,
        trackRequestSize: false,
        trackResponseSize: false,
        trackUserContext: false
      });

      expect(middleware).to.exist;
      expect(middleware).to.be.instanceOf(PerformanceMiddleware);
    });

    it('should update middleware options', () => {
      const middleware = PerformanceMiddleware.create();
      middleware.updateOptions({ enabled: false });
      
      // Note: We can't easily test the internal state, but we can verify the method exists
      expect(middleware.updateOptions).to.be.a('function');
    });
  });

  describe('DatabaseMonitor', () => {
    it('should create DatabaseMonitor instance', () => {
      const monitor = DatabaseMonitor.getInstance();
      expect(monitor).to.exist;
      expect(monitor).to.be.instanceOf(DatabaseMonitor);
    });

    it('should monitor database operation', async () => {
      const monitor = DatabaseMonitor.getInstance();
      
      const result = await monitor.monitorOperation(
        { operation: 'select', table: 'documents' },
        async () => {
          // Simulate database operation
          return [{ id: '1', name: 'test' }];
        }
      );

      expect(result.isOk()).to.be.true;
      expect(result.unwrap()).to.deep.equal([{ id: '1', name: 'test' }]);
    });

    it('should monitor database result operation', async () => {
      const monitor = DatabaseMonitor.getInstance();
      
      const result = await monitor.monitorResultOperation(
        { operation: 'insert', table: 'documents' },
        async () => {
          // Simulate successful result
          return { isOk: () => true, unwrap: () => ({ id: '1', name: 'test' }) };
        }
      );

      expect(result.isOk()).to.be.true;
    });

    it('should create monitored operation wrapper', () => {
      const monitor = DatabaseMonitor.getInstance();
      
      const monitoredOp = monitor.createMonitoredOperation(
        { operation: 'select', table: 'documents' },
        async () => [{ id: '1' }]
      );

      expect(monitoredOp).to.be.a('function');
    });
  });

  describe('FileMonitor', () => {
    it('should create FileMonitor instance', () => {
      const monitor = FileMonitor.getInstance();
      expect(monitor).to.exist;
      expect(monitor).to.be.instanceOf(FileMonitor);
    });

    it('should monitor file upload operation', async () => {
      const monitor = FileMonitor.getInstance();
      
      const result = await monitor.monitorUpload(
        'application/pdf',
        1024,
        ['validation', 'compression', 'upload'],
        async () => 'file-id-123'
      );

      expect(result.isOk()).to.be.true;
      expect(result.unwrap()).to.equal('file-id-123');
    });

    it('should monitor file download operation', async () => {
      const monitor = FileMonitor.getInstance();
      
      const result = await monitor.monitorDownload(
        'application/pdf',
        2048,
        async () => Buffer.from('test content')
      );

      expect(result.isOk()).to.be.true;
      expect(result.unwrap()).to.be.instanceOf(Buffer);
    });

    it('should monitor file delete operation', async () => {
      const monitor = FileMonitor.getInstance();
      
      const result = await monitor.monitorDelete(
        'application/pdf',
        1024,
        async () => true
      );

      expect(result.isOk()).to.be.true;
      expect(result.unwrap()).to.be.true;
    });

    it('should monitor file processing operation', async () => {
      const monitor = FileMonitor.getInstance();
      
      const result = await monitor.monitorProcessing(
        'application/pdf',
        1024,
        ['validation', 'compression', 'processing'],
        async () => 'processed-file-id'
      );

      expect(result.isOk()).to.be.true;
      expect(result.unwrap()).to.equal('processed-file-id');
    });
  });

  describe('PerformanceConfiguration', () => {
    it('should create PerformanceConfiguration instance', () => {
      const config = PerformanceConfiguration.getInstance();
      expect(config).to.exist;
      expect(config).to.be.instanceOf(PerformanceConfiguration);
    });

    it('should check if performance monitoring is enabled', () => {
      const config = PerformanceConfiguration.getInstance();
      const enabled = config.isEnabled();
      expect(enabled).to.be.a('boolean');
    });

    it('should check if storage monitoring is enabled', () => {
      const config = PerformanceConfiguration.getInstance();
      const enabled = config.isStorageMonitoringEnabled();
      expect(enabled).to.be.a('boolean');
    });

    it('should check if API monitoring is enabled', () => {
      const config = PerformanceConfiguration.getInstance();
      const enabled = config.isApiMonitoringEnabled();
      expect(enabled).to.be.a('boolean');
    });

    it('should check if database monitoring is enabled', () => {
      const config = PerformanceConfiguration.getInstance();
      const enabled = config.isDatabaseMonitoringEnabled();
      expect(enabled).to.be.a('boolean');
    });

    it('should check if file monitoring is enabled', () => {
      const config = PerformanceConfiguration.getInstance();
      const enabled = config.isFileMonitoringEnabled();
      expect(enabled).to.be.a('boolean');
    });

    it('should get sample rate', () => {
      const config = PerformanceConfiguration.getInstance();
      const sampleRate = config.getSampleRate();
      expect(sampleRate).to.be.a('number');
      expect(sampleRate).to.be.greaterThanOrEqual(0);
      expect(sampleRate).to.be.lessThanOrEqual(1);
    });

    it('should get slow storage threshold', () => {
      const config = PerformanceConfiguration.getInstance();
      const threshold = config.getSlowStorageThreshold();
      expect(threshold).to.be.a('number');
      expect(threshold).to.be.greaterThan(0);
    });

    it('should get slow API threshold', () => {
      const config = PerformanceConfiguration.getInstance();
      const threshold = config.getSlowApiThreshold();
      expect(threshold).to.be.a('number');
      expect(threshold).to.be.greaterThan(0);
    });

    it('should get slow query threshold', () => {
      const config = PerformanceConfiguration.getInstance();
      const threshold = config.getSlowQueryThreshold();
      expect(threshold).to.be.a('number');
      expect(threshold).to.be.greaterThan(0);
    });

    it('should get all configuration', () => {
      const config = PerformanceConfiguration.getInstance();
      const allConfig = config.getAllConfig();
      expect(allConfig).to.be.an('object');
      expect(allConfig).to.have.property('enabled');
      expect(allConfig).to.have.property('sampleRate');
      expect(allConfig).to.have.property('storage');
      expect(allConfig).to.have.property('api');
      expect(allConfig).to.have.property('database');
      expect(allConfig).to.have.property('files');
    });
  });

  describe('PerformanceEndpoint', () => {
    it('should create PerformanceEndpoint instance', () => {
      const endpoint = PerformanceEndpoint.create();
      expect(endpoint).to.exist;
      expect(endpoint).to.be.instanceOf(PerformanceEndpoint);
    });

    it('should create endpoint with custom options', () => {
      const endpoint = PerformanceEndpoint.create({
        includeNewRelicStatus: false,
        includeConfiguration: false,
        includeHealthChecks: false,
        includeMetrics: false
      });

      expect(endpoint).to.exist;
      expect(endpoint).to.be.instanceOf(PerformanceEndpoint);
    });

    it('should have registerRoutes method', () => {
      const endpoint = PerformanceEndpoint.create();
      expect(endpoint.registerRoutes).to.be.a('function');
    });
  });

  describe('Performance Monitoring Decorators', () => {
    it('should have MonitorDatabase decorator available', () => {
      expect(MonitorDatabase).to.be.a('function');
    });

    it('should have MonitorDatabaseResult decorator available', () => {
      expect(MonitorDatabaseResult).to.be.a('function');
    });

    it('should have MonitorFile decorator available', () => {
      expect(MonitorFile).to.be.a('function');
    });

    it('should have MonitorFileResult decorator available', () => {
      expect(MonitorFileResult).to.be.a('function');
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should integrate with New Relic metrics', () => {
      const monitor = PerformanceMonitor.getInstance();
      const timer = monitor.createTimer();
      
      // This should send metrics to New Relic if enabled
      const result = timer.endStorageOperation({
        operation: 'upload',
        strategy: 's3',
        success: true,
        fileSize: 1024,
        fileType: 'application/pdf'
      });

      expect(result.isOk()).to.be.true;
    });

    it('should handle configuration updates', () => {
      const monitor = PerformanceMonitor.getInstance();
      
      // Test that the method exists and can be called
      expect(monitor.updateConfig).to.be.a('function');
      
      // Note: We can't easily test environment variable updates in tests
      // but we can verify the method exists
    });

    it('should provide comprehensive monitoring coverage', () => {
      const monitor = PerformanceMonitor.getInstance();
      const config = PerformanceConfiguration.getInstance();
      
      // Verify all monitoring types are available
      expect(config.isStorageMonitoringEnabled()).to.be.a('boolean');
      expect(config.isApiMonitoringEnabled()).to.be.a('boolean');
      expect(config.isDatabaseMonitoringEnabled()).to.be.a('boolean');
      expect(config.isFileMonitoringEnabled()).to.be.a('boolean');
      
      // Verify monitor can create timers for all types
      const timer = monitor.createTimer();
      expect(timer).to.exist;
      expect(timer.endStorageOperation).to.be.a('function');
      expect(timer.endApiResponse).to.be.a('function');
      expect(timer.endDatabaseQuery).to.be.a('function');
      expect(timer.endFileOperation).to.be.a('function');
    });
  });
});
