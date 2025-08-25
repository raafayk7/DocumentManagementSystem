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
    this.totalItems = totalItems;
    this.completedItems = 0;
    this.failedItems = 0;
    this.startTime = Date.now();
    
    console.log(`Starting operation with ${totalItems} items...`);
  }

  /**
   * Update progress
   */
  public updateProgress(completed: number, failed: number = 0): void {
    this.completedItems = completed;
    this.failedItems = failed;
    
    const percentage = Math.round((this.completedItems / this.totalItems) * 100);
    const progressBar = this.createProgressBar(percentage);
    
    process.stdout.write(`\r${progressBar} ${percentage}% (${this.completedItems}/${this.totalItems})`);
    
    if (this.completedItems === this.totalItems) {
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
    const filledLength = Math.round((percentage / 100) * barLength);
    const emptyLength = barLength - filledLength;
    
    const filled = '█'.repeat(filledLength);
    const empty = '░'.repeat(emptyLength);
    
    return `[${filled}${empty}]`;
  }

  /**
   * Show operation summary
   */
  private showSummary(): void {
    if (!this.startTime) return;
    
    const duration = Date.now() - this.startTime;
    const durationSeconds = (duration / 1000).toFixed(2);
    
    console.log(`\nSummary:`);
    console.log(`  Total items: ${this.totalItems}`);
    console.log(`  Completed: ${this.completedItems}`);
    console.log(`  Failed: ${this.failedItems}`);
    console.log(`  Duration: ${durationSeconds}s`);
    console.log(`  Success rate: ${Math.round((this.completedItems / this.totalItems) * 100)}%`);
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
}
