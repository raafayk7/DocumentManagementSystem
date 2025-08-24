import { AppResult, AppError } from '@carbonteq/hexapp';
import { StorageHealth } from '../../../../shared/storage/StorageTypes.js';

/**
 * Emulator Configuration
 */
export interface EmulatorConfig {
  /** Whether to use emulators instead of cloud services */
  useEmulators: boolean;
  /** LocalStack configuration for S3 emulation */
  localStack: {
    /** LocalStack endpoint URL */
    endpoint: string;
    /** LocalStack port */
    port: number;
    /** Whether to use path-style addressing */
    usePathStyle: boolean;
    /** Access key for LocalStack */
    accessKey: string;
    /** Secret key for LocalStack */
    secretKey: string;
    /** Region for LocalStack */
    region: string;
  };
  /** Azurite configuration for Azure emulation */
  azurite: {
    /** Azurite endpoint URL */
    endpoint: string;
    /** Azurite port */
    port: number;
    /** Account name for Azurite */
    accountName: string;
    /** Account key for Azurite */
    accountKey: string;
  };
  /** Health check configuration */
  healthCheck: {
    /** Health check interval in milliseconds */
    interval: number;
    /** Health check timeout in milliseconds */
    timeout: number;
    /** Maximum retries for health checks */
    maxRetries: number;
  };
}

/**
 * Emulator Health Status
 */
export interface EmulatorHealth {
  /** Overall emulator status */
  status: 'healthy' | 'unhealthy' | 'unknown';
  /** LocalStack health status */
  localStack: {
    status: 'healthy' | 'unhealthy' | 'unknown';
    endpoint: string;
    responseTime: number;
    lastChecked: Date;
    error?: string;
  };
  /** Azurite health status */
  azurite: {
    status: 'healthy' | 'unhealthy' | 'unknown';
    endpoint: string;
    responseTime: number;
    lastChecked: Date;
    error?: string;
  };
  /** Overall health metrics */
  metrics: {
    totalChecks: number;
    successfulChecks: number;
    failedChecks: number;
    averageResponseTime: number;
    lastUpdated: Date;
  };
}

/**
 * Emulator Manager
 * Manages LocalStack (S3) and Azurite (Azure) emulators
 */
export class EmulatorManager {
  private readonly config: EmulatorConfig;
  private healthStatus: EmulatorHealth;
  private healthCheckInterval?: NodeJS.Timeout;
  private isRunning: boolean = false;

  constructor(config: EmulatorConfig) {
    this.config = config;
    this.healthStatus = this.initializeHealthStatus();
  }

