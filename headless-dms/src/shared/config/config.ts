// src/shared/config/config.ts
import * as dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// =============================================================================
// BASE CONFIGURATION SCHEMAS
// =============================================================================

// Server configuration schema
const ServerConfigSchema = z.object({
  PORT: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(65535)).default(3000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Database configuration schema
const DatabaseConfigSchema = z.object({
  DB_HOST: z.string().min(1, 'Database host is required'),
  DB_PORT: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(65535)),
  DB_USER: z.string().min(1, 'Database user is required'),
  DB_PASSWORD: z.string().min(1, 'Database password is required'),
  DB_NAME: z.string().min(1, 'Database name is required'),
  DB_SSL: z.string().transform(val => val === 'true').default(false),
});

// JWT configuration schema
const JWTConfigSchema = z.object({
  JWT_SECRET: z.string().min(1, 'JWT secret is required'),
  DOWNLOAD_JWT_SECRET: z.string().min(1, 'Download JWT secret is required'),
});

// Circuit Breaker configuration schema
const CircuitBreakerConfigSchema = z.object({
  CIRCUIT_BREAKER_FAILURE_THRESHOLD: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).default(5),
  CIRCUIT_BREAKER_TIMEOUT_MS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1000)).default(30000),
  CIRCUIT_BREAKER_HALF_OPEN_MAX_CALLS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).default(3),
  CIRCUIT_BREAKER_SUCCESS_THRESHOLD: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).default(3),
  CIRCUIT_BREAKER_MAX_HISTORY_SIZE: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(10)).default(100),
  CIRCUIT_BREAKER_ENABLED: z.string().transform(val => val === 'true').default(true),
  CIRCUIT_BREAKER_METRICS_ENABLED: z.string().transform(val => val === 'true').default(true),
  CIRCUIT_BREAKER_NAME: z.string().default('storage'),
});

// Retry Policy configuration schema
const RetryPolicyConfigSchema = z.object({
  RETRY_POLICY_MAX_ATTEMPTS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).default(3),
  RETRY_POLICY_BASE_DELAY_MS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(100)).default(1000),
  RETRY_POLICY_MAX_DELAY_MS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1000)).default(30000),
  RETRY_POLICY_BACKOFF_MULTIPLIER: z.string().transform(val => parseFloat(val)).pipe(z.number().min(1.0)).default(2.0),
  RETRY_POLICY_JITTER_FACTOR: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0).max(1)).default(0.1),
  RETRY_POLICY_ATTEMPT_TIMEOUT_MS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1000)).default(5000),
  RETRY_POLICY_TOTAL_TIMEOUT_MS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(5000)).default(60000),
  RETRY_POLICY_ENABLED: z.string().transform(val => val === 'true').default(true),
  RETRY_POLICY_JITTER_ENABLED: z.string().transform(val => val === 'true').default(true),
  RETRY_POLICY_NAME: z.string().default('default'),
});

// New Relic configuration schema
const NewRelicConfigSchema = z.object({
  NEW_RELIC_LICENSE_KEY: z.string().min(1, 'New Relic license key is required'),
  NEW_RELIC_APP_NAME: z.string().default('Headless-DMS'),
  NEW_RELIC_ACCOUNT_ID: z.string().min(1, 'New Relic account ID is required'),
  NEW_RELIC_ENABLED: z.string().transform(val => val === 'true').default(true),
  NEW_RELIC_LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  NEW_RELIC_DISTRIBUTED_TRACING_ENABLED: z.string().transform(val => val === 'true').default(true),
  NEW_RELIC_APDEX_TARGET: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0.1).max(1.0)).default(0.5),
});

