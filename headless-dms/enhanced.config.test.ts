// src/shared/config/config.test.ts
import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { 
  loadConfig, 
  validateStorageConfig, 
  validateCLIConfig, 
  validateNewRelicConfig,
  getStorageStrategyPriority,
  getCLIConcurrencySettings,
  getResilienceSettings
} from './src/shared/config/config.js';

describe('Enhanced Configuration System', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env };
    
    // Set up test environment variables
    process.env.NODE_ENV = 'test';
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '5432';
    process.env.DB_USER = 'testuser';
    process.env.DB_PASSWORD = 'testpass';
    process.env.DB_NAME = 'testdb';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.DOWNLOAD_JWT_SECRET = 'test-download-secret';
    process.env.NEW_RELIC_LICENSE_KEY = 'test-license-key';
    process.env.NEW_RELIC_ACCOUNT_ID = '12345';
    
    // Set up storage configuration defaults
    process.env.STORAGE_BACKEND = 's3';
    process.env.STORAGE_EMULATOR = 'true';
    process.env.STORAGE_FALLBACK_ENABLED = 'true';
    process.env.STORAGE_TIMEOUT_MS = '30000';
    process.env.STORAGE_RETRY_ATTEMPTS = '3';
    process.env.STORAGE_CIRCUIT_BREAKER_THRESHOLD = '5';
    process.env.STORAGE_STRATEGY_PRIORITY = 's3,azure,local';
    
    // Set up CLI configuration defaults
    process.env.CLI_CONCURRENT_DOWNLOADS = '5';
    process.env.CLI_CONCURRENT_UPLOADS = '3';
    process.env.CLI_BATCH_SIZE = '100';
    process.env.CLI_MAX_BATCH_SIZE = '1000';
    process.env.CLI_OPERATION_TIMEOUT_MS = '300000';
    process.env.CLI_RETRY_ATTEMPTS = '3';
    process.env.CLI_PROGRESS_ENABLED = 'true';
    process.env.CLI_VERBOSE_LOGGING = 'true';
    
    // Set up resilience configuration defaults
    process.env.CIRCUIT_BREAKER_ENABLED = 'true';
    process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD = '5';
    process.env.CIRCUIT_BREAKER_TIMEOUT_MS = '30000';
    process.env.CIRCUIT_BREAKER_HALF_OPEN_MAX_CALLS = '3';
    process.env.CIRCUIT_BREAKER_SUCCESS_THRESHOLD = '3';
    process.env.CIRCUIT_BREAKER_MAX_HISTORY_SIZE = '100';
    process.env.CIRCUIT_BREAKER_NAME = 'storage';
    process.env.CIRCUIT_BREAKER_METRICS_ENABLED = 'true';
    
    process.env.RETRY_POLICY_ENABLED = 'true';
    process.env.RETRY_POLICY_MAX_ATTEMPTS = '3';
    process.env.RETRY_POLICY_BASE_DELAY_MS = '1000';
    process.env.RETRY_POLICY_MAX_DELAY_MS = '30000';
    process.env.RETRY_POLICY_BACKOFF_MULTIPLIER = '2.0';
    process.env.RETRY_POLICY_JITTER_FACTOR = '0.1';
    process.env.RETRY_POLICY_ATTEMPT_TIMEOUT_MS = '5000';
    process.env.RETRY_POLICY_TOTAL_TIMEOUT_MS = '60000';
    process.env.RETRY_POLICY_JITTER_ENABLED = 'true';
    process.env.RETRY_POLICY_NAME = 'default';
    
    // Set up New Relic configuration defaults
    process.env.NEW_RELIC_ENABLED = 'true';
    process.env.NEW_RELIC_APP_NAME = 'Headless-DMS';
    process.env.NEW_RELIC_LOG_LEVEL = 'info';
    process.env.NEW_RELIC_DISTRIBUTED_TRACING_ENABLED = 'true';
    process.env.NEW_RELIC_APDEX_TARGET = '0.5';
    
    // Set up metrics configuration defaults
    process.env.METRICS_ENABLED = 'true';
    process.env.METRICS_BUFFER_SIZE = '100';
    process.env.METRICS_FLUSH_INTERVAL = '60000';
    process.env.METRICS_NEW_RELIC_ENABLED = 'true';
    process.env.METRICS_NEW_RELIC_BUFFER_SIZE = '50';
    process.env.METRICS_ENDPOINT_ENABLED = 'true';
    process.env.METRICS_ENDPOINT_AUTH_REQUIRED = 'true';
    process.env.METRICS_ENDPOINT_PATH = '/metrics';
    
    // Set up performance monitoring defaults
    process.env.PERFORMANCE_MONITORING_ENABLED = 'true';
    process.env.PERFORMANCE_MONITORING_SAMPLE_RATE = '1.0';
    process.env.PERFORMANCE_MONITORING_STORAGE = 'true';
    process.env.PERFORMANCE_MONITORING_SLOW_STORAGE_THRESHOLD = '5000';
    process.env.PERFORMANCE_MONITORING_API = 'true';
    process.env.PERFORMANCE_MONITORING_SLOW_API_THRESHOLD = '2000';
    process.env.PERFORMANCE_MONITORING_DATABASE = 'true';
    process.env.PERFORMANCE_MONITORING_SLOW_QUERY_THRESHOLD = '1000';
    process.env.PERFORMANCE_MONITORING_FILES = 'true';
    
    // Set up emulator configuration defaults
    process.env.USE_EMULATORS = 'true';
    process.env.LOCALSTACK_ENDPOINT = 'http://127.0.0.1:4566';
    process.env.LOCALSTACK_PORT = '4566';
    process.env.LOCALSTACK_USE_PATH_STYLE = 'true';
    process.env.LOCALSTACK_ACCESS_KEY = 'test';
    process.env.LOCALSTACK_SECRET_KEY = 'test';
    process.env.LOCALSTACK_REGION = 'us-east-1';
    process.env.AZURITE_ENDPOINT = 'http://127.0.0.1:10000';
    process.env.AZURITE_PORT = '10000';
    process.env.AZURITE_ACCOUNT_NAME = 'devstoreaccount1';
  });

  afterEach(() => {
    // Restore original environment by clearing all test-set variables
    Object.keys(process.env).forEach(key => {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    });
    
    // Restore any missing original variables
    Object.keys(originalEnv).forEach(key => {
      if (process.env[key] === undefined) {
        process.env[key] = originalEnv[key];
      }
    });
  });

  describe('Storage Configuration', () => {
    it('should load storage configuration with defaults', () => {
      const config = loadConfig();
      
      expect(config.STORAGE_BACKEND).to.equal('s3');
      expect(config.STORAGE_EMULATOR).to.be.true;
      expect(config.STORAGE_FALLBACK_ENABLED).to.be.true;
      expect(config.STORAGE_TIMEOUT_MS).to.equal(30000);
      expect(config.STORAGE_RETRY_ATTEMPTS).to.equal(3);
      expect(config.STORAGE_CIRCUIT_BREAKER_THRESHOLD).to.equal(5);
      expect(config.STORAGE_STRATEGY_PRIORITY).to.deep.equal(['s3', 'azure', 'local']);
    });

    it('should validate storage configuration correctly', () => {
      const config = loadConfig();
      
      // Should not throw
      expect(() => validateStorageConfig(config)).to.not.throw();
    });

    it('should reject invalid storage backend', () => {
      // Set invalid storage backend
      process.env.STORAGE_BACKEND = 'invalid';
      
      // Should throw validation error
      expect(() => loadConfig()).to.throw('Invalid option: expected one of "s3"|"azure"|"local"');
      
      // Reset to valid value for next tests
      process.env.STORAGE_BACKEND = 's3';
    });

    it('should reject low storage timeout', () => {
      // Set invalid storage timeout
      process.env.STORAGE_TIMEOUT_MS = '500';
      
      // Should throw validation error
      expect(() => loadConfig()).to.throw('Number must be greater than or equal to 1000');
      
      // Reset to valid value for next tests
      process.env.STORAGE_TIMEOUT_MS = '30000';
    });

    it('should accept valid storage backend values', () => {
      // Test S3 backend
      process.env.STORAGE_BACKEND = 's3';
      let config = loadConfig();
      expect(config.STORAGE_BACKEND).to.equal('s3');
      
      // Test Azure backend
      process.env.STORAGE_BACKEND = 'azure';
      config = loadConfig();
      expect(config.STORAGE_BACKEND).to.equal('azure');
      
      // Test Local backend
      process.env.STORAGE_BACKEND = 'local';
      config = loadConfig();
      expect(config.STORAGE_BACKEND).to.equal('local');
      
      // Reset to default for next tests
      process.env.STORAGE_BACKEND = 's3';
    });
  });

  describe('CLI Configuration', () => {
    it('should load CLI configuration with defaults', () => {
      const config = loadConfig();
      
      expect(config.CLI_CONCURRENT_DOWNLOADS).to.equal(5);
      expect(config.CLI_CONCURRENT_UPLOADS).to.equal(3);
      expect(config.CLI_BATCH_SIZE).to.equal(100);
      expect(config.CLI_MAX_BATCH_SIZE).to.equal(1000);
      expect(config.CLI_OPERATION_TIMEOUT_MS).to.equal(300000);
      expect(config.CLI_RETRY_ATTEMPTS).to.equal(3);
      expect(config.CLI_PROGRESS_ENABLED).to.be.true;
      expect(config.CLI_VERBOSE_LOGGING).to.be.true;
    });

    it('should validate CLI configuration correctly', () => {
      const config = loadConfig();
      
      // Should not throw
      expect(() => validateCLIConfig(config)).to.not.throw();
    });

    it('should reject invalid concurrent downloads', () => {
      process.env.CLI_CONCURRENT_DOWNLOADS = '60';
      
      expect(() => loadConfig()).to.throw('Number must be less than or equal to 50');
      
      // Reset to valid value for next tests
      process.env.CLI_CONCURRENT_DOWNLOADS = '5';
    });

    it('should reject invalid batch size', () => {
      process.env.CLI_BATCH_SIZE = '5';
      
      expect(() => loadConfig()).to.throw('Number must be greater than or equal to 10');
      
      // Reset to valid value for next tests
      process.env.CLI_BATCH_SIZE = '100';
    });

    it('should accept valid CLI configuration values', () => {
      // Test valid concurrent downloads
      process.env.CLI_CONCURRENT_DOWNLOADS = '10';
      let config = loadConfig();
      expect(config.CLI_CONCURRENT_DOWNLOADS).to.equal(10);
      
      // Test valid batch size
      process.env.CLI_BATCH_SIZE = '500';
      config = loadConfig();
      expect(config.CLI_BATCH_SIZE).to.equal(500);
      
      // Reset to default for next tests
      process.env.CLI_CONCURRENT_DOWNLOADS = '5';
      process.env.CLI_BATCH_SIZE = '100';
    });
  });

  describe('Resilience Configuration', () => {
    it('should load circuit breaker configuration with defaults', () => {
      const config = loadConfig();
      
      expect(config.CIRCUIT_BREAKER_FAILURE_THRESHOLD).to.equal(5);
      expect(config.CIRCUIT_BREAKER_TIMEOUT_MS).to.equal(30000);
      expect(config.CIRCUIT_BREAKER_HALF_OPEN_MAX_CALLS).to.equal(3);
      expect(config.CIRCUIT_BREAKER_SUCCESS_THRESHOLD).to.equal(3);
      expect(config.CIRCUIT_BREAKER_MAX_HISTORY_SIZE).to.equal(100);
      expect(config.CIRCUIT_BREAKER_ENABLED).to.be.true;
      expect(config.CIRCUIT_BREAKER_METRICS_ENABLED).to.be.true;
      expect(config.CIRCUIT_BREAKER_NAME).to.equal('storage');
    });

    it('should load retry policy configuration with defaults', () => {
      const config = loadConfig();
      
      expect(config.RETRY_POLICY_MAX_ATTEMPTS).to.equal(3);
      expect(config.RETRY_POLICY_BASE_DELAY_MS).to.equal(1000);
      expect(config.RETRY_POLICY_MAX_DELAY_MS).to.equal(30000);
      expect(config.RETRY_POLICY_BACKOFF_MULTIPLIER).to.equal(2.0);
      expect(config.RETRY_POLICY_JITTER_FACTOR).to.equal(0.1);
      expect(config.RETRY_POLICY_ATTEMPT_TIMEOUT_MS).to.equal(5000);
      expect(config.RETRY_POLICY_TOTAL_TIMEOUT_MS).to.equal(60000);
      expect(config.RETRY_POLICY_ENABLED).to.be.true;
      expect(config.RETRY_POLICY_JITTER_ENABLED).to.be.true;
      expect(config.RETRY_POLICY_NAME).to.equal('default');
    });

    it('should accept custom resilience configuration values', () => {
      // Test custom circuit breaker settings
      process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD = '10';
      process.env.CIRCUIT_BREAKER_TIMEOUT_MS = '60000';
      
      const config = loadConfig();
      expect(config.CIRCUIT_BREAKER_FAILURE_THRESHOLD).to.equal(10);
      expect(config.CIRCUIT_BREAKER_TIMEOUT_MS).to.equal(60000);
      
      // Reset to default for next tests
      process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD = '5';
      process.env.CIRCUIT_BREAKER_TIMEOUT_MS = '30000';
    });
  });

  describe('New Relic Configuration', () => {
    it('should load New Relic configuration with defaults', () => {
      const config = loadConfig();
      
      expect(config.NEW_RELIC_LICENSE_KEY).to.equal('test-license-key');
      expect(config.NEW_RELIC_APP_NAME).to.equal('Headless-DMS');
      expect(config.NEW_RELIC_ACCOUNT_ID).to.equal('12345');
      expect(config.NEW_RELIC_ENABLED).to.be.true;
      expect(config.NEW_RELIC_LOG_LEVEL).to.equal('info');
      expect(config.NEW_RELIC_DISTRIBUTED_TRACING_ENABLED).to.be.true;
      expect(config.NEW_RELIC_APDEX_TARGET).to.equal(0.5);
    });

    it('should validate New Relic configuration correctly', () => {
      const config = loadConfig();
      
      // Should not throw
      expect(() => validateNewRelicConfig(config)).to.not.throw();
    });

    it('should reject missing license key when enabled', () => {
      delete process.env.NEW_RELIC_LICENSE_KEY;
      
      expect(() => loadConfig()).to.throw('New Relic license key is required');
      
      // Restore for next tests
      process.env.NEW_RELIC_LICENSE_KEY = 'test-license-key';
    });

    it('should reject missing account ID when enabled', () => {
      delete process.env.NEW_RELIC_ACCOUNT_ID;
      
      expect(() => loadConfig()).to.throw('New Relic account ID is required');
      
      // Restore for next tests
      process.env.NEW_RELIC_ACCOUNT_ID = '12345';
    });

    it('should accept custom New Relic configuration values', () => {
      // Test custom app name
      process.env.NEW_RELIC_APP_NAME = 'Custom-App-Name';
      process.env.NEW_RELIC_LOG_LEVEL = 'debug';
      
      const config = loadConfig();
      expect(config.NEW_RELIC_APP_NAME).to.equal('Custom-App-Name');
      expect(config.NEW_RELIC_LOG_LEVEL).to.equal('debug');
      
      // Reset to default for next tests
      process.env.NEW_RELIC_APP_NAME = 'Headless-DMS';
      process.env.NEW_RELIC_LOG_LEVEL = 'info';
    });
  });

  describe('Metrics Configuration', () => {
    it('should load metrics configuration with defaults', () => {
      const config = loadConfig();
      
      expect(config.METRICS_ENABLED).to.be.true;
      expect(config.METRICS_BUFFER_SIZE).to.equal(100);
      expect(config.METRICS_FLUSH_INTERVAL).to.equal(60000);
      expect(config.METRICS_NEW_RELIC_ENABLED).to.be.true;
      expect(config.METRICS_NEW_RELIC_BUFFER_SIZE).to.equal(50);
      expect(config.METRICS_ENDPOINT_ENABLED).to.be.true;
      expect(config.METRICS_ENDPOINT_AUTH_REQUIRED).to.be.true;
      expect(config.METRICS_ENDPOINT_PATH).to.equal('/metrics');
    });

    it('should load performance monitoring configuration with defaults', () => {
      const config = loadConfig();
      
      expect(config.PERFORMANCE_MONITORING_ENABLED).to.be.true;
      expect(config.PERFORMANCE_MONITORING_SAMPLE_RATE).to.equal(1.0);
      expect(config.PERFORMANCE_MONITORING_STORAGE).to.be.true;
      expect(config.PERFORMANCE_MONITORING_SLOW_STORAGE_THRESHOLD).to.equal(5000);
      expect(config.PERFORMANCE_MONITORING_API).to.be.true;
      expect(config.PERFORMANCE_MONITORING_SLOW_API_THRESHOLD).to.equal(2000);
      expect(config.PERFORMANCE_MONITORING_DATABASE).to.be.true;
      expect(config.PERFORMANCE_MONITORING_SLOW_QUERY_THRESHOLD).to.equal(1000);
      expect(config.PERFORMANCE_MONITORING_FILES).to.be.true;
    });

    it('should accept custom metrics configuration values', () => {
      // Test custom metrics settings
      process.env.METRICS_BUFFER_SIZE = '200';
      process.env.METRICS_FLUSH_INTERVAL = '30000';
      process.env.PERFORMANCE_MONITORING_SAMPLE_RATE = '0.5';
      
      const config = loadConfig();
      expect(config.METRICS_BUFFER_SIZE).to.equal(200);
      expect(config.METRICS_FLUSH_INTERVAL).to.equal(30000);
      expect(config.PERFORMANCE_MONITORING_SAMPLE_RATE).to.equal(0.5);
      
      // Reset to default for next tests
      process.env.METRICS_BUFFER_SIZE = '100';
      process.env.METRICS_FLUSH_INTERVAL = '60000';
      process.env.PERFORMANCE_MONITORING_SAMPLE_RATE = '1.0';
    });
  });

  describe('Emulator Configuration', () => {
    it('should load emulator configuration with defaults', () => {
      const config = loadConfig();
      
      expect(config.USE_EMULATORS).to.be.true;
      expect(config.LOCALSTACK_ENDPOINT).to.equal('http://127.0.0.1:4566');
      expect(config.LOCALSTACK_PORT).to.equal(4566);
      expect(config.LOCALSTACK_USE_PATH_STYLE).to.be.true;
      expect(config.LOCALSTACK_ACCESS_KEY).to.equal('test');
      expect(config.LOCALSTACK_SECRET_KEY).to.equal('test');
      expect(config.LOCALSTACK_REGION).to.equal('us-east-1');
      expect(config.AZURITE_ENDPOINT).to.equal('http://127.0.0.1:10000');
      expect(config.AZURITE_PORT).to.equal(10000);
      expect(config.AZURITE_ACCOUNT_NAME).to.equal('devstoreaccount1');
    });

    it('should accept custom emulator configuration values', () => {
      // Test custom emulator settings
      process.env.LOCALSTACK_ENDPOINT = 'http://localhost:9000';
      process.env.LOCALSTACK_PORT = '9000';
      process.env.AZURITE_ENDPOINT = 'http://localhost:20000';
      
      const config = loadConfig();
      expect(config.LOCALSTACK_ENDPOINT).to.equal('http://localhost:9000');
      expect(config.LOCALSTACK_PORT).to.equal(9000);
      expect(config.AZURITE_ENDPOINT).to.equal('http://localhost:20000');
      
      // Reset to default for next tests
      process.env.LOCALSTACK_ENDPOINT = 'http://127.0.0.1:4566';
      process.env.LOCALSTACK_PORT = '4566';
      process.env.AZURITE_ENDPOINT = 'http://127.0.0.1:10000';
    });
  });

  describe('Configuration Helper Functions', () => {
    it('should get storage strategy priority correctly', () => {
      const config = loadConfig();
      const priority = getStorageStrategyPriority(config);
      
      expect(priority).to.deep.equal(['s3', 'azure', 'local']);
    });

    it('should get CLI concurrency settings correctly', () => {
      const config = loadConfig();
      const settings = getCLIConcurrencySettings(config);
      
      expect(settings.concurrentDownloads).to.equal(5);
      expect(settings.concurrentUploads).to.equal(3);
      expect(settings.batchSize).to.equal(100);
      expect(settings.maxBatchSize).to.equal(1000);
    });

    it('should get resilience settings correctly', () => {
      const config = loadConfig();
      const settings = getResilienceSettings(config);
      
      expect(settings.circuitBreaker.enabled).to.be.true;
      expect(settings.circuitBreaker.failureThreshold).to.equal(5);
      expect(settings.circuitBreaker.timeoutMs).to.equal(30000);
      expect(settings.retry.enabled).to.be.true;
      expect(settings.retry.maxAttempts).to.equal(3);
      expect(settings.retry.baseDelayMs).to.equal(1000);
    });
  });

  describe('Environment-Specific Configuration', () => {
    it('should apply development defaults', () => {
      process.env.NODE_ENV = 'development';
      const config = loadConfig();
      
      expect(config.LOG_LEVEL).to.equal('debug');
      expect(config.STORAGE_EMULATOR).to.be.true;
      expect(config.STORAGE_FALLBACK_ENABLED).to.be.true;
      expect(config.CLI_VERBOSE_LOGGING).to.be.true;
      expect(config.CLI_PROGRESS_ENABLED).to.be.true;
      expect(config.METRICS_DEV_MODE).to.be.true;
      expect(config.PERFORMANCE_MONITORING_SAMPLE_RATE).to.equal(1.0);
      
      // Reset to test for next tests
      process.env.NODE_ENV = 'test';
    });

    it('should apply production defaults', () => {
      process.env.NODE_ENV = 'production';
      const config = loadConfig();
      
      expect(config.LOG_LEVEL).to.equal('info');
      expect(config.STORAGE_EMULATOR).to.be.false;
      expect(config.STORAGE_FALLBACK_ENABLED).to.be.true;
      expect(config.CLI_VERBOSE_LOGGING).to.be.false;
      expect(config.CLI_PROGRESS_ENABLED).to.be.false;
      expect(config.METRICS_DEV_MODE).to.be.false;
      expect(config.PERFORMANCE_MONITORING_SAMPLE_RATE).to.equal(0.1);
      
      // Reset to test for next tests
      process.env.NODE_ENV = 'test';
    });

    it('should apply test defaults', () => {
      process.env.NODE_ENV = 'test';
      const config = loadConfig();
      
      expect(config.LOG_LEVEL).to.equal('error');
      expect(config.STORAGE_EMULATOR).to.be.true;
      expect(config.STORAGE_FALLBACK_ENABLED).to.be.false;
      expect(config.CLI_VERBOSE_LOGGING).to.be.false;
      expect(config.CLI_PROGRESS_ENABLED).to.be.false;
      expect(config.METRICS_DEV_MODE).to.be.false;
      expect(config.PERFORMANCE_MONITORING_SAMPLE_RATE).to.equal(0.0);
      
      // Reset to test for next tests
      process.env.NODE_ENV = 'test';
    });
  });

  describe('Configuration Validation', () => {
    it('should reject missing required database configuration', () => {
      delete process.env.DB_HOST;
      
      expect(() => loadConfig()).to.throw('Database host is required');
      
      // Restore for next tests
      process.env.DB_HOST = 'localhost';
    });

    it('should reject missing required JWT configuration', () => {
      delete process.env.JWT_SECRET;
      
      expect(() => loadConfig()).to.throw('JWT secret is required');
      
      // Restore for next tests
      process.env.JWT_SECRET = 'test-jwt-secret';
    });

    it('should reject invalid port number', () => {
      process.env.PORT = '70000';
      
      expect(() => loadConfig()).to.throw('Number must be less than or equal to 65535');
      
      // Reset to valid value for next tests
      process.env.PORT = '3000';
    });

    it('should reject invalid NODE_ENV', () => {
      process.env.NODE_ENV = 'invalid';
      
      expect(() => loadConfig()).to.throw('Invalid option: expected one of "development"|"production"|"test"');
      
      // Reset to test for next tests
      process.env.NODE_ENV = 'test';
    });

    it('should validate storage strategy priority format', () => {
      // Test valid priority format
      process.env.STORAGE_STRATEGY_PRIORITY = 's3,local,azure';
      let config = loadConfig();
      expect(config.STORAGE_STRATEGY_PRIORITY).to.deep.equal(['s3', 'local', 'azure']);
      
      // Test invalid priority format
      process.env.STORAGE_STRATEGY_PRIORITY = 's3,invalid,azure';
      expect(() => loadConfig()).to.throw('Invalid option: expected one of "s3"|"azure"|"local"');
      
      // Reset to default for next tests
      process.env.STORAGE_STRATEGY_PRIORITY = 's3,azure,local';
    });
  });
});
