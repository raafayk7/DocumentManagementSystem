import { injectable } from 'tsyringe';
import { EventEmitter } from 'events';

/**
 * Concurrency control configuration
 */
export interface ConcurrencyConfig {
  maxConcurrent: number;
  maxQueueSize: number;
  rateLimitDelay: number;
  workerTimeout: number;
  retryAttempts: number;
  retryDelay: number;
}

/**
 * Worker pool status
 */
export interface WorkerPoolStatus {
  active: number;
  max: number;
  available: number;
  queued: number;
  totalProcessed: number;
  totalFailed: number;
  averageProcessingTime: number;
}

/**
 * Job status
 */
export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Job information
 */
export interface JobInfo<T = any> {
  id: string;
  status: JobStatus;
  data: T;
  processor: (data: T) => Promise<any>;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
  processingTime?: number;
}

/**
 * Manages concurrency for CLI operations
 * Handles worker pools, rate limiting, and resource management
 */
@injectable()
export class ConcurrencyManager extends EventEmitter {
  private activeWorkers = 0;
  private jobQueue: Array<{ job: JobInfo; resolve: Function; reject: Function }> = [];
  private runningJobs = new Map<string, JobInfo>();
  private completedJobs = new Map<string, JobInfo>();
  private config: ConcurrencyConfig;
  private isShuttingDown = false;
  private processingStats = {
    totalProcessed: 0,
    totalFailed: 0,
    totalProcessingTime: 0
  };

  constructor() {
    super();
    
    // Load configuration from environment or use defaults
    this.config = {
      maxConcurrent: parseInt(process.env.CLI_MAX_CONCURRENT || '5'),
      maxQueueSize: parseInt(process.env.CLI_MAX_QUEUE_SIZE || '100'),
      rateLimitDelay: parseInt(process.env.CLI_RATE_LIMIT_DELAY || '100'),
      workerTimeout: parseInt(process.env.CLI_WORKER_TIMEOUT || '30000'),
      retryAttempts: parseInt(process.env.CLI_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.CLI_RETRY_DELAY || '1000')
    };
  }

  /**
   * Get current concurrency status
   */
  public getStatus(): WorkerPoolStatus {
    return {
      active: this.activeWorkers,
      max: this.config.maxConcurrent,
      available: this.config.maxConcurrent - this.activeWorkers,
      queued: this.jobQueue.length,
      totalProcessed: this.processingStats.totalProcessed,
      totalFailed: this.processingStats.totalFailed,
      averageProcessingTime: this.processingStats.totalProcessed > 0 
        ? this.processingStats.totalProcessingTime / this.processingStats.totalProcessed 
        : 0
    };
  }