// Emulator configuration schema
const EmulatorConfigSchema = z.object({
  USE_EMULATORS: z.string().transform(val => val === 'true').default(true),
  LOCALSTACK_ENDPOINT: z.string().url().default('http://127.0.0.1:4566'),
  LOCALSTACK_PORT: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(65535)).default(4566),
  LOCALSTACK_USE_PATH_STYLE: z.string().transform(val => val === 'true').default(true),
  LOCALSTACK_ACCESS_KEY: z.string().default('test'),
  LOCALSTACK_SECRET_KEY: z.string().default('test'),
  LOCALSTACK_REGION: z.string().default('us-east-1'),
  AZURITE_ENDPOINT: z.string().url().default('http://127.0.0.1:10000'),
  AZURITE_PORT: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(65535)).default(10000),
  AZURITE_ACCOUNT_NAME: z.string().default('devstoreaccount1'),
  AZURITE_ACCOUNT_KEY: z.string().default('Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw=='),
  EMULATOR_HEALTH_CHECK_INTERVAL: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1000)).default(30000),
  EMULATOR_HEALTH_CHECK_TIMEOUT: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1000)).default(5000),
  EMULATOR_HEALTH_CHECK_MAX_RETRIES: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).default(3),
  STORAGE_STRATEGY: z.enum(['s3', 'azure', 'local']).default('s3'),
  S3_BUCKET_NAME: z.string().default('dms-test-bucket'),
  AZURE_CONTAINER_NAME: z.string().default('dms-test-container'),
});

// Metrics system configuration schema
const MetricsConfigSchema = z.object({
  METRICS_ENABLED: z.string().transform(val => val === 'true').default(true),
  METRICS_BUFFER_SIZE: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(10)).default(100),
  METRICS_FLUSH_INTERVAL: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1000)).default(60000),
  METRICS_NEW_RELIC_ENABLED: z.string().transform(val => val === 'true').default(true),
  METRICS_NEW_RELIC_BUFFER_SIZE: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(10)).default(50),
  METRICS_ENDPOINT_ENABLED: z.string().transform(val => val === 'true').default(true),
  METRICS_ENDPOINT_AUTH_REQUIRED: z.string().transform(val => val === 'true').default(true),
  METRICS_ENDPOINT_PATH: z.string().default('/metrics'),
  METRICS_SUMMARY_PATH: z.string().default('/metrics/summary'),
  METRICS_HEALTH_PATH: z.string().default('/metrics/health'),
  METRICS_MIDDLEWARE_ENABLED: z.string().transform(val => val === 'true').default(true),
  METRICS_MIDDLEWARE_TRACK_REQUESTS: z.string().transform(val => val === 'true').default(true),
  METRICS_MIDDLEWARE_TRACK_USER_ACTIVITY: z.string().transform(val => val === 'true').default(true),
  METRICS_MIDDLEWARE_TRACK_PERFORMANCE: z.string().transform(val => val === 'true').default(true),
  METRICS_STORAGE_TRACK_OPERATIONS: z.string().transform(val => val === 'true').default(true),
  METRICS_STORAGE_TRACK_ERRORS: z.string().transform(val => val === 'true').default(true),
  METRICS_STORAGE_TRACK_PERFORMANCE: z.string().transform(val => val === 'true').default(true),
  METRICS_USER_ACTIVITY_TRACK_AUTH: z.string().transform(val => val === 'true').default(true),
  METRICS_USER_ACTIVITY_TRACK_DOCUMENTS: z.string().transform(val => val === 'true').default(true),
  METRICS_USER_ACTIVITY_ANONYMIZE: z.string().transform(val => val === 'true').default(true),
  METRICS_PERFORMANCE_WARNING_THRESHOLD: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(100)).default(1000),
  METRICS_PERFORMANCE_CRITICAL_THRESHOLD: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1000)).default(5000),
  METRICS_ERROR_RATE_WARNING_THRESHOLD: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0).max(100)).default(5.0),
  METRICS_ERROR_RATE_CRITICAL_THRESHOLD: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0).max(100)).default(20.0),
  METRICS_SUCCESS_RATE_WARNING_THRESHOLD: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0).max(1)).default(0.95),
  METRICS_SUCCESS_RATE_CRITICAL_THRESHOLD: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0).max(1)).default(0.80),
  METRICS_USER_ACTIVITY_WARNING_THRESHOLD: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0).max(100)).default(1.0),
  METRICS_USER_ACTIVITY_CRITICAL_THRESHOLD: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0).max(100)).default(0.1),
  METRICS_LOGGING_ENABLED: z.string().transform(val => val === 'true').default(true),
  METRICS_LOGGING_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  METRICS_DEV_MODE: z.string().transform(val => val === 'true').default(false),
  METRICS_TEST_MODE: z.string().transform(val => val === 'true').default(false),
});

