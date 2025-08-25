import { injectable, inject } from 'tsyringe';
import { ConcurrencyManager, JobInfo, JobStatus } from './ConcurrencyManager.js';
import { ProgressTracker } from './ProgressTracker.js';

/**
 * Background job configuration
 */
export interface BackgroundJobConfig {
  enablePersistence: boolean;
  persistenceInterval: number;
  maxRetries: number;
  retryBackoffMultiplier: number;
  jobTimeout: number;
  cleanupInterval: number;
  maxCompletedJobs: number;
}

/**
 * Background job result
 */
export interface BackgroundJobResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  processingTime: number;
  retryCount: number;
}

/**
 * Background job metadata
 */
export interface BackgroundJobMetadata {
  type: string;
  priority: 'low' | 'normal' | 'high';
  tags?: string[];
  description?: string;
  estimatedDuration?: number;
  dependencies?: string[];
}

/**
 * Processes background jobs with persistence and recovery capabilities
 */
@injectable()
export class BackgroundJobProcessor {
  private config: BackgroundJobConfig;
  private jobHistory: Map<string, JobInfo> = new Map();
  private jobMetadata: Map<string, BackgroundJobMetadata> = new Map();
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    @inject(ConcurrencyManager) private concurrencyManager: ConcurrencyManager,
    @inject(ProgressTracker) private progressTracker: ProgressTracker
  ) {
    this.config = {
      enablePersistence: process.env.BG_JOB_PERSISTENCE === 'true',
      persistenceInterval: parseInt(process.env.BG_JOB_PERSISTENCE_INTERVAL || '30000'),
      maxRetries: parseInt(process.env.BG_JOB_MAX_RETRIES || '3'),
      retryBackoffMultiplier: parseFloat(process.env.BG_JOB_RETRY_BACKOFF || '2.0'),
      jobTimeout: parseInt(process.env.BG_JOB_TIMEOUT || '300000'),
      cleanupInterval: parseInt(process.env.BG_JOB_CLEANUP_INTERVAL || '3600000'),
      maxCompletedJobs: parseInt(process.env.BG_JOB_MAX_COMPLETED || '1000')
    };

    this.setupEventHandlers();
    this.startCleanupTimer();
  }

  /**
   * Submit a background job for processing
   */
  public async submitBackgroundJob<T>(
    jobData: T,
    processor: (data: T) => Promise<any>,
    metadata: BackgroundJobMetadata
  ): Promise<string> {
    const jobId = await this.concurrencyManager.submitJob(
      jobData,
      this.createJobProcessor(processor),
      metadata.priority
    );

    // Store metadata
    this.jobMetadata.set(jobId, metadata);

    // Set up job monitoring
    this.monitorJob(jobId);

    return jobId;
  }

  /**
   * Create a job processor with retry logic and error handling
   */
  private createJobProcessor<T>(processor: (data: T) => Promise<any>) {
    return async (data: T): Promise<any> => {
      let lastError: Error;
      let retryCount = 0;

      while (retryCount <= this.config.maxRetries) {
        try {
          const startTime = Date.now();
          const result = await processor(data);
          const processingTime = Date.now() - startTime;

          return {
            success: true,
            data: result,
            processingTime,
            retryCount
          } as BackgroundJobResult<T>;

        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          retryCount++;

          if (retryCount <= this.config.maxRetries) {
            // Calculate backoff delay
            const backoffDelay = this.config.retryBackoffMultiplier ** retryCount * 1000;
            await this.delay(backoffDelay);
          }
        }
      }

      // All retries exhausted
      throw new Error(`Job failed after ${retryCount} retries: ${lastError!.message}`);
    };
  }

  /**
   * Monitor job progress and handle completion
   */
  private monitorJob(jobId: string): void {
    const checkJobStatus = async () => {
      const jobInfo = this.concurrencyManager.getJobInfo(jobId);
      if (!jobInfo) return;

      // Update progress tracker
      if (jobInfo.status === JobStatus.RUNNING) {
        this.progressTracker.updateProgress(0, 0, `Processing job ${jobId}`);
      } else if (jobInfo.status === JobStatus.COMPLETED) {
        this.progressTracker.updateProgress(1, 0, `Job ${jobId} completed`);
        this.jobHistory.set(jobId, jobInfo);
      } else if (jobInfo.status === JobStatus.FAILED) {
        this.progressTracker.updateProgress(0, 1, `Job ${jobId} failed: ${jobInfo.error}`);
        this.jobHistory.set(jobId, jobInfo);
      }

      // Continue monitoring if job is still running
      if (jobInfo.status === JobStatus.PENDING || jobInfo.status === JobStatus.RUNNING) {
        setTimeout(checkJobStatus, 1000);
      }
    };

    checkJobStatus();
  }

  /**
   * Get job status and metadata
   */
  public getJobDetails(jobId: string): { job: JobInfo; metadata: BackgroundJobMetadata } | undefined {
    const job = this.concurrencyManager.getJobInfo(jobId);
    const metadata = this.jobMetadata.get(jobId);
    
    if (!job || !metadata) return undefined;
    
    return { job, metadata };
  }

  /**
   * Get all background jobs
   */
  public getAllBackgroundJobs(): Array<{ job: JobInfo; metadata: BackgroundJobMetadata }> {
    const allJobs = this.concurrencyManager.getAllJobs();
    const result: Array<{ job: JobInfo; metadata: BackgroundJobMetadata }> = [];

    // Add running jobs
    if (allJobs.running && allJobs.running.length > 0) {
      for (const job of allJobs.running) {
        const metadata = this.jobMetadata.get(job.id);
        if (metadata) {
          result.push({ job, metadata });
        }
      }
    }

    // Add completed jobs
    if (allJobs.completed && allJobs.completed.length > 0) {
      for (const job of allJobs.completed) {
        const metadata = this.jobMetadata.get(job.id);
        if (metadata) {
          result.push({ job, metadata });
        }
      }
    }

    return result;
  }

  /**
   * Cancel a background job
   */
  public cancelBackgroundJob(jobId: string): boolean {
    const cancelled = this.concurrencyManager.cancelJob(jobId);
    if (cancelled) {
      this.progressTracker.updateProgress(0, 1, `Job ${jobId} cancelled`);
    }
    return cancelled;
  }

  /**
   * Get background job statistics
   */
  public getBackgroundJobStats(): {
    totalJobs: number;
    runningJobs: number;
    completedJobs: number;
    failedJobs: number;
    averageProcessingTime: number;
    successRate: number;
  } {
    const allJobs = this.concurrencyManager.getAllJobs();
    const totalJobs = allJobs.running.length + allJobs.completed.length;
    const completedJobs = allJobs.completed.length;
    const failedJobs = allJobs.completed.filter(job => 
      job.status === JobStatus.FAILED
    ).length;
    const runningJobs = allJobs.running.length;

    const completedJobTimes = allJobs.completed
      .filter(job => job.processingTime)
      .map(job => job.processingTime!);

    const averageProcessingTime = completedJobTimes.length > 0
      ? completedJobTimes.reduce((sum, time) => sum + time, 0) / completedJobTimes.length
      : 0;

    const successRate = completedJobs > 0
      ? ((completedJobs - failedJobs) / completedJobs) * 100
      : 0;

    return {
      totalJobs,
      runningJobs,
      completedJobs,
      failedJobs,
      averageProcessingTime,
      successRate
    };
  }

  /**
   * Update background job configuration
   */
  public updateConfig(newConfig: Partial<BackgroundJobConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Start cleanup timer for old completed jobs
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldJobs();
    }, this.config.cleanupInterval);
  }

  /**
   * Clean up old completed jobs to prevent memory bloat
   */
  private cleanupOldJobs(): void {
    const allJobs = this.concurrencyManager.getAllJobs();
    const completedJobs = Array.from(allJobs.completed.values())
      .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0));

    // Keep only the most recent completed jobs
    if (completedJobs.length > this.config.maxCompletedJobs) {
      const jobsToRemove = completedJobs.slice(this.config.maxCompletedJobs);
      for (const job of jobsToRemove) {
        this.jobHistory.delete(job.id);
        this.jobMetadata.delete(job.id);
      }
    }
  }

  /**
   * Setup event handlers for concurrency manager
   */
  private setupEventHandlers(): void {
    this.concurrencyManager.on('jobQueued', (job) => {
      this.progressTracker.updateProgress(0, 0, `Job ${job.id} queued`);
    });

    this.concurrencyManager.on('jobStarted', (job) => {
      this.progressTracker.updateProgress(0, 0, `Job ${job.id} started`);
    });

    this.concurrencyManager.on('jobCompleted', (job, result) => {
      this.progressTracker.updateProgress(1, 0, `Job ${job.id} completed successfully`);
    });

    this.concurrencyManager.on('jobFailed', (job, error) => {
      this.progressTracker.updateProgress(0, 1, `Job ${job.id} failed: ${error}`);
    });

    this.concurrencyManager.on('jobCancelled', (job) => {
      this.progressTracker.updateProgress(0, 1, `Job ${job.id} cancelled`);
    });
  }

  /**
   * Shutdown the background job processor
   */
  public async shutdown(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    await this.concurrencyManager.shutdown();
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
