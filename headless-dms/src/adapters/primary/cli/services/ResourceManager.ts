import { injectable } from 'tsyringe';
import { EventEmitter } from 'events';

/**
 * Resource type definitions
 */
export enum ResourceType {
  MEMORY = 'memory',
  CPU = 'cpu',
  FILE_HANDLES = 'file_handles',
  NETWORK_CONNECTIONS = 'network_connections',
  DISK_SPACE = 'disk_space'
}

/**
 * Resource threshold configuration
 */
export interface ResourceThresholds {
  memory: {
    warning: number; // Percentage
    critical: number; // Percentage
    maxUsage: number; // MB
  };
  cpu: {
    warning: number; // Percentage
    critical: number; // Percentage
    maxUsage: number; // Percentage
  };
  fileHandles: {
    warning: number; // Percentage
    critical: number; // Percentage
    maxOpen: number; // Count
  };
  networkConnections: {
    warning: number; // Percentage
    critical: number; // Percentage
    maxConnections: number; // Count
  };
  diskSpace: {
    warning: number; // Percentage
    critical: number; // Percentage
    minFreeSpace: number; // MB
  };
}

/**
 * Resource usage information
 */
export interface ResourceUsage {
  type: ResourceType;
  current: number;
  max: number;
  percentage: number;
  status: 'healthy' | 'warning' | 'critical';
  timestamp: Date;
}

/**
 * System resource status
 */
export interface SystemResourceStatus {
  overall: 'healthy' | 'warning' | 'critical';
  resources: ResourceUsage[];
  timestamp: Date;
  recommendations: string[];
}

/**
 * Manages and monitors system resources to prevent exhaustion
 */
@injectable()
export class ResourceManager extends EventEmitter {
  private thresholds: ResourceThresholds;
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;
  private resourceHistory: Map<ResourceType, ResourceUsage[]> = new Map();
  private maxHistorySize = 100;

  constructor() {
    super();
    
    this.thresholds = {
      memory: {
        warning: parseInt(process.env.RESOURCE_MEMORY_WARNING || '70'),
        critical: parseInt(process.env.RESOURCE_MEMORY_CRITICAL || '85'),
        maxUsage: parseInt(process.env.RESOURCE_MEMORY_MAX_MB || '1024')
      },
      cpu: {
        warning: parseInt(process.env.RESOURCE_CPU_WARNING || '70'),
        critical: parseInt(process.env.RESOURCE_CPU_CRITICAL || '85'),
        maxUsage: parseInt(process.env.RESOURCE_CPU_MAX || '90')
      },
      fileHandles: {
        warning: parseInt(process.env.RESOURCE_FILE_HANDLES_WARNING || '70'),
        critical: parseInt(process.env.RESOURCE_FILE_HANDLES_CRITICAL || '85'),
        maxOpen: parseInt(process.env.RESOURCE_FILE_HANDLES_MAX || '1000')
      },
      networkConnections: {
        warning: parseInt(process.env.RESOURCE_NETWORK_WARNING || '70'),
        critical: parseInt(process.env.RESOURCE_NETWORK_CRITICAL || '85'),
        maxConnections: parseInt(process.env.RESOURCE_NETWORK_MAX || '100')
      },
      diskSpace: {
        warning: parseInt(process.env.RESOURCE_DISK_WARNING || '80'),
        critical: parseInt(process.env.RESOURCE_DISK_CRITICAL || '90'),
        minFreeSpace: parseInt(process.env.RESOURCE_DISK_MIN_FREE_MB || '100')
      }
    };

    // Initialize resource history
    Object.values(ResourceType).forEach(type => {
      this.resourceHistory.set(type, []);
    });
  }

