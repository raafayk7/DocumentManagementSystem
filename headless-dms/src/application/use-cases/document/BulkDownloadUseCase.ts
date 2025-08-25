import { injectable, inject } from 'tsyringe';
import { AppResult } from '@carbonteq/hexapp';
import { IDocumentApplicationService } from '../../../ports/input/IDocumentApplicationService.js';
import { IStorageStrategy } from '../../../ports/output/IStorageStrategy.js';
import { ConcurrencyManager } from '../../../adapters/primary/cli/services/ConcurrencyManager.js';
import { ProgressTracker } from '../../../adapters/primary/cli/services/ProgressTracker.js';

export interface BulkDownloadOptions {
  folder?: string;
  outputPath: string;
  concurrent: number;
  resume: boolean;
  format: 'json' | 'csv';
}

export interface BulkDownloadResult {
  totalDocuments: number;
  downloadedDocuments: number;
  failedDocuments: number;
  outputPath: string;
  duration: number;
  successRate: number;
}

export interface DocumentDownloadInfo {
  id: string;
  name: string;
  filePath: string;
  mimeType: string;
  size: string;
  tags: string[];
  metadata: Record<string, string>;
}

/**
 * Use case for bulk downloading documents
 * Orchestrates download operations using existing application services
 */
@injectable()
export class BulkDownloadUseCase {
  constructor(
    @inject('IDocumentApplicationService') private documentService: IDocumentApplicationService,
    @inject('IStorageStrategy') private storageStrategy: IStorageStrategy,
    @inject(ConcurrencyManager) private concurrencyManager: ConcurrencyManager,
    @inject(ProgressTracker) private progressTracker: ProgressTracker
  ) {}

  /**
   * Execute bulk download operation
   */
  public async execute(options: BulkDownloadOptions): Promise<AppResult<BulkDownloadResult>> {
    try {
      // 1. Get documents to download
      const documentsResult = await this.getDocumentsToDownload(options.folder);
      if (documentsResult.isErr()) {
        return AppResult.Err(documentsResult.unwrapErr());
      }

      const documents = documentsResult.unwrap();
      if (documents.length === 0) {
        return AppResult.Err(new Error('No documents found to download'));
      }

      // 2. Initialize progress tracking
      this.progressTracker.initialize(documents.length);
      this.concurrencyManager.updateLimits(options.concurrent, 100);

      // 3. Create output directory
      await this.ensureOutputDirectory(options.outputPath);

      // 4. Download documents with concurrency control
      const startTime = Date.now();
      const result = await this.downloadDocumentsWithConcurrency(documents, options);

      // 5. Calculate final statistics
      const duration = Date.now() - startTime;
      const successRate = (result.downloadedDocuments / documents.length) * 100;

      const downloadResult: BulkDownloadResult = {
        totalDocuments: documents.length,
        downloadedDocuments: result.downloadedDocuments,
        failedDocuments: result.failedDocuments,
        outputPath: options.outputPath,
        duration,
        successRate
      };

      return AppResult.Ok(downloadResult);

    } catch (error) {
      return AppResult.Err(error instanceof Error ? error : new Error('Bulk download failed'));
    }
  }

  /**
   * Get documents to download based on folder filter
   */
  private async getDocumentsToDownload(folder?: string): Promise<AppResult<DocumentDownloadInfo[]>> {
    try {
      // Use existing document service to get documents
      const documentsResult = await this.documentService.getDocuments({
        page: 1,
        limit: 1000, // TODO: Implement pagination for large datasets
        folder: folder
      });

      if (documentsResult.isErr()) {
        return AppResult.Err(documentsResult.unwrapErr());
      }

      const documents = documentsResult.unwrap();
      
      // Transform to download info format
      const downloadInfo: DocumentDownloadInfo[] = documents.data.map(doc => ({
        id: doc.id,
        name: doc.name,
        filePath: doc.filePath,
        mimeType: doc.mimeType,
        size: doc.size,
        tags: doc.tags || [],
        metadata: doc.metadata || {}
      }));

      return AppResult.Ok(downloadInfo);

    } catch (error) {
      return AppResult.Err(error instanceof Error ? error : new Error('Failed to get documents'));
    }
  }

  /**
   * Ensure output directory exists
   */
  private async ensureOutputDirectory(outputPath: string): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    try {
      await fs.access(outputPath);
    } catch {
      await fs.mkdir(outputPath, { recursive: true });
    }
  }

  /**
   * Download documents with concurrency control
   */
  private async downloadDocumentsWithConcurrency(
    documents: DocumentDownloadInfo[],
    options: BulkDownloadOptions
  ): Promise<{ downloadedDocuments: number; failedDocuments: number }> {
    let downloadedCount = 0;
    let failedCount = 0;
    const activeDownloads: Promise<void>[] = [];

    for (const document of documents) {
      // Wait for available worker slot
      while (!this.concurrencyManager.canStartWorker()) {
        await this.concurrencyManager.waitForRateLimit();
      }

      // Start download worker
      this.concurrencyManager.startWorker();
      
      const downloadPromise = this.downloadSingleDocument(document, options.outputPath)
        .then(() => {
          downloadedCount++;
          this.progressTracker.markCompleted();
        })
        .catch((error) => {
          failedCount++;
          this.progressTracker.markFailed();
          console.error(`Failed to download ${document.name}:`, error.message);
        })
        .finally(() => {
          this.concurrencyManager.stopWorker();
        });

      activeDownloads.push(downloadPromise);
    }

    // Wait for all downloads to complete
    await Promise.all(activeDownloads);

    return { downloadedDocuments: downloadedCount, failedDocuments: failedCount };
  }

  /**
   * Download a single document
   */
  private async downloadSingleDocument(document: DocumentDownloadInfo, outputPath: string): Promise<void> {
    try {
      // 1. Download file content using storage strategy
      const downloadResult = await this.storageStrategy.download(document.filePath);
      if (downloadResult.isErr()) {
        throw new Error(`Storage download failed: ${downloadResult.unwrapErr().message}`);
      }

      const fileBuffer = downloadResult.unwrap();

      // 2. Save to output directory
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const outputFilePath = path.join(outputPath, document.name);
      await fs.writeFile(outputFilePath, fileBuffer);

      // 3. Save metadata if requested
      const metadataPath = path.join(outputPath, `${document.name}.metadata.json`);
      const metadata = {
        id: document.id,
        name: document.name,
        mimeType: document.mimeType,
        size: document.size,
        tags: document.tags,
        metadata: document.metadata,
        downloadedAt: new Date().toISOString()
      };
      
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    } catch (error) {
      throw new Error(`Failed to download ${document.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