// Performance monitoring configuration schema
const PerformanceMonitoringConfigSchema = z.object({
  PERFORMANCE_MONITORING_ENABLED: z.string().transform(val => val === 'true').default(true),
  PERFORMANCE_MONITORING_SAMPLE_RATE: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0).max(1)).default(1.0),
  PERFORMANCE_MONITORING_STORAGE: z.string().transform(val => val === 'true').default(true),
  PERFORMANCE_MONITORING_SLOW_STORAGE_THRESHOLD: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(100)).default(5000),
  PERFORMANCE_MONITORING_API: z.string().transform(val => val === 'true').default(true),
  PERFORMANCE_MONITORING_SLOW_API_THRESHOLD: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(100)).default(2000),
  PERFORMANCE_MONITORING_DATABASE: z.string().transform(val => val === 'true').default(true),
  PERFORMANCE_MONITORING_SLOW_QUERY_THRESHOLD: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(100)).default(1000),
  PERFORMANCE_MONITORING_FILES: z.string().transform(val => val === 'true').default(true),
  PERFORMANCE_MIDDLEWARE_ENABLED: z.string().transform(val => val === 'true').default(true),
  PERFORMANCE_MIDDLEWARE_TRACK_REQUEST_SIZE: z.string().transform(val => val === 'true').default(true),
  PERFORMANCE_MIDDLEWARE_TRACK_RESPONSE_SIZE: z.string().transform(val => val === 'true').default(true),
  PERFORMANCE_MIDDLEWARE_TRACK_USER_CONTEXT: z.string().transform(val => val === 'true').default(true),
  PERFORMANCE_ALERTING_ENABLED: z.string().transform(val => val === 'true').default(true),
  PERFORMANCE_ALERTING_SLOW_OPERATION_PERCENTILE: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(50).max(99)).default(95),
  PERFORMANCE_METRICS_AGGREGATION_ENABLED: z.string().transform(val => val === 'true').default(true),
  PERFORMANCE_METRICS_AGGREGATION_INTERVAL: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1000)).default(60000),
  PERFORMANCE_DASHBOARD_ENABLED: z.string().transform(val => val === 'true').default(true),
  PERFORMANCE_DASHBOARD_PORT: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(65535)).default(3001),
});

