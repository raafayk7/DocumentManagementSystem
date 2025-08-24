import { newRelicConfig } from './NewRelicConfig.js';
import { newRelicMetrics } from './NewRelicMetrics.js';

export interface StorageMetrics {
  strategy: string;
  operation: string;
  duration: number;
  success: boolean;
  errorType?: string;
  fileSize?: number;
  timestamp: Date;
}

export interface UserActivityMetrics {
  userId: string;
  action: string;
  resource: string;
  timestamp: Date;
  userRole: string;
  success: boolean;
}

export interface PerformanceMetrics {
  operation: string;
  storageStrategy: string;
  duration: number;
  fileSize: number;
  success: boolean;
  timestamp: Date;
}

export interface ErrorMetrics {
  storageStrategy: string;
  errorType: string;
  errorMessage: string;
  timestamp: Date;
  context?: Record<string, any>;
}

export interface MetricsSummary {
  storageUtilization: {
    [strategy: string]: {
      totalOperations: number;
      successRate: number;
      averageResponseTime: number;
      lastUsed: Date;
    };
  };
  errorRates: {
    [strategy: string]: {
      [errorType: string]: number;
    };
  };
  userActivity: {
    totalUsers: number;
    activeUsers: number;
    peakUsageTime: string;
    mostActiveRole: string;
  };
}

export class MetricsService {
  private static instance: MetricsService;
  private metricsBuffer: {
    storage: StorageMetrics[];
    userActivity: UserActivityMetrics[];
    performance: PerformanceMetrics[];
    errors: ErrorMetrics[];
  };
  private readonly bufferSize = 100;
  private readonly flushInterval = 60000; // 1 minute
  private flushTimer?: NodeJS.Timeout;

  private constructor() {
    this.metricsBuffer = {
      storage: [],
      userActivity: [],
      performance: [],
      errors: []
    };
    this.startPeriodicFlush();
  }

  public static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  // Storage Backend Utilization Metrics
  public trackStorageOperation(metrics: StorageMetrics): void {
    this.metricsBuffer.storage.push(metrics);
    
    // Send critical metrics immediately
    this.sendStorageMetricToNewRelic(metrics);
    
    if (this.metricsBuffer.storage.length >= this.bufferSize) {
      this.flushStorageMetrics();
    }
  }

  // Document Operation Performance Metrics
  public trackPerformance(metrics: PerformanceMetrics): void {
    this.metricsBuffer.performance.push(metrics);
    
    // Send performance metrics immediately for real-time monitoring
    this.sendPerformanceMetricToNewRelic(metrics);
    
    if (this.metricsBuffer.performance.length >= this.bufferSize) {
      this.flushPerformanceMetrics();
    }
  }

  // Error Rates by Storage Type
  public trackError(metrics: ErrorMetrics): void {
    this.metricsBuffer.errors.push(metrics);
    
    // Send errors immediately for alerting
    this.sendErrorMetricToNewRelic(metrics);
    
    if (this.metricsBuffer.errors.length >= this.bufferSize) {
      this.flushErrorMetrics();
    }
  }

  // User Activity Patterns
  public trackUserActivity(metrics: UserActivityMetrics): void {
    // Anonymize user ID for privacy
    const anonymizedMetrics = {
      ...metrics,
      userId: this.anonymizeUserId(metrics.userId)
    };
    
    this.metricsBuffer.userActivity.push(anonymizedMetrics);
    
    // Batch collect user activity (less critical)
    if (this.metricsBuffer.userActivity.length >= this.bufferSize) {
      this.flushUserActivityMetrics();
    }
  }

  // Get Metrics Summary
  public getMetricsSummary(): MetricsSummary {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const recentStorageMetrics = this.metricsBuffer.storage.filter(
      m => m.timestamp > oneHourAgo
    );
    
    const recentUserActivity = this.metricsBuffer.userActivity.filter(
      m => m.timestamp > oneHourAgo
    );

    return {
      storageUtilization: this.calculateStorageUtilization(recentStorageMetrics),
      errorRates: this.calculateErrorRates(recentStorageMetrics),
      userActivity: this.calculateUserActivitySummary(recentUserActivity)
    };
  }

  // Private Methods
  private anonymizeUserId(userId: string): string {
    // Simple hash for anonymization
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `user_${Math.abs(hash)}`;
  }

  private calculateStorageUtilization(metrics: StorageMetrics[]): MetricsSummary['storageUtilization'] {
    const utilization: MetricsSummary['storageUtilization'] = {};
    
    metrics.forEach(metric => {
      if (!utilization[metric.strategy]) {
        utilization[metric.strategy] = {
          totalOperations: 0,
          successRate: 0,
          averageResponseTime: 0,
          lastUsed: new Date(0)
        };
      }
      
      const strategy = utilization[metric.strategy];
      strategy.totalOperations++;
      strategy.lastUsed = metric.timestamp;
      
      // Calculate success rate
      const successfulOps = metrics.filter(m => m.strategy === metric.strategy && m.success).length;
      strategy.successRate = successfulOps / strategy.totalOperations;
      
      // Calculate average response time
      const responseTimes = metrics
        .filter(m => m.strategy === metric.strategy)
        .map(m => m.duration);
      strategy.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    });
    
    return utilization;
  }

