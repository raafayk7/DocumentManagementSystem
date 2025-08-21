import { AppResult, BaseValueObject } from '@carbonteq/hexapp';

/**
 * MimeType value object representing MIME types with validation and categorization.
 * 
 * Characteristics:
 * - Immutable: Once created, MIME type cannot be changed
 * - No Identity: Two text/plain MIME types are considered equal
 * - Value Comparison: Equality is based on MIME type value, not instance
 * - Self-validating: Only valid MIME types can be created
 * - Easily testable: Simple to test all scenarios
 * - Extends hexapp's BaseValueObject for framework consistency
 */
export class MimeType extends BaseValueObject<string> {
  // Common MIME type patterns
  private static readonly MIME_TYPE_PATTERN = /^[a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9!#$&\-\^_\.+]*$/;
  
  // Common MIME type categories
  private static readonly TEXT_TYPES = ['text/plain', 'text/html', 'text/css', 'text/javascript', 'text/markdown'];
  private static readonly IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  private static readonly DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  private static readonly ARCHIVE_TYPES = ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'];
  
  // Private constructor ensures immutability
  private constructor(private readonly _value: string) {
    super();
  }

  /**
   * Factory method to create a MimeType with validation.
   * Returns AppResult<T> for consistent error handling.
   */
  static create(value: string): AppResult<MimeType> {
    // Validation logic - self-validating
    if (!value || typeof value !== 'string') {
      return AppResult.Err(new Error('MIME type value is required and must be a string'));
    }

    const normalizedValue = value.toLowerCase().trim();
    
    // Basic MIME type format validation
    if (!MimeType.MIME_TYPE_PATTERN.test(normalizedValue)) {
      return AppResult.Err(new Error(`Invalid MIME type format: '${value}'. Expected format: type/subtype`));
    }

    // Check for common invalid patterns
    if (normalizedValue.includes('..') || normalizedValue.includes('//')) {
      return AppResult.Err(new Error(`Invalid MIME type: '${value}'. Contains invalid characters`));
    }

    return AppResult.Ok(new MimeType(normalizedValue));
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
   * Create a MIME type from a trusted source (bypasses validation)
   * Use with caution - only for data that has already been validated
   */
  static fromTrusted(value: string): MimeType {
    return new MimeType(value.toLowerCase().trim());
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
    return MimeType.TEXT_TYPES.includes(this._value);
  }

  /**
   * Check if this is an image MIME type
   */
  get isImage(): boolean {
    return MimeType.IMAGE_TYPES.includes(this._value) || this.mainType === 'image';
  }

  /**
   * Check if this is a document MIME type
   */
  get isDocument(): boolean {
    return MimeType.DOCUMENT_TYPES.includes(this._value) || 
           this.mainType === 'application' && this.subType.includes('document');
  }

  /**
   * Check if this is an archive MIME type
   */
  get isArchive(): boolean {
    return MimeType.ARCHIVE_TYPES.includes(this._value) || 
           this.mainType === 'application' && this.subType.includes('zip');
  }

  /**
   * Check if this is an audio MIME type
   */
  get isAudio(): boolean {
    return this.mainType === 'audio';
  }

  /**
   * Check if this is a video MIME type
   */
  get isVideo(): boolean {
    return this.mainType === 'video';
  }

  /**
   * Check if this is a binary MIME type
   */
  get isBinary(): boolean {
    return this.mainType === 'application' || this.isImage || this.isAudio || this.isVideo;
  }

  /**
   * Check if this MIME type supports streaming
   */
  get supportsStreaming(): boolean {
    return this.isAudio || this.isVideo || this._value === 'text/plain';
  }

  /**
   * Check if this MIME type is editable in text editors
   */
  get isTextEditable(): boolean {
    return this.isText || this._value === 'application/json' || this._value === 'application/xml';
  }

  /**
   * Check if this MIME type can be previewed in browsers
   */
  get isBrowserPreviewable(): boolean {
    return this.isText || this.isImage || this._value === 'application/pdf';
  }

  /**
   * Get the file extension typically associated with this MIME type
   */
  get typicalExtension(): string {
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
      'application/json': '.json',
      'application/xml': '.xml'
    };
    
    return extensionMap[this._value] || '';
  }

  /**
   * Check if this MIME type matches a pattern
   */
  matches(pattern: string | RegExp): boolean {
    if (typeof pattern === 'string') {
      return this._value.includes(pattern.toLowerCase());
    }
    return pattern.test(this._value);
  }

  /**
   * Check if this MIME type starts with a specific type
   */
  startsWith(type: string): boolean {
    return this.mainType === type.toLowerCase();
  }

  /**
   * Value equality - compares by value, not instance
   */
  equals(other: MimeType): boolean {
    if (!other) return false;
    return this._value === other._value;
  }

  /**
   * String representation for serialization
   */
  toString(): string {
    return this._value;
  }

  /**
   * Get a normalized version (lowercase, trimmed)
   */
  get normalized(): string {
    return this._value.toLowerCase().trim();
  }

  /**
   * Check if a string represents a valid MIME type
   */
  static isValid(value: string): boolean {
    return MimeType.create(value).isOk();
  }

  /**
   * Get all supported text MIME types
   */
  static getTextTypes(): readonly string[] {
    return MimeType.TEXT_TYPES;
  }

  /**
   * Get all supported image MIME types
   */
  static getImageTypes(): readonly string[] {
    return MimeType.IMAGE_TYPES;
  }

  /**
   * Get all supported document MIME types
   */
  static getDocumentTypes(): readonly string[] {
    return MimeType.DOCUMENT_TYPES;
  }

  /**
   * Get all supported archive MIME types
   */
  static getArchiveTypes(): readonly string[] {
    return MimeType.ARCHIVE_TYPES;
  }

  /**
   * Check if a MIME type is in a specific category
   */
  static isInCategory(mimeType: string, category: 'text' | 'image' | 'document' | 'archive'): boolean {
    const mimeTypeObj = MimeType.create(mimeType);
    if (mimeTypeObj.isErr()) return false;
    
    switch (category) {
      case 'text': return mimeTypeObj.unwrap().isText;
      case 'image': return mimeTypeObj.unwrap().isImage;
      case 'document': return mimeTypeObj.unwrap().isDocument;
      case 'archive': return mimeTypeObj.unwrap().isArchive;
      default: return false;
    }
  }

  /**
   * Required serialize method from BaseValueObject
   */
  serialize(): string {
    return this._value;
  }

  /**
   * Optional getParser method for boundary validation
   */
  getParser() {
    // Return a Zod schema for MIME type validation at boundaries
    const { z } = require('zod');
    return z.string()
      .regex(/^[a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9!#$&\-\^_\.+]*$/, 'Invalid MIME type format. Expected format: type/subtype');
  }
}