// Storage configuration schema
const StorageConfigSchema = z.object({
  STORAGE_BACKEND: z.enum(['s3', 'azure', 'local']).default('s3'),
  STORAGE_EMULATOR: z.string().transform(val => val === 'true').default(true),
  STORAGE_FALLBACK_ENABLED: z.string().transform(val => val === 'true').default(true),
  STORAGE_TIMEOUT_MS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1000)).default(30000),
  STORAGE_RETRY_ATTEMPTS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).default(3),
  STORAGE_CIRCUIT_BREAKER_THRESHOLD: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).default(5),
  STORAGE_STRATEGY_PRIORITY: z.string().transform(val => val.split(',').map(s => s.trim())).pipe(z.array(z.enum(['s3', 'azure', 'local']))).default(['s3', 'azure', 'local']),
  STORAGE_HEALTH_CHECK_INTERVAL: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1000)).default(30000),
  STORAGE_HEALTH_CHECK_TIMEOUT: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1000)).default(5000),
  STORAGE_HEALTH_CHECK_MAX_RETRIES: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).default(3),
  STORAGE_SLOW_OPERATION_THRESHOLD: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(100)).default(5000),
  STORAGE_CRITICAL_OPERATION_THRESHOLD: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1000)).default(15000),
  STORAGE_FALLBACK_STRATEGY: z.enum(['s3', 'azure', 'local']).default('local'),
  STORAGE_FALLBACK_TIMEOUT_MS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1000)).default(10000),
  STORAGE_FALLBACK_MAX_RETRIES: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).default(2),
  STORAGE_METRICS_ENABLED: z.string().transform(val => val === 'true').default(true),
  STORAGE_METRICS_SAMPLE_RATE: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0).max(1)).default(1.0),
  STORAGE_METRICS_TRACK_OPERATIONS: z.string().transform(val => val === 'true').default(true),
  STORAGE_METRICS_TRACK_ERRORS: z.string().transform(val => val === 'true').default(true),
  STORAGE_METRICS_TRACK_PERFORMANCE: z.string().transform(val => val === 'true').default(true),
  STORAGE_LOGGING_ENABLED: z.string().transform(val => val === 'true').default(true),
  STORAGE_LOGGING_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  STORAGE_LOGGING_TRACK_OPERATIONS: z.string().transform(val => val === 'true').default(true),
  STORAGE_LOGGING_TRACK_ERRORS: z.string().transform(val => val === 'true').default(true),
  STORAGE_LOGGING_TRACK_PERFORMANCE: z.string().transform(val => val === 'true').default(true),
});

// CLI configuration schema
const CLIConfigSchema = z.object({
  CLI_CONCURRENT_DOWNLOADS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(50)).default(5),
  CLI_CONCURRENT_UPLOADS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(20)).default(3),
  CLI_BATCH_SIZE: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(10).max(10000)).default(100),
  CLI_MAX_BATCH_SIZE: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(100).max(100000)).default(1000),
  CLI_OPERATION_TIMEOUT_MS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(10000)).default(300000),
  CLI_RETRY_ATTEMPTS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).default(3),
  CLI_RETRY_DELAY_MS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(100)).default(1000),
  CLI_PROGRESS_ENABLED: z.string().transform(val => val === 'true').default(true),
  CLI_PROGRESS_UPDATE_INTERVAL: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(100)).default(1000),
  CLI_VERBOSE_LOGGING: z.string().transform(val => val === 'true').default(true),
  CLI_MAX_MEMORY_USAGE_MB: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(64).max(8192)).default(512),
  CLI_MAX_FILE_SIZE_MB: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(10000)).default(100),
  CLI_TEMP_DIRECTORY: z.string().default('./temp'),
  CLI_AUTH_REQUIRED: z.string().transform(val => val === 'true').default(true),
  CLI_AUTH_TOKEN_EXPIRY_HOURS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(168)).default(24),
  CLI_AUTH_REFRESH_ENABLED: z.string().transform(val => val === 'true').default(true),
  CLI_BACKGROUND_JOBS_ENABLED: z.string().transform(val => val === 'true').default(true),
  CLI_BACKGROUND_JOBS_MAX_CONCURRENT: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(20)).default(3),
  CLI_BACKGROUND_JOBS_QUEUE_SIZE: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(10).max(10000)).default(100),
  CLI_BACKGROUND_JOBS_PERSISTENCE: z.string().transform(val => val === 'true').default(true),
  CLI_HEALTH_CHECK_ENABLED: z.string().transform(val => val === 'true').default(true),
  CLI_HEALTH_CHECK_INTERVAL: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1000)).default(30000),
  CLI_HEALTH_CHECK_TIMEOUT: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1000)).default(5000),
  CLI_METRICS_ENABLED: z.string().transform(val => val === 'true').default(true),
  CLI_METRICS_SAMPLE_RATE: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0).max(1)).default(1.0),
  CLI_LOGGING_ENABLED: z.string().transform(val => val === 'true').default(true),
  CLI_LOGGING_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