  /**
   * Start the emulator manager
   */
  async start(): Promise<AppResult<void>> {
    try {
      if (this.isRunning) {
        return AppResult.Ok(undefined);
      }

      // Start health monitoring if emulators are enabled
      if (this.config.useEmulators) {
        await this.startHealthMonitoring();
      }

      this.isRunning = true;
      return AppResult.Ok(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error starting emulator manager';
      return AppResult.Err(AppError.Generic(`Failed to start emulator manager: ${errorMessage}`));
    }
  }

  /**
   * Stop the emulator manager
   */
  async stop(): Promise<AppResult<void>> {
    try {
      if (!this.isRunning) {
        return AppResult.Ok(undefined);
      }

      // Stop health monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = undefined;
      }

      this.isRunning = false;
      return AppResult.Ok(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error stopping emulator manager';
      return AppResult.Err(AppError.Generic(`Failed to stop emulator manager: ${errorMessage}`));
    }
  }

  /**
   * Get current emulator health status
   */
  getHealth(): EmulatorHealth {
    return { ...this.healthStatus };
  }

  /**
   * Check if emulators are enabled
   */
  isEmulatorMode(): boolean {
    return this.config.useEmulators;
  }

  /**
   * Get LocalStack configuration
   */
  getLocalStackConfig() {
    return { ...this.config.localStack };
  }

  /**
   * Get Azurite configuration
   */
  getAzuriteConfig() {
    return { ...this.config.azurite };
  }

  /**
   * Perform manual health check
   */
  async performHealthCheck(): Promise<AppResult<EmulatorHealth>> {
    try {
      if (!this.config.useEmulators) {
        return AppResult.Ok(this.healthStatus);
      }

      // Check LocalStack health
      const localStackHealth = await this.checkLocalStackHealth();
      
      // Check Azurite health
      const azuriteHealth = await this.checkAzuriteHealth();

      // Update overall health status
      this.updateHealthStatus(localStackHealth, azuriteHealth);

      return AppResult.Ok(this.getHealth());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during health check';
      return AppResult.Err(AppError.Generic(`Health check failed: ${errorMessage}`));
    }
  }

  /**
   * Start health monitoring
   */
  private async startHealthMonitoring(): Promise<void> {
    // Perform initial health check
    await this.performHealthCheck();

    // Set up periodic health checks
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('Periodic health check failed:', error);
      }
    }, this.config.healthCheck.interval);
  }

  /**
   * Check LocalStack health
   */
  private async checkLocalStackHealth(): Promise<{
    status: 'healthy' | 'unhealthy' | 'unknown';
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.healthCheck.timeout);
      
      // Simple HTTP health check to LocalStack endpoint
      const response = await fetch(`${this.config.localStack.endpoint}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return {
          status: 'healthy',
          responseTime,
        };
      } else {
        return {
          status: 'unhealthy',
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        status: 'unhealthy',
        responseTime,
        error: errorMessage,
      };
    }
  }

  /**
   * Check Azurite health
   */
  private async checkAzuriteHealth(): Promise<{
    status: 'healthy' | 'unhealthy' | 'unknown';
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.healthCheck.timeout);
      
      // Simple HTTP health check to Azurite endpoint
      const response = await fetch(`${this.config.azurite.endpoint}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return {
          status: 'healthy',
          responseTime,
        };
      } else {
        return {
          status: 'unhealthy',
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        status: 'unhealthy',
        responseTime,
        error: errorMessage,
      };
    }
  }

  /**
   * Update health status
   */
  private updateHealthStatus(
    localStackHealth: { status: 'healthy' | 'unhealthy' | 'unknown'; responseTime: number; error?: string },
    azuriteHealth: { status: 'healthy' | 'unhealthy' | 'unknown'; responseTime: number; error?: string }
  ): void {
    // Update LocalStack health
    this.healthStatus.localStack = {
      status: localStackHealth.status,
      endpoint: this.config.localStack.endpoint,
      responseTime: localStackHealth.responseTime,
      lastChecked: new Date(),
      error: localStackHealth.error,
    };

    // Update Azurite health
    this.healthStatus.azurite = {
      status: azuriteHealth.status,
      endpoint: this.config.azurite.endpoint,
      responseTime: azuriteHealth.responseTime,
      lastChecked: new Date(),
      error: azuriteHealth.error,
    };

    // Update overall status
    if (localStackHealth.status === 'healthy' && azuriteHealth.status === 'healthy') {
      this.healthStatus.status = 'healthy';
    } else if (localStackHealth.status === 'unhealthy' || azuriteHealth.status === 'unhealthy') {
      this.healthStatus.status = 'unhealthy';
    } else {
      this.healthStatus.status = 'unknown';
    }

    // Update metrics
    this.healthStatus.metrics.totalChecks++;
    if (this.healthStatus.status === 'healthy') {
      this.healthStatus.metrics.successfulChecks++;
    } else {
      this.healthStatus.metrics.failedChecks++;
    }

    // Calculate average response time
    const totalResponseTime = localStackHealth.responseTime + azuriteHealth.responseTime;
    const currentAverage = this.healthStatus.metrics.averageResponseTime;
    const totalChecks = this.healthStatus.metrics.totalChecks;
    
    this.healthStatus.metrics.averageResponseTime = 
      (currentAverage * (totalChecks - 1) + totalResponseTime) / totalChecks;

    this.healthStatus.metrics.lastUpdated = new Date();
  }

  /**
   * Initialize health status
   */
  private initializeHealthStatus(): EmulatorHealth {
    return {
      status: 'unknown',
      localStack: {
        status: 'unknown',
        endpoint: this.config.localStack.endpoint,
        responseTime: 0,
        lastChecked: new Date(),
      },
      azurite: {
        status: 'unknown',
        endpoint: this.config.azurite.endpoint,
        responseTime: 0,
        lastChecked: new Date(),
      },
      metrics: {
        totalChecks: 0,
        successfulChecks: 0,
        failedChecks: 0,
        averageResponseTime: 0,
        lastUpdated: new Date(),
      },
    };
  }

  /**
   * Get emulator status summary
   */
  getStatusSummary(): string {
    if (!this.config.useEmulators) {
      return 'Emulators disabled - using cloud services';
    }

    const localStackStatus = this.healthStatus.localStack.status;
    const azuriteStatus = this.healthStatus.azurite.status;
    const overallStatus = this.healthStatus.status;

    return `Emulators: ${overallStatus} | LocalStack: ${localStackStatus} | Azurite: ${azuriteStatus}`;
  }

  /**
   * Check if specific emulator is healthy
   */
  isLocalStackHealthy(): boolean {
    return this.config.useEmulators && this.healthStatus.localStack.status === 'healthy';
  }

  isAzuriteHealthy(): boolean {
    return this.config.useEmulators && this.healthStatus.azurite.status === 'healthy';
  }

  /**
   * Get configuration for environment switching
   */
  getEnvironmentConfig(): {
    useEmulators: boolean;
    s3Endpoint?: string;
    s3Config?: any;
    azureEndpoint?: string;
    azureConfig?: any;
  } {
    if (!this.config.useEmulators) {
      return { useEmulators: false };
    }

    return {
      useEmulators: true,
      s3Endpoint: this.isLocalStackHealthy() ? this.config.localStack.endpoint : undefined,
      s3Config: this.isLocalStackHealthy() ? {
        endpoint: this.config.localStack.endpoint,
        usePathStyle: this.config.localStack.usePathStyle,
        accessKey: this.config.localStack.accessKey,
        secretKey: this.config.localStack.secretKey,
        region: this.config.localStack.region,
      } : undefined,
      azureEndpoint: this.isAzuriteHealthy() ? this.config.azurite.endpoint : undefined,
      azureConfig: this.isAzuriteHealthy() ? {
        endpoint: this.config.azurite.endpoint,
        accountName: this.config.azurite.accountName,
        accountKey: this.config.azurite.accountKey,
      } : undefined,
    };
  }
}
