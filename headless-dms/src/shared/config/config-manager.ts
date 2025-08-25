// src/shared/config/config-manager.ts
import { loadConfig, type AppConfig, validateDatabaseConfig, validateServerConfig, validateJWTConfig, validateStorageConfig, validateCLIConfig, validateNewRelicConfig } from './config.js';
import { parseCliArgs, applyCliOverrides, validateModeConfig, getConfigSummary, type StartupMode } from '../../adapters/primary/commander/cli.js';

// =============================================================================
// CONFIGURATION MANAGER
// =============================================================================

export class ConfigurationManager {
  private static instance: ConfigurationManager;
  private config: AppConfig | null = null;
  private cliArgs: any = null;
  private mode: StartupMode = 'dev';

  private constructor() {}

  // Singleton pattern
  public static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  // =============================================================================
  // CONFIGURATION LOADING
  // =============================================================================

  /**
   * Load configuration with proper priority handling
   * Priority: Command-line args > Environment variables > .env file > Environment defaults > Base defaults
   */
  public async loadConfiguration(): Promise<AppConfig> {
    try {
      console.log('🔄 Loading configuration...');

      // Step 1: Parse CLI arguments
      this.cliArgs = parseCliArgs();
      this.mode = this.cliArgs.mode;
      console.log(`📋 CLI mode: ${this.mode}`);

      // Step 2: Load base configuration from environment
      this.config = loadConfig();
      console.log('✅ Base configuration loaded');

      // Step 3: Apply CLI overrides
      this.config = applyCliOverrides(this.config, this.cliArgs);
      console.log('✅ CLI overrides applied');

      // Step 4: Validate mode-specific configuration
      validateModeConfig(this.mode, this.config);
      console.log('✅ Mode-specific validation passed');

      // Step 5: Validate all configuration sections
      this.validateConfiguration();
      console.log('✅ Configuration validation passed');

      // Step 6: Log configuration summary
      this.logConfigurationSummary();

      return this.config;
    } catch (error) {
      console.error('❌ Configuration loading failed:', error);
      throw error;
    }
  }

  // =============================================================================
  // CONFIGURATION VALIDATION
  // =============================================================================

  private validateConfiguration(): void {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }

    // Validate critical configuration sections
    validateDatabaseConfig(this.config);
    validateServerConfig(this.config);
    validateJWTConfig(this.config);
    validateStorageConfig(this.config);
    validateCLIConfig(this.config);
    validateNewRelicConfig(this.config);