// Development settings schema
const DevelopmentConfigSchema = z.object({
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('debug'),
});

// =============================================================================
// MAIN CONFIGURATION SCHEMA
// =============================================================================

const ConfigSchema = z.object({
  // Base configurations
  ...ServerConfigSchema.shape,
  ...DatabaseConfigSchema.shape,
  ...JWTConfigSchema.shape,
  
  // Resilience configurations
  ...CircuitBreakerConfigSchema.shape,
  ...RetryPolicyConfigSchema.shape,
  
  // Observability configurations
  ...NewRelicConfigSchema.shape,
  ...EmulatorConfigSchema.shape,
  ...MetricsConfigSchema.shape,
  ...PerformanceMonitoringConfigSchema.shape,
  
  // Storage and CLI configurations
  ...StorageConfigSchema.shape,
  ...CLIConfigSchema.shape,
  
  // Development configurations
  ...DevelopmentConfigSchema.shape,
});

export type AppConfig = z.infer<typeof ConfigSchema>;

// =============================================================================
// ENVIRONMENT-SPECIFIC CONFIGURATIONS
// =============================================================================

const environmentDefaults = {
  development: {
    LOG_LEVEL: 'debug',
    STORAGE_EMULATOR: true,
    STORAGE_FALLBACK_ENABLED: true,
    CLI_VERBOSE_LOGGING: true,
    CLI_PROGRESS_ENABLED: true,
    METRICS_DEV_MODE: true,
    PERFORMANCE_MONITORING_SAMPLE_RATE: 1.0,
  },
  production: {
    LOG_LEVEL: 'info',
    STORAGE_EMULATOR: false,
    STORAGE_FALLBACK_ENABLED: true,
    CLI_VERBOSE_LOGGING: false,
    CLI_PROGRESS_ENABLED: false,
    METRICS_DEV_MODE: false,
    PERFORMANCE_MONITORING_SAMPLE_RATE: 0.1,
  },
  test: {
    LOG_LEVEL: 'error',
    STORAGE_EMULATOR: true,
    STORAGE_FALLBACK_ENABLED: false,
    CLI_VERBOSE_LOGGING: false,
    CLI_PROGRESS_ENABLED: false,
    METRICS_DEV_MODE: false,
    PERFORMANCE_MONITORING_SAMPLE_RATE: 0.0,
  },
} as const;

// =============================================================================
// CONFIGURATION LOADING AND VALIDATION
// =============================================================================

export function loadConfig(): AppConfig {
  try {
    // Load base configuration from environment variables
    const baseConfig = ConfigSchema.parse(process.env);
    
    // Apply environment-specific defaults
    const envDefaults = environmentDefaults[baseConfig.NODE_ENV] || environmentDefaults.development;
    const config = { ...baseConfig, ...envDefaults };
    
    console.log('Configuration loaded successfully:', {
      NODE_ENV: config.NODE_ENV,
      PORT: config.PORT,
      HOST: config.HOST,
      STORAGE_BACKEND: config.STORAGE_BACKEND,
      STORAGE_EMULATOR: config.STORAGE_EMULATOR,
      CLI_CONCURRENT_DOWNLOADS: config.CLI_CONCURRENT_DOWNLOADS,
      CLI_BATCH_SIZE: config.CLI_BATCH_SIZE,
    });
    
    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Configuration validation failed:');
      error.issues.forEach((err: any) => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
    } else {
      console.error('Configuration loading failed:', error);
    }
    process.exit(1);
  }
}

// =============================================================================
// CONFIGURATION VALIDATION HELPERS
// =============================================================================

