import { z } from 'zod';
import { AppResult, AppError } from '@carbonteq/hexapp';

/**
 * Environment-based emulator configuration schema
 */
const EmulatorConfigSchema = z.object({
  // Emulator mode
  USE_EMULATORS: z.string().transform(val => val === 'true'),
  
  // LocalStack configuration
  LOCALSTACK_ENDPOINT: z.string().default('http://127.0.0.1:4566'),
  LOCALSTACK_PORT: z.string().transform(val => parseInt(val, 10)).default(4566),
  LOCALSTACK_USE_PATH_STYLE: z.string().transform(val => val === 'true').default(true),
  LOCALSTACK_ACCESS_KEY: z.string().default('test'),
  LOCALSTACK_SECRET_KEY: z.string().default('test'),
  LOCALSTACK_REGION: z.string().default('us-east-1'),
  
  // Azurite configuration
  AZURITE_ENDPOINT: z.string().default('http://127.0.0.1:10000'),
  AZURITE_PORT: z.string().transform(val => parseInt(val, 10)).default(10000),
  AZURITE_ACCOUNT_NAME: z.string().default('devstoreaccount1'),
  AZURITE_ACCOUNT_KEY: z.string().default('Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw=='),
  
  // Health check configuration
  EMULATOR_HEALTH_CHECK_INTERVAL: z.string().transform(val => parseInt(val, 10)).default(30000), // 30 seconds
  EMULATOR_HEALTH_CHECK_TIMEOUT: z.string().transform(val => parseInt(val, 10)).default(5000),  // 5 seconds
  EMULATOR_HEALTH_CHECK_MAX_RETRIES: z.string().transform(val => parseInt(val, 10)).default(3),
});

/**
 * Emulator Configuration
 * Loads and validates emulator configuration from environment variables
 */
export class EmulatorConfig {
  private static instance: EmulatorConfig;
  private config: z.infer<typeof EmulatorConfigSchema>;