  /**
   * Submit a job for processing
   */
  public async submitJob<T>(
    jobData: T,
    processor: (data: T) => Promise<any>,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<string> {
    if (this.isShuttingDown) {
      throw new Error('ConcurrencyManager is shutting down');
    }

    const job: JobInfo<T> = {
      id: this.generateJobId(),
      status: JobStatus.PENDING,
      data: jobData,
      processor,
      createdAt: new Date(),
      retryCount: 0
    };

    // Check queue size limit
    if (this.jobQueue.length >= this.config.maxQueueSize) {
      throw new Error('Job queue is full');
    }

    // Create a promise for the job result
    const jobPromise = new Promise((resolve, reject) => {
      const queueItem = { job, resolve, reject };
      
      // Add to queue based on priority
      if (priority === 'high') {
        this.jobQueue.unshift(queueItem);
      } else if (priority === 'low') {
        this.jobQueue.push(queueItem);
      } else {
        // Normal priority - add after high priority jobs
        const highPriorityCount = this.jobQueue.filter(item => 
          item.job.status === JobStatus.PENDING
        ).length;
        this.jobQueue.splice(highPriorityCount, 0, queueItem);
      }

      this.emit('jobQueued', job);
      this.processNextJob();
    });

    // Store the promise for later resolution
    (job as any).resultPromise = jobPromise;

    // Return the job ID immediately
    return job.id;
  }

  /**
   * Get job result when available
   */
  public async getJobResult(jobId: string): Promise<any> {
    const job = this.runningJobs.get(jobId) || this.completedJobs.get(jobId);
    if (!job || !(job as any).resultPromise) {
      throw new Error('Job not found or no result promise available');
    }
    
    return (job as any).resultPromise;
  }

  /**
   * Process the next job in the queue
   */
  private async processNextJob(): Promise<void> {
    if (this.activeWorkers >= this.config.maxConcurrent || this.jobQueue.length === 0) {
      return;
    }

    const queueItem = this.jobQueue.shift();
    if (!queueItem) return;

    const { job, resolve, reject } = queueItem;
    
    // Update job status
    job.status = JobStatus.RUNNING;
    job.startedAt = new Date();
    this.runningJobs.set(job.id, job);
    this.activeWorkers++;

    this.emit('jobStarted', job);

    try {
      // Apply rate limiting
      if (this.config.rateLimitDelay > 0) {
        await this.delay(this.config.rateLimitDelay);
      }

      // Process the job with timeout
      const result = await this.processJobWithTimeout(job, resolve, reject);
      
      // Job completed successfully
      job.status = JobStatus.COMPLETED;
      job.completedAt = new Date();
      job.processingTime = job.completedAt.getTime() - job.startedAt!.getTime();
      
      this.completedJobs.set(job.id, job);
      this.runningJobs.delete(job.id);
      this.activeWorkers--;
      
      this.processingStats.totalProcessed++;
      this.processingStats.totalProcessingTime += job.processingTime;
      
      this.emit('jobCompleted', job, result);
      resolve(result);

    } catch (error) {
      // Job failed
      job.status = JobStatus.FAILED;
      job.error = error instanceof Error ? error.message : String(error);
      job.completedAt = new Date();
      
      this.completedJobs.set(job.id, job);
      this.runningJobs.delete(job.id);
      this.activeWorkers--;
      
      this.processingStats.totalFailed++;
      
      this.emit('jobFailed', job, error);
      reject(error);
    }

    // Process next job
    this.processNextJob();
  }

  /**
   * Process job with timeout protection
   */
  private async processJobWithTimeout(
    job: JobInfo,
    resolve: Function,
    reject: Function
  ): Promise<any> {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Job timeout')), this.config.workerTimeout);
    });

    // Execute the actual job processor
    const jobPromise = job.processor(job.data);
    
    return Promise.race([jobPromise, timeoutPromise]);
  }

  /**
   * Cancel a running job
   */
  public cancelJob(jobId: string): boolean {
    const job = this.runningJobs.get(jobId);
    if (!job) return false;

    job.status = JobStatus.CANCELLED;
    job.completedAt = new Date();
    
    this.runningJobs.delete(jobId);
    this.activeWorkers--;
    
    this.emit('jobCancelled', job);
    return true;
  }

  /**
   * Get job information
   */
  public getJobInfo(jobId: string): JobInfo | undefined {
    return this.runningJobs.get(jobId) || this.completedJobs.get(jobId);
  }

  /**
   * Get all jobs
   */
  public getAllJobs(): { running: JobInfo[]; completed: JobInfo[] } {
    return {
      running: Array.from(this.runningJobs.values()),
      completed: Array.from(this.completedJobs.values())
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<ConcurrencyConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }

  /**
   * Shutdown the concurrency manager
   */
  public async shutdown(timeout: number = 5000): Promise<void> {
    this.isShuttingDown = true;
    this.emit('shutdownStarted');

    // Wait for running jobs to complete
    const startTime = Date.now();
    while (this.activeWorkers > 0 && (Date.now() - startTime) < timeout) {
      await this.delay(100);
    }

    // Cancel remaining jobs
    for (const job of this.runningJobs.values()) {
      this.cancelJob(job.id);
    }

    // Clear queue
    this.jobQueue = [];
    
    this.emit('shutdownCompleted');
  }

  /**
   * Wait for all jobs to complete
   */
  public async waitForCompletion(): Promise<void> {
    while (this.activeWorkers > 0 || this.jobQueue.length > 0) {
      await this.delay(100);
    }
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current configuration
   */
  public getConfig(): ConcurrencyConfig {
    return { ...this.config };
  }
}
