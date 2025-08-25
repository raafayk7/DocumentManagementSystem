import { BlobServiceClient, ContainerClient, BlobClient, BlockBlobClient, BlobItem, BlobProperties, StorageSharedKeyCredential } from '@azure/storage-blob';
import { DefaultAzureCredential, TokenCredential } from '@azure/identity';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { IStorageStrategy } from '../../../../ports/output/IStorageStrategy.js';
import { FileInfo, StorageHealth, StorageStats, UploadOptions, DownloadOptions, StorageOperationResult } from '../../../../shared/storage/StorageTypes.js';
import { RetryExecutor } from '../../../../shared/resilience/RetryExecutor.js';
import { injectable } from 'tsyringe';

/**
 * Azure Storage Strategy Configuration
 */
export interface AzureStorageConfig {
  /** Azure Storage account connection string */
  connectionString?: string;
  /** Azure Storage account name */
  accountName?: string;
  /** Azure Storage account key */
  accountKey?: string;
  /** Azure Storage container name */
  containerName: string;
  /** Azure Storage endpoint (for Azurite emulator) */
  endpoint?: string;
  /** Maximum file size in bytes */
  maxFileSize?: number;
  /** Allowed MIME types */
  allowedMimeTypes?: string[];
  /** Whether to use Azurite emulator */
  useEmulator?: boolean;
  /** Azurite emulator endpoint (default: http://127.0.0.1:10000) */
  emulatorEndpoint?: string;
}

/**
 * Azure Storage Strategy
 * Implements IStorageStrategy for Azure Blob Storage with Azurite emulator support
 */
@injectable()
export class AzureStorageStrategy implements IStorageStrategy {
  private blobServiceClient: BlobServiceClient;
  private containerClient: ContainerClient;
  private containerName: string;
  private maxFileSize: number;
  private allowedMimeTypes: string[];
  private retryExecutor: RetryExecutor;
  private performanceMetrics: Map<string, StorageOperationResult<any>[]> = new Map();
  private useEmulator: boolean;

  constructor() {
    // Initialize with default values - will be configured by the factory
    this.containerName = process.env.AZURE_STORAGE_CONTAINER || 'dms-container';
    this.maxFileSize = 100 * 1024 * 1024; // 100MB default
    this.allowedMimeTypes = ['*/*']; // Allow all by default
    this.retryExecutor = new RetryExecutor();
    this.useEmulator = process.env.AZURE_STORAGE_USE_EMULATOR === 'true';

    // Initialize Azure Blob Service Client
    if (this.useEmulator) {
      // Use Azurite emulator
      const accountName = process.env.AZURE_STORAGE_ACCOUNT || 'devstoreaccount1';
      const accountKey = process.env.AZURE_STORAGE_KEY || 'Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==';
      
      const credential = new StorageSharedKeyCredential(accountName, accountKey);
      const emulatorEndpoint = process.env.AZURE_STORAGE_ENDPOINT || 'http://127.0.0.1:10000';
      const url = `${emulatorEndpoint}/${accountName}`;
      this.blobServiceClient = new BlobServiceClient(url, credential);
    } else {
      // Use connection string or default Azure credentials
      const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
      if (connectionString) {
        this.blobServiceClient = new BlobServiceClient(connectionString);
      } else {
        const credential = new DefaultAzureCredential();
        const accountName = process.env.AZURE_STORAGE_ACCOUNT || 'default';
        const url = `https://${accountName}.blob.core.windows.net`;
        this.blobServiceClient = new BlobServiceClient(url, credential);
      }
    }

    // Get container client
    this.containerClient = this.blobServiceClient.getContainerClient(this.containerName);
  }