export function validateDatabaseConfig(config: AppConfig): void {
  if (!config.DB_HOST || !config.DB_USER || !config.DB_PASSWORD || !config.DB_NAME) {
    throw new Error('Missing required database configuration');
  }
}

export function validateServerConfig(config: AppConfig): void {
  if (config.PORT < 1 || config.PORT > 65535) {
    throw new Error(`Invalid port number: ${config.PORT}`);
  }
}

export function validateJWTConfig(config: AppConfig): void {
  if (!config.JWT_SECRET || !config.DOWNLOAD_JWT_SECRET) {
    throw new Error('Missing required JWT configuration');
  }
}

export function validateStorageConfig(config: AppConfig): void {
  if (!config.STORAGE_BACKEND || !['s3', 'azure', 'local'].includes(config.STORAGE_BACKEND)) {
    throw new Error(`Invalid storage backend: ${config.STORAGE_BACKEND}`);
  }
  
  if (config.STORAGE_TIMEOUT_MS < 1000) {
    throw new Error(`Storage timeout too low: ${config.STORAGE_TIMEOUT_MS}ms`);
  }
}

export function validateCLIConfig(config: AppConfig): void {
  if (config.CLI_CONCURRENT_DOWNLOADS < 1 || config.CLI_CONCURRENT_DOWNLOADS > 50) {
    throw new Error(`Invalid CLI concurrent downloads: ${config.CLI_CONCURRENT_DOWNLOADS}`);
  }
  
  if (config.CLI_BATCH_SIZE < 10 || config.CLI_BATCH_SIZE > 10000) {
    throw new Error(`Invalid CLI batch size: ${config.CLI_BATCH_SIZE}`);
  }
}

export function validateNewRelicConfig(config: AppConfig): void {
  if (config.NEW_RELIC_ENABLED && (!config.NEW_RELIC_LICENSE_KEY || !config.NEW_RELIC_ACCOUNT_ID)) {
    throw new Error('New Relic enabled but missing required configuration');
  }
}

// =============================================================================
// CONFIGURATION INTEGRATION HELPERS
// =============================================================================

export function getStorageStrategyPriority(config: AppConfig): string[] {
  return config.STORAGE_STRATEGY_PRIORITY;
}

export function isStorageEmulatorEnabled(config: AppConfig): boolean {
  return config.STORAGE_EMULATOR;
}

export function getCLIConcurrencySettings(config: AppConfig) {
  return {
    concurrentDownloads: config.CLI_CONCURRENT_DOWNLOADS,
    concurrentUploads: config.CLI_CONCURRENT_UPLOADS,
    batchSize: config.CLI_BATCH_SIZE,
    maxBatchSize: config.CLI_MAX_BATCH_SIZE,
  };
}

export function getResilienceSettings(config: AppConfig) {
  return {
    circuitBreaker: {
      failureThreshold: config.CIRCUIT_BREAKER_FAILURE_THRESHOLD,
      timeoutMs: config.CIRCUIT_BREAKER_TIMEOUT_MS,
      enabled: config.CIRCUIT_BREAKER_ENABLED,
    },
    retry: {
      maxAttempts: config.RETRY_POLICY_MAX_ATTEMPTS,
      baseDelayMs: config.RETRY_POLICY_BASE_DELAY_MS,
      maxDelayMs: config.RETRY_POLICY_MAX_DELAY_MS,
      enabled: config.RETRY_POLICY_ENABLED,
    },
  };
}

// =============================================================================
// CONFIGURATION EXPORTS
// =============================================================================

export {
  ServerConfigSchema,
  DatabaseConfigSchema,
  JWTConfigSchema,
  CircuitBreakerConfigSchema,
  RetryPolicyConfigSchema,
  NewRelicConfigSchema,
  EmulatorConfigSchema,
  MetricsConfigSchema,
  PerformanceMonitoringConfigSchema,
  StorageConfigSchema,
  CLIConfigSchema,
  DevelopmentConfigSchema,
  environmentDefaults,
}; 