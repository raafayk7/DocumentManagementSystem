import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command, CopyObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { IStorageStrategy } from '../../../../ports/output/IStorageStrategy.js';
import { FileInfo, StorageHealth, StorageStats, UploadOptions, DownloadOptions, StorageOperationResult } from '../../../../shared/storage/StorageTypes.js';
import { RetryExecutor } from '../../../../shared/resilience/RetryExecutor.js';

export class S3StorageStrategy implements IStorageStrategy {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly maxFileSize: number;
  private readonly allowedMimeTypes: string[];
  private readonly retryExecutor: RetryExecutor;
  private readonly performanceMetrics: Map<string, StorageOperationResult<any>[]> = new Map();

  constructor(
    s3Client: S3Client,
    bucketName: string,
    maxFileSize: number = 100 * 1024 * 1024, // 100MB default
    allowedMimeTypes: string[] = ['*/*'], // Allow all by default
    retryExecutor?: RetryExecutor
  ) {
    if (!bucketName || bucketName.trim() === '') {
      throw new Error('Bucket name is required');
    }
    
    this.s3Client = s3Client;
    this.bucketName = bucketName;
    this.maxFileSize = maxFileSize;
    this.allowedMimeTypes = allowedMimeTypes;
    this.retryExecutor = retryExecutor || new RetryExecutor();
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

      const key = options?.customMetadata?.path || file.name;
      
      // For large files, use multipart upload
      if (file.content.length > 5 * 1024 * 1024) { // 5MB threshold
        return await this.performMultipartUpload(file, key, options);
      }

      // Simple upload for smaller files
      const uploadParams = {
        Bucket: this.bucketName,
        Key: key,
        Body: file.content,
        ContentType: file.mimeType,
        Metadata: {
          originalName: file.name,
          size: file.content.length.toString(),
          uploadedAt: new Date().toISOString(),
          ...options?.customMetadata
        },
        checksum: options?.generateChecksum ? this.generateChecksum(file.content) : undefined,
      };

      await this.s3Client.send(new PutObjectCommand(uploadParams));
      
      const fileUrl = `s3://${this.bucketName}/${key}`;
      return this.recordSuccess('upload', startTime, fileUrl);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';
      return this.recordError('upload', startTime, errorMessage);
    }
  }

  async download(filePath: string, options?: DownloadOptions): Promise<AppResult<Buffer>> {
    const startTime = Date.now();
    
    try {
      if (!filePath) {
        return this.recordError('download', startTime, 'File path is required');
      }

      const downloadParams = {
        Bucket: this.bucketName,
        Key: filePath,
        ...options
      };

      const response = await this.s3Client.send(new GetObjectCommand(downloadParams));
      
      if (!response.Body) {
        return this.recordError('download', startTime, 'No file content received from S3');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const reader = response.Body.transformToWebStream().getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      const buffer = Buffer.concat(chunks);
      
      // Verify file integrity if checksum is provided
      if (response.ChecksumSHA256 && options?.verifyIntegrity) {
        const calculatedChecksum = this.generateChecksum(buffer);
        if (calculatedChecksum !== response.ChecksumSHA256) {
          return this.recordError('download', startTime, 'File integrity check failed');
        }
      }

      return this.recordSuccess('download', startTime, buffer);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown download error';
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

      const deleteParams = {
        Bucket: this.bucketName,
        Key: filePath
      };

      await this.s3Client.send(new DeleteObjectCommand(deleteParams));
      
      return this.recordSuccess('delete', startTime, true);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown delete error';
      return this.recordError('delete', startTime, errorMessage);
    }
  }

  async exists(filePath: string): Promise<AppResult<boolean>> {
    const startTime = Date.now();
    
    try {
      if (!filePath) {
        return this.recordError('exists', startTime, 'File path is required');
      }

      const headParams = {
        Bucket: this.bucketName,
        Key: filePath
      };

      try {
        await this.s3Client.send(new HeadObjectCommand(headParams));
        return this.recordSuccess('exists', startTime, true);
      } catch (error: any) {
        if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
          return this.recordSuccess('exists', startTime, false);
        }
        throw error;
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown exists check error';
      return this.recordError('exists', startTime, errorMessage);
    }
  }

  async getHealth(): Promise<AppResult<StorageHealth>> {
    const startTime = Date.now();
    
    try {
      // Test basic S3 operations
      const testKey = `health-check-${Date.now()}`;
      const testContent = Buffer.from('health check');
      
      // Test upload
      const uploadResult = await this.upload({
        name: testKey,
        path: testKey,
        content: testContent,
        mimeType: 'text/plain',
        size: testContent.length
      });
      
      if (!uploadResult.isOk()) {
        // Type assertion to handle the type narrowing issue
        const errorResult = uploadResult as AppResult<never>;
        return AppResult.Err(AppError.Generic(`S3 health check failed: ${errorResult.unwrapErr().message}`));
      }

      // Test download
      const downloadResult = await this.download(testKey);
      if (!downloadResult.isOk()) {
        // Type assertion to handle the type narrowing issue
        const errorResult = downloadResult as AppResult<never>;
        return AppResult.Err(AppError.Generic(`S3 health check failed: ${errorResult.unwrapErr().message}`));
      }

      // Test delete
      const deleteResult = await this.delete(testKey);
      if (!deleteResult.isOk()) {
        // Type assertion to handle the type narrowing issue
        const errorResult = deleteResult as AppResult<never>;
        return AppResult.Err(AppError.Generic(`S3 health check failed: ${errorResult.unwrapErr().message}`));
      }

      const health: StorageHealth = {
        status: 'healthy',
        responseTime: 0,
        successRate: 100,
        availableCapacity: -1,
        totalCapacity: -1,
        lastChecked: new Date(),
        metrics: {
          bucket: this.bucketName,
          region: this.s3Client.config.region || 'unknown',
          endpoint: this.s3Client.config.endpoint || 'default'
        }
      };

      return this.recordSuccess('getHealth', startTime, health);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown health check error';
      return AppResult.Err(AppError.Generic(`S3 health check failed: ${errorMessage}`));
    }
  }

  async listFiles(prefix?: string): Promise<AppResult<FileInfo[]>> {
    const startTime = Date.now();
    
    try {
      const listParams: any = {
        Bucket: this.bucketName
      };

      if (prefix) {
        listParams.Prefix = prefix;
      }

      const response = await this.s3Client.send(new ListObjectsV2Command(listParams));
      
      if (!response.Contents) {
        return this.recordSuccess('listFiles', startTime, []);
      }

      const files: FileInfo[] = response.Contents.map(obj => ({
        name: obj.Key || '',
        path: obj.Key || '',
        size: obj.Size || 0,
        mimeType: this.detectMimeType(obj.Key || ''),
        content: Buffer.alloc(0), // Don't load content for listing
        modifiedAt: obj.LastModified || new Date()
      }));

      return this.recordSuccess('listFiles', startTime, files);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown list files error';
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

      const copyParams = {
        Bucket: this.bucketName,
        CopySource: `${this.bucketName}/${sourcePath}`,
        Key: destinationPath
      };

      await this.s3Client.send(new CopyObjectCommand(copyParams));
      
      return this.recordSuccess('copyFile', startTime, true);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown copy error';
      return this.recordError('copyFile', startTime, errorMessage);
    }
  }

  async getFileInfo(filePath: string): Promise<AppResult<FileInfo>> {
    const startTime = Date.now();
    
    try {
      if (!filePath) {
        return this.recordError('getFileInfo', startTime, 'File path is required');
      }

      const headParams = {
        Bucket: this.bucketName,
        Key: filePath
      };

      const response = await this.s3Client.send(new HeadObjectCommand(headParams));
      
      const fileInfo: FileInfo = {
        name: filePath,
        path: filePath,
        size: response.ContentLength || 0,
        mimeType: response.ContentType || this.detectMimeType(filePath),
        content: Buffer.alloc(0), // Don't load content for info
        modifiedAt: response.LastModified || new Date()
      };

      return this.recordSuccess('getFileInfo', startTime, fileInfo);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown get file info error';
      return this.recordError('getFileInfo', startTime, errorMessage);
    }
  }

  async getStorageStats(): Promise<AppResult<StorageStats>> {
    const startTime = Date.now();
    
    try {
      const listParams = {
        Bucket: this.bucketName
      };

      const response = await this.s3Client.send(new ListObjectsV2Command(listParams));
      
      if (!response.Contents) {
        const stats: StorageStats = {
          totalCapacity: 0,
          usedCapacity: 0,
          availableCapacity: 0,
          totalFiles: 0,
          totalDirectories: 0,
          utilizationPercentage: 0,
          averageFileSize: 0,
          largestFileSize: 0,
          storageType: 'S3',
          lastUpdated: new Date()
        };
        return this.recordSuccess('getStorageStats', startTime, stats);
      }

      let usedCapacity = 0;
      const fileTypeCount: { [key: string]: number } = {};

      response.Contents.forEach(obj => {
        usedCapacity += obj.Size || 0;
        const mimeType = this.detectMimeType(obj.Key || '');
        fileTypeCount[mimeType] = (fileTypeCount[mimeType] || 0) + 1;
      });

      const stats: StorageStats = {
        totalCapacity: -1, // S3 doesn't provide total capacity
        usedCapacity,
        availableCapacity: -1, // S3 doesn't provide available capacity
        totalFiles: response.Contents.length,
        totalDirectories: 0, // S3 doesn't distinguish directories
        utilizationPercentage: -1, // Can't calculate without total capacity
        averageFileSize: response.Contents.length > 0 ? usedCapacity / response.Contents.length : 0,
        largestFileSize: Math.max(...response.Contents.map(obj => obj.Size || 0)),
        storageType: 'S3',
        lastUpdated: new Date()
      };

      return this.recordSuccess('getStorageStats', startTime, stats);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown get storage stats error';
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown move error';
      return this.recordError('moveFile', startTime, errorMessage);
    }
  }

  async createDirectory(directoryPath: string): Promise<AppResult<boolean>> {
    const startTime = Date.now();
    
    try {
      if (!directoryPath) {
        return this.recordError('createDirectory', startTime, 'Directory path is required');
      }

      // In S3, directories are logical constructs represented by keys ending with '/'
      // We create a marker object to represent the directory
      const directoryKey = directoryPath.endsWith('/') ? directoryPath : `${directoryPath}/`;
      
      // Check if directory already exists
      const existsResult = await this.exists(directoryKey);
      if (existsResult.isOk() && existsResult.unwrap()) {
        return this.recordError('createDirectory', startTime, 'Directory already exists');
      }

      // Create directory marker
      const markerParams = {
        Bucket: this.bucketName,
        Key: directoryKey,
        Body: '',
        ContentType: 'application/x-directory'
      };

      await this.s3Client.send(new PutObjectCommand(markerParams));
      
      return this.recordSuccess('createDirectory', startTime, true);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown create directory error';
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

  private async performMultipartUpload(file: FileInfo, key: string, options?: UploadOptions): Promise<AppResult<string>> {
    let uploadId: string | undefined;
    try {
      // Create multipart upload
      const createParams = {
        Bucket: this.bucketName,
        Key: key,
        ContentType: file.mimeType,
        Metadata: {
          originalName: file.name,
          size: file.content.length.toString(),
          uploadedAt: new Date().toISOString(),
          ...options?.customMetadata
        }
      };

      const createResponse = await this.s3Client.send(new CreateMultipartUploadCommand(createParams));
      uploadId = createResponse.UploadId;

      if (!uploadId) {
        throw new Error('Failed to create multipart upload');
      }

      // Upload parts
      const partSize = 5 * 1024 * 1024; // 5MB parts
      const parts: { ETag: string; PartNumber: number }[] = [];
      
      for (let i = 0; i < file.content.length; i += partSize) {
        const partNumber = Math.floor(i / partSize) + 1;
        const partContent = file.content.slice(i, i + partSize);
        
        const uploadPartParams = {
          Bucket: this.bucketName,
          Key: key,
          UploadId: uploadId,
          PartNumber: partNumber,
          Body: partContent
        };

        const uploadPartResponse = await this.s3Client.send(new UploadPartCommand(uploadPartParams));
        
        if (uploadPartResponse.ETag) {
          parts.push({
            ETag: uploadPartResponse.ETag,
            PartNumber: partNumber
          });
        }
      }

      // Complete multipart upload
      const completeParams = {
        Bucket: this.bucketName,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts }
      };

      await this.s3Client.send(new CompleteMultipartUploadCommand(completeParams));
      
      const fileUrl = `s3://${this.bucketName}/${key}`;
      return AppResult.Ok(fileUrl);
      
    } catch (error) {
      // Abort multipart upload on failure
      if (uploadId) {
        try {
          const abortParams = {
            Bucket: this.bucketName,
            Key: key,
            UploadId: uploadId
          };
          await this.s3Client.send(new AbortMultipartUploadCommand(abortParams));
        } catch (abortError) {
          // Ignore abort errors
        }
      }
      
      throw error;
    }
  }

  async generateDownloadUrl(filePath: string, expiresIn: number = 3600): Promise<AppResult<string>> {
    try {
      if (!filePath) {
        return AppResult.Err(AppError.Generic('File path is required'));
      }

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: filePath
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return AppResult.Ok(url);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error generating download URL';
      return AppResult.Err(AppError.Generic(`Failed to generate download URL: ${errorMessage}`));
    }
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
    return AppResult.Err(AppError.Generic(`S3 ${operation} failed: ${errorMessage}`));
  }
}
