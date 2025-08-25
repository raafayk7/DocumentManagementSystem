// src/adapters/primary/commander/cli.ts
import { Command } from 'commander';
import { z } from 'zod';
import type { AppConfig } from '../../../shared/config/config.js';

// CLI argument validation schema
const CliArgsSchema = z.object({
  mode: z.enum(['dev', 'prod', 'test']).default('dev'),
  port: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(65535)).optional(),
  host: z.string().optional(),
  help: z.boolean().optional(),
  
  // Storage configuration overrides
  storageBackend: z.enum(['s3', 'azure', 'local']).optional(),
  storageEmulator: z.string().transform(val => val === 'true').optional(),
  storageFallback: z.string().transform(val => val === 'true').optional(),
  
  // CLI configuration overrides
  cliConcurrentDownloads: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(50)).optional(),
  cliBatchSize: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(10).max(10000)).optional(),
  cliVerbose: z.string().transform(val => val === 'true').optional(),
  
  // Performance configuration overrides
  performanceSampleRate: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0).max(1)).optional(),
  metricsEnabled: z.string().transform(val => val === 'true').optional(),
  
  // New Relic configuration overrides
  newRelicEnabled: z.string().transform(val => val === 'true').optional(),
  newRelicAppName: z.string().optional(),
});

export type CliArgs = z.infer<typeof CliArgsSchema>;

// Mode configuration with enhanced settings
export const modeConfig = {
  dev: {
    logging: 'debug',
    healthChecks: true,
    shutdownDelay: 10000,
    validation: 'relaxed',
    storageEmulator: true,
    storageFallback: true,
    cliVerbose: true,
    cliProgress: true,
    metricsDevMode: true,
    performanceSampleRate: 1.0,
    newRelicEnabled: true,
  },
  prod: {
    logging: 'info',
    healthChecks: true,
    shutdownDelay: 0,
    validation: 'strict',
    storageEmulator: false,
    storageFallback: true,
    cliVerbose: false,
    cliProgress: false,
    metricsDevMode: false,
    performanceSampleRate: 0.1,
    newRelicEnabled: true,
  },
  test: {
    logging: 'error',
    healthChecks: false,
    shutdownDelay: 0,
    validation: 'minimal',
    storageEmulator: true,
    storageFallback: false,
    cliVerbose: false,
    cliProgress: false,
    metricsDevMode: false,
    performanceSampleRate: 0.0,
    newRelicEnabled: false,
  },
} as const;

export type StartupMode = keyof typeof modeConfig;

// Parse CLI arguments
export function parseCliArgs(): CliArgs {
  const program = new Command();

  program
    .name('headless-dms')
    .description('Headless Document Management System')
    .version('1.0.0')
    .option('-m, --mode <mode>', 'Startup mode (dev, prod, test)', 'dev')
    .option('-p, --port <port>', 'Server port', '3000')
    .option('-h, --host <host>', 'Server host', '0.0.0.0')
    
    // Storage configuration options
    .option('--storage-backend <backend>', 'Storage backend (s3, azure, local)')
    .option('--storage-emulator <enabled>', 'Enable/disable storage emulator (true/false)')
    .option('--storage-fallback <enabled>', 'Enable/disable storage fallback (true/false)')
    
    // CLI configuration options
    .option('--cli-concurrent-downloads <count>', 'CLI concurrent downloads (1-50)')
    .option('--cli-batch-size <size>', 'CLI batch size (10-10000)')
    .option('--cli-verbose <enabled>', 'CLI verbose logging (true/false)')
    
    // Performance configuration options
    .option('--performance-sample-rate <rate>', 'Performance monitoring sample rate (0.0-1.0)')
    .option('--metrics-enabled <enabled>', 'Enable/disable metrics (true/false)')
    
    // New Relic configuration options
    .option('--new-relic-enabled <enabled>', 'Enable/disable New Relic (true/false)')
    .option('--new-relic-app-name <name>', 'New Relic application name')
    
    .helpOption('-H, --help', 'Display help information');

  program.parse();

  const options = program.opts();

  try {
    // Validate CLI arguments
    const validatedArgs = CliArgsSchema.parse({
      mode: options.mode,
      port: options.port,
      host: options.host,
      help: options.help,
      storageBackend: options.storageBackend,
      storageEmulator: options.storageEmulator,
      storageFallback: options.storageFallback,
      cliConcurrentDownloads: options.cliConcurrentDownloads,
      cliBatchSize: options.cliBatchSize,
      cliVerbose: options.cliVerbose,
      performanceSampleRate: options.performanceSampleRate,
      metricsEnabled: options.metricsEnabled,
      newRelicEnabled: options.newRelicEnabled,
      newRelicAppName: options.newRelicAppName,
    });

    console.log('CLI arguments parsed successfully:', {
      mode: validatedArgs.mode,
      port: validatedArgs.port,
      host: validatedArgs.host,
      storageBackend: validatedArgs.storageBackend,
      storageEmulator: validatedArgs.storageEmulator,
      cliConcurrentDownloads: validatedArgs.cliConcurrentDownloads,
      cliBatchSize: validatedArgs.cliBatchSize,
    });

    return validatedArgs;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Invalid CLI arguments:');
      error.issues.forEach((err: any) => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
    } else {
      console.error('CLI argument parsing failed:', error);
    }
    process.exit(1);
  }
}

// Get mode configuration
export function getModeConfig(mode: StartupMode) {
  return modeConfig[mode];
}