  private calculateErrorRates(metrics: StorageMetrics[]): MetricsSummary['errorRates'] {
    const errorRates: MetricsSummary['errorRates'] = {};
    
    metrics.forEach(metric => {
      if (!metric.success && metric.errorType) {
        if (!errorRates[metric.strategy]) {
          errorRates[metric.strategy] = {};
        }
        if (!errorRates[metric.strategy][metric.errorType]) {
          errorRates[metric.strategy][metric.errorType] = 0;
        }
        errorRates[metric.strategy][metric.errorType]++;
      }
    });
    
    return errorRates;
  }

  private calculateUserActivitySummary(metrics: UserActivityMetrics[]): MetricsSummary['userActivity'] {
    const uniqueUsers = new Set(metrics.map(m => m.userId));
    const activeUsers = new Set(metrics.filter(m => 
      m.timestamp > new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
    ).map(m => m.userId));
    
    // Find peak usage time (simplified - could be enhanced)
    const hourCounts = new Array(24).fill(0);
    metrics.forEach(m => {
      const hour = m.timestamp.getHours();
      hourCounts[hour]++;
    });
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    
    // Find most active role
    const roleCounts: Record<string, number> = {};
    metrics.forEach(m => {
      roleCounts[m.userRole] = (roleCounts[m.userRole] || 0) + 1;
    });
    const mostActiveRole = Object.entries(roleCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';
    
    return {
      totalUsers: uniqueUsers.size,
      activeUsers: activeUsers.size,
      peakUsageTime: `${peakHour}:00`,
      mostActiveRole
    };
  }

  // New Relic Integration Methods
  private sendStorageMetricToNewRelic(metric: StorageMetrics): void {
    if (!newRelicConfig.isEnabled()) return;
    
    try {
      newRelicMetrics.recordMetric('storage.operation', 1, {
        strategy: metric.strategy,
        operation: metric.operation,
        duration: metric.duration,
        success: metric.success,
        errorType: metric.errorType || 'none',
        fileSize: metric.fileSize || 0,
        timestamp: metric.timestamp.toISOString()
      });
    } catch (error) {
      console.error('Failed to send storage metric to New Relic:', error);
    }
  }

  private sendPerformanceMetricToNewRelic(metric: PerformanceMetrics): void {
    if (!newRelicConfig.isEnabled()) return;
    
    try {
      newRelicMetrics.recordMetric('performance.metric', 1, {
        operation: metric.operation,
        storageStrategy: metric.storageStrategy,
        duration: metric.duration,
        fileSize: metric.fileSize,
        success: metric.success,
        timestamp: metric.timestamp.toISOString()
      });
    } catch (error) {
      console.error('Failed to send performance metric to New Relic:', error);
    }
  }

  private sendErrorMetricToNewRelic(metric: ErrorMetrics): void {
    if (!newRelicConfig.isEnabled()) return;
    
    try {
      newRelicMetrics.recordMetric('storage.error', 1, {
        storageStrategy: metric.storageStrategy,
        errorType: metric.errorType,
        errorMessage: metric.errorMessage,
        timestamp: metric.timestamp.toISOString(),
        context: JSON.stringify(metric.context || {})
      });
    } catch (error) {
      console.error('Failed to send error metric to New Relic:', error);
    }
  }

  // Flush Methods
  private flushStorageMetrics(): void {
    if (this.metricsBuffer.storage.length === 0) return;
    
    // Send batch metrics to New Relic
    this.metricsBuffer.storage.forEach(metric => {
      this.sendStorageMetricToNewRelic(metric);
    });
    
    // Clear buffer
    this.metricsBuffer.storage = [];
  }

  private flushPerformanceMetrics(): void {
    if (this.metricsBuffer.performance.length === 0) return;
    
    this.metricsBuffer.performance.forEach(metric => {
      this.sendPerformanceMetricToNewRelic(metric);
    });
    
    this.metricsBuffer.performance = [];
  }

  private flushErrorMetrics(): void {
    if (this.metricsBuffer.errors.length === 0) return;
    
    this.metricsBuffer.errors.forEach(metric => {
      this.sendErrorMetricToNewRelic(metric);
    });
    
    this.metricsBuffer.errors = [];
  }

  private flushUserActivityMetrics(): void {
    if (this.metricsBuffer.userActivity.length === 0) return;
    
    // Send user activity metrics in batch
    if (newRelicConfig.isEnabled()) {
      try {
        newRelicMetrics.recordMetric('user.activity.batch', this.metricsBuffer.userActivity.length, {
          totalActivities: this.metricsBuffer.userActivity.length,
          timestamp: new Date().toISOString(),
          activities: this.metricsBuffer.userActivity.map(m => ({
            action: m.action,
            resource: m.resource,
            userRole: m.userRole,
            success: m.success,
            timestamp: m.timestamp.toISOString()
          }))
        });
      } catch (error) {
        console.error('Failed to send user activity batch to New Relic:', error);
      }
    }
    
    this.metricsBuffer.userActivity = [];
  }

  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushStorageMetrics();
      this.flushPerformanceMetrics();
      this.flushErrorMetrics();
      this.flushUserActivityMetrics();
    }, this.flushInterval);
  }

  public stopPeriodicFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  public flushAllMetrics(): void {
    this.flushStorageMetrics();
    this.flushPerformanceMetrics();
    this.flushErrorMetrics();
    this.flushUserActivityMetrics();
  }
}
