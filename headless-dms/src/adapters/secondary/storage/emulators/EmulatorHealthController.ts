import { Request, Response } from 'express';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { EmulatorManager } from './EmulatorManager.js';
import { EmulatorConfig } from './EmulatorConfig.js';
import { EmulatorHealth } from './EmulatorManager.js';

/**
 * Emulator Health Controller
 * Provides REST endpoints for emulator health monitoring
 */
export class EmulatorHealthController {
  private emulatorManager: EmulatorManager;
  private emulatorConfig: EmulatorConfig;

  constructor() {
    this.emulatorConfig = EmulatorConfig.getInstance();
    this.emulatorManager = new EmulatorManager(this.emulatorConfig.getConfig());
  }

  /**
   * Get overall emulator health status
   */
  async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const healthResult: AppResult<EmulatorHealth> = await this.emulatorManager.performHealthCheck();
      
      if (healthResult.isOk()) {
        const health = healthResult.unwrap();
        res.status(200).json({
          status: 'success',
          data: {
            emulatorMode: this.emulatorManager.isEmulatorMode(),
            overallHealth: health.status,
            timestamp: new Date().toISOString(),
            localStack: {
              status: health.localStack.status,
              endpoint: health.localStack.endpoint,
              responseTime: health.localStack.responseTime,
              lastChecked: health.localStack.lastChecked,
              error: health.localStack.error,
            },
            azurite: {
              status: health.azurite.status,
              endpoint: health.azurite.endpoint,
              responseTime: health.azurite.responseTime,
              lastChecked: health.azurite.lastChecked,
              error: health.azurite.error,
            },
            metrics: health.metrics,
          },
        });
      } else {
        // Type assertion to handle the type narrowing issue
        const errorResult = healthResult as AppResult<never>;
        const error = errorResult.unwrapErr();
        res.status(500).json({
          status: 'error',
          message: `Health check failed: ${error.message}`,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        status: 'error',
        message: `Health check failed: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get LocalStack-specific health status
   */
  async getLocalStackHealth(req: Request, res: Response): Promise<void> {
    try {
      if (!this.emulatorManager.isEmulatorMode()) {
        res.status(400).json({
          status: 'error',
          message: 'Emulators are not enabled',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const health = this.emulatorManager.getHealth();
      const isHealthy = this.emulatorManager.isLocalStackHealthy();
      
      res.status(200).json({
        status: 'success',
        data: {
          service: 'LocalStack',
          status: health.localStack.status,
          healthy: isHealthy,
          endpoint: health.localStack.endpoint,
          responseTime: health.localStack.responseTime,
          lastChecked: health.localStack.lastChecked,
          error: health.localStack.error,
          configuration: this.emulatorManager.getLocalStackConfig(),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        status: 'error',
        message: `LocalStack health check failed: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get Azurite-specific health status
   */
  async getAzuriteHealth(req: Request, res: Response): Promise<void> {
    try {
      if (!this.emulatorManager.isEmulatorMode()) {
        res.status(400).json({
          status: 'error',
          message: 'Emulators are not enabled',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const health = this.emulatorManager.getHealth();
      const isHealthy = this.emulatorManager.isAzuriteHealthy();
      
      res.status(200).json({
        status: 'success',
        data: {
          service: 'Azurite',
          status: health.azurite.status,
          healthy: isHealthy,
          endpoint: health.azurite.endpoint,
          responseTime: health.azurite.responseTime,
          lastChecked: health.azurite.lastChecked,
          error: health.azurite.error,
          configuration: this.emulatorManager.getAzuriteConfig(),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        status: 'error',
        message: `Azurite health check failed: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get emulator configuration
   */
  getConfiguration(req: Request, res: Response): void {
    try {
      const config = this.emulatorConfig.getConfig();
      const summary = this.emulatorConfig.getConfigSummary();
      
      res.status(200).json({
        status: 'success',
        data: {
          summary,
          emulatorMode: config.useEmulators,
          localStack: {
            enabled: config.useEmulators,
            ...config.localStack,
          },
          azurite: {
            enabled: config.useEmulators,
            ...config.azurite,
          },
          healthCheck: config.healthCheck,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        status: 'error',
        message: `Configuration retrieval failed: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Perform manual health check
   */
  async performHealthCheck(req: Request, res: Response): Promise<void> {
    try {
      const healthResult: AppResult<EmulatorHealth> = await this.emulatorManager.performHealthCheck();
      
      if (healthResult.isOk()) {
        const health = healthResult.unwrap();
        res.status(200).json({
          status: 'success',
          message: 'Health check completed successfully',
          data: {
            overallStatus: health.status,
            localStackStatus: health.localStack.status,
            azuriteStatus: health.azurite.status,
            timestamp: new Date().toISOString(),
          },
        });
      } else {
        // Type assertion to handle the type narrowing issue
        const errorResult = healthResult as AppResult<never>;
        const error = errorResult.unwrapErr();
        res.status(500).json({
          status: 'error',
          message: `Health check failed: ${error.message}`,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        status: 'error',
        message: `Manual health check failed: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get emulator status summary
   */
  getStatusSummary(req: Request, res: Response): void {
    try {
      const summary = this.emulatorManager.getStatusSummary();
      const config = this.emulatorConfig.getConfig();
      
      res.status(200).json({
        status: 'success',
        data: {
          summary,
          emulatorMode: config.useEmulators,
          localStackHealthy: this.emulatorManager.isLocalStackHealthy(),
          azuriteHealthy: this.emulatorManager.isAzuriteHealthy(),
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        status: 'error',
        message: `Status summary retrieval failed: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Start emulator manager
   */
  async startEmulatorManager(req: Request, res: Response): Promise<void> {
    try {
      const startResult: AppResult<void> = await this.emulatorManager.start();
      
      if (startResult.isOk()) {
        res.status(200).json({
          status: 'success',
          message: 'Emulator manager started successfully',
          timestamp: new Date().toISOString(),
        });
      } else {
        // Type assertion to handle the type narrowing issue
        const errorResult = startResult as AppResult<never>;
        const error = errorResult.unwrapErr();
        res.status(500).json({
          status: 'error',
          message: `Failed to start emulator manager: ${error.message}`,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        status: 'error',
        message: `Failed to start emulator manager: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Stop emulator manager
   */
  async stopEmulatorManager(req: Request, res: Response): Promise<void> {
    try {
      const stopResult: AppResult<void> = await this.emulatorManager.stop();
      
      if (stopResult.isOk()) {
        res.status(200).json({
          status: 'success',
          message: 'Emulator manager stopped successfully',
          timestamp: new Date().toISOString(),
        });
      } else {
        // Type assertion to handle the type narrowing issue
        const errorResult = stopResult as AppResult<never>;
        const error = errorResult.unwrapErr();
        res.status(500).json({
          status: 'error',
          message: `Failed to stop emulator manager: ${error.message}`,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        status: 'error',
        message: `Failed to stop emulator manager: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
