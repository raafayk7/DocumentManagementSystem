import { promises as fs, existsSync, statSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { createHash } from 'crypto';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { IStorageStrategy } from '../../../ports/output/IStorageStrategy.js';
import { 
  FileInfo, 
  StorageHealth, 
  StorageStats, 
  UploadOptions, 
  DownloadOptions,
  StorageOperationResult 
} from '../../../shared/storage/StorageTypes.js';

/**
 * LocalStorageStrategy - implements IStorageStrategy for local file system storage
 * This will be the fallback strategy when cloud storage fails
 */
export class LocalStorageStrategy implements IStorageStrategy {
  private readonly basePath: string;
  private readonly maxFileSize: number;
  private readonly allowedMimeTypes: string[];
  private readonly performanceMetrics: Map<string, StorageOperationResult<any>[]>;
  private readonly healthMetrics: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    lastHealthCheck: Date;
    averageResponseTime: number;
  };

  constructor(
    basePath: string = 'uploads',
    maxFileSize: number = 100 * 1024 * 1024, // 100MB default
    allowedMimeTypes: string[] = []
  ) {
    this.basePath = this.normalizePath(basePath);
    this.maxFileSize = maxFileSize;
    this.allowedMimeTypes = allowedMimeTypes;
    this.performanceMetrics = new Map();
    this.healthMetrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      lastHealthCheck: new Date(),
      averageResponseTime: 0
    };

    // Ensure base directory exists
    this.ensureBaseDirectory();
  }

  /**
   * Upload a file to local storage
   */
  async upload(file: FileInfo, options?: UploadOptions): Promise<AppResult<string>> {
    const startTime = Date.now();
    const operationId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Validate file
      const validationResult = this.validateFile(file);
      if (!validationResult.success) {
        return this.handleError('upload', validationResult.error!, startTime, operationId);
      }

      // Determine file path
      const filePath = this.buildFilePath(file.name, options?.customMetadata);
      const fullPath = join(this.basePath, filePath);

      // Create directories if needed
      if (options?.createDirectories) {
        await this.createDirectoryRecursive(dirname(fullPath));
      }

      // Check if file exists and handle overwrite
      if (await this.exists(fullPath)) {
        if (!options?.overwrite) {
          return this.handleError('upload', 'File already exists and overwrite not allowed', startTime, operationId);
        }
      }

      // Generate checksum if requested
      let checksum: string | undefined;
      if (options?.generateChecksum) {
        checksum = this.generateChecksum(file.content);
      }

      // Write file
      await fs.writeFile(fullPath, file.content);

      // Update file metadata
      const fileInfo: FileInfo = {
        ...file,
        path: filePath,
        checksum,
        createdAt: new Date(),
        modifiedAt: new Date()
      };

      // Save metadata if needed
      await this.saveFileMetadata(filePath, fileInfo);

      this.recordSuccess('upload', startTime, operationId);
      return AppResult.Ok(filePath);

    } catch (error) {
      return this.handleError('upload', error instanceof Error ? error.message : 'Unknown upload error', startTime, operationId);
    }
  }

  /**
   * Download a file from local storage
   */
  async download(filePath: string, options?: DownloadOptions): Promise<AppResult<Buffer>> {
    const startTime = Date.now();
    const operationId = `download_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const fullPath = join(this.basePath, filePath);

      // Check if file exists
      if (!existsSync(fullPath)) {
        return this.handleError('download', 'File not found', startTime, operationId);
      }

      // Check if it's a file (not directory)
      const stats = statSync(fullPath);
      if (!stats.isFile()) {
        return this.handleError('download', 'Path is not a file', startTime, operationId);
      }

      // Read file content
      const content = await fs.readFile(fullPath);

      // Verify integrity if requested
      if (options?.verifyIntegrity && options.expectedChecksum) {
        const actualChecksum = this.generateChecksum(content);
        if (actualChecksum !== options.expectedChecksum) {
          return this.handleError('download', 'File integrity check failed', startTime, operationId);
        }
      }

      this.recordSuccess('download', startTime, operationId);
      return AppResult.Ok(content);

    } catch (error) {
      return this.handleError('download', error instanceof Error ? error.message : 'Unknown download error', startTime, operationId);
    }
  }

  /**
   * Delete a file from local storage
   */
  async delete(filePath: string): Promise<AppResult<boolean>> {
    const startTime = Date.now();
    const operationId = `delete_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const fullPath = join(this.basePath, filePath);

      // Check if file exists
      if (!existsSync(fullPath)) {
        return this.handleError('delete', 'File not found', startTime, operationId);
      }

      // Delete file
      await fs.unlink(fullPath);

      // Delete metadata if exists
      await this.deleteFileMetadata(filePath);

      this.recordSuccess('delete', startTime, operationId);
      return AppResult.Ok(true);

    } catch (error) {
      return this.handleError('delete', error instanceof Error ? error.message : 'Unknown delete error', startTime, operationId);
    }
  }

  /**
   * Check if a file exists in local storage
   */
  async exists(filePath: string): Promise<AppResult<boolean>> {
    const startTime = Date.now();
    const operationId = `exists_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const fullPath = join(this.basePath, filePath);
      const exists = existsSync(fullPath);

      this.recordSuccess('exists', startTime, operationId);
      return AppResult.Ok(exists);

    } catch (error) {
      return this.handleError('exists', error instanceof Error ? error.message : 'Unknown exists error', startTime, operationId);
    }
  }

  /**
   * Get health status of local storage
   */
  async getHealth(): Promise<AppResult<StorageHealth>> {
    const startTime = Date.now();
    const operationId = `health_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Check if base directory is accessible
      const baseDirAccessible = await this.checkDirectoryAccess(this.basePath);
      
      // Calculate success rate
      const successRate = this.healthMetrics.totalOperations > 0 
        ? (this.healthMetrics.successfulOperations / this.healthMetrics.totalOperations) * 100 
        : 100;

      // Determine overall status
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (successRate < 80) status = 'unhealthy';
      else if (successRate < 95) status = 'degraded';

      // Get disk space information
      const diskInfo = await this.getDiskSpaceInfo();

      const health: StorageHealth = {
        status,
        responseTime: this.healthMetrics.averageResponseTime,
        successRate,
        availableCapacity: diskInfo.available,
        totalCapacity: diskInfo.total,
        lastChecked: new Date(),
        metrics: {
          totalOperations: this.healthMetrics.totalOperations,
          successfulOperations: this.healthMetrics.successfulOperations,
          failedOperations: this.healthMetrics.failedOperations,
          baseDirectoryAccessible: baseDirAccessible
        }
      };

      this.healthMetrics.lastHealthCheck = new Date();
      this.recordSuccess('health', startTime, operationId);
      return AppResult.Ok(health);

    } catch (error) {
      return this.handleError('health', error instanceof Error ? error.message : 'Unknown health error', startTime, operationId);
    }
  }

  /**
   * List files in local storage
   */
  async listFiles(prefix?: string): Promise<AppResult<FileInfo[]>> {
    const startTime = Date.now();
    const operationId = `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const searchPath = prefix ? join(this.basePath, prefix) : this.basePath;
      
      if (!existsSync(searchPath)) {
        return AppResult.Ok([]);
      }

      const files: FileInfo[] = [];
      await this.scanDirectory(searchPath, files, prefix || '');

      this.recordSuccess('list', startTime, operationId);
      return AppResult.Ok(files);

    } catch (error) {
      return this.handleError('list', error instanceof Error ? error.message : 'Unknown list error', startTime, operationId);
    }
  }

  /**
   * Copy a file within local storage
   */
  async copyFile(source: string, destination: string): Promise<AppResult<boolean>> {
    const startTime = Date.now();
    const operationId = `copy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const sourcePath = join(this.basePath, source);
      const destPath = join(this.basePath, destination);

      // Check if source exists
      if (!existsSync(sourcePath)) {
        return this.handleError('copy', 'Source file not found', startTime, operationId);
      }

      // Create destination directory if needed
      await this.createDirectoryRecursive(dirname(destPath));

      // Copy file
      await fs.copyFile(sourcePath, destPath);

      this.recordSuccess('copy', startTime, operationId);
      return AppResult.Ok(true);

    } catch (error) {
      return this.handleError('copy', error instanceof Error ? error.message : 'Unknown copy error', startTime, operationId);
    }
  }

  /**
   * Get file information from local storage
   */
  async getFileInfo(filePath: string): Promise<AppResult<FileInfo>> {
    const startTime = Date.now();
    const operationId = `info_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const fullPath = join(this.basePath, filePath);

      if (!existsSync(fullPath)) {
        return this.handleError('info', 'File not found', startTime, operationId);
      }

      const stats = statSync(fullPath);
      if (!stats.isFile()) {
        return this.handleError('info', 'Path is not a file', startTime, operationId);
      }

      // Try to load metadata first
      let metadata = await this.loadFileMetadata(filePath);
      
      // If no metadata, create basic info from file system
      if (!metadata) {
        metadata = {
          name: basename(filePath),
          path: filePath,
          content: Buffer.alloc(0), // Don't load content for info
          mimeType: this.getMimeTypeFromExtension(extname(filePath)),
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        };
      }

      this.recordSuccess('info', startTime, operationId);
      return AppResult.Ok(metadata);

    } catch (error) {
      return this.handleError('info', error instanceof Error ? error.message : 'Unknown info error', startTime, operationId);
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<AppResult<StorageStats>> {
    const startTime = Date.now();
    const operationId = `stats_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const diskInfo = await this.getDiskSpaceInfo();
      const fileStats = await this.calculateFileStatistics();

      const stats: StorageStats = {
        totalCapacity: diskInfo.total,
        usedCapacity: diskInfo.used,
        availableCapacity: diskInfo.available,
        totalFiles: fileStats.totalFiles,
        totalDirectories: fileStats.totalDirectories,
        utilizationPercentage: (diskInfo.used / diskInfo.total) * 100,
        averageFileSize: fileStats.averageFileSize,
        largestFileSize: fileStats.largestFileSize,
        storageType: 'local',
        lastUpdated: new Date()
      };

      this.recordSuccess('stats', startTime, operationId);
      return AppResult.Ok(stats);

    } catch (error) {
      return this.handleError('stats', error instanceof Error ? error.message : 'Unknown stats error', startTime, operationId);
    }
  }

  /**
   * Move a file within local storage
   */
  async moveFile(source: string, destination: string): Promise<AppResult<boolean>> {
    const startTime = Date.now();
    const operationId = `move_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const sourcePath = join(this.basePath, source);
      const destPath = join(this.basePath, destination);

      // Check if source exists
      if (!existsSync(sourcePath)) {
        return this.handleError('move', 'Source file not found', startTime, operationId);
      }

      // Create destination directory if needed
      await this.createDirectoryRecursive(dirname(destPath));

      // Move file
      await fs.rename(sourcePath, destPath);

      // Update metadata path if exists
      await this.updateFileMetadataPath(source, destination);

      this.recordSuccess('move', startTime, operationId);
      return AppResult.Ok(true);

    } catch (error) {
      return this.handleError('move', error instanceof Error ? error.message : 'Unknown move error', startTime, operationId);
    }
  }

  /**
   * Create a directory in local storage
   */
  async createDirectory(path: string): Promise<AppResult<boolean>> {
    const startTime = Date.now();
    const operationId = `mkdir_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const fullPath = join(this.basePath, path);

      if (existsSync(fullPath)) {
        return this.handleError('mkdir', 'Directory already exists', startTime, operationId);
      }

      await fs.mkdir(fullPath, { recursive: true });

      this.recordSuccess('mkdir', startTime, operationId);
      return AppResult.Ok(true);

    } catch (error) {
      return this.handleError('mkdir', error instanceof Error ? error.message : 'Unknown mkdir error', startTime, operationId);
    }
  }

  // Private helper methods

  private normalizePath(path: string): string {
    return path.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '');
  }

  private async ensureBaseDirectory(): Promise<void> {
    try {
      if (!existsSync(this.basePath)) {
        await fs.mkdir(this.basePath, { recursive: true });
      }
    } catch (error) {
      console.error(`Failed to create base directory: ${this.basePath}`, error);
    }
  }

  private validateFile(file: FileInfo): { success: boolean; error?: string } {
    if (!file.name || file.name.trim() === '') {
      return { success: false, error: 'File name is required' };
    }

    if (!file.content || file.content.length === 0) {
      return { success: false, error: 'File content is required' };
    }

    if (file.size > this.maxFileSize) {
      return { success: false, error: `File size ${file.size} exceeds maximum allowed size ${this.maxFileSize}` };
    }

    if (this.allowedMimeTypes.length > 0 && !this.allowedMimeTypes.includes(file.mimeType)) {
      return { success: false, error: `MIME type ${file.mimeType} is not allowed` };
    }

    return { success: true };
  }

  private buildFilePath(fileName: string, customMetadata?: Record<string, any>): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const extension = extname(fileName);
    const baseName = basename(fileName, extension);
    
    // Use custom path from metadata if provided
    if (customMetadata?.path) {
      return `${customMetadata.path}/${baseName}_${timestamp}_${randomId}${extension}`;
    }

    // Default to date-based organization
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}/${month}/${day}/${baseName}_${timestamp}_${randomId}${extension}`;
  }

  private async createDirectoryRecursive(dirPath: string): Promise<void> {
    if (!existsSync(dirPath)) {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  private generateChecksum(content: Buffer): string {
    return createHash('sha256').update(content).digest('hex');
  }

  private async saveFileMetadata(filePath: string, fileInfo: FileInfo): Promise<void> {
    try {
      const metadataPath = this.getMetadataPath(filePath);
      await this.createDirectoryRecursive(dirname(metadataPath));
      
      const metadata = {
        ...fileInfo,
        content: undefined // Don't save content in metadata
      };
      
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      // Metadata saving is optional, don't fail the operation
      console.warn(`Failed to save metadata for ${filePath}:`, error);
    }
  }

  private async loadFileMetadata(filePath: string): Promise<FileInfo | null> {
    try {
      const metadataPath = this.getMetadataPath(filePath);
      if (!existsSync(metadataPath)) {
        return null;
      }

      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(metadataContent);
      
      // Load actual content
      const fullPath = join(this.basePath, filePath);
      if (existsSync(fullPath)) {
        metadata.content = await fs.readFile(fullPath);
        metadata.size = metadata.content.length;
      }

      return metadata;
    } catch (error) {
      return null;
    }
  }

  private async deleteFileMetadata(filePath: string): Promise<void> {
    try {
      const metadataPath = this.getMetadataPath(filePath);
      if (existsSync(metadataPath)) {
        await fs.unlink(metadataPath);
      }
    } catch (error) {
      // Metadata deletion is optional
      console.warn(`Failed to delete metadata for ${filePath}:`, error);
    }
  }

  private async updateFileMetadataPath(oldPath: string, newPath: string): Promise<void> {
    try {
      const oldMetadataPath = this.getMetadataPath(oldPath);
      const newMetadataPath = this.getMetadataPath(newPath);
      
      if (existsSync(oldMetadataPath)) {
        await this.createDirectoryRecursive(dirname(newMetadataPath));
        await fs.rename(oldMetadataPath, newMetadataPath);
        
        // Update the path in the metadata content
        const metadataContent = await fs.readFile(newMetadataPath, 'utf-8');
        const metadata = JSON.parse(metadataContent);
        metadata.path = newPath;
        await fs.writeFile(newMetadataPath, JSON.stringify(metadata, null, 2));
      }
    } catch (error) {
      console.warn(`Failed to update metadata path from ${oldPath} to ${newPath}:`, error);
    }
  }

  private getMetadataPath(filePath: string): string {
    return join(this.basePath, '.metadata', `${filePath}.meta.json`);
  }

  private async scanDirectory(dirPath: string, files: FileInfo[], prefix: string): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        const relativePath = fullPath.replace(this.basePath, '').replace(/^[\\/]/, '');
        
        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath, files, prefix);
        } else if (entry.isFile()) {
          try {
            const stats = statSync(fullPath);
            const fileInfo: FileInfo = {
              name: entry.name,
              path: relativePath,
              content: Buffer.alloc(0), // Don't load content during listing
              mimeType: this.getMimeTypeFromExtension(extname(entry.name)),
              size: stats.size,
              createdAt: stats.birthtime,
              modifiedAt: stats.mtime,
              isDirectory: false
            };
            files.push(fileInfo);
          } catch (error) {
            console.warn(`Failed to read file info for ${fullPath}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to scan directory ${dirPath}:`, error);
    }
  }

  private getMimeTypeFromExtension(extension: string): string {
    const mimeTypes: Record<string, string> = {
      '.txt': 'text/plain',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.zip': 'application/zip',
      '.rar': 'application/vnd.rar',
      '.7z': 'application/x-7z-compressed'
    };
    
    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  private async checkDirectoryAccess(dirPath: string): Promise<boolean> {
    try {
      await fs.access(dirPath);
      return true;
    } catch {
      return false;
    }
  }

  private async getDiskSpaceInfo(): Promise<{ total: number; used: number; available: number }> {
    try {
      // This is a simplified implementation - in production you might want to use a library like 'diskusage'
      const stats = statSync(this.basePath);
      const total = 1024 * 1024 * 1024 * 100; // Assume 100GB for now
      const used = total * 0.3; // Assume 30% used
      const available = total - used;
      
      return { total, used, available };
    } catch {
      return { total: 0, used: 0, available: 0 };
    }
  }

  private async calculateFileStatistics(): Promise<{
    totalFiles: number;
    totalDirectories: number;
    averageFileSize: number;
    largestFileSize: number;
  }> {
    try {
      const files: FileInfo[] = [];
      await this.scanDirectory(this.basePath, files, '');
      
      const fileFiles = files.filter(f => !f.isDirectory);
      const totalFiles = fileFiles.length;
      const totalDirectories = files.filter(f => f.isDirectory).length;
      
      let totalSize = 0;
      let largestSize = 0;
      
      for (const file of fileFiles) {
        totalSize += file.size;
        if (file.size > largestSize) {
          largestSize = file.size;
        }
      }
      
      const averageFileSize = totalFiles > 0 ? totalSize / totalFiles : 0;
      
      return {
        totalFiles,
        totalDirectories,
        averageFileSize,
        largestFileSize: largestSize
      };
    } catch {
      return {
        totalFiles: 0,
        totalDirectories: 0,
        averageFileSize: 0,
        largestFileSize: 0
      };
    }
  }

  private recordSuccess(operation: string, startTime: number, operationId: string): void {
    const duration = Date.now() - startTime;
    
    // Update health metrics
    this.healthMetrics.totalOperations++;
    this.healthMetrics.successfulOperations++;
    this.healthMetrics.averageResponseTime = 
      (this.healthMetrics.averageResponseTime * (this.healthMetrics.totalOperations - 1) + duration) / 
      this.healthMetrics.totalOperations;

    // Record performance metrics
    const result: StorageOperationResult<any> = {
      success: true,
      duration,
      timestamp: new Date(),
      metadata: { operationId }
    };

    if (!this.performanceMetrics.has(operation)) {
      this.performanceMetrics.set(operation, []);
    }
    this.performanceMetrics.get(operation)!.push(result);
  }

  private handleError(operation: string, errorMessage: string, startTime: number, operationId: string): AppResult<never> {
    const duration = Date.now() - startTime;
    
    // Update health metrics
    this.healthMetrics.totalOperations++;
    this.healthMetrics.failedOperations++;

    // Record performance metrics
    const result: StorageOperationResult<any> = {
      success: false,
      error: errorMessage,
      duration,
      timestamp: new Date(),
      metadata: { operationId }
    };

    if (!this.performanceMetrics.has(operation)) {
      this.performanceMetrics.set(operation, []);
    }
    this.performanceMetrics.get(operation)!.push(result);

    return AppResult.Err(AppError.Generic(`LocalStorageStrategy.${operation}: ${errorMessage}`));
  }

  /**
   * Get performance metrics for a specific operation
   */
  getPerformanceMetrics(operation: string): StorageOperationResult<any>[] {
    return this.performanceMetrics.get(operation) || [];
  }

  /**
   * Get all performance metrics
   */
  getAllPerformanceMetrics(): Map<string, StorageOperationResult<any>[]> {
    return new Map(this.performanceMetrics);
  }

  /**
   * Reset performance metrics
   */
  resetPerformanceMetrics(): void {
    this.performanceMetrics.clear();
    this.healthMetrics.totalOperations = 0;
    this.healthMetrics.successfulOperations = 0;
    this.healthMetrics.failedOperations = 0;
    this.healthMetrics.averageResponseTime = 0;
  }
}
