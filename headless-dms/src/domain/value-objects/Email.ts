import { AppResult, BaseValueObject } from '@carbonteq/hexapp';

/**
 * Email value object representing email addresses with validation and business rules.
 * 
 * Characteristics:
 * - Immutable: Once created, email cannot be changed
 * - No Identity: Two "user@example.com" emails are considered equal
 * - Value Comparison: Equality is based on email value, not instance
 * - Self-validating: Only valid email addresses can be created
 * - Easily testable: Simple to test all scenarios
 * - Extends hexapp's BaseValueObject for framework consistency
 */
export class Email extends BaseValueObject<string> {
  // Email validation regex (RFC 5322 compliant)
  private static readonly EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  // Common disposable email domains (partial list)
  private static readonly DISPOSABLE_DOMAINS = [
    '10minutemail.com', 'guerrillamail.com', 'mailinator.com', 'tempmail.org',
    'throwaway.email', 'yopmail.com', 'temp-mail.org', 'sharklasers.com'
  ];
  
  // Private constructor ensures immutability
  private constructor(private readonly _value: string) {
    super();
  }

  /**
   * Factory method to create an Email with validation.
   * Returns AppResult<T> for consistent error handling.
   */
  static create(value: string): AppResult<Email> {
    // Validation logic - self-validating
    if (!value || typeof value !== 'string') {
      return AppResult.Err(new Error('Email address is required and must be a string'));
    }

    const normalizedValue = value.toLowerCase().trim();
    
    // Basic format validation
    if (!Email.EMAIL_REGEX.test(normalizedValue)) {
      return AppResult.Err(new Error('Invalid email format'));
    }

    // Length validation
    if (normalizedValue.length > 254) { // RFC 5321 limit
      return AppResult.Err(new Error('Email address cannot exceed 254 characters'));
    }

    // Local part validation (before @)
    const [localPart, domain] = normalizedValue.split('@');
    if (localPart.length > 64) { // RFC 5321 limit
      return AppResult.Err(new Error('Local part of email cannot exceed 64 characters'));
    }

    if (localPart.length === 0) {
      return AppResult.Err(new Error('Local part of email cannot be empty'));
    }

    // Domain validation
    if (!domain || domain.length === 0) {
      return AppResult.Err(new Error('Domain part of email cannot be empty'));
    }

    if (domain.length > 253) { // RFC 5321 limit
      return AppResult.Err(new Error('Domain part of email cannot exceed 253 characters'));
    }

    // Check for valid domain format
    if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(domain)) {
      return AppResult.Err(new Error('Invalid domain format'));
    }

    return AppResult.Ok(new Email(normalizedValue));
  }

  /**
   * Create an email with disposable domain checking
   */
  static createWithDisposableCheck(value: string, allowDisposable: boolean = false): AppResult<Email> {
    const emailResult = Email.create(value);
    if (emailResult.isErr()) {
      return emailResult;
    }

    const email = emailResult.unwrap();
    
    if (!allowDisposable && email.isDisposable()) {
      return AppResult.Err(new Error('Disposable email addresses are not allowed'));
    }

    return AppResult.Ok(email);
  }

  /**
   * Get the email value (immutable accessor)
   */
  get value(): string {
    return this._value;
  }

  /**
   * Get the domain part of the email address
   */
  get domain(): string {
    return this._value.split('@')[1];
  }

  /**
   * Get the local part of the email address (before @)
   */
  get localPart(): string {
    return this._value.split('@')[0];
  }

  /**
   * Get the top-level domain (TLD)
   */
  get topLevelDomain(): string {
    const domainParts = this.domain.split('.');
    return domainParts[domainParts.length - 1];
  }

  /**
   * Check if the email is from a disposable domain
   */
  isDisposable(): boolean {
    return Email.DISPOSABLE_DOMAINS.includes(this.domain);
  }

  /**
   * Check if the email is from a corporate domain (not common providers)
   */
  get isCorporate(): boolean {
    const commonProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
    return !commonProviders.includes(this.domain);
  }

  /**
   * Check if the email is from a common provider
   */
  get isCommonProvider(): boolean {
    return !this.isCorporate;
  }

  /**
   * Check if the email has a specific domain
   */
  hasDomain(domain: string): boolean {
    return this.domain.toLowerCase() === domain.toLowerCase();
  }

  /**
   * Check if the email has the same domain as another email
   */
  hasSameDomain(other: Email): boolean {
    return this.domain.toLowerCase() === other.domain.toLowerCase();
  }

  /**
   * Check if the email has the same top-level domain as another email
   */
  hasSameTopLevelDomain(other: Email): boolean {
    return this.topLevelDomain.toLowerCase() === other.topLevelDomain.toLowerCase();
  }

  /**
   * Check if the email equals another email (case-insensitive)
   */
  equals(other: Email): boolean {
    if (!other) return false;
    return this._value.toLowerCase() === other._value.toLowerCase();
  }

  /**
   * Check if the email equals another email (case-insensitive)
   */
  equalsIgnoreCase(other: Email): boolean {
    return this.equals(other);
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
   * Check if a string represents a valid email address
   */
  static isValid(value: string): boolean {
    return Email.create(value).isOk();
  }

  /**
   * Get the maximum allowed email length
   */
  static getMaxLength(): number {
    return 254;
  }

  /**
   * Get the maximum allowed local part length
   */
  static getMaxLocalPartLength(): number {
    return 64;
  }

  /**
   * Get the maximum allowed domain length
   */
  static getMaxDomainLength(): number {
    return 253;
  }

  /**
   * Get all disposable domains
   */
  static getDisposableDomains(): readonly string[] {
    return Email.DISPOSABLE_DOMAINS;
  }

  /**
   * Check if a domain is disposable
   */
  static isDisposableDomain(domain: string): boolean {
    return Email.DISPOSABLE_DOMAINS.includes(domain.toLowerCase());
  }

  /**
   * Create an email from a trusted source (bypasses validation)
   * Use with caution - only for data that has already been validated
   */
  static fromTrusted(value: string): Email {
    return new Email(value.toLowerCase().trim());
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
    // Return a Zod schema for email validation at boundaries
    const { z } = require('zod');
    return z.string().email().max(254);
  }
}
