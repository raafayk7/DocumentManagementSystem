import { FastifyRequest, FastifyReply } from 'fastify';
import { MetricsService } from './metrics.service.js';
import { newRelicConfig } from './NewRelicConfig.js';

export interface MetricsEndpointOptions {
  requireAuth?: boolean;
  includeNewRelicStatus?: boolean;
  includeSystemMetrics?: boolean;
}

export class MetricsEndpoint {
  private metricsService: MetricsService;
  private options: MetricsEndpointOptions;

  constructor(options: MetricsEndpointOptions = {}) {
    this.metricsService = MetricsService.getInstance();
    this.options = {
      requireAuth: true,
      includeNewRelicStatus: true,
      includeSystemMetrics: true,
      ...options
    };
  }

  public async getMetrics(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // Check authentication if required
      if (this.options.requireAuth && !this.isAuthenticated(request)) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const metrics = await this.collectMetrics();
      
      reply.status(200).send({
        timestamp: new Date().toISOString(),
        metrics
      });
    } catch (error) {
      reply.status(500).send({ 
        error: 'Failed to collect metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  public async getMetricsSummary(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      if (this.options.requireAuth && !this.isAuthenticated(request)) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const summary = this.metricsService.getMetricsSummary();
      
      reply.status(200).send({
        timestamp: new Date().toISOString(),
        summary
      });
    } catch (error) {
      reply.status(500).send({ 
        error: 'Failed to get metrics summary',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  public async getHealthMetrics(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      if (this.options.requireAuth && !this.isAuthenticated(request)) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const healthMetrics = await this.collectHealthMetrics();
      
      reply.status(200).send({
        timestamp: new Date().toISOString(),
        status: 'healthy',
        metrics: healthMetrics
      });
    } catch (error) {
      reply.status(500).send({ 
        error: 'Failed to collect health metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async collectMetrics(): Promise<any> {
    const metrics: any = {};

    // Get metrics summary
    metrics.summary = this.metricsService.getMetricsSummary();

    // Add New Relic status if enabled
    if (this.options.includeNewRelicStatus) {
      metrics.newRelic = {
        enabled: newRelicConfig.isEnabled(),
        status: newRelicConfig.isEnabled() ? 'connected' : 'disabled'
      };
    }

    // Add system metrics if enabled
    if (this.options.includeSystemMetrics) {
      metrics.system = this.collectSystemMetrics();
    }

    return metrics;
  }

  private async collectHealthMetrics(): Promise<any> {
    const healthMetrics: any = {};

    // Storage utilization health
    const summary = this.metricsService.getMetricsSummary();
    healthMetrics.storage = {};

    Object.entries(summary.storageUtilization).forEach(([strategy, metrics]) => {
      const health = this.calculateStorageHealth(metrics);
      healthMetrics.storage[strategy] = {
        ...metrics,
        health,
        status: health === 'healthy' ? 'ok' : health === 'warning' ? 'degraded' : 'critical'
      };
    });

    // Error rate health
    healthMetrics.errors = {};
    Object.entries(summary.errorRates).forEach(([strategy, errorTypes]) => {
      const totalErrors = Object.values(errorTypes).reduce((sum: number, count: number) => sum + count, 0);
      const totalOps = summary.storageUtilization[strategy]?.totalOperations || 0;
      const errorRate = totalOps > 0 ? (totalErrors / totalOps) * 100 : 0;
      
      let health: 'healthy' | 'warning' | 'critical';
      if (errorRate < 5) health = 'healthy';
      else if (errorRate < 20) health = 'warning';
      else health = 'critical';

      healthMetrics.errors[strategy] = {
        totalErrors,
        errorRate: errorRate.toFixed(2),
        health,
        status: health === 'healthy' ? 'ok' : health === 'warning' ? 'degraded' : 'critical'
      };
    });

    // User activity health
    const userMetrics = summary.userActivity;
    const activeUserRate = userMetrics.totalUsers > 0 ? 
      (userMetrics.activeUsers / userMetrics.totalUsers) * 100 : 0;
    
    let userHealth: 'healthy' | 'warning' | 'critical';
    if (activeUserRate > 10) userHealth = 'healthy';
    else if (activeUserRate > 1) userHealth = 'warning';
    else userHealth = 'critical';

    healthMetrics.userActivity = {
      ...userMetrics,
      activeUserRate: activeUserRate.toFixed(2),
      health: userHealth,
      status: userHealth === 'healthy' ? 'ok' : userHealth === 'warning' ? 'degraded' : 'critical'
    };

    return healthMetrics;
  }

  private calculateStorageHealth(metrics: any): 'healthy' | 'warning' | 'critical' {
    const { successRate, averageResponseTime } = metrics;
    
    // Check success rate
    if (successRate < 0.8) return 'critical';
    if (successRate < 0.95) return 'warning';
    
    // Check response time (assuming response time is in milliseconds)
    if (averageResponseTime > 5000) return 'critical';
    if (averageResponseTime > 1000) return 'warning';
    
    return 'healthy';
  }

  private collectSystemMetrics(): any {
    const systemMetrics: any = {};

    // Memory usage
    const memUsage = process.memoryUsage();
    systemMetrics.memory = {
      rss: this.formatBytes(memUsage.rss),
      heapTotal: this.formatBytes(memUsage.heapTotal),
      heapUsed: this.formatBytes(memUsage.heapUsed),
      external: this.formatBytes(memUsage.external)
    };

    // CPU usage (simplified)
    systemMetrics.cpu = {
      uptime: process.uptime(),
      platform: process.platform,
      nodeVersion: process.version
    };

    // Process info
    systemMetrics.process = {
      pid: process.pid,
      title: process.title,
      argv: process.argv.slice(0, 2) // Only show main args, not all
    };

    return systemMetrics;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private isAuthenticated(request: FastifyRequest): boolean {
    try {
      // Check if user is authenticated via JWT middleware
      return !!(request as any).user;
    } catch (error) {
      return false;
    }
  }

  // Static method for easy integration
  public static create(options?: MetricsEndpointOptions): MetricsEndpoint {
    return new MetricsEndpoint(options);
  }
}
