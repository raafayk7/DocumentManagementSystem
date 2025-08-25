import { Command } from 'commander';
import { injectable, inject } from 'tsyringe';
import { IStorageStrategy } from '../../../../ports/output/IStorageStrategy.js';
import { ConcurrencyManager } from '../services/ConcurrencyManager.js';

/**
 * CLI command for showing system status and health
 * Integrates with existing application services for business logic
 */
@injectable()
export class StatusCommand {
  constructor(
    @inject('IStorageStrategy') private storageStrategy: IStorageStrategy,
    @inject(ConcurrencyManager) private concurrencyManager: ConcurrencyManager
  ) {}

  /**
   * Register the status command with the CLI program
   */
  public register(program: Command): void {
    program
      .command('status')
      .description('Show system status and health information')
      .option('-v, --verbose', 'Show detailed status information')
      .option('--storage', 'Show storage strategy status')
      .option('--health', 'Show system health metrics')
      .option('--format <format>', 'Output format (json, table)', 'format')
      .action(async (options) => {
        try {
          console.log('🔍 Checking system status...\n');

          // Show basic system info
          this.showBasicStatus();

          // Show storage status if requested
          if (options.storage || options.verbose) {
            await this.showStorageStatus();
          }

          // Show health metrics if requested
          if (options.health || options.verbose) {
            await this.showHealthMetrics();
          }

          // Show concurrency status
          this.showConcurrencyStatus();

          console.log('\n✅ System status check completed');

        } catch (error) {
          console.error('❌ Status check failed:', error);
          process.exit(1);
        }
      });
  }

  /**
   * Show basic system status
   */
  private showBasicStatus(): void {
    console.log('📊 Basic System Status:');
    console.log(`   Node.js version: ${process.version}`);
    console.log(`   Platform: ${process.platform}`);
    console.log(`   Architecture: ${process.arch}`);
    console.log(`   Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    console.log(`   Uptime: ${Math.round(process.uptime())}s`);
  }

  /**
   * Show storage strategy status
   */
  private async showStorageStatus(): Promise<void> {
    try {
      console.log('\n💾 Storage Strategy Status:');
      
      const healthResult = await this.storageStrategy.getHealth();
      if (healthResult.isOk()) {
        const health = healthResult.unwrap();
        console.log(`   Status: ${health.status}`);
        console.log(`   Available: ${health.available ? '✅' : '❌'}`);
        console.log(`   Response time: ${health.responseTime}ms`);
        console.log(`   Last checked: ${health.lastChecked.toISOString()}`);
        
        if (health.details) {
          console.log(`   Details: ${JSON.stringify(health.details, null, 2)}`);
        }
      } else {
        console.log(`   Status: ❌ Error - ${healthResult.unwrapErr().message}`);
      }
    } catch (error) {
      console.log(`   Status: ❌ Failed to check - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Show health metrics
   */
  private async showHealthMetrics(): Promise<void> {
    try {
      console.log('\n🏥 Health Metrics:');
      
      // Get storage stats
      const statsResult = await this.storageStrategy.getStorageStats();
      if (statsResult.isOk()) {
        const stats = statsResult.unwrap();
        console.log(`   Total capacity: ${stats.totalCapacity}`);
        console.log(`   Used capacity: ${stats.usedCapacity}`);
        console.log(`   Available capacity: ${stats.availableCapacity}`);
        console.log(`   Utilization: ${stats.utilizationPercentage}%`);
      } else {
        console.log(`   Storage stats: ❌ Error - ${statsResult.unwrapErr().message}`);
      }

      // Show process health
      const cpuUsage = process.cpuUsage();
      console.log(`   CPU usage: ${Math.round(cpuUsage.user / 1000)}ms user, ${Math.round(cpuUsage.system / 1000)}ms system`);
      
    } catch (error) {
      console.log(`   Health metrics: ❌ Failed to check - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Show concurrency status
   */
  private showConcurrencyStatus(): void {
    console.log('\n⚡ Concurrency Status:');
    const status = this.concurrencyManager.getStatus();
    console.log(`   Active workers: ${status.active}`);
    console.log(`   Max workers: ${status.max}`);
    console.log(`   Available workers: ${status.available}`);
  }
}
