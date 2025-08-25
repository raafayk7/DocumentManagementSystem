// src/shared/config/index.ts

// Main configuration exports
export { 
  loadConfig, 
  type AppConfig,
  validateDatabaseConfig,
  validateServerConfig,
  validateJWTConfig,
  validateStorageConfig,
  validateCLIConfig,
  validateNewRelicConfig,
  getStorageStrategyPriority,
  isStorageEmulatorEnabled,
  getCLIConcurrencySettings,
  getResilienceSettings,
} from './config.js';

// Configuration manager
export { default as ConfigurationManager } from './config-manager.js';

// Individual schema exports
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
} from './config.js';

// Default configuration
export { default as config } from './config.js';