  /**
   * Start resource monitoring
   */
  public startMonitoring(intervalMs: number = 5000): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.checkResources();
    }, intervalMs);

    this.emit('monitoringStarted', { intervalMs });
  }

  /**
   * Stop resource monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    this.isMonitoring = false;
    this.emit('monitoringStopped');
  }

  /**
   * Check current resource usage
   */
  public async checkResources(): Promise<SystemResourceStatus> {
    const resources: ResourceUsage[] = [];
    const recommendations: string[] = [];

    // Check memory usage
    const memoryUsage = await this.getMemoryUsage();
    resources.push(memoryUsage);
    if (memoryUsage.status === 'warning') {
      recommendations.push('Consider reducing concurrent operations to lower memory usage');
    } else if (memoryUsage.status === 'critical') {
      recommendations.push('Immediate action required: Stop non-essential operations');
    }

    // Check CPU usage
    const cpuUsage = await this.getCpuUsage();
    resources.push(cpuUsage);
    if (cpuUsage.status === 'warning') {
      recommendations.push('Consider reducing worker pool size to lower CPU usage');
    } else if (cpuUsage.status === 'critical') {
      recommendations.push('Immediate action required: Reduce system load');
    }

    // Check file handles
    const fileHandleUsage = await this.getFileHandleUsage();
    resources.push(fileHandleUsage);
    if (fileHandleUsage.status === 'warning') {
      recommendations.push('Consider closing unused file handles');
    } else if (fileHandleUsage.status === 'critical') {
      recommendations.push('Immediate action required: Close file handles to prevent system failure');
    }

    // Check network connections
    const networkUsage = await this.getNetworkUsage();
    resources.push(networkUsage);
    if (networkUsage.status === 'warning') {
      recommendations.push('Consider reducing concurrent network operations');
    } else if (networkUsage.status === 'critical') {
      recommendations.push('Immediate action required: Reduce network load');
    }

    // Check disk space
    const diskUsage = await this.getDiskUsage();
    resources.push(diskUsage);
    if (diskUsage.status === 'warning') {
      recommendations.push('Consider cleaning up temporary files and logs');
    } else if (diskUsage.status === 'critical') {
      recommendations.push('Immediate action required: Free up disk space');
    }

    // Determine overall status
    const overall = this.determineOverallStatus(resources);

    const status: SystemResourceStatus = {
      overall,
      resources,
      timestamp: new Date(),
      recommendations
    };

    // Store in history
    resources.forEach(usage => {
      const history = this.resourceHistory.get(usage.type) || [];
      history.push(usage);
      
      // Keep only recent history
      if (history.length > this.maxHistorySize) {
        history.shift();
      }
      
      this.resourceHistory.set(usage.type, history);
    });

    this.emit('resourcesChecked', status);
    return status;
  }

  /**
   * Get memory usage information
   */
  private async getMemoryUsage(): Promise<ResourceUsage> {
    const memUsage = process.memoryUsage();
    const currentMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const maxMB = this.thresholds.memory.maxUsage;
    const percentage = Math.round((currentMB / maxMB) * 100);

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (percentage >= this.thresholds.memory.critical) {
      status = 'critical';
    } else if (percentage >= this.thresholds.memory.warning) {
      status = 'warning';
    }

    return {
      type: ResourceType.MEMORY,
      current: currentMB,
      max: maxMB,
      percentage,
      status,
      timestamp: new Date()
    };
  }

  /**
   * Get CPU usage information
   */
  private async getCpuUsage(): Promise<ResourceUsage> {
    // Simplified CPU usage calculation
    // In a real implementation, you'd use a more sophisticated method
    const startUsage = process.cpuUsage();
    await this.delay(100); // Small delay to measure CPU usage
    const endUsage = process.cpuUsage();
    
    const userCpu = endUsage.user - startUsage.user;
    const systemCpu = endUsage.system - startUsage.system;
    const totalCpu = userCpu + systemCpu;
    
    // Convert to percentage (simplified)
    const percentage = Math.min(100, Math.round(totalCpu / 10000));
    const maxUsage = this.thresholds.cpu.maxUsage;

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (percentage >= this.thresholds.cpu.critical) {
      status = 'critical';
    } else if (percentage >= this.thresholds.cpu.warning) {
      status = 'warning';
    }

    return {
      type: ResourceType.CPU,
      current: percentage,
      max: maxUsage,
      percentage,
      status,
      timestamp: new Date()
    };
  }

  /**
   * Get file handle usage information
   */
  private async getFileHandleUsage(): Promise<ResourceUsage> {
    // Simplified file handle count
    // In a real implementation, you'd use system calls to get actual count
    const current = 0; // Placeholder
    const max = this.thresholds.fileHandles.maxOpen;
    const percentage = 0; // Placeholder

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (percentage >= this.thresholds.fileHandles.critical) {
      status = 'critical';
    } else if (percentage >= this.thresholds.fileHandles.warning) {
      status = 'warning';
    }

    return {
      type: ResourceType.FILE_HANDLES,
      current,
      max,
      percentage,
      status,
      timestamp: new Date()
    };
  }

  /**
   * Get network connection usage information
   */
  private async getNetworkUsage(): Promise<ResourceUsage> {
    // Simplified network connection count
    // In a real implementation, you'd use system calls to get actual count
    const current = 0; // Placeholder
    const max = this.thresholds.networkConnections.maxConnections;
    const percentage = 0; // Placeholder

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (percentage >= this.thresholds.networkConnections.critical) {
      status = 'critical';
    } else if (percentage >= this.thresholds.networkConnections.warning) {
      status = 'warning';
    }

    return {
      type: ResourceType.NETWORK_CONNECTIONS,
      current,
      max,
      percentage,
      status,
      timestamp: new Date()
    };
  }

  /**
   * Get disk space usage information
   */
  private async getDiskUsage(): Promise<ResourceUsage> {
    // Simplified disk space calculation
    // In a real implementation, you'd use system calls to get actual disk usage
    const current = 0; // Placeholder - would be used space in MB
    const max = 1000; // Placeholder - would be total space in MB
    const percentage = 0; // Placeholder

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (percentage >= this.thresholds.diskSpace.critical) {
      status = 'critical';
    } else if (percentage >= this.thresholds.diskSpace.warning) {
      status = 'warning';
    }

    return {
      type: ResourceType.DISK_SPACE,
      current,
      max,
      percentage,
      status,
      timestamp: new Date()
    };
  }

  /**
   * Determine overall system status based on individual resource statuses
   */
  private determineOverallStatus(resources: ResourceUsage[]): 'healthy' | 'warning' | 'critical' {
    if (resources.some(r => r.status === 'critical')) {
      return 'critical';
    } else if (resources.some(r => r.status === 'warning')) {
      return 'warning';
    }
    return 'healthy';
  }

  /**
   * Get resource usage history
   */
  public getResourceHistory(type: ResourceType, limit: number = 50): ResourceUsage[] {
    const history = this.resourceHistory.get(type) || [];
    return history.slice(-limit);
  }

  /**
   * Update resource thresholds
   */
  public updateThresholds(newThresholds: Partial<ResourceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    this.emit('thresholdsUpdated', this.thresholds);
  }

  /**
   * Get current thresholds
   */
  public getThresholds(): ResourceThresholds {
    return { ...this.thresholds };
  }

  /**
   * Check if system is healthy for operations
   */
  public async isSystemHealthy(): Promise<boolean> {
    const status = await this.checkResources();
    return status.overall === 'healthy';
  }

  /**
   * Get system health recommendations
   */
  public async getHealthRecommendations(): Promise<string[]> {
    const status = await this.checkResources();
    return status.recommendations;
  }

  /**
   * Shutdown resource manager
   */
  public shutdown(): void {
    this.stopMonitoring();
    this.resourceHistory.clear();
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
