import { Result } from '@carbonteq/fp';

/**
 * MimeType value object representing MIME types with validation and categorization.
 * 
 * Characteristics:
 * - Immutable: Once created, MIME type cannot be changed
 * - No Identity: Two text/plain MIME types are considered equal
 * - Value Comparison: Equality is based on MIME type value, not instance
 * - Self-validating: Only valid MIME types can be created
 * - Easily testable: Simple to test all scenarios
 */
export class MimeType {
  // Common MIME type patterns
  private static readonly MIME_TYPE_PATTERN = /^[a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9!#$&\-\^_]*$/;
  
  // Common MIME type categories
  private static readonly TEXT_TYPES = ['text/plain', 'text/html', 'text/css', 'text/javascript', 'text/markdown'];
  private static readonly IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  private static readonly DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  private static readonly ARCHIVE_TYPES = ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'];
  
  // Private constructor ensures immutability
  private constructor(private readonly _value: string) {}

  /**
   * Factory method to create a MimeType with validation.
   * Returns Result<T, E> for consistent error handling.
   */
  static create(value: string): Result<MimeType, string> {
    // Validation logic - self-validating
    if (!value || typeof value !== 'string') {
      return Result.Err('MIME type value is required and must be a string');
    }

    const normalizedValue = value.toLowerCase().trim();
    
    // Basic MIME type format validation
    if (!MimeType.MIME_TYPE_PATTERN.test(normalizedValue)) {
      return Result.Err(`Invalid MIME type format: '${value}'. Expected format: type/subtype`);
    }

    // Check for common invalid patterns
    if (normalizedValue.includes('..') || normalizedValue.includes('//')) {
      return Result.Err(`Invalid MIME type: '${value}'. Contains invalid characters`);
    }

    return Result.Ok(new MimeType(normalizedValue));
  }

  /**
   * Create common MIME types
   */
  static textPlain(): MimeType {
    return new MimeType('text/plain');
  }

  static textHtml(): MimeType {
    return new MimeType('text/html');
  }

  static imageJpeg(): MimeType {
    return new MimeType('image/jpeg');
  }

  static imagePng(): MimeType {
    return new MimeType('image/png');
  }

  static applicationPdf(): MimeType {
    return new MimeType('application/pdf');
  }

  static applicationZip(): MimeType {
    return new MimeType('application/zip');
  }

  /**
   * Get the MIME type value (immutable accessor)
   */
  get value(): string {
    return this._value;
  }

  /**
   * Get the main type (e.g., "text" from "text/plain")
   */
  get mainType(): string {
    return this._value.split('/')[0];
  }

  /**
   * Get the subtype (e.g., "plain" from "text/plain")
   */
  get subType(): string {
    return this._value.split('/')[1];
  }

  /**
   * Check if this is a text MIME type
   */
  get isText(): boolean {
    return this.mainType === 'text';
  }

  /**
   * Check if this is an image MIME type
   */
  get isImage(): boolean {
    return this.mainType === 'image';
  }

  /**
   * Check if this is a document MIME type
   */
  get isDocument(): boolean {
    return this.mainType === 'application' && 
           (this.subType.includes('pdf') || this.subType.includes('word') || this.subType.includes('document'));
  }

  /**
   * Check if this is an archive MIME type
   */
  get isArchive(): boolean {
    return this.mainType === 'application' && 
           (this.subType.includes('zip') || this.subType.includes('rar') || this.subType.includes('7z'));
  }

  /**
   * Check if this is a binary MIME type
   */
  get isBinary(): boolean {
    return !this.isText;
  }

  /**
   * Get the file extension typically associated with this MIME type
   */
  getFileExtension(): string {
    const extensionMap: Record<string, string> = {
      'text/plain': '.txt',
      'text/html': '.html',
      'text/css': '.css',
      'text/javascript': '.js',
      'text/markdown': '.md',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'application/pdf': '.pdf',
      'application/zip': '.zip',
      'application/x-rar-compressed': '.rar',
      'application/x-7z-compressed': '.7z'
    };

    return extensionMap[this._value] || '';
  }

  /**
   * Value equality - compares by value, not instance
   */
  equals(other: MimeType): boolean {
    if (!other) return false;
    return this._value === other._value;
  }

  /**
   * Check if this MIME type is compatible with another
   * (same main type or specific compatibility rules)
   */
  isCompatibleWith(other: MimeType): boolean {
    if (!other) return false;
    
    // Same MIME type is always compatible
    if (this.equals(other)) return true;
    
    // Text types are generally compatible with each other
    if (this.isText && other.isText) return true;
    
    // Image types are generally compatible with each other
    if (this.isImage && other.isImage) return true;
    
    return false;
  }

  /**
   * String representation for serialization
   */
  toString(): string {
    return this._value;
  }

  /**
   * Get all supported MIME types (useful for validation, forms, etc.)
   */
  static getSupportedTypes(): readonly string[] {
    return [
      ...MimeType.TEXT_TYPES,
      ...MimeType.IMAGE_TYPES,
      ...MimeType.DOCUMENT_TYPES,
      ...MimeType.ARCHIVE_TYPES
    ];
  }

  /**
   * Check if a string value represents a valid MIME type
   */
  static isValid(value: string): boolean {
    return MimeType.create(value).isOk();
  }

  /**
   * Get MIME types by category
   */
  static getTextTypes(): readonly string[] {
    return MimeType.TEXT_TYPES;
  }

  static getImageTypes(): readonly string[] {
    return MimeType.IMAGE_TYPES;
  }

  static getDocumentTypes(): readonly string[] {
    return MimeType.DOCUMENT_TYPES;
  }

  static getArchiveTypes(): readonly string[] {
    return MimeType.ARCHIVE_TYPES;
  }
}
