import { FastifyRequest, FastifyReply } from 'fastify';
import { performanceMonitor } from './performance.monitor.js';
import { performanceConfiguration } from './performance.config.js';
import { newRelicConfig } from '../new-relic/NewRelicConfig.js';

/**
 * Performance endpoint options
 */
export interface PerformanceEndpointOptions {
  includeNewRelicStatus?: boolean;
  includeConfiguration?: boolean;
  includeHealthChecks?: boolean;
  includeMetrics?: boolean;
}

/**
 * Performance monitoring endpoint
 * Exposes performance metrics, health checks, and configuration information
 */
export class PerformanceEndpoint {
  private options: PerformanceEndpointOptions;

  constructor(options: PerformanceEndpointOptions = {}) {
    this.options = {
      includeNewRelicStatus: true,
      includeConfiguration: true,
      includeHealthChecks: true,
      includeMetrics: true,
      ...options
    };
  }

  /**
   * Create endpoint instance with default options
   */
  static create(options?: PerformanceEndpointOptions): PerformanceEndpoint {
    return new PerformanceEndpoint(options);
  }

  /**
   * Get performance metrics summary
   */
  public async getPerformanceMetrics(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const metrics: any = {
        timestamp: new Date().toISOString(),
        performance: {
          enabled: performanceConfiguration.isEnabled(),
          sampleRate: performanceConfiguration.getSampleRate(),
          thresholds: {
            storage: performanceConfiguration.getSlowStorageThreshold(),
            api: performanceConfiguration.getSlowApiThreshold(),
            database: performanceConfiguration.getSlowQueryThreshold()
          }
        },
        monitoring: {
          storage: performanceConfiguration.isStorageMonitoringEnabled(),
          api: performanceConfiguration.isApiMonitoringEnabled(),
          database: performanceConfiguration.isDatabaseMonitoringEnabled(),
          files: performanceConfiguration.isFileMonitoringEnabled()
        },
        middleware: {
          enabled: performanceConfiguration.isMiddlewareEnabled(),
          trackRequestSize: performanceConfiguration.isRequestSizeTrackingEnabled(),
          trackResponseSize: performanceConfiguration.isResponseSizeTrackingEnabled(),
          trackUserContext: performanceConfiguration.isUserContextTrackingEnabled()
        },
        alerting: {
          enabled: performanceConfiguration.isAlertingEnabled(),
          slowOperationPercentile: performanceConfiguration.getSlowOperationPercentile()
        },
        metrics: {
          aggregationEnabled: performanceConfiguration.isMetricsAggregationEnabled(),
          aggregationInterval: performanceConfiguration.getMetricsAggregationInterval()
        },
        dashboard: {
          enabled: performanceConfiguration.isDashboardEnabled(),
          port: performanceConfiguration.getDashboardPort()
        }
      };

      if (this.options.includeNewRelicStatus) {
        metrics.newRelic = {
          enabled: newRelicConfig.isEnabled(),
          status: newRelicConfig.isEnabled() ? 'connected' : 'disabled'
        };
      }

      reply.status(200).send({
        success: true,
        data: metrics
      });
    } catch (error) {
      reply.status(500).send({
        success: false,
        error: 'Failed to retrieve performance metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get performance configuration
   */
  public async getConfiguration(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const config = performanceConfiguration.getAllConfig();
      
      reply.status(200).send({
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          configuration: config
        }
      });
    } catch (error) {
      reply.status(500).send({
        success: false,
        error: 'Failed to retrieve performance configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get performance health status
   */
  public async getHealthStatus(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const health = {
        timestamp: new Date().toISOString(),
        status: 'healthy',
        checks: {
          performanceMonitoring: {
            status: performanceConfiguration.isEnabled() ? 'healthy' : 'disabled',
            enabled: performanceConfiguration.isEnabled()
          },
          newRelic: {
            status: newRelicConfig.isEnabled() ? 'healthy' : 'disabled',
            enabled: newRelicConfig.isEnabled()
          },
          storage: {
            status: performanceConfiguration.isStorageMonitoringEnabled() ? 'healthy' : 'disabled',
            enabled: performanceConfiguration.isStorageMonitoringEnabled()
          },
          api: {
            status: performanceConfiguration.isApiMonitoringEnabled() ? 'healthy' : 'disabled',
            enabled: performanceConfiguration.isApiMonitoringEnabled()
          },
          database: {
            status: performanceConfiguration.isDatabaseMonitoringEnabled() ? 'healthy' : 'disabled',
            enabled: performanceConfiguration.isDatabaseMonitoringEnabled()
          },
          files: {
            status: performanceConfiguration.isFileMonitoringEnabled() ? 'healthy' : 'disabled',
            enabled: performanceConfiguration.isFileMonitoringEnabled()
          }
        }
      };

      // Check if any critical components are unhealthy
      const criticalChecks = [
        health.checks.performanceMonitoring,
        health.checks.newRelic
      ];

      const hasUnhealthy = criticalChecks.some(check => check.status === 'disabled');
      if (hasUnhealthy) {
        health.status = 'degraded';
      }

      reply.status(200).send({
        success: true,
        data: health
      });
    } catch (error) {
      reply.status(500).send({
        success: false,
        error: 'Failed to retrieve health status',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update performance configuration
   */
  public async updateConfiguration(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const updates = request.body as Record<string, unknown>;
      
      // Validate updates
      const validUpdates: Partial<typeof performanceConfiguration> = {};
      
      // Only allow updating certain configuration values
      if (typeof updates.sampleRate === 'number' && updates.sampleRate >= 0 && updates.sampleRate <= 1) {
        process.env.PERFORMANCE_MONITORING_SAMPLE_RATE = updates.sampleRate.toString();
      }
      
      if (typeof updates.slowStorageThreshold === 'number' && updates.slowStorageThreshold >= 100) {
        process.env.PERFORMANCE_MONITORING_SLOW_STORAGE_THRESHOLD = updates.slowStorageThreshold.toString();
      }
      
      if (typeof updates.slowApiThreshold === 'number' && updates.slowApiThreshold >= 100) {
        process.env.PERFORMANCE_MONITORING_SLOW_API_THRESHOLD = updates.slowApiThreshold.toString();
      }
      
      if (typeof updates.slowQueryThreshold === 'number' && updates.slowQueryThreshold >= 100) {
        process.env.PERFORMANCE_MONITORING_SLOW_QUERY_THRESHOLD = updates.slowQueryThreshold.toString();
      }

      // Reload configuration
      performanceConfiguration.getConfig();

      reply.status(200).send({
        success: true,
        message: 'Configuration updated successfully',
        data: {
          timestamp: new Date().toISOString(),
          updated: Object.keys(updates)
        }
      });
    } catch (error) {
      reply.status(400).send({
        success: false,
        error: 'Failed to update configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get performance monitoring status
   */
  public async getStatus(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const status = {
        timestamp: new Date().toISOString(),
        performance: {
          enabled: performanceConfiguration.isEnabled(),
          status: performanceConfiguration.isEnabled() ? 'active' : 'inactive'
        },
        newRelic: {
          enabled: newRelicConfig.isEnabled(),
          status: newRelicConfig.isEnabled() ? 'connected' : 'disconnected'
        },
        monitoring: {
          storage: performanceConfiguration.isStorageMonitoringEnabled(),
          api: performanceConfiguration.isApiMonitoringEnabled(),
          database: performanceConfiguration.isDatabaseMonitoringEnabled(),
          files: performanceConfiguration.isFileMonitoringEnabled()
        },
        middleware: {
          enabled: performanceConfiguration.isMiddlewareEnabled(),
          status: performanceConfiguration.isMiddlewareEnabled() ? 'active' : 'inactive'
        }
      };

      reply.status(200).send({
        success: true,
        data: status
      });
    } catch (error) {
      reply.status(500).send({
        success: false,
        error: 'Failed to retrieve status',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Register performance monitoring routes
   */
  public registerRoutes(fastify: any): void {
    // Performance metrics endpoint
    fastify.get('/performance/metrics', this.getPerformanceMetrics.bind(this));
    
    // Performance configuration endpoint
    fastify.get('/performance/config', this.getConfiguration.bind(this));
    fastify.put('/performance/config', this.updateConfiguration.bind(this));
    
    // Performance health endpoint
    fastify.get('/performance/health', this.getHealthStatus.bind(this));
    
    // Performance status endpoint
    fastify.get('/performance/status', this.getStatus.bind(this));
  }
}

/**
 * Factory function to create performance endpoint
 */
export function createPerformanceEndpoint(options?: PerformanceEndpointOptions): PerformanceEndpoint {
  return PerformanceEndpoint.create(options);
}
