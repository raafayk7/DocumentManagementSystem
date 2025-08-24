import { z } from 'zod';
import { AppResult, AppError } from '@carbonteq/hexapp';

/**
 * New Relic configuration schema and validation
 */
const NewRelicConfigSchema = z.object({
  licenseKey: z.string().min(1, 'New Relic license key is required'),
  appName: z.string().min(1, 'New Relic app name is required').default('Headless-DMS'),
  accountId: z.string().min(1, 'New Relic account ID is required'),
  enabled: z.boolean().default(true),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  distributedTracingEnabled: z.boolean().default(true),
  apdexTarget: z.number().min(0).max(1).default(0.5),
  region: z.enum(['US', 'EU']).default('US'),
  customAttributes: z.record(z.string(), z.unknown()).default({}),
});

export type NewRelicConfig = z.infer<typeof NewRelicConfigSchema>;

/**
 * New Relic configuration manager
 * Handles environment variable loading, validation, and configuration management
 */
export class NewRelicConfigManager {
  private static instance: NewRelicConfigManager;
  private config: NewRelicConfig | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): NewRelicConfigManager {
    if (!NewRelicConfigManager.instance) {
      NewRelicConfigManager.instance = new NewRelicConfigManager();
    }
    return NewRelicConfigManager.instance;
  }

  /**
   * Load and validate configuration from environment variables
   */
  loadConfig(): AppResult<NewRelicConfig> {
    try {
      const envConfig = {
        licenseKey: process.env.NEW_RELIC_LICENSE_KEY,
        appName: process.env.NEW_RELIC_APP_NAME,
        accountId: process.env.NEW_RELIC_ACCOUNT_ID,
        enabled: process.env.NEW_RELIC_ENABLED === 'true',
        logLevel: process.env.NEW_RELIC_LOG_LEVEL,
        distributedTracingEnabled: process.env.NEW_RELIC_DISTRIBUTED_TRACING_ENABLED === 'true',
        apdexTarget: process.env.NEW_RELIC_APDEX_TARGET ? parseFloat(process.env.NEW_RELIC_APDEX_TARGET) : undefined,
        region: process.env.NEW_RELIC_REGION,
        customAttributes: this.parseCustomAttributes(process.env.NEW_RELIC_CUSTOM_ATTRIBUTES),
      };

      // Filter out undefined values
      const filteredConfig = Object.fromEntries(
        Object.entries(envConfig).filter(([_, value]) => value !== undefined)
      );

      const result = NewRelicConfigSchema.safeParse(filteredConfig);
      
      if (!result.success) {
        const errorMessage = result.error.issues.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ');
        return AppResult.Err(AppError.InvalidData(`New Relic configuration validation failed: ${errorMessage}`));
      }

      this.config = result.data;
      return AppResult.Ok(this.config);
    } catch (error) {
      return AppResult.Err(AppError.Generic(`Failed to load New Relic configuration: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AppResult<NewRelicConfig> {
    if (!this.config) {
      return this.loadConfig();
    }
    return AppResult.Ok(this.config);
  }

  /**
   * Check if New Relic is enabled
   */
  isEnabled(): boolean {
    const config = this.getConfig();
    return config.isOk() && config.unwrap().enabled;
  }

  /**
   * Get license key
   */
  getLicenseKey(): AppResult<string> {
    const config = this.getConfig();
    if (config.isErr()) {
      return AppResult.Err(config.unwrapErr());
    }
    return AppResult.Ok(config.unwrap().licenseKey);
  }

  /**
   * Get app name
   */
  getAppName(): AppResult<string> {
    const config = this.getConfig();
    if (config.isErr()) {
      return AppResult.Err(config.unwrapErr());
    }
    return AppResult.Ok(config.unwrap().appName);
  }

  /**
   * Get account ID
   */
  getAccountId(): AppResult<string> {
    const config = this.getConfig();
    if (config.isErr()) {
      return AppResult.Err(config.unwrapErr());
    }
    return AppResult.Ok(config.unwrap().accountId);
  }

  /**
   * Parse custom attributes from environment variable
   * Format: "key1:value1,key2:value2"
   */
  private parseCustomAttributes(attributesString?: string): Record<string, unknown> {
    if (!attributesString) {
      return {};
    }

    try {
      const attributes: Record<string, unknown> = {};
      const pairs = attributesString.split(',');

      for (const pair of pairs) {
        const [key, value] = pair.split(':').map(s => s.trim());
        if (key && value) {
          // Try to parse as JSON, fallback to string
          try {
            attributes[key] = JSON.parse(value);
          } catch {
            attributes[key] = value;
          }
        }
      }

      return attributes;
    } catch (error) {
      console.warn('Failed to parse New Relic custom attributes:', error);
      return {};
    }
  }

  /**
   * Validate configuration is complete
   */
  validateConfig(): AppResult<boolean> {
    const config = this.getConfig();
    if (config.isErr()) {
      return AppResult.Err(config.unwrapErr());
    }

    const cfg = config.unwrap();
    const requiredFields = ['licenseKey', 'appName', 'accountId'];
    
    for (const field of requiredFields) {
      if (!cfg[field as keyof NewRelicConfig]) {
        return AppResult.Err(AppError.InvalidData(`Missing required New Relic configuration: ${field}`));
      }
    }

    return AppResult.Ok(true);
  }

  /**
   * Get configuration summary for logging
   */
  getConfigSummary(): AppResult<string> {
    const config = this.getConfig();
    if (config.isErr()) {
      return AppResult.Err(config.unwrapErr());
    }

    const cfg = config.unwrap();
    return AppResult.Ok(
      `New Relic Config: App=${cfg.appName}, Account=${cfg.accountId}, Region=${cfg.region}, Enabled=${cfg.enabled}`
    );
  }
}

/**
 * Export singleton instance
 */
export const newRelicConfig = NewRelicConfigManager.getInstance();
