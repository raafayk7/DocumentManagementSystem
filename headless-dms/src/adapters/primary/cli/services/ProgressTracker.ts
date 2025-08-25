import { injectable } from 'tsyringe';

/**
 * Tracks and displays progress for CLI operations
 * Handles progress bars, status updates, and formatting
 */
@injectable()
export class ProgressTracker {
  private totalItems = 0;
  private completedItems = 0;
  private failedItems = 0;
  private startTime: number | null = null;

  constructor() {}

  /**
   * Initialize progress tracking
   */
  public initialize(totalItems: number): void {
    this.totalItems = Math.max(0, totalItems);
    this.completedItems = 0;
    this.failedItems = 0;
    this.startTime = Date.now();
    
    if (this.totalItems > 0) {
      console.log(`Starting operation with ${this.totalItems} items...`);
    } else {
      console.log('Starting operation...');
    }
  }

  /**
   * Update progress
   */
  public updateProgress(completed: number, failed: number = 0, message?: string): void {
    this.completedItems = Math.max(0, completed);
    this.failedItems = Math.max(0, failed);
    
    // Handle case where totalItems is 0 to avoid division by zero
    if (this.totalItems === 0) {
      if (message) {
        process.stdout.write(`\r${message}`);
      }
      return;
    }
    
    const percentage = Math.round((this.completedItems / this.totalItems) * 100);
    const progressBar = this.createProgressBar(percentage);
    
    const progressText = `${progressBar} ${percentage}% (${this.completedItems}/${this.totalItems})`;
    const displayText = message ? `${message} - ${progressText}` : progressText;
    
    process.stdout.write(`\r${displayText}`);
    
    if (this.completedItems >= this.totalItems && this.totalItems > 0) {
      console.log('\nOperation completed!');
      this.showSummary();
    }
  }

  /**
   * Mark item as completed
   */
  public markCompleted(): void {
    this.completedItems++;
    this.updateProgress(this.completedItems, this.failedItems);
  }

  /**
   * Mark item as failed
   */
  public markFailed(): void {
    this.failedItems++;
    this.updateProgress(this.completedItems, this.failedItems);
  }

  /**
   * Create a simple progress bar
   */
  private createProgressBar(percentage: number): string {
    const barLength = 20;
    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    const filledLength = Math.round((clampedPercentage / 100) * barLength);
    const emptyLength = Math.max(0, barLength - filledLength);
    
    const filled = '█'.repeat(filledLength);
    const empty = '░'.repeat(emptyLength);
    
    return `[${filled}${empty}]`;
  }

  /**
   * Show operation summary
   */
  private showSummary(): void {
    if (!this.startTime || this.totalItems === 0) return;
    
    const duration = Date.now() - this.startTime;
    const durationSeconds = (duration / 1000).toFixed(2);
    
    console.log(`\nSummary:`);
    console.log(`  Total items: ${this.totalItems}`);
    console.log(`  Completed: ${this.completedItems}`);
    console.log(`  Failed: ${this.failedItems}`);
    console.log(`  Duration: ${durationSeconds}s`);
    
    const successRate = this.totalItems > 0 
      ? Math.round((this.completedItems / this.totalItems) * 100)
      : 0;
    console.log(`  Success rate: ${successRate}%`);
  }

  /**
   * Reset progress tracker
   */
  public reset(): void {
    this.totalItems = 0;
    this.completedItems = 0;
    this.failedItems = 0;
    this.startTime = null;
  }

  /**
   * Get current progress status
   */
  public getStatus(): {
    totalItems: number;
    completedItems: number;
    failedItems: number;
    percentage: number;
    isComplete: boolean;
  } {
    const percentage = this.totalItems > 0 
      ? Math.round((this.completedItems / this.totalItems) * 100)
      : 0;
    
    return {
      totalItems: this.totalItems,
      completedItems: this.completedItems,
      failedItems: this.failedItems,
      percentage,
      isComplete: this.totalItems > 0 && this.completedItems >= this.totalItems
    };
  }
}