    // Additional validation based on mode
    this.validateModeSpecificConfiguration();
  }

  private validateModeSpecificConfiguration(): void {
    if (!this.config) return;

    switch (this.mode) {
      case 'prod':
        this.validateProductionConfiguration();
        break;
      case 'test':
        this.validateTestConfiguration();
        break;
      case 'dev':
        this.validateDevelopmentConfiguration();
        break;
    }
  }

  private validateProductionConfiguration(): void {
    if (!this.config) return;

    // Production-specific validations
    if (this.config.STORAGE_EMULATOR) {
      throw new Error('Production mode: Storage emulators are not allowed');
    }

    if (this.config.JWT_SECRET === 'supersecretkey') {
      throw new Error('Production mode: Default JWT secret is not allowed');
    }

    if (this.config.DOWNLOAD_JWT_SECRET === 'supersecretdownloadkey') {
      throw new Error('Production mode: Default download JWT secret is not allowed');
    }

    if (this.config.DB_PASSWORD === 'kaz7/postgres') {
      throw new Error('Production mode: Default database password is not allowed');
    }

    if (!this.config.NEW_RELIC_ENABLED) {
      console.warn('⚠️  Production mode: New Relic monitoring is recommended');
    }

    if (this.config.PERFORMANCE_MONITORING_SAMPLE_RATE > 0.5) {
      console.warn('⚠️  Production mode: High performance monitoring sample rate may impact performance');
    }
  }

  private validateTestConfiguration(): void {
    if (!this.config) return;

    // Test-specific validations
    if (this.config.STORAGE_EMULATOR === false) {
      console.warn('⚠️  Test mode: Storage emulators are recommended for testing');
    }

    if (this.config.METRICS_ENABLED) {
      console.warn('⚠️  Test mode: Metrics collection may interfere with test results');
    }

    if (this.config.NEW_RELIC_ENABLED) {
      console.warn('⚠️  Test mode: New Relic integration may interfere with test results');
    }
  }

  private validateDevelopmentConfiguration(): void {
    if (!this.config) return;

    // Development-specific validations
    if (this.config.STORAGE_EMULATOR === false) {
      console.warn('⚠️  Development mode: Storage emulators are recommended for local development');
    }

    if (this.config.PERFORMANCE_MONITORING_SAMPLE_RATE < 0.5) {
      console.warn('⚠️  Development mode: Low performance monitoring sample rate may miss issues');
    }
  }

  // =============================================================================
  // CONFIGURATION ACCESS
  // =============================================================================

  public getConfig(): AppConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfiguration() first.');
    }
    return this.config;
  }

  public getCliArgs(): any {
    if (!this.cliArgs) {
      throw new Error('CLI arguments not parsed. Call loadConfiguration() first.');
    }
    return this.cliArgs;
  }

  public getMode(): StartupMode {
    return this.mode;
  }

  // =============================================================================
  // CONFIGURATION HELPERS
  // =============================================================================

  public getStorageConfiguration() {
    const config = this.getConfig();
    return {
      backend: config.STORAGE_BACKEND,
      emulator: config.STORAGE_EMULATOR,
      fallback: config.STORAGE_FALLBACK_ENABLED,
      strategyPriority: config.STORAGE_STRATEGY_PRIORITY,
      timeout: config.STORAGE_TIMEOUT_MS,
      retryAttempts: config.STORAGE_RETRY_ATTEMPTS,
      circuitBreakerThreshold: config.STORAGE_CIRCUIT_BREAKER_THRESHOLD,
      healthCheck: {
        interval: config.STORAGE_HEALTH_CHECK_INTERVAL,
        timeout: config.STORAGE_HEALTH_CHECK_TIMEOUT,
        maxRetries: config.STORAGE_HEALTH_CHECK_MAX_RETRIES,
      },
      performance: {
        slowThreshold: config.STORAGE_SLOW_OPERATION_THRESHOLD,
        criticalThreshold: config.STORAGE_CRITICAL_OPERATION_THRESHOLD,
      },
      fallback: {
        strategy: config.STORAGE_FALLBACK_STRATEGY,
        timeout: config.STORAGE_FALLBACK_TIMEOUT_MS,
        maxRetries: config.STORAGE_FALLBACK_MAX_RETRIES,
      },
      metrics: {
        enabled: config.STORAGE_METRICS_ENABLED,
        sampleRate: config.STORAGE_METRICS_SAMPLE_RATE,
        trackOperations: config.STORAGE_METRICS_TRACK_OPERATIONS,
        trackErrors: config.STORAGE_METRICS_TRACK_ERRORS,
        trackPerformance: config.STORAGE_METRICS_TRACK_PERFORMANCE,
      },
      logging: {
        enabled: config.STORAGE_LOGGING_ENABLED,
        level: config.STORAGE_LOGGING_LEVEL,
        trackOperations: config.STORAGE_LOGGING_TRACK_OPERATIONS,
        trackErrors: config.STORAGE_LOGGING_TRACK_ERRORS,
        trackPerformance: config.STORAGE_LOGGING_TRACK_PERFORMANCE,
      },
    };
  }

  public getCLIConfiguration() {
    const config = this.getConfig();
    return {
      concurrency: {
        downloads: config.CLI_CONCURRENT_DOWNLOADS,
        uploads: config.CLI_CONCURRENT_UPLOADS,
      },
      batch: {
        size: config.CLI_BATCH_SIZE,
        maxSize: config.CLI_MAX_BATCH_SIZE,
      },
      timeout: {
        operation: config.CLI_OPERATION_TIMEOUT_MS,
        retry: config.CLI_RETRY_DELAY_MS,
      },
      retry: {
        attempts: config.CLI_RETRY_ATTEMPTS,
      },
      progress: {
        enabled: config.CLI_PROGRESS_ENABLED,
        updateInterval: config.CLI_PROGRESS_UPDATE_INTERVAL,
      },
      logging: {
        verbose: config.CLI_VERBOSE_LOGGING,
        enabled: config.CLI_LOGGING_ENABLED,
        level: config.CLI_LOGGING_LEVEL,
      },
      resources: {
        maxMemoryMB: config.CLI_MAX_MEMORY_USAGE_MB,
        maxFileSizeMB: config.CLI_MAX_FILE_SIZE_MB,
        tempDirectory: config.CLI_TEMP_DIRECTORY,
      },
      authentication: {
        required: config.CLI_AUTH_REQUIRED,
        tokenExpiryHours: config.CLI_AUTH_TOKEN_EXPIRY_HOURS,
        refreshEnabled: config.CLI_AUTH_REFRESH_ENABLED,
      },
      backgroundJobs: {
        enabled: config.CLI_BACKGROUND_JOBS_ENABLED,
        maxConcurrent: config.CLI_BACKGROUND_JOBS_MAX_CONCURRENT,
        queueSize: config.CLI_BACKGROUND_JOBS_QUEUE_SIZE,
        persistence: config.CLI_BACKGROUND_JOBS_PERSISTENCE,
      },
      health: {
        enabled: config.CLI_HEALTH_CHECK_ENABLED,
        interval: config.CLI_HEALTH_CHECK_INTERVAL,
        timeout: config.CLI_HEALTH_CHECK_TIMEOUT,
      },
      metrics: {
        enabled: config.CLI_METRICS_ENABLED,
        sampleRate: config.CLI_METRICS_SAMPLE_RATE,
      },
    };
  }

  public getResilienceConfiguration() {
    const config = this.getConfig();
    return {
      circuitBreaker: {
        enabled: config.CIRCUIT_BREAKER_ENABLED,
        failureThreshold: config.CIRCUIT_BREAKER_FAILURE_THRESHOLD,
        timeoutMs: config.CIRCUIT_BREAKER_TIMEOUT_MS,
        halfOpenMaxCalls: config.CIRCUIT_BREAKER_HALF_OPEN_MAX_CALLS,
        successThreshold: config.CIRCUIT_BREAKER_SUCCESS_THRESHOLD,
        maxHistorySize: config.CIRCUIT_BREAKER_MAX_HISTORY_SIZE,
        name: config.CIRCUIT_BREAKER_NAME,
        metricsEnabled: config.CIRCUIT_BREAKER_METRICS_ENABLED,
      },
      retry: {
        enabled: config.RETRY_POLICY_ENABLED,
        maxAttempts: config.RETRY_POLICY_MAX_ATTEMPTS,
        baseDelayMs: config.RETRY_POLICY_BASE_DELAY_MS,
        maxDelayMs: config.RETRY_POLICY_MAX_DELAY_MS,
        backoffMultiplier: config.RETRY_POLICY_BACKOFF_MULTIPLIER,
        jitterFactor: config.RETRY_POLICY_JITTER_FACTOR,
        attemptTimeoutMs: config.RETRY_POLICY_ATTEMPT_TIMEOUT_MS,
        totalTimeoutMs: config.RETRY_POLICY_TOTAL_TIMEOUT_MS,
        jitterEnabled: config.RETRY_POLICY_JITTER_ENABLED,
        name: config.RETRY_POLICY_NAME,
      },
    };
  }

  public getObservabilityConfiguration() {
    const config = this.getConfig();
    return {
      newRelic: {
        enabled: config.NEW_RELIC_ENABLED,
        licenseKey: config.NEW_RELIC_LICENSE_KEY,
        appName: config.NEW_RELIC_APP_NAME,
        accountId: config.NEW_RELIC_ACCOUNT_ID,
        logLevel: config.NEW_RELIC_LOG_LEVEL,
        distributedTracing: config.NEW_RELIC_DISTRIBUTED_TRACING_ENABLED,
        apdexTarget: config.NEW_RELIC_APDEX_TARGET,
      },
      metrics: {
        enabled: config.METRICS_ENABLED,
        bufferSize: config.METRICS_BUFFER_SIZE,
        flushInterval: config.METRICS_FLUSH_INTERVAL,
        newRelicEnabled: config.METRICS_NEW_RELIC_ENABLED,
        newRelicBufferSize: config.METRICS_NEW_RELIC_BUFFER_SIZE,
        devMode: config.METRICS_DEV_MODE,
        testMode: config.METRICS_TEST_MODE,
      },
      performance: {
        enabled: config.PERFORMANCE_MONITORING_ENABLED,
        sampleRate: config.PERFORMANCE_MONITORING_SAMPLE_RATE,
        storage: config.PERFORMANCE_MONITORING_STORAGE,
        api: config.PERFORMANCE_MONITORING_API,
        database: config.PERFORMANCE_MONITORING_DATABASE,
        files: config.PERFORMANCE_MONITORING_FILES,
      },
    };
  }

  // =============================================================================
  // CONFIGURATION LOGGING
  // =============================================================================

  private logConfigurationSummary(): void {
    if (!this.config) return;

    const summary = getConfigSummary(this.config, this.mode);
    
    console.log('\n📊 Configuration Summary:');
    console.log('=' .repeat(50));
    console.log(`Mode: ${summary.mode}`);
    console.log(`Environment: ${summary.server.nodeEnv}`);
    console.log(`Server: ${summary.server.host}:${summary.server.port}`);
    
    console.log('\n🗄️  Storage Configuration:');
    console.log(`  Backend: ${summary.storage.backend}`);
    console.log(`  Emulator: ${summary.storage.emulator}`);
    console.log(`  Fallback: ${summary.storage.fallback}`);
    console.log(`  Priority: ${summary.storage.strategyPriority.join(' → ')}`);
    
    console.log('\n⚡ CLI Configuration:');
    console.log(`  Concurrent Downloads: ${summary.cli.concurrentDownloads}`);
    console.log(`  Concurrent Uploads: ${summary.cli.concurrentUploads}`);
    console.log(`  Batch Size: ${summary.cli.batchSize}`);
    console.log(`  Verbose: ${summary.cli.verbose}`);
    
    console.log('\n🔄 Resilience Configuration:');
    console.log(`  Circuit Breaker: ${summary.resilience.circuitBreaker.enabled ? '✅' : '❌'}`);
    console.log(`  Retry Policy: ${summary.resilience.retry.enabled ? '✅' : '❌'}`);
    
    console.log('\n👁️  Observability Configuration:');
    console.log(`  New Relic: ${summary.observability.newRelic.enabled ? '✅' : '❌'}`);
    console.log(`  Metrics: ${summary.observability.metrics.enabled ? '✅' : '❌'}`);
    console.log(`  Performance: ${summary.observability.performance.enabled ? '✅' : '❌'}`);
    
    console.log('=' .repeat(50));
    console.log('✅ Configuration loaded successfully!\n');
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  public isDevelopmentMode(): boolean {
    return this.mode === 'dev';
  }

  public isProductionMode(): boolean {
    return this.mode === 'prod';
  }

  public isTestMode(): boolean {
    return this.mode === 'test';
  }

  public isStorageEmulatorEnabled(): boolean {
    return this.config?.STORAGE_EMULATOR ?? false;
  }

  public isNewRelicEnabled(): boolean {
    return this.config?.NEW_RELIC_ENABLED ?? false;
  }

  public isMetricsEnabled(): boolean {
    return this.config?.METRICS_ENABLED ?? false;
  }

  public isPerformanceMonitoringEnabled(): boolean {
    return this.config?.PERFORMANCE_MONITORING_ENABLED ?? false;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default ConfigurationManager;
