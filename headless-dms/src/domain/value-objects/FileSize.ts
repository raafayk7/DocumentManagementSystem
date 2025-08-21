import { AppResult, BaseValueObject } from '@carbonteq/hexapp';

/**
 * FileSize value object representing file sizes with units and validation.
 * 
 * Characteristics:
 * - Immutable: Once created, file size cannot be changed
 * - No Identity: Two 1KB file sizes are considered equal
 * - Value Comparison: Equality is based on size value, not instance
 * - Self-validating: Only valid file sizes can be created
 * - Easily testable: Simple to test all scenarios
 * - Extends hexapp's BaseValueObject for framework consistency
 */
export class FileSize extends BaseValueObject<number> {
  // Size units in bytes
  private static readonly BYTES_IN_KB = 1024;
  private static readonly BYTES_IN_MB = 1024 * 1024;
  private static readonly BYTES_IN_GB = 1024 * 1024 * 1024;
  
  // Maximum file size (100GB)
  private static readonly MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024 * 1024;
  
  // Private constructor ensures immutability
  private constructor(private readonly _bytes: number) {
    super();
  }

  /**
   * Factory method to create a FileSize from bytes with validation.
   * Returns AppResult<T> for consistent error handling.
   */
  static fromBytes(bytes: number): AppResult<FileSize> {
    // Validation logic - self-validating
    if (typeof bytes !== 'number' || isNaN(bytes)) {
      return AppResult.Err(new Error('File size must be a valid number'));
    }

    if (bytes < 0) {
      return AppResult.Err(new Error('File size cannot be negative'));
    }

    if (bytes > FileSize.MAX_FILE_SIZE_BYTES) {
      return AppResult.Err(new Error(`File size cannot exceed ${FileSize.formatBytes(FileSize.MAX_FILE_SIZE_BYTES)}`));
    }

    return AppResult.Ok(new FileSize(Math.round(bytes)));
  }

  /**
   * Create a FileSize from kilobytes
   */
  static fromKB(kilobytes: number): AppResult<FileSize> {
    return FileSize.fromBytes(kilobytes * FileSize.BYTES_IN_KB);
  }

  /**
   * Create a FileSize from megabytes
   */
  static fromMB(megabytes: number): AppResult<FileSize> {
    return FileSize.fromBytes(megabytes * FileSize.BYTES_IN_MB);
  }

  /**
   * Create a FileSize from gigabytes
   */
  static fromGB(gigabytes: number): AppResult<FileSize> {
    return FileSize.fromBytes(gigabytes * FileSize.BYTES_IN_GB);
  }

  /**
   * Create a FileSize from a trusted source (bypasses validation)
   * Use with caution - only for data that has already been validated
   */
  static fromTrusted(bytes: number): FileSize {
    return new FileSize(Math.round(bytes));
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
   * Check if this file size is reasonable for upload
   */
  get isReasonableForUpload(): boolean {
    return this._bytes <= 100 * FileSize.BYTES_IN_MB; // 100MB limit for uploads
  }

  /**
   * Check if this file size is reasonable for email attachment
   */
  get isReasonableForEmail(): boolean {
    return this._bytes <= 25 * FileSize.BYTES_IN_MB; // 25MB limit for email
  }

  /**
   * Check if this file size is reasonable for web display
   */
  get isReasonableForWeb(): boolean {
    return this._bytes <= 10 * FileSize.BYTES_IN_MB; // 10MB limit for web
  }

  /**
   * Get the most appropriate unit for display
   */
  get displayUnit(): 'B' | 'KB' | 'MB' | 'GB' {
    if (this._bytes < FileSize.BYTES_IN_KB) return 'B';
    if (this._bytes < FileSize.BYTES_IN_MB) return 'KB';
    if (this._bytes < FileSize.BYTES_IN_GB) return 'MB';
    return 'GB';
  }

  /**
   * Get the size in the most appropriate unit
   */
  get displayValue(): number {
    switch (this.displayUnit) {
      case 'B': return this._bytes;
      case 'KB': return this.kilobytes;
      case 'MB': return this.megabytes;
      case 'GB': return this.gigabytes;
      default: return this._bytes;
    }
  }

  /**
   * Get a human-readable string representation
   */
  get humanReadable(): string {
    return FileSize.formatBytes(this._bytes);
  }

  /**
   * Get a compact string representation
   */
  get compact(): string {
    const value = this.displayValue;
    const unit = this.displayUnit;
    return `${Math.round(value * 100) / 100}${unit}`;
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
   * Check if this file size is greater than or equal to another
   */
  isGreaterThanOrEqual(other: FileSize): boolean {
    if (!other) return false;
    return this._bytes >= other._bytes;
  }

  /**
   * Check if this file size is less than or equal to another
   */
  isLessThanOrEqual(other: FileSize): boolean {
    if (!other) return false;
    return this._bytes <= other._bytes;
  }

  /**
   * Add another file size to this one
   */
  add(other: FileSize): FileSize {
    if (!other) return this;
    return new FileSize(this._bytes + other._bytes);
  }

  /**
   * Subtract another file size from this one
   */
  subtract(other: FileSize): AppResult<FileSize> {
    if (!other) return AppResult.Ok(this);
    
    const result = this._bytes - other._bytes;
    if (result < 0) {
      return AppResult.Err(new Error('Cannot subtract a larger file size from a smaller one'));
    }
    
    return AppResult.Ok(new FileSize(result));
  }

  /**
   * String representation for serialization
   */
  toString(): string {
    return this._bytes.toString();
  }

  /**
   * Check if a number represents a valid file size
   */
  static isValid(bytes: number): boolean {
    return FileSize.fromBytes(bytes).isOk();
  }

  /**
   * Get the maximum allowed file size
   */
  static getMaxFileSize(): number {
    return FileSize.MAX_FILE_SIZE_BYTES;
  }

  /**
   * Get the maximum allowed file size in human-readable format
   */
  static getMaxFileSizeHuman(): string {
    return FileSize.formatBytes(FileSize.MAX_FILE_SIZE_BYTES);
  }

  /**
   * Format bytes into a human-readable string
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Required serialize method from BaseValueObject
   */
  serialize(): number {
    return this._bytes;
  }

  /**
   * Optional getParser method for boundary validation
   */
  getParser() {
    // Return a Zod schema for file size validation at boundaries
    const { z } = require('zod');
    return z.number()
      .positive('File size must be positive')
      .max(100 * 1024 * 1024 * 1024, 'File size cannot exceed 100GB');
  }
}
