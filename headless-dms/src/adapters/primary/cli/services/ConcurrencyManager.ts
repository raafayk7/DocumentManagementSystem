import { injectable } from 'tsyringe';

/**
 * Manages concurrency for CLI operations
 * Handles worker pools, rate limiting, and resource management
 */
@injectable()
export class ConcurrencyManager {
  private activeWorkers = 0;
  private maxConcurrent: number;
  private rateLimitDelay: number;

  constructor() {
    // TODO: Load from environment configuration
    this.maxConcurrent = parseInt(process.env.CLI_MAX_CONCURRENT || '5');
    this.rateLimitDelay = parseInt(process.env.CLI_RATE_LIMIT_DELAY || '100');
  }

  /**
   * Get current concurrency status
   */
  public getStatus(): { active: number; max: number; available: number } {
    return {
      active: this.activeWorkers,
      max: this.maxConcurrent,
      available: this.maxConcurrent - this.activeWorkers
    };
  }

  /**
   * Check if a new worker can be started
   */
  public canStartWorker(): boolean {
    return this.activeWorkers < this.maxConcurrent;
  }

  /**
   * Start a new worker
   */
  public startWorker(): void {
    if (!this.canStartWorker()) {
      throw new Error('Maximum concurrent workers reached');
    }
    this.activeWorkers++;
  }

  /**
   * Stop a worker
   */
  public stopWorker(): void {
    if (this.activeWorkers > 0) {
      this.activeWorkers--;
    }
  }

  /**
   * Wait for rate limiting
   */
  public async waitForRateLimit(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
  }

  /**
   * Update concurrency limits
   */
  public updateLimits(maxConcurrent: number, rateLimitDelay: number): void {
    this.maxConcurrent = maxConcurrent;
    this.rateLimitDelay = rateLimitDelay;
  }
}
