import { injectable } from 'tsyringe';
import type { AppResult } from '@carbonteq/hexapp';
import type { IStorageStrategy } from '../../../ports/output/IStorageStrategy.js';
import type { StorageStrategyConfig, StorageHealth } from '../../../shared/storage/StorageTypes.js';
import { storageConfig } from '../../../shared/storage/StorageConfig.js';

/**
 * StorageStrategyFactory - manages strategy selection, fallback, and health monitoring
 * This factory will select the appropriate storage strategy based on configuration and health
 */
@injectable()
export class StorageStrategyFactory {
  private strategies: Map<string, IStorageStrategy> = new Map();
  private strategyConfigs: StorageStrategyConfig[] = [];
  private healthCache: Map<string, { health: StorageHealth; lastChecked: Date }> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeStrategies();
    this.startHealthMonitoring();
  }

  /**
   * Initialize available storage strategies
   */
  private initializeStrategies(): void {
    this.strategyConfigs = storageConfig.getDefaultStrategyConfig();
    
    // Log available strategies
    console.log('Storage Strategy Factory initialized with strategies:', 
      this.strategyConfigs.map(s => `${s.name} (${s.type}) - Priority: ${s.priority}`));
  }

  /**
   * Register a storage strategy
   * @param strategy - Storage strategy implementation
   * @param config - Strategy configuration
   */
  registerStrategy(strategy: IStorageStrategy, config: StorageStrategyConfig): void {
    this.strategies.set(config.id, strategy);
    console.log(`Registered storage strategy: ${config.name} (${config.id})`);
  }

  /**
   * Get the primary storage strategy based on configuration
   * @returns Primary storage strategy or null if none available
   */
  getPrimaryStrategy(): IStorageStrategy | null {
    const primaryConfig = this.strategyConfigs.find(config => 
      config.enabled && config.priority === 1
    );

    if (!primaryConfig) {
      // Fallback to highest priority enabled strategy
      const fallbackConfig = this.strategyConfigs
        .filter(config => config.enabled)
        .sort((a, b) => a.priority - b.priority)[0];

      if (fallbackConfig) {
        return this.strategies.get(fallbackConfig.id) || null;
      }
    }

    return primaryConfig ? this.strategies.get(primaryConfig.id) || null : null;
  }

  /**
   * Get a specific storage strategy by ID
   * @param strategyId - Strategy identifier
   * @returns Storage strategy or null if not found
   */
  getStrategy(strategyId: string): IStorageStrategy | null {
    return this.strategies.get(strategyId) || null;
  }

  /**
   * Get all available storage strategies
   * @returns Array of all registered strategies
   */
  getAllStrategies(): IStorageStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Get strategies by type
   * @param type - Strategy type (local, s3, azure, custom)
   * @returns Array of strategies of the specified type
   */
  getStrategiesByType(type: string): IStorageStrategy[] {
    const configs = this.strategyConfigs.filter(config => 
      config.type === type && config.enabled
    );
    
    return configs
      .map(config => this.strategies.get(config.id))
      .filter((strategy): strategy is IStorageStrategy => strategy !== null);
  }

  /**
   * Select the best available strategy based on health and priority
   * @param preferredType - Preferred strategy type (optional)
   * @returns Best available strategy or null if none available
   */
  selectBestStrategy(preferredType?: string): IStorageStrategy | null {
    // Filter enabled strategies
    let availableConfigs = this.strategyConfigs.filter(config => config.enabled);

    // Filter by preferred type if specified
    if (preferredType) {
      availableConfigs = availableConfigs.filter(config => config.type === preferredType);
    }

    if (availableConfigs.length === 0) {
      console.warn('No available storage strategies found');
      return null;
    }

    // Sort by health status first, then by priority
    const healthyConfigs = availableConfigs.filter(config => {
      const health = this.healthCache.get(config.id);
      return health && health.health.status === 'healthy';
    });

    if (healthyConfigs.length === 0) {
      console.warn('No healthy storage strategies found, using degraded strategies');
      return this.selectStrategyByPriority(availableConfigs);
    }

    return this.selectStrategyByPriority(healthyConfigs);
  }

  /**
   * Select strategy by priority (lower number = higher priority)
   * @param configs - Available strategy configurations
   * @returns Highest priority strategy
   */
  private selectStrategyByPriority(configs: StorageStrategyConfig[]): IStorageStrategy | null {
    const sortedConfigs = configs.sort((a, b) => a.priority - b.priority);
    const bestConfig = sortedConfigs[0];
    
    if (!bestConfig) {
      return null;
    }

    const strategy = this.strategies.get(bestConfig.id);
    if (strategy) {
      console.log(`Selected storage strategy: ${bestConfig.name} (${bestConfig.id}) - Priority: ${bestConfig.priority}`);
    }

    return strategy || null;
  }

  /**
   * Get fallback strategy when primary strategy fails
   * @param failedStrategyId - ID of the failed strategy
   * @returns Fallback strategy or null if none available
   */
  getFallbackStrategy(failedStrategyId: string): IStorageStrategy | null {
    const failedConfig = this.strategyConfigs.find(config => config.id === failedStrategyId);
    
    if (!failedConfig || !failedConfig.allowFallback) {
      return null;
    }

    // Find alternative strategies with lower priority (higher fallback priority)
    const fallbackConfigs = this.strategyConfigs.filter(config => 
      config.enabled && 
      config.id !== failedStrategyId && 
      config.allowFallback &&
      config.priority > failedConfig.priority
    );

    if (fallbackConfigs.length === 0) {
      console.warn(`No fallback strategies available for ${failedConfig.name}`);
      return null;
    }

    // Select the highest priority fallback strategy
    const fallbackConfig = fallbackConfigs.sort((a, b) => a.priority - b.priority)[0];
    const fallbackStrategy = this.strategies.get(fallbackConfig.id);

    if (fallbackStrategy) {
      console.log(`Using fallback strategy: ${fallbackConfig.name} (${fallbackConfig.id})`);
    }

    return fallbackStrategy || null;
  }

  /**
   * Get strategy health information
   * @param strategyId - Strategy identifier
   * @returns Health information or null if not available
   */
  getStrategyHealth(strategyId: string): StorageHealth | null {
    const healthData = this.healthCache.get(strategyId);
    return healthData ? healthData.health : null;
  }

  /**
   * Get health status for all strategies
   * @returns Map of strategy ID to health status
   */
  getAllStrategyHealth(): Map<string, StorageHealth> {
    const healthMap = new Map<string, StorageHealth>();
    
    for (const [strategyId, healthData] of this.healthCache) {
      healthMap.set(strategyId, healthData.health);
    }
    
    return healthMap;
  }

  /**
   * Start health monitoring for all strategies
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, storageConfig.healthCheckInterval);

    console.log(`Started health monitoring with interval: ${storageConfig.healthCheckInterval}ms`);
  }

  /**
   * Perform health checks for all registered strategies
   */
  private async performHealthChecks(): Promise<void> {
    const healthPromises = Array.from(this.strategies.entries()).map(async ([strategyId, strategy]) => {
      try {
        const startTime = Date.now();
        const healthResult = await strategy.getHealth();
        const duration = Date.now() - startTime;

        if (healthResult.isOk()) {
          const health = healthResult.unwrap();
          this.healthCache.set(strategyId, {
            health,
            lastChecked: new Date()
          });

          // Log health status changes
          const previousHealth = this.healthCache.get(strategyId);
          if (previousHealth && previousHealth.health.status !== health.status) {
            console.log(`Strategy ${strategyId} health changed from ${previousHealth.health.status} to ${health.status}`);
          }
        } else {
          console.error(`Health check failed for strategy ${strategyId}:`, healthResult.unwrapErr());
          
          // Mark strategy as unhealthy
          this.healthCache.set(strategyId, {
            health: {
              status: 'unhealthy',
              responseTime: duration,
              successRate: 0,
              availableCapacity: 0,
              totalCapacity: 0,
              lastChecked: new Date(),
              error: healthResult.unwrapErr().message
            },
            lastChecked: new Date()
          });
        }
      } catch (error) {
        console.error(`Unexpected error during health check for strategy ${strategyId}:`, error);
      }
    });

    await Promise.allSettled(healthPromises);
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('Stopped health monitoring');
    }
  }

  /**
   * Get factory status and statistics
   * @returns Factory status information
   */
  getStatus(): {
    totalStrategies: number;
    enabledStrategies: number;
    healthyStrategies: number;
    unhealthyStrategies: number;
    primaryStrategy: string | null;
    healthCheckInterval: number;
  } {
    const totalStrategies = this.strategies.size;
    const enabledStrategies = this.strategyConfigs.filter(config => config.enabled).length;
    
    let healthyStrategies = 0;
    let unhealthyStrategies = 0;
    
    for (const healthData of this.healthCache.values()) {
      if (healthData.health.status === 'healthy') {
        healthyStrategies++;
      } else {
        unhealthyStrategies++;
      }
    }

    const primaryStrategy = this.getPrimaryStrategy()?.constructor.name || null;

    return {
      totalStrategies,
      enabledStrategies,
      healthyStrategies,
      unhealthyStrategies,
      primaryStrategy,
      healthCheckInterval: storageConfig.healthCheckInterval
    };
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stopHealthMonitoring();
    this.strategies.clear();
    this.healthCache.clear();
    console.log('StorageStrategyFactory disposed');
  }
}
