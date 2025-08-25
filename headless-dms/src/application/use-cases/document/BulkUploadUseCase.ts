import { injectable, inject } from 'tsyringe';
import { AppResult } from '@carbonteq/hexapp';
import { IDocumentApplicationService } from '../../../ports/input/IDocumentApplicationService.js';
import { IStorageStrategy } from '../../../ports/output/IStorageStrategy.js';
import { ConcurrencyManager } from '../../../adapters/primary/cli/services/ConcurrencyManager.js';
import { ProgressTracker } from '../../../adapters/primary/cli/services/ProgressTracker.js';

export interface BulkUploadOptions {
  directory: string;
  concurrent: number;
  tags?: string[];
  metadata?: Record<string, string>;
  dryRun: boolean;
}

export interface BulkUploadResult {
  totalFiles: number;
  uploadedFiles: number;
  failedFiles: number;
  skippedFiles: number;
  duration: number;
  successRate: number;
}

export interface FileUploadInfo {
  filePath: string;
  fileName: string;
  mimeType: string;
  size: number;
  tags: string[];
  metadata: Record<string, string>;
}

/**
 * Use case for bulk uploading documents
 * Orchestrates upload operations using existing application services
 */
@injectable()
export class BulkUploadUseCase {
  constructor(
    @inject('IDocumentApplicationService') private documentService: IDocumentApplicationService,
    @inject('IStorageStrategy') private storageStrategy: IStorageStrategy,
    @inject(ConcurrencyManager) private concurrencyManager: ConcurrencyManager,
    @inject(ProgressTracker) private progressTracker: ProgressTracker
  ) {}

  /**
   * Execute bulk upload operation
   */
  public async execute(options: BulkUploadOptions): Promise<AppResult<BulkUploadResult>> {
    try {
      // 1. Scan directory for files to upload
      const filesResult = await this.scanDirectoryForFiles(options.directory);
      if (filesResult.isErr()) {
        return AppResult.Err(filesResult.unwrapErr());
      }

      const files = filesResult.unwrap();
      if (files.length === 0) {
        return AppResult.Err(new Error('No files found to upload'));
      }

      // 2. Initialize progress tracking
      this.progressTracker.initialize(files.length);
      this.concurrencyManager.updateLimits(options.concurrent, 100);

      // 3. Process files with concurrency control
      const startTime = Date.now();
      const result = await this.uploadFilesWithConcurrency(files, options);

      // 4. Calculate final statistics
      const duration = Date.now() - startTime;
      const successRate = (result.uploadedFiles / files.length) * 100;

      const uploadResult: BulkUploadResult = {
        totalFiles: files.length,
        uploadedFiles: result.uploadedFiles,
        failedFiles: result.failedFiles,
        skippedFiles: result.skippedFiles,
        duration,
        successRate
      };

      return AppResult.Ok(uploadResult);

    } catch (error) {
      return AppResult.Err(error instanceof Error ? error : new Error('Bulk upload failed'));
    }
  }

  /**
   * Scan directory for files to upload
   */
  private async scanDirectoryForFiles(directory: string): Promise<AppResult<FileUploadInfo[]>> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const files: FileUploadInfo[] = [];
      
      async function scanDir(dir: string): Promise<void> {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            await scanDir(fullPath);
          } else if (entry.isFile()) {
            // Get file stats
            const stats = await fs.stat(fullPath);
            
            // Determine MIME type
            const mimeType = this.getMimeType(entry.name);
            
            files.push({
              filePath: fullPath,
              fileName: entry.name,
              mimeType,
              size: stats.size,
              tags: [],
              metadata: {}
            });
          }
        }
      }
      
      await scanDir.call(this, directory);
      return AppResult.Ok(files);

    } catch (error) {
      return AppResult.Err(error instanceof Error ? error : new Error('Failed to scan directory'));
    }
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'txt': 'text/plain',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'tiff': 'image/tiff',
      'mp4': 'video/mp4',
      'avi': 'video/x-msvideo',
      'mov': 'video/quicktime',
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed'
    };
    
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  /**
   * Upload files with concurrency control
   */
  private async uploadFilesWithConcurrency(
    files: FileUploadInfo[],
    options: BulkUploadOptions
  ): Promise<{ uploadedFiles: number; failedFiles: number; skippedFiles: number }> {
    let uploadedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const activeUploads: Promise<void>[] = [];

    for (const file of files) {
      // Wait for available worker slot
      while (!this.concurrencyManager.canStartWorker()) {
        await this.concurrencyManager.waitForRateLimit();
      }

      // Start upload worker
      this.concurrencyManager.startWorker();
      
      const uploadPromise = this.uploadSingleFile(file, options)
        .then(() => {
          uploadedCount++;
          this.progressTracker.markCompleted();
        })
        .catch((error) => {
          if (error.message.includes('skipped')) {
            skippedCount++;
            this.progressTracker.markCompleted(); // Count as completed for progress
          } else {
            failedCount++;
            this.progressTracker.markFailed();
            console.error(`Failed to upload ${file.fileName}:`, error.message);
          }
        })
        .finally(() => {
          this.concurrencyManager.stopWorker();
        });

      activeUploads.push(uploadPromise);
    }

    // Wait for all uploads to complete
    await Promise.all(activeUploads);

    return { uploadedFiles: uploadedCount, failedFiles: failedCount, skippedFiles: skippedCount };
  }

  /**
   * Upload a single file
   */
  private async uploadSingleFile(file: FileUploadInfo, options: BulkUploadOptions): Promise<void> {
    try {
      // 1. Read file content
      const fs = await import('fs/promises');
      const fileBuffer = await fs.readFile(file.filePath);

      // 2. Check if file already exists (basic duplicate detection)
      if (!options.dryRun) {
        const existsResult = await this.storageStrategy.exists(file.fileName);
        if (existsResult.isOk() && existsResult.unwrap()) {
          throw new Error(`File ${file.fileName} already exists - skipped`);
        }
      }

      if (options.dryRun) {
        console.log(`[DRY RUN] Would upload: ${file.fileName} (${file.size} bytes)`);
        return;
      }

      // 3. Upload to storage strategy
      const uploadResult = await this.storageStrategy.upload({
        name: file.fileName,
        size: file.size,
        mimeType: file.mimeType,
        buffer: fileBuffer
      }, {
        tags: options.tags || [],
        metadata: {
          ...file.metadata,
          ...options.metadata,
          uploadedAt: new Date().toISOString(),
          originalPath: file.filePath
        }
      });

      if (uploadResult.isErr()) {
        throw new Error(`Storage upload failed: ${uploadResult.unwrapErr().message}`);
      }

      // 4. Create document record
      const createResult = await this.documentService.createDocument({
        name: file.fileName,
        filePath: uploadResult.unwrap(),
        mimeType: file.mimeType,
        size: file.size.toString(),
        tags: options.tags || [],
        metadata: {
          ...file.metadata,
          ...options.metadata,
          uploadedAt: new Date().toISOString(),
          originalPath: file.filePath
        }
      });

      if (createResult.isErr()) {
        throw new Error(`Document creation failed: ${createResult.unwrapErr().message}`);
      }

    } catch (error) {
      throw new Error(`Failed to upload ${file.fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