  private constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): EmulatorConfig {
    if (!EmulatorConfig.instance) {
      EmulatorConfig.instance = new EmulatorConfig();
    }
    return EmulatorConfig.instance;
  }

  /**
   * Load configuration from environment variables
   */
  private loadConfig(): z.infer<typeof EmulatorConfigSchema> {
    try {
      const envConfig = {
        USE_EMULATORS: process.env.USE_EMULATORS || 'false',
        LOCALSTACK_ENDPOINT: process.env.LOCALSTACK_ENDPOINT || 'http://127.0.0.1:4566',
        LOCALSTACK_PORT: process.env.LOCALSTACK_PORT || '4566',
        LOCALSTACK_USE_PATH_STYLE: process.env.LOCALSTACK_USE_PATH_STYLE || 'true',
        LOCALSTACK_ACCESS_KEY: process.env.LOCALSTACK_ACCESS_KEY || 'test',
        LOCALSTACK_SECRET_KEY: process.env.LOCALSTACK_SECRET_KEY || 'test',
        LOCALSTACK_REGION: process.env.LOCALSTACK_REGION || 'us-east-1',
        AZURITE_ENDPOINT: process.env.AZURITE_ENDPOINT || 'http://127.0.0.1:10000',
        AZURITE_PORT: process.env.AZURITE_PORT || '10000',
        AZURITE_ACCOUNT_NAME: process.env.AZURITE_ACCOUNT_NAME || 'devstoreaccount1',
        AZURITE_ACCOUNT_KEY: process.env.AZURITE_ACCOUNT_KEY || 'Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==',
        EMULATOR_HEALTH_CHECK_INTERVAL: process.env.EMULATOR_HEALTH_CHECK_INTERVAL || '30000',
        EMULATOR_HEALTH_CHECK_TIMEOUT: process.env.EMULATOR_HEALTH_CHECK_TIMEOUT || '5000',
        EMULATOR_HEALTH_CHECK_MAX_RETRIES: process.env.EMULATOR_HEALTH_CHECK_MAX_RETRIES || '3',
      };

      return EmulatorConfigSchema.parse(envConfig);
    } catch (error) {
      console.error('Failed to load emulator configuration:', error);
      throw new Error('Invalid emulator configuration');
    }
  }

  /**
   * Get complete emulator configuration
   */
  getConfig() {
    return {
      useEmulators: this.config.USE_EMULATORS,
      localStack: {
        endpoint: this.config.LOCALSTACK_ENDPOINT,
        port: this.config.LOCALSTACK_PORT,
        usePathStyle: this.config.LOCALSTACK_USE_PATH_STYLE,
        accessKey: this.config.LOCALSTACK_ACCESS_KEY,
        secretKey: this.config.LOCALSTACK_SECRET_KEY,
        region: this.config.LOCALSTACK_REGION,
      },
      azurite: {
        endpoint: this.config.AZURITE_ENDPOINT,
        port: this.config.AZURITE_PORT,
        accountName: this.config.AZURITE_ACCOUNT_NAME,
        accountKey: this.config.AZURITE_ACCOUNT_KEY,
      },
      healthCheck: {
        interval: this.config.EMULATOR_HEALTH_CHECK_INTERVAL,
        timeout: this.config.EMULATOR_HEALTH_CHECK_TIMEOUT,
        maxRetries: this.config.EMULATOR_HEALTH_CHECK_MAX_RETRIES,
      },
    };
  }

  /**
   * Check if emulators are enabled
   */
  isEmulatorMode(): boolean {
    return this.config.USE_EMULATORS;
  }

  /**
   * Get LocalStack configuration
   */
  getLocalStackConfig() {
    return {
      endpoint: this.config.LOCALSTACK_ENDPOINT,
      port: this.config.LOCALSTACK_PORT,
      usePathStyle: this.config.LOCALSTACK_USE_PATH_STYLE,
      accessKey: this.config.LOCALSTACK_ACCESS_KEY,
      secretKey: this.config.LOCALSTACK_SECRET_KEY,
      region: this.config.LOCALSTACK_REGION,
    };
  }

  /**
   * Get Azurite configuration
   */
  getAzuriteConfig() {
    return {
      endpoint: this.config.AZURITE_ENDPOINT,
      port: this.config.AZURITE_PORT,
      accountName: this.config.AZURITE_ACCOUNT_NAME,
      accountKey: this.config.AZURITE_ACCOUNT_KEY,
    };
  }

  /**
   * Get health check configuration
   */
  getHealthCheckConfig() {
    return {
      interval: this.config.EMULATOR_HEALTH_CHECK_INTERVAL,
      timeout: this.config.EMULATOR_HEALTH_CHECK_TIMEOUT,
      maxRetries: this.config.EMULATOR_HEALTH_CHECK_MAX_RETRIES,
    };
  }

  /**
   * Get configuration summary
   */
  getConfigSummary(): string {
    if (!this.config.USE_EMULATORS) {
      return 'Emulators: DISABLED (using cloud services)';
    }

    return `Emulators: ENABLED | LocalStack: ${this.config.LOCALSTACK_ENDPOINT} | Azurite: ${this.config.AZURITE_ENDPOINT}`;
  }

  /**
   * Validate configuration
   */
  validate(): AppResult<void> {
    try {
      // Validate LocalStack endpoint
      if (this.config.USE_EMULATORS) {
        const localStackUrl = new URL(this.config.LOCALSTACK_ENDPOINT);
        if (!localStackUrl.protocol.startsWith('http')) {
          return AppResult.Err(AppError.Generic('LocalStack endpoint must use HTTP/HTTPS protocol'));
        }

        // Validate Azurite endpoint
        const azuriteUrl = new URL(this.config.AZURITE_ENDPOINT);
        if (!azuriteUrl.protocol.startsWith('http')) {
          return AppResult.Err(AppError.Generic('Azurite endpoint must use HTTP/HTTPS protocol'));
        }

        // Validate ports
        if (this.config.LOCALSTACK_PORT < 1 || this.config.LOCALSTACK_PORT > 65535) {
          return AppResult.Err(AppError.Generic('LocalStack port must be between 1 and 65535'));
        }

        if (this.config.AZURITE_PORT < 1 || this.config.AZURITE_PORT > 65535) {
          return AppResult.Err(AppError.Generic('Azurite port must be between 1 and 65535'));
        }

        // Validate health check configuration
        if (this.config.EMULATOR_HEALTH_CHECK_INTERVAL < 1000) {
          return AppResult.Err(AppError.Generic('Health check interval must be at least 1000ms'));
        }

        if (this.config.EMULATOR_HEALTH_CHECK_TIMEOUT < 100) {
          return AppResult.Err(AppError.Generic('Health check timeout must be at least 100ms'));
        }

        if (this.config.EMULATOR_HEALTH_CHECK_MAX_RETRIES < 0) {
          return AppResult.Err(AppError.Generic('Health check max retries must be non-negative'));
        }
      }

      return AppResult.Ok(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      return AppResult.Err(AppError.Generic(`Configuration validation failed: ${errorMessage}`));
    }
  }

  /**
   * Reload configuration from environment
   */
  reload(): void {
    this.config = this.loadConfig();
  }
}