  async upload(file: FileInfo, options?: UploadOptions): Promise<AppResult<string>> {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validationResult = this.validateUploadInput(file);
      if (!validationResult.isOk()) {
        // Type assertion to handle the type narrowing issue
        const errorResult = validationResult as AppResult<never>;
        return this.recordError('upload', startTime, errorResult.unwrapErr().message);
      }

      const blobName = options?.customMetadata?.path || file.name;
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

      // Set metadata
      const metadata: Record<string, string> = {
        originalName: file.name,
        size: file.content.length.toString(),
        uploadedAt: new Date().toISOString(),
        ...options?.customMetadata
      };

      // Upload blob
      await blockBlobClient.upload(file.content, file.content.length, {
        blobHTTPHeaders: {
          blobContentType: file.mimeType,
          blobContentMD5: options?.generateChecksum ? Buffer.from(this.generateChecksum(file.content), 'hex') : undefined
        },
        metadata
      });

      const fileUrl = `azure://${this.containerName}/${blobName}`;
      return this.recordSuccess('upload', startTime, fileUrl);
      
    } catch (error) {
      const errorMessage = this.handleAzureError(error, 'upload');
      return this.recordError('upload', startTime, errorMessage);
    }
  }

  async download(filePath: string, options?: DownloadOptions): Promise<AppResult<Buffer>> {
    const startTime = Date.now();
    
    try {
      if (!filePath) {
        return this.recordError('download', startTime, 'File path is required');
      }

      const blockBlobClient = this.containerClient.getBlockBlobClient(filePath);
      
      // Check if blob exists
      const exists = await blockBlobClient.exists();
      if (!exists) {
        return this.recordError('download', startTime, 'File not found');
      }

      // Download blob
      const downloadResponse = await blockBlobClient.download();
      
      if (!downloadResponse.readableStreamBody) {
        return this.recordError('download', startTime, 'No file content received from Azure');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      // For Azure SDK v12, handle the stream properly
      if (downloadResponse.readableStreamBody) {
        // Convert to Node.js readable stream if needed
        const stream = downloadResponse.readableStreamBody as any;
        if (stream.getReader) {
          const reader = stream.getReader();
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }
        } else {
          // Fallback for different stream types
          const buffer = await this.streamToBuffer(stream);
          chunks.push(buffer);
        }
      }
      
      const buffer = Buffer.concat(chunks);

      // Verify file integrity if checksum is provided
      if (downloadResponse.contentMD5 && options?.verifyIntegrity) {
        const calculatedChecksum = this.generateChecksum(buffer);
        // Convert the calculated checksum to base64 for comparison
        const calculatedBase64 = Buffer.from(calculatedChecksum, 'hex').toString('base64');
        // contentMD5 is Uint8Array in v12, convert to base64 string
        const responseMD5 = Buffer.from(downloadResponse.contentMD5).toString('base64');
        if (calculatedBase64 !== responseMD5) {
          return this.recordError('download', startTime, 'File integrity check failed');
        }
      }

      return this.recordSuccess('download', startTime, buffer);
      
    } catch (error) {
      const errorMessage = this.handleAzureError(error, 'download');
      return this.recordError('download', startTime, errorMessage);
    }
  }

  async delete(filePath: string): Promise<AppResult<boolean>> {
    const startTime = Date.now();
    
    try {
      if (!filePath) {
        return this.recordError('delete', startTime, 'File path is required');
      }

      // Check if file exists first
      const existsResult = await this.exists(filePath);
      if (!existsResult.isOk() || !existsResult.unwrap()) {
        return this.recordError('delete', startTime, 'File not found');
      }

      const blockBlobClient = this.containerClient.getBlockBlobClient(filePath);
      await blockBlobClient.delete();
      
      return this.recordSuccess('delete', startTime, true);
      
    } catch (error) {
      const errorMessage = this.handleAzureError(error, 'delete');
      return this.recordError('delete', startTime, errorMessage);
    }
  }

  async exists(filePath: string): Promise<AppResult<boolean>> {
    const startTime = Date.now();
    
    try {
      if (!filePath) {
        return this.recordError('exists', startTime, 'File path is required');
      }

      const blockBlobClient = this.containerClient.getBlockBlobClient(filePath);
      const exists = await blockBlobClient.exists();
      
      return this.recordSuccess('exists', startTime, exists);
      
    } catch (error) {
      const errorMessage = this.handleAzureError(error, 'exists');
      return this.recordError('exists', startTime, errorMessage);
    }
  }

  async getHealth(): Promise<AppResult<StorageHealth>> {
    const startTime = Date.now();
    
    try {
      // Test basic Azure operations
      const testBlobName = `health-check-${Date.now()}`;
      const testContent = Buffer.from('health check');
      
      // Test upload
      const uploadResult = await this.upload({
        name: testBlobName,
        path: testBlobName,
        content: testContent,
        mimeType: 'text/plain',
        size: testContent.length
      });
      
      if (!uploadResult.isOk()) {
        // Type assertion to handle the type narrowing issue
        const errorResult = uploadResult as AppResult<never>;
        return AppResult.Err(AppError.Generic(`Azure health check failed: ${errorResult.unwrapErr().message}`));
      }

      // Test download
      const downloadResult = await this.download(testBlobName);
      if (!downloadResult.isOk()) {
        // Type assertion to handle the type narrowing issue
        const errorResult = downloadResult as AppResult<never>;
        return AppResult.Err(AppError.Generic(`Azure health check failed: ${errorResult.unwrapErr().message}`));
      }

      // Test delete
      const deleteResult = await this.delete(testBlobName);
      if (!deleteResult.isOk()) {
        // Type assertion to handle the type narrowing issue
        const errorResult = deleteResult as AppResult<never>;
        return AppResult.Err(AppError.Generic(`Azure health check failed: ${errorResult.unwrapErr().message}`));
      }

      const health: StorageHealth = {
        status: 'healthy',
        responseTime: 0,
        successRate: 100,
        availableCapacity: -1,
        totalCapacity: -1,
        lastChecked: new Date(),
        metrics: {
          container: this.containerName,
          account: this.blobServiceClient.accountName,
          endpoint: this.useEmulator ? 'Azurite Emulator' : 'Azure Cloud',
          emulator: this.useEmulator
        }
      };

      return this.recordSuccess('getHealth', startTime, health);
      
    } catch (error) {
      const errorMessage = this.handleAzureError(error, 'health check');
      return AppResult.Err(AppError.Generic(`Azure health check failed: ${errorMessage}`));
    }
  }

  async listFiles(prefix?: string): Promise<AppResult<FileInfo[]>> {
    const startTime = Date.now();
    
    try {
      const files: FileInfo[] = [];
      
      // List blobs with optional prefix
      const listOptions = prefix ? { prefix } : {};
      
      for await (const blob of this.containerClient.listBlobsFlat(listOptions)) {
        files.push({
          name: blob.name,
          path: blob.name,
          size: blob.properties.contentLength || 0,
          mimeType: blob.properties.contentType || this.detectMimeType(blob.name),
          content: Buffer.alloc(0), // Don't load content for listing
          modifiedAt: blob.properties.lastModified || new Date()
        });
      }

      return this.recordSuccess('listFiles', startTime, files);
      
    } catch (error) {
      const errorMessage = this.handleAzureError(error, 'list files');
      return this.recordError('listFiles', startTime, errorMessage);
    }
  }

  async copyFile(sourcePath: string, destinationPath: string): Promise<AppResult<boolean>> {
    const startTime = Date.now();
    
    try {
      if (!sourcePath || !destinationPath) {
        return this.recordError('copyFile', startTime, 'Source and destination paths are required');
      }

      // Check if source exists
      const existsResult = await this.exists(sourcePath);
      if (!existsResult.isOk() || !existsResult.unwrap()) {
        return this.recordError('copyFile', startTime, 'Source file not found');
      }

      // Copy blob
      const sourceBlobClient = this.containerClient.getBlobClient(sourcePath);
      const destinationBlobClient = this.containerClient.getBlobClient(destinationPath);
      
      await destinationBlobClient.beginCopyFromURL(sourceBlobClient.url);
      
      return this.recordSuccess('copyFile', startTime, true);
      
    } catch (error) {
      const errorMessage = this.handleAzureError(error, 'copy');
      return this.recordError('copyFile', startTime, errorMessage);
    }
  }

  async getFileInfo(filePath: string): Promise<AppResult<FileInfo>> {
    const startTime = Date.now();
    
    try {
      if (!filePath) {
        return this.recordError('getFileInfo', startTime, 'File path is required');
      }

      const blockBlobClient = this.containerClient.getBlockBlobClient(filePath);
      
      // Check if blob exists
      const exists = await blockBlobClient.exists();
      if (!exists) {
        return this.recordError('getFileInfo', startTime, 'File not found');
      }

      // Get blob properties
      const properties = await blockBlobClient.getProperties();
      
      const fileInfo: FileInfo = {
        name: filePath,
        path: filePath,
        size: properties.contentLength || 0,
        mimeType: properties.contentType || this.detectMimeType(filePath),
        content: Buffer.alloc(0), // Don't load content for info
        modifiedAt: properties.lastModified || new Date()
      };

      return this.recordSuccess('getFileInfo', startTime, fileInfo);
      
    } catch (error) {
      const errorMessage = this.handleAzureError(error, 'get file info');
      return this.recordError('getFileInfo', startTime, errorMessage);
    }
  }

  async getStorageStats(): Promise<AppResult<StorageStats>> {
    const startTime = Date.now();
    
    try {
      let totalFiles = 0;
      let usedCapacity = 0;
      let largestFileSize = 0;

      // List all blobs to calculate stats
      for await (const blob of this.containerClient.listBlobsFlat()) {
        totalFiles++;
        const size = blob.properties.contentLength || 0;
        usedCapacity += size;
        largestFileSize = Math.max(largestFileSize, size);
      }

      const stats: StorageStats = {
        totalCapacity: -1, // Azure doesn't provide total capacity
        usedCapacity,
        availableCapacity: -1, // Azure doesn't provide available capacity
        totalFiles,
        totalDirectories: 0, // Azure doesn't distinguish directories
        utilizationPercentage: -1, // Can't calculate without total capacity
        averageFileSize: totalFiles > 0 ? usedCapacity / totalFiles : 0,
        largestFileSize,
        storageType: 'Azure Blob Storage',
        lastUpdated: new Date()
      };

      return this.recordSuccess('getStorageStats', startTime, stats);
      
    } catch (error) {
      const errorMessage = this.handleAzureError(error, 'get storage stats');
      return this.recordError('getStorageStats', startTime, errorMessage);
    }
  }

  async moveFile(sourcePath: string, destinationPath: string): Promise<AppResult<boolean>> {
    const startTime = Date.now();
    
    try {
      if (!sourcePath || !destinationPath) {
        return this.recordError('moveFile', startTime, 'Source and destination paths are required');
      }

      // Check if source exists
      const existsResult = await this.exists(sourcePath);
      if (!existsResult.isOk() || !existsResult.unwrap()) {
        return this.recordError('moveFile', startTime, 'Source file not found');
      }

      // Copy file to destination
      const copyResult = await this.copyFile(sourcePath, destinationPath);
      if (!copyResult.isOk()) {
        // Type assertion to handle the type narrowing issue
        const errorResult = copyResult as AppResult<never>;
        return this.recordError('moveFile', startTime, `Copy failed: ${errorResult.unwrapErr().message}`);
      }

      // Delete source file
      const deleteResult = await this.delete(sourcePath);
      if (!deleteResult.isOk()) {
        // Type assertion to handle the type narrowing issue
        const errorResult = deleteResult as AppResult<never>;
        return this.recordError('moveFile', startTime, `Delete source failed: ${errorResult.unwrapErr().message}`);
      }

      return this.recordSuccess('moveFile', startTime, true);
      
    } catch (error) {
      const errorMessage = this.handleAzureError(error, 'move');
      return this.recordError('moveFile', startTime, errorMessage);
    }
  }

  async createDirectory(directoryPath: string): Promise<AppResult<boolean>> {
    const startTime = Date.now();
    
    try {
      if (!directoryPath) {
        return this.recordError('createDirectory', startTime, 'Directory path is required');
      }

      // In Azure Blob Storage, directories are logical constructs represented by blobs ending with '/'
      // We create a marker blob to represent the directory
      const directoryBlobName = directoryPath.endsWith('/') ? directoryPath : `${directoryPath}/`;
      
      // Check if directory already exists
      const existsResult = await this.exists(directoryBlobName);
      if (existsResult.isOk() && existsResult.unwrap()) {
        return this.recordError('createDirectory', startTime, 'Directory already exists');
      }

      // Create directory marker blob
      const blockBlobClient = this.containerClient.getBlockBlobClient(directoryBlobName);
      await blockBlobClient.upload('', 0, {
        blobHTTPHeaders: {
          blobContentType: 'application/x-directory'
        }
      });
      
      return this.recordSuccess('createDirectory', startTime, true);
      
    } catch (error) {
      const errorMessage = this.handleAzureError(error, 'create directory');
      return this.recordError('createDirectory', startTime, errorMessage);
    }
  }

  // Helper methods
  private validateUploadInput(file: FileInfo): AppResult<void> {
    if (!file.name) {
      return AppResult.Err(AppError.Generic('File name is required'));
    }
    
    if (!file.content || file.content.length === 0) {
      return AppResult.Err(AppError.Generic('File content is required'));
    }
    
    if (file.content.length > this.maxFileSize) {
      return AppResult.Err(AppError.Generic(`File size ${file.content.length} exceeds maximum allowed size ${this.maxFileSize}`));
    }
    
    if (!this.isMimeTypeAllowed(file.mimeType)) {
      return AppResult.Err(AppError.Generic(`MIME type ${file.mimeType} is not allowed`));
    }
    
    return AppResult.Ok(undefined);
  }

  private isMimeTypeAllowed(mimeType: string): boolean {
    if (this.allowedMimeTypes.includes('*/*')) {
      return true;
    }
    
    return this.allowedMimeTypes.some(allowed => {
      if (allowed.endsWith('/*')) {
        const baseType = allowed.slice(0, -2);
        return mimeType.startsWith(baseType);
      }
      return allowed === mimeType;
    });
  }

  private detectMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      'txt': 'text/plain',
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'xml': 'application/xml',
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'mp4': 'video/mp4',
      'mp3': 'audio/mpeg',
      'zip': 'application/zip',
      'tar': 'application/x-tar',
      'gz': 'application/gzip'
    };
    
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  private generateChecksum(data: Buffer): string {
    // Simple hash implementation - in production, use crypto module
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Convert stream to buffer - helper method for Azure SDK v12 compatibility
   */
  private async streamToBuffer(stream: any): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      stream.on('data', (chunk: Uint8Array) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  /**
   * Handle Azure-specific errors and provide meaningful error messages
   */
  private handleAzureError(error: unknown, operation: string): string {
    if (error instanceof Error) {
      // Handle specific Azure error types
      if (error.name === 'RestError') {
        const restError = error as any;
        switch (restError.statusCode) {
          case 404:
            return `Azure ${operation} failed: Resource not found`;
          case 403:
            return `Azure ${operation} failed: Access denied`;
          case 409:
            return `Azure ${operation} failed: Conflict - resource already exists`;
          case 413:
            return `Azure ${operation} failed: File too large`;
          case 500:
            return `Azure ${operation} failed: Internal server error`;
          case 503:
            return `Azure ${operation} failed: Service unavailable`;
          default:
            return `Azure ${operation} failed: ${restError.message}`;
        }
      }
      
      // Handle other Azure SDK errors
      if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        return `Azure ${operation} failed: Connection error - check if Azurite emulator is running`;
      }
      
      return `Azure ${operation} failed: ${error.message}`;
    }
    
    return `Azure ${operation} failed: Unknown error`;
  }

  // Performance metrics methods
  getPerformanceMetrics(operation: string): StorageOperationResult<any>[] {
    return this.performanceMetrics.get(operation) || [];
  }

  getAllPerformanceMetrics(): Map<string, StorageOperationResult<any>[]> {
    return new Map(this.performanceMetrics);
  }

  clearPerformanceMetrics(): void {
    this.performanceMetrics.clear();
  }

  // Helper methods for type-safe operation recording
  private recordSuccess<T>(operation: string, startTime: number, result: T): AppResult<T> {
    const duration = Date.now() - startTime;
    
    const operationResult: StorageOperationResult<T> = {
      success: true,
      duration,
      timestamp: new Date(),
      data: result,
      error: undefined
    };

    if (!this.performanceMetrics.has(operation)) {
      this.performanceMetrics.set(operation, []);
    }
    
    this.performanceMetrics.get(operation)!.push(operationResult);
    return AppResult.Ok(result);
  }

  private recordError<T>(operation: string, startTime: number, errorMessage: string): AppResult<T> {
    const duration = Date.now() - startTime;
    
    const operationResult: StorageOperationResult<T> = {
      success: false,
      duration,
      timestamp: new Date(),
      data: undefined,
      error: errorMessage
    };

    if (!this.performanceMetrics.has(operation)) {
      this.performanceMetrics.set(operation, []);
    }
    
    this.performanceMetrics.get(operation)!.push(operationResult);
    return AppResult.Err(AppError.Generic(`Azure ${operation} failed: ${errorMessage}`));
  }
}