// Apply CLI overrides to configuration
export function applyCliOverrides(config: AppConfig, cliArgs: CliArgs): AppConfig {
  const overriddenConfig = { ...config };
  
  // Apply storage overrides
  if (cliArgs.storageBackend) {
    overriddenConfig.STORAGE_BACKEND = cliArgs.storageBackend;
  }
  if (cliArgs.storageEmulator !== undefined) {
    overriddenConfig.STORAGE_EMULATOR = cliArgs.storageEmulator;
  }
  if (cliArgs.storageFallback !== undefined) {
    overriddenConfig.STORAGE_FALLBACK_ENABLED = cliArgs.storageFallback;
  }
  
  // Apply CLI overrides
  if (cliArgs.cliConcurrentDownloads) {
    overriddenConfig.CLI_CONCURRENT_DOWNLOADS = cliArgs.cliConcurrentDownloads;
  }
  if (cliArgs.cliBatchSize) {
    overriddenConfig.CLI_BATCH_SIZE = cliArgs.cliBatchSize;
  }
  if (cliArgs.cliVerbose !== undefined) {
    overriddenConfig.CLI_VERBOSE_LOGGING = cliArgs.cliVerbose;
  }
  
  // Apply performance overrides
  if (cliArgs.performanceSampleRate !== undefined) {
    overriddenConfig.PERFORMANCE_MONITORING_SAMPLE_RATE = cliArgs.performanceSampleRate;
  }
  if (cliArgs.metricsEnabled !== undefined) {
    overriddenConfig.METRICS_ENABLED = cliArgs.metricsEnabled;
  }
  
  // Apply New Relic overrides
  if (cliArgs.newRelicEnabled !== undefined) {
    overriddenConfig.NEW_RELIC_ENABLED = cliArgs.newRelicEnabled;
  }
  if (cliArgs.newRelicAppName) {
    overriddenConfig.NEW_RELIC_APP_NAME = cliArgs.newRelicAppName;
  }
  
  return overriddenConfig;
}

// Validate mode-specific configuration
export function validateModeConfig(mode: StartupMode, config: AppConfig): void {
  const modeSettings = getModeConfig(mode);
  
  console.log(`Validating ${mode} mode configuration:`, modeSettings);
  
  // Mode-specific validation rules
  switch (mode) {
    case 'dev':
      // Development mode is more permissive
      console.log('Development mode: Using relaxed validation rules');
      break;
      
    case 'prod':
      // Production mode requires stricter validation
      console.log('Production mode: Using strict validation rules');
      
      if (!config.JWT_SECRET || config.JWT_SECRET === 'supersecretkey') {
        throw new Error('Production mode requires secure JWT secrets');
      }
      
      if (config.STORAGE_EMULATOR) {
        throw new Error('Production mode cannot use storage emulators');
      }
      
      if (!config.NEW_RELIC_ENABLED) {
        console.warn('Production mode: New Relic monitoring is recommended');
      }
      
      if (config.PERFORMANCE_MONITORING_SAMPLE_RATE > 0.5) {
        console.warn('Production mode: High sample rate may impact performance');
      }
      break;
      
    case 'test':
      // Test mode allows insecure settings
      console.log('Test mode: Using minimal validation rules');
      
      if (config.STORAGE_EMULATOR === false) {
        console.warn('Test mode: Storage emulator is recommended for testing');
      }
      break;
  }
}

// Get configuration summary for logging
export function getConfigSummary(config: AppConfig, mode: StartupMode): Record<string, any> {
  const modeSettings = getModeConfig(mode);
  
  return {
    mode,
    modeSettings,
    server: {
      port: config.PORT,
      host: config.HOST,
      nodeEnv: config.NODE_ENV,
    },
    storage: {
      backend: config.STORAGE_BACKEND,
      emulator: config.STORAGE_EMULATOR,
      fallback: config.STORAGE_FALLBACK_ENABLED,
      strategyPriority: config.STORAGE_STRATEGY_PRIORITY,
    },
    cli: {
      concurrentDownloads: config.CLI_CONCURRENT_DOWNLOADS,
      concurrentUploads: config.CLI_CONCURRENT_UPLOADS,
      batchSize: config.CLI_BATCH_SIZE,
      verbose: config.CLI_VERBOSE_LOGGING,
    },
    resilience: {
      circuitBreaker: {
        enabled: config.CIRCUIT_BREAKER_ENABLED,
        failureThreshold: config.CIRCUIT_BREAKER_FAILURE_THRESHOLD,
        timeoutMs: config.CIRCUIT_BREAKER_TIMEOUT_MS,
      },
      retry: {
        enabled: config.RETRY_POLICY_ENABLED,
        maxAttempts: config.RETRY_POLICY_MAX_ATTEMPTS,
        baseDelayMs: config.RETRY_POLICY_BASE_DELAY_MS,
      },
    },
    observability: {
      newRelic: {
        enabled: config.NEW_RELIC_ENABLED,
        appName: config.NEW_RELIC_APP_NAME,
        distributedTracing: config.NEW_RELIC_DISTRIBUTED_TRACING_ENABLED,
      },
      metrics: {
        enabled: config.METRICS_ENABLED,
        devMode: config.METRICS_DEV_MODE,
      },
      performance: {
        enabled: config.PERFORMANCE_MONITORING_ENABLED,
        sampleRate: config.PERFORMANCE_MONITORING_SAMPLE_RATE,
      },
    },
  };
} 