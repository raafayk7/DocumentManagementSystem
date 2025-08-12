import { Result } from '@carbonteq/fp';

/**
 * FileSize value object representing file sizes with units and validation.
 * 
 * Characteristics:
 * - Immutable: Once created, file size cannot be changed
 * - No Identity: Two 1KB file sizes are considered equal
 * - Value Comparison: Equality is based on size value, not instance
 * - Self-validating: Only valid file sizes can be created
 * - Easily testable: Simple to test all scenarios
 */
export class FileSize {
  // Size units in bytes
  private static readonly BYTES_IN_KB = 1024;
  private static readonly BYTES_IN_MB = 1024 * 1024;
  private static readonly BYTES_IN_GB = 1024 * 1024 * 1024;
  
  // Maximum file size (100GB)
  private static readonly MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024 * 1024;
  
  // Private constructor ensures immutability
  private constructor(private readonly _bytes: number) {}

  /**
   * Factory method to create a FileSize from bytes with validation.
   * Returns Result<T, E> for consistent error handling.
   */
  static fromBytes(bytes: number): Result<FileSize, string> {
    // Validation logic - self-validating
    if (typeof bytes !== 'number' || isNaN(bytes)) {
      return Result.Err('File size must be a valid number');
    }

    if (bytes < 0) {
      return Result.Err('File size cannot be negative');
    }

    if (bytes > FileSize.MAX_FILE_SIZE_BYTES) {
      return Result.Err(`File size cannot exceed ${FileSize.formatBytes(FileSize.MAX_FILE_SIZE_BYTES)}`);
    }

    return Result.Ok(new FileSize(Math.round(bytes)));
  }

  /**
   * Create a FileSize from kilobytes
   */
  static fromKB(kilobytes: number): Result<FileSize, string> {
    return FileSize.fromBytes(kilobytes * FileSize.BYTES_IN_KB);
  }

  /**
   * Create a FileSize from megabytes
   */
  static fromMB(megabytes: number): Result<FileSize, string> {
    return FileSize.fromBytes(megabytes * FileSize.BYTES_IN_MB);
  }

  /**
   * Create a FileSize from gigabytes
   */
  static fromGB(gigabytes: number): Result<FileSize, string> {
    return FileSize.fromBytes(gigabytes * FileSize.BYTES_IN_GB);
  }

  /**
   * Get the size in bytes (immutable accessor)
   */
  get bytes(): number {
    return this._bytes;
  }

  /**
   * Get the size in kilobytes
   */
  get kilobytes(): number {
    return this._bytes / FileSize.BYTES_IN_KB;
  }

  /**
   * Get the size in megabytes
   */
  get megabytes(): number {
    return this._bytes / FileSize.BYTES_IN_MB;
  }

  /**
   * Get the size in gigabytes
   */
  get gigabytes(): number {
    return this._bytes / FileSize.BYTES_IN_GB;
  }

  /**
   * Check if this is a small file (< 1MB)
   */
  get isSmall(): boolean {
    return this._bytes < FileSize.BYTES_IN_MB;
  }

  /**
   * Check if this is a medium file (1MB - 100MB)
   */
  get isMedium(): boolean {
    return this._bytes >= FileSize.BYTES_IN_MB && this._bytes < 100 * FileSize.BYTES_IN_MB;
  }

  /**
   * Check if this is a large file (100MB - 1GB)
   */
  get isLarge(): boolean {
    return this._bytes >= 100 * FileSize.BYTES_IN_MB && this._bytes < FileSize.BYTES_IN_GB;
  }

  /**
   * Check if this is a very large file (>= 1GB)
   */
  get isVeryLarge(): boolean {
    return this._bytes >= FileSize.BYTES_IN_GB;
  }

  /**
   * Check if this file size is zero
   */
  get isEmpty(): boolean {
    return this._bytes === 0;
  }

  /**
   * Value equality - compares by value, not instance
   */
  equals(other: FileSize): boolean {
    if (!other) return false;
    return this._bytes === other._bytes;
  }

  /**
   * Check if this file size is greater than another
   */
  isGreaterThan(other: FileSize): boolean {
    if (!other) return false;
    return this._bytes > other._bytes;
  }

  /**
   * Check if this file size is less than another
   */
  isLessThan(other: FileSize): boolean {
    if (!other) return false;
    return this._bytes < other._bytes;
  }

  /**
   * Add another file size to this one
   */
  add(other: FileSize): Result<FileSize, string> {
    if (!other) {
      return Result.Err('Cannot add undefined file size');
    }
    return FileSize.fromBytes(this._bytes + other._bytes);
  }

  /**
   * Subtract another file size from this one
   */
  subtract(other: FileSize): Result<FileSize, string> {
    if (!other) {
      return Result.Err('Cannot subtract undefined file size');
    }
    return FileSize.fromBytes(this._bytes - other._bytes);
  }

  /**
   * Get human-readable representation
   */
  toString(): string {
    return FileSize.formatBytes(this._bytes);
  }

  /**
   * Get human-readable representation with specific unit
   */
  format(unit: 'B' | 'KB' | 'MB' | 'GB'): string {
    switch (unit) {
      case 'B':
        return `${this._bytes} B`;
      case 'KB':
        return `${this.kilobytes.toFixed(2)} KB`;
      case 'MB':
        return `${this.megabytes.toFixed(2)} MB`;
      case 'GB':
        return `${this.gigabytes.toFixed(2)} GB`;
      default:
        return this.toString();
    }
  }

  /**
   * Static method to format bytes into human-readable string
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Get the maximum allowed file size
   */
  static getMaxFileSize(): FileSize {
    return new FileSize(FileSize.MAX_FILE_SIZE_BYTES);
  }

  /**
   * Check if a number represents a valid file size
   */
  static isValid(bytes: number): boolean {
    return FileSize.fromBytes(bytes).isOk();
  }
}
