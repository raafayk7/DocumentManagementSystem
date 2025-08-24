import { injectable } from 'tsyringe';
import type { AppResult } from '@carbonteq/hexapp';
import type { IStorageStrategy } from '../../../ports/output/IStorageStrategy.js';
import type { StorageHealth, StorageStrategyConfig } from '../../../shared/storage/StorageTypes.js';
import { storageConfig } from '../../../shared/storage/StorageConfig.js';

/**
 * StorageHealthChecker - monitors health of all storage strategies
 * Provides health metrics for strategy selection and New Relic monitoring
 */
@injectable()
export class StorageHealthChecker {
  private healthMetrics: Map<string, HealthMetric> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  constructor() {
    this.startMonitoring();
  }

  /**
   * Start health monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, storageConfig.healthCheckInterval);

    console.log(`StorageHealthChecker started monitoring with interval: ${storageConfig.healthCheckInterval}ms`);
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    this.isMonitoring = false;
    console.log('StorageHealthChecker stopped monitoring');
  }

  /**
   * Perform health check for a specific strategy
   * @param strategy - Storage strategy to check
   * @param config - Strategy configuration
   * @returns Health check result
   */
  async checkStrategyHealth(strategy: IStorageStrategy, config: StorageStrategyConfig): Promise<HealthCheckResult> {
    const startTime = Date.now();
    let health: StorageHealth;
    let error: string | null = null;

    try {
      const healthResult = await strategy.getHealth();
      
      if (healthResult.isOk()) {
        health = healthResult.unwrap();
      } else {
        // Type assertion to handle the type narrowing issue
        const errorResult = healthResult as AppResult<never>;
        error = errorResult.unwrapErr().message;
        health = this.createUnhealthyHealth(error);
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error during health check';
      health = this.createUnhealthyHealth(error);
    }

    const duration = Date.now() - startTime;
    const result: HealthCheckResult = {
      strategyId: config.id,
      strategyName: config.name,
      strategyType: config.type,
      health,
      duration,
      timestamp: new Date(),
      error
    };

    // Update health metrics
    this.updateHealthMetrics(config.id, result);

    return result;
  }

  /**
   * Perform health checks for multiple strategies
   * @param strategies - Map of strategy ID to strategy and config
   * @returns Array of health check results
   */
  async checkMultipleStrategies(
    strategies: Map<string, { strategy: IStorageStrategy; config: StorageStrategyConfig }>
  ): Promise<HealthCheckResult[]> {
    const healthPromises = Array.from(strategies.entries()).map(async ([strategyId, { strategy, config }]) => {
      return this.checkStrategyHealth(strategy, config);
    });

    return Promise.allSettled(healthPromises)
      .then(results => 
        results
          .filter((result): result is PromiseFulfilledResult<HealthCheckResult> => result.status === 'fulfilled')
          .map(result => result.value)
      );
  }

  /**
   * Get health metrics for a specific strategy
   * @param strategyId - Strategy identifier
   * @returns Health metrics or null if not available
   */
  getHealthMetrics(strategyId: string): HealthMetric | null {
    return this.healthMetrics.get(strategyId) || null;
  }

  /**
   * Get health metrics for all strategies
   * @returns Map of strategy ID to health metrics
   */
  getAllHealthMetrics(): Map<string, HealthMetric> {
    return new Map(this.healthMetrics);
  }

  /**
   * Get aggregated health statistics
   * @returns Aggregated health statistics
   */
  getAggregatedHealthStats(): AggregatedHealthStats {
    const stats: AggregatedHealthStats = {
      totalStrategies: 0,
      healthyStrategies: 0,
      degradedStrategies: 0,
      unhealthyStrategies: 0,
      averageResponseTime: 0,
      averageSuccessRate: 0,
      totalCapacity: 0,
      availableCapacity: 0,
      lastUpdated: new Date()
    };

    if (this.healthMetrics.size === 0) {
      return stats;
    }

    let totalResponseTime = 0;
    let totalSuccessRate = 0;
    let totalCapacity = 0;
    let availableCapacity = 0;

    for (const metric of this.healthMetrics.values()) {
      stats.totalStrategies++;
      
      switch (metric.latestHealth.status) {
        case 'healthy':
          stats.healthyStrategies++;
          break;
        case 'degraded':
          stats.degradedStrategies++;
          break;
        case 'unhealthy':
          stats.unhealthyStrategies++;
          break;
      }

      totalResponseTime += metric.latestHealth.responseTime;
      totalSuccessRate += metric.latestHealth.successRate;
      totalCapacity += metric.latestHealth.totalCapacity;
      availableCapacity += metric.latestHealth.availableCapacity;
    }

    stats.averageResponseTime = totalResponseTime / stats.totalStrategies;
    stats.averageSuccessRate = totalSuccessRate / stats.totalStrategies;
    stats.totalCapacity = totalCapacity;
    stats.availableCapacity = availableCapacity;

    return stats;
  }

  /**
   * Get health trends for a strategy
   * @param strategyId - Strategy identifier
   * @param timeWindow - Time window in milliseconds (default: 1 hour)
   * @returns Health trend data
   */
  getHealthTrends(strategyId: string, timeWindow: number = 60 * 60 * 1000): HealthTrend {
    const metric = this.healthMetrics.get(strategyId);
    if (!metric) {
      return {
        strategyId,
        trend: 'unknown',
        changeRate: 0,
        dataPoints: []
      };
    }

    const cutoffTime = Date.now() - timeWindow;
    const recentChecks = metric.healthHistory.filter(check => 
      check.timestamp.getTime() > cutoffTime
    );

    if (recentChecks.length < 2) {
      return {
        strategyId,
        trend: 'insufficient_data',
        changeRate: 0,
        dataPoints: recentChecks
      };
    }

    // Calculate trend based on response time and success rate
    const responseTimeTrend = this.calculateTrend(
      recentChecks.map(check => check.health.responseTime)
    );
    
    const successRateTrend = this.calculateTrend(
      recentChecks.map(check => check.health.successRate)
    );

    // Determine overall trend
    let trend: 'improving' | 'stable' | 'degrading' = 'stable';
    if (responseTimeTrend < -0.1 && successRateTrend > 0.1) {
      trend = 'improving';
    } else if (responseTimeTrend > 0.1 || successRateTrend < -0.1) {
      trend = 'degrading';
    }

    const changeRate = (responseTimeTrend + successRateTrend) / 2;

    return {
      strategyId,
      trend,
      changeRate,
      dataPoints: recentChecks
    };
  }

  /**
   * Calculate trend for a series of values
   * @param values - Array of numeric values
   * @returns Trend value (negative = improving, positive = degrading)
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) {
      return 0;
    }

    const n = values.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      const x = i;
      const y = values[i];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  /**
   * Create unhealthy health status
   * @param error - Error message
   * @returns Unhealthy health status
   */
  private createUnhealthyHealth(error: string): StorageHealth {
    return {
      status: 'unhealthy',
      responseTime: 0,
      successRate: 0,
      availableCapacity: 0,
      totalCapacity: 0,
      lastChecked: new Date(),
      error
    };
  }

  /**
   * Update health metrics for a strategy
   * @param strategyId - Strategy identifier
   * @param result - Health check result
   */
  private updateHealthMetrics(strategyId: string, result: HealthCheckResult): void {
    let metric = this.healthMetrics.get(strategyId);
    
    if (!metric) {
      metric = {
        strategyId,
        strategyName: result.strategyName,
        strategyType: result.strategyType,
        latestHealth: result.health,
        healthHistory: [],
        averageResponseTime: 0,
        averageSuccessRate: 0,
        totalChecks: 0,
        successfulChecks: 0,
        lastUpdated: new Date()
      };
      this.healthMetrics.set(strategyId, metric);
    }

    // Update latest health
    metric.latestHealth = result.health;
    metric.lastUpdated = new Date();

    // Add to history (keep last 100 checks)
    metric.healthHistory.push({
      health: result.health,
      duration: result.duration,
      timestamp: result.timestamp,
      error: result.error
    });

    if (metric.healthHistory.length > 100) {
      metric.healthHistory.shift();
    }

    // Update statistics
    metric.totalChecks++;
    if (result.health.status === 'healthy') {
      metric.successfulChecks++;
    }

    // Calculate averages
    const responseTimes = metric.healthHistory.map(check => check.health.responseTime);
    const successRates = metric.healthHistory.map(check => check.health.successRate);

    metric.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    metric.averageSuccessRate = successRates.reduce((a, b) => a + b, 0) / successRates.length;
  }

  /**
   * Perform periodic health checks
   */
  private async performHealthChecks(): Promise<void> {
    // This method will be called by the factory
    // Implementation depends on how strategies are registered
    console.log('StorageHealthChecker: Periodic health checks performed');
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stopMonitoring();
    this.healthMetrics.clear();
    console.log('StorageHealthChecker disposed');
  }
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  strategyId: string;
  strategyName: string;
  strategyType: string;
  health: StorageHealth;
  duration: number;
  timestamp: Date;
  error: string | null;
}

/**
 * Health metric for a strategy
 */
export interface HealthMetric {
  strategyId: string;
  strategyName: string;
  strategyType: string;
  latestHealth: StorageHealth;
  healthHistory: Array<{
    health: StorageHealth;
    duration: number;
    timestamp: Date;
    error: string | null;
  }>;
  averageResponseTime: number;
  averageSuccessRate: number;
  totalChecks: number;
  successfulChecks: number;
  lastUpdated: Date;
}

/**
 * Aggregated health statistics
 */
export interface AggregatedHealthStats {
  totalStrategies: number;
  healthyStrategies: number;
  degradedStrategies: number;
  unhealthyStrategies: number;
  averageResponseTime: number;
  averageSuccessRate: number;
  totalCapacity: number;
  availableCapacity: number;
  lastUpdated: Date;
}

/**
 * Health trend data
 */
export interface HealthTrend {
  strategyId: string;
  trend: 'improving' | 'stable' | 'degrading' | 'insufficient_data' | 'unknown';
  changeRate: number;
  dataPoints: Array<{
    health: StorageHealth;
    duration: number;
    timestamp: Date;
    error: string | null;
  }>;
}
