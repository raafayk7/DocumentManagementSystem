import { AppResult, AppError } from '@carbonteq/hexapp';
import { newRelicConfig } from './NewRelicConfig.js';
import { newRelicMetrics } from './NewRelicMetrics.js';
import { newRelicTracer } from './NewRelicTracer.js';
import { newRelicIntegration } from './NewRelicIntegration.js';

/**
 * New Relic health check service
 * Provides health monitoring and status information
 */
export class NewRelicHealthCheck {
  private static instance: NewRelicHealthCheck;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): NewRelicHealthCheck {
    if (!NewRelicHealthCheck.instance) {
      NewRelicHealthCheck.instance = new NewRelicHealthCheck();
    }
    return NewRelicHealthCheck.instance;
  }

  /**
   * Get comprehensive health status
   */
  getHealthStatus(): AppResult<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    newRelic: {
      enabled: boolean;
      initialized: boolean;
      configValid: boolean;
      metricsEnabled: boolean;
      tracingEnabled: boolean;
    };
    metrics: {
      bufferSize: number;
      customAttributesCount: number;
    };
    tracing: {
      activeTransactions: number;
      activeSpans: number;
      totalTransactions: number;
      totalSpans: number;
    };
    configuration: {
      appName: string;
      accountId: string;
      region: string;
      logLevel: string;
      distributedTracingEnabled: boolean;
    };
    errors: string[];
  }> {
    try {
      const errors: string[] = [];
      
      // Get integration health
      const integrationHealth = newRelicIntegration.getHealthStatus();
      if (integrationHealth.isErr()) {
        errors.push(`Integration health check failed: ${integrationHealth.unwrapErr().message}`);
      }

      // Get metrics summary
      const metricsSummary = newRelicMetrics.getMetricsSummary();
      let metricsInfo = { bufferSize: 0, customAttributesCount: 0 };
      if (metricsSummary.isOk()) {
        const summary = metricsSummary.unwrap();
        metricsInfo = {
          bufferSize: Object.keys(summary).length,
          customAttributesCount: 0, // This would need to be exposed from NewRelicMetrics
        };
      } else {
        const error = (metricsSummary as any).unwrapErr();
        errors.push(`Metrics summary failed: ${error.message}`);
      }

      // Get tracing stats
      const tracingStats = newRelicTracer.getTracingStats();
      let tracingInfo = {
        activeTransactions: 0,
        activeSpans: 0,
        totalTransactions: 0,
        totalSpans: 0,
      };
      if (tracingStats.isOk()) {
        tracingInfo = tracingStats.unwrap();
      } else {
        const error = (tracingStats as any).unwrapErr();
        errors.push(`Tracing stats failed: ${error.message}`);
      }

      // Get configuration
      const config = newRelicConfig.getConfig();
      let configInfo = {
        appName: 'Unknown',
        accountId: 'Unknown',
        region: 'Unknown',
        logLevel: 'Unknown',
        distributedTracingEnabled: false,
      };
      if (config.isOk()) {
        const cfg = config.unwrap();
        configInfo = {
          appName: cfg.appName,
          accountId: cfg.accountId,
          region: cfg.region,
          logLevel: cfg.logLevel,
          distributedTracingEnabled: cfg.distributedTracingEnabled,
        };
      } else {
        const error = (config as any).unwrapErr();
        errors.push(`Configuration retrieval failed: ${error.message}`);
      }

      // Determine overall status
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (errors.length > 0) {
        status = 'unhealthy';
      } else if (integrationHealth.isOk()) {
        const health = integrationHealth.unwrap();
        if (!health.enabled || !health.initialized || !health.configValid) {
          status = 'degraded';
        }
      }

      return AppResult.Ok({
        status,
        timestamp: new Date().toISOString(),
        newRelic: integrationHealth.isOk() ? integrationHealth.unwrap() : {
          enabled: false,
          initialized: false,
          configValid: false,
          metricsEnabled: false,
          tracingEnabled: false,
        },
        metrics: metricsInfo,
        tracing: tracingInfo,
        configuration: configInfo,
        errors,
      });
    } catch (error) {
      return AppResult.Err(AppError.Generic(`Failed to get health status: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Get simple health check (for load balancers)
   */
  getSimpleHealthCheck(): AppResult<{ status: string; timestamp: string }> {
    try {
      const health = this.getHealthStatus();
      if (health.isErr()) {
        return AppResult.Ok({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
        });
      }

      const h = health.unwrap();
      return AppResult.Ok({
        status: h.status,
        timestamp: h.timestamp,
      });
    } catch (error) {
      return AppResult.Ok({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get detailed health check (for monitoring systems)
   */
  getDetailedHealthCheck(): AppResult<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    details: Record<string, unknown>;
    recommendations: string[];
  }> {
    try {
      const health = this.getHealthStatus();
      if (health.isErr()) {
        return AppResult.Err(health.unwrapErr());
      }

      const h = health.unwrap();
      const details: Record<string, unknown> = {
        newRelic: h.newRelic,
        metrics: h.metrics,
        tracing: h.tracing,
        configuration: h.configuration,
        errors: h.errors,
      };

      const recommendations: string[] = [];

      // Generate recommendations based on health status
      if (!h.newRelic.enabled) {
        recommendations.push('Enable New Relic by setting NEW_RELIC_ENABLED=true');
      }

      if (!h.newRelic.configValid) {
        recommendations.push('Fix New Relic configuration - check license key and account ID');
      }

      if (!h.newRelic.initialized) {
        recommendations.push('Initialize New Relic integration before use');
      }

      if (h.errors.length > 0) {
        recommendations.push('Review and fix error conditions');
      }

      if (h.metrics.bufferSize > 1000) {
        recommendations.push('Consider flushing metrics buffer more frequently');
      }

      if (h.tracing.activeTransactions > 100) {
        recommendations.push('Monitor active transaction count for potential memory leaks');
      }

      return AppResult.Ok({
        status: h.status,
        timestamp: h.timestamp,
        details,
        recommendations,
      });
    } catch (error) {
      return AppResult.Err(AppError.Generic(`Failed to get detailed health check: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Get metrics summary for monitoring
   */
  getMetricsSummary(): AppResult<{
    timestamp: string;
    metrics: Record<string, number>;
    tracing: {
      activeTransactions: number;
      activeSpans: number;
      totalTransactions: number;
      totalSpans: number;
    };
  }> {
    try {
      const metricsSummary = newRelicMetrics.getMetricsSummary();
      const tracingStats = newRelicTracer.getTracingStats();

      let metrics: Record<string, number> = {};
      let tracing = {
        activeTransactions: 0,
        activeSpans: 0,
        totalTransactions: 0,
        totalSpans: 0,
      };

      if (metricsSummary.isOk()) {
        metrics = metricsSummary.unwrap();
      }

      if (tracingStats.isOk()) {
        tracing = tracingStats.unwrap();
      }

      return AppResult.Ok({
        timestamp: new Date().toISOString(),
        metrics,
        tracing,
      });
    } catch (error) {
      return AppResult.Err(AppError.Generic(`Failed to get metrics summary: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Get configuration summary
   */
  getConfigurationSummary(): AppResult<{
    timestamp: string;
    configuration: {
      appName: string;
      accountId: string;
      region: string;
      logLevel: string;
      distributedTracingEnabled: boolean;
      enabled: boolean;
    };
  }> {
    try {
      const config = newRelicConfig.getConfig();
      const enabled = newRelicConfig.isEnabled();

      let configInfo = {
        appName: 'Unknown',
        accountId: 'Unknown',
        region: 'Unknown',
        logLevel: 'Unknown',
        distributedTracingEnabled: false,
      };

      if (config.isOk()) {
        const cfg = config.unwrap();
        configInfo = {
          appName: cfg.appName,
          accountId: cfg.accountId,
          region: cfg.region,
          logLevel: cfg.logLevel,
          distributedTracingEnabled: cfg.distributedTracingEnabled,
        };
      }

      return AppResult.Ok({
        timestamp: new Date().toISOString(),
        configuration: {
          ...configInfo,
          enabled,
        },
      });
    } catch (error) {
      return AppResult.Err(AppError.Generic(`Failed to get configuration summary: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Perform health check and return formatted response
   */
  performHealthCheck(): AppResult<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    message: string;
    timestamp: string;
    details: Record<string, unknown>;
  }> {
    try {
      const health = this.getHealthStatus();
      if (health.isErr()) {
        return AppResult.Ok({
          status: 'unhealthy',
          message: 'Health check failed',
          timestamp: new Date().toISOString(),
          details: { error: health.unwrapErr().message },
        });
      }

      const h = health.unwrap();
      let message = '';

      switch (h.status) {
        case 'healthy':
          message = 'New Relic integration is healthy and functioning normally';
          break;
        case 'degraded':
          message = 'New Relic integration is degraded but operational';
          break;
        case 'unhealthy':
          message = 'New Relic integration is unhealthy and requires attention';
          break;
      }

      return AppResult.Ok({
        status: h.status,
        message,
        timestamp: h.timestamp,
        details: {
          newRelic: h.newRelic,
          metrics: h.metrics,
          tracing: h.tracing,
          configuration: h.configuration,
          errors: h.errors,
        },
      });
    } catch (error) {
      return AppResult.Ok({
        status: 'unhealthy',
        message: 'Health check failed with unexpected error',
        timestamp: new Date().toISOString(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
    }
  }
}

/**
 * Export singleton instance
 */
export const newRelicHealthCheck = NewRelicHealthCheck.getInstance();
