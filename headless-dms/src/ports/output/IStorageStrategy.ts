import type { AppResult } from '@carbonteq/hexapp';
import type { FileInfo, StorageHealth, StorageStats, UploadOptions, DownloadOptions } from '../../shared/storage/StorageTypes.js';

/**
 * IStorageStrategy interface - defines the contract for storage strategies
 * This will be implemented by LocalStorageStrategy, S3StorageStrategy, and AzureStorageStrategy
 * 
 * The interface provides a unified way to interact with different storage backends
 * while maintaining consistency in error handling and return types.
 */
export interface IStorageStrategy {
  /**
   * Upload a file to storage
   * @param file - File information including content, metadata, and path
   * @param options - Optional upload configuration (overwrite, compression, etc.)
   * @returns Promise resolving to the file path/identifier in storage
   */
  upload(file: FileInfo, options?: UploadOptions): Promise<AppResult<string>>;

  /**
   * Download a file from storage
   * @param filePath - Path/identifier of the file to download
   * @param options - Optional download configuration (integrity check, streaming, etc.)
   * @returns Promise resolving to the file content as Buffer
   */
  download(filePath: string, options?: DownloadOptions): Promise<AppResult<Buffer>>;

  /**
   * Delete a file from storage
   * @param filePath - Path/identifier of the file to delete
   * @returns Promise resolving to success status
   */
  delete(filePath: string): Promise<AppResult<boolean>>;

  /**
   * Check if a file exists in storage
   * @param filePath - Path/identifier of the file to check
   * @returns Promise resolving to existence status
   */
  exists(filePath: string): Promise<AppResult<boolean>>;

  /**
   * Get the health status of this storage strategy
   * @returns Promise resolving to health metrics and status
   */
  getHealth(): Promise<AppResult<StorageHealth>>;

  /**
   * List files in storage, optionally filtered by prefix
   * @param prefix - Optional prefix to filter files (e.g., folder path)
   * @returns Promise resolving to array of file information
   */
  listFiles(prefix?: string): Promise<AppResult<FileInfo[]>>;

  /**
   * Copy a file from source to destination within storage
   * @param source - Source file path/identifier
   * @param destination - Destination file path/identifier
   * @returns Promise resolving to success status
   */
  copyFile(source: string, destination: string): Promise<AppResult<boolean>>;

  /**
   * Get detailed information about a file
   * @param filePath - Path/identifier of the file
   * @returns Promise resolving to file information including metadata
   */
  getFileInfo(filePath: string): Promise<AppResult<FileInfo>>;

  /**
   * Get storage statistics and capacity information
   * @returns Promise resolving to storage statistics
   */
  getStorageStats(): Promise<AppResult<StorageStats>>;

  /**
   * Move a file from source to destination within storage
   * @param source - Source file path/identifier
   * @param destination - Destination file path/identifier
   * @returns Promise resolving to success status
   */
  moveFile(source: string, destination: string): Promise<AppResult<boolean>>;

  /**
   * Create a directory/folder in storage
   * @param path - Directory path to create
   * @returns Promise resolving to success status
   */
  createDirectory(path: string): Promise<AppResult<boolean>>;
}
