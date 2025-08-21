import { AppResult, BaseValueObject } from '@carbonteq/hexapp';

/**
 * DocumentName value object representing document names with validation and business rules.
 * 
 * Characteristics:
 * - Immutable: Once created, document name cannot be changed
 * - No Identity: Two "report.pdf" names are considered equal
 * - Value Comparison: Equality is based on name value, not instance
 * - Self-validating: Only valid document names can be created
 * - Easily testable: Simple to test all scenarios
 * - Extends hexapp's BaseValueObject for framework consistency
 */
export class DocumentName extends BaseValueObject<string> {
  // Validation constants
  private static readonly MIN_LENGTH = 1;
  private static readonly MAX_LENGTH = 255;
  private static readonly FORBIDDEN_CHARACTERS = /[<>:"|?*\x00-\x1f]/;
  private static readonly FORBIDDEN_NAMES = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
  
  // Private constructor ensures immutability
  private constructor(private readonly _value: string) {
    super();
  }

  /**
   * Factory method to create a DocumentName with validation.
   * Returns AppResult<T> for consistent error handling.
   */
  static create(value: string): AppResult<DocumentName> {
    // Validation logic - self-validating
    if (!value || typeof value !== 'string') {
      return AppResult.Err(new Error('Document name is required and must be a string'));
    }

    const trimmedValue = value.trim();
    
    // Length validation
    if (trimmedValue.length < DocumentName.MIN_LENGTH) {
      return AppResult.Err(new Error(`Document name must be at least ${DocumentName.MIN_LENGTH} character long`));
    }

    if (trimmedValue.length > DocumentName.MAX_LENGTH) {
      return AppResult.Err(new Error(`Document name cannot exceed ${DocumentName.MAX_LENGTH} characters`));
    }

    // Forbidden characters validation
    if (DocumentName.FORBIDDEN_CHARACTERS.test(trimmedValue)) {
      return AppResult.Err(new Error('Document name contains forbidden characters (< > : " | ? * or control characters)'));
    }

    // Forbidden names validation (Windows reserved names)
    const upperValue = trimmedValue.toUpperCase();
    if (DocumentName.FORBIDDEN_NAMES.includes(upperValue)) {
      return AppResult.Err(new Error(`Document name '${trimmedValue}' is a reserved system name`));
    }

    // Check for leading/trailing spaces and dots
    if (trimmedValue.startsWith('.') || trimmedValue.endsWith('.') || trimmedValue.startsWith(' ') || trimmedValue.endsWith(' ')) {
      return AppResult.Err(new Error('Document name cannot start or end with spaces or dots'));
    }

    // Check for consecutive spaces or dots
    if (trimmedValue.includes('  ') || trimmedValue.includes('..')) {
      return AppResult.Err(new Error('Document name cannot contain consecutive spaces or dots'));
    }

    return AppResult.Ok(new DocumentName(trimmedValue));
  }

  /**
   * Create a document name from a filename (extracts name without extension)
   */
  static fromFilename(filename: string): AppResult<DocumentName> {
    if (!filename || typeof filename !== 'string') {
      return AppResult.Err(new Error('Filename is required and must be a string'));
    }

    // Extract name without extension
    const lastDotIndex = filename.lastIndexOf('.');
    const nameWithoutExtension = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
    
    return DocumentName.create(nameWithoutExtension);
  }

  /**
   * Get the document name value (immutable accessor)
   */
  get value(): string {
    return this._value;
  }

  /**
   * Get the length of the document name
   */
  get length(): number {
    return this._value.length;
  }

  /**
   * Check if the document name is short (< 10 characters)
   */
  get isShort(): boolean {
    return this._value.length < 10;
  }

  /**
   * Check if the document name is medium length (10-50 characters)
   */
  get isMedium(): boolean {
    return this._value.length >= 10 && this._value.length <= 50;
  }

  /**
   * Check if the document name is long (> 50 characters)
   */
  get isLong(): boolean {
    return this._value.length > 50;
  }

  /**
   * Check if the document name contains numbers
   */
  get hasNumbers(): boolean {
    return /\d/.test(this._value);
  }

  /**
   * Check if the document name contains special characters
   */
  get hasSpecialChars(): boolean {
    return /[^a-zA-Z0-9\s\-_\.]/.test(this._value);
  }

  /**
   * Get the first word of the document name
   */
  get firstWord(): string {
    return this._value.split(' ')[0];
  }

  /**
   * Get the last word of the document name
   */
  get lastWord(): string {
    const words = this._value.split(' ');
    return words[words.length - 1];
  }

  /**
   * Get the word count
   */
  get wordCount(): number {
    return this._value.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Check if the document name starts with a specific prefix
   */
  startsWith(prefix: string): boolean {
    return this._value.toLowerCase().startsWith(prefix.toLowerCase());
  }

  /**
   * Check if the document name ends with a specific suffix
   */
  endsWith(suffix: string): boolean {
    return this._value.toLowerCase().endsWith(suffix.toLowerCase());
  }

  /**
   * Check if the document name contains a specific substring
   */
  contains(substring: string): boolean {
    return this._value.toLowerCase().includes(substring.toLowerCase());
  }

  /**
   * Value equality - compares by value, not instance
   */
  equals(other: DocumentName): boolean {
    if (!other) return false;
    return this._value.toLowerCase() === other._value.toLowerCase();
  }

  /**
   * Case-insensitive equality check
   */
  equalsIgnoreCase(other: DocumentName): boolean {
    if (!other) return false;
    return this._value.toLowerCase() === other._value.toLowerCase();
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
   * Get the maximum allowed document name length
   */
  static getMaxLength(): number {
    return DocumentName.MAX_LENGTH;
  }

  /**
   * Get the minimum required document name length
   */
  static getMinLength(): number {
    return DocumentName.MIN_LENGTH;
  }

  /**
   * Check if a string represents a valid document name
   */
  static isValid(value: string): boolean {
    return DocumentName.create(value).isOk();
  }

  /**
   * Get all forbidden characters
   */
  static getForbiddenCharacters(): string {
    return '< > : " | ? * and control characters';
  }

  /**
   * Get all forbidden system names
   */
  static getForbiddenNames(): readonly string[] {
    return DocumentName.FORBIDDEN_NAMES;
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
    // Return a Zod schema for document name validation at boundaries
    const { z } = require('zod');
    return z.string()
      .min(1, 'Document name is required')
      .max(255, 'Document name cannot exceed 255 characters')
      .regex(/^[^<>:"|?*\x00-\x1f]+$/, 'Document name contains forbidden characters');
  }
}
