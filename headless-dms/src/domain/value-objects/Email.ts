import { AppResult } from '@carbonteq/hexapp';

/**
 * Email value object representing email addresses with validation and business rules.
 * 
 * Characteristics:
 * - Immutable: Once created, email cannot be changed
 * - No Identity: Two "user@example.com" emails are considered equal
 * - Value Comparison: Equality is based on email value, not instance
 * - Self-validating: Only valid email addresses can be created
 * - Easily testable: Simple to test all scenarios
 */
export class Email {
  // Email validation regex (RFC 5322 compliant)
  private static readonly EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  // Common disposable email domains (partial list)
  private static readonly DISPOSABLE_DOMAINS = [
    '10minutemail.com', 'guerrillamail.com', 'mailinator.com', 'tempmail.org',
    'throwaway.email', 'yopmail.com', 'temp-mail.org', 'sharklasers.com'
  ];
  
  // Private constructor ensures immutability
  private constructor(private readonly _value: string) {}

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
   * Get the local part (before @)
   */
  get localPart(): string {
    return this._value.split('@')[0];
  }

  /**
   * Get the domain part (after @)
   */
  get domain(): string {
    return this._value.split('@')[1];
  }

  /**
   * Get the top-level domain
   */
  get topLevelDomain(): string {
    const domainParts = this.domain.split('.');
    return domainParts[domainParts.length - 1];
  }

  /**
   * Check if this is a corporate email (not common free providers)
   */
  get isCorporate(): boolean {
    const commonProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'];
    return !commonProviders.includes(this.domain);
  }

  /**
   * Check if this is a free email provider
   */
  get isFreeProvider(): boolean {
    const commonProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'];
    return commonProviders.includes(this.domain);
  }

  /**
   * Check if this is a disposable email
   */
  isDisposable(): boolean {
    return Email.DISPOSABLE_DOMAINS.some(disposableDomain => 
      this.domain === disposableDomain || this.domain.endsWith('.' + disposableDomain)
    );
  }

  /**
   * Check if this is a valid business email format
   */
  get isValidBusinessFormat(): boolean {
    // Business emails typically have a company domain
    return this.isCorporate && !this.isDisposable();
  }

  /**
   * Get the email length
   */
  get length(): number {
    return this._value.length;
  }

  /**
   * Check if the email is short (< 20 characters)
   */
  get isShort(): boolean {
    return this._value.length < 20;
  }

  /**
   * Check if the email is medium length (20-40 characters)
   */
  get isMedium(): boolean {
    return this._value.length >= 20 && this._value.length <= 40;
  }

  /**
   * Check if the email is long (> 40 characters)
   */
  get isLong(): boolean {
    return this._value.length > 40;
  }

  /**
   * Check if the email contains numbers
   */
  get hasNumbers(): boolean {
    return /\d/.test(this._value);
  }

  /**
   * Check if the email contains special characters
   */
  get hasSpecialChars(): boolean {
    return /[^a-zA-Z0-9@._-]/.test(this._value);
  }

  /**
   * Value equality - compares by value, not instance
   */
  equals(other: Email): boolean {
    if (!other) return false;
    return this._value === other._value;
  }

  /**
   * Case-insensitive equality check
   */
  equalsIgnoreCase(other: Email): boolean {
    if (!other) return false;
    return this._value.toLowerCase() === other._value.toLowerCase();
  }

  /**
   * Check if this email has the same domain as another
   */
  hasSameDomain(other: Email): boolean {
    if (!other) return false;
    return this.domain === other.domain;
  }

  /**
   * Check if this email has the same top-level domain as another
   */
  hasSameTopLevelDomain(other: Email): boolean {
    if (!other) return false;
    return this.topLevelDomain === other.topLevelDomain;
  }

  /**
   * String representation for serialization
   */
  toString(): string {
    return this._value;
  }

  /**
   * Get a masked version for privacy (e.g., u***@e***.com)
   */
  get masked(): string {
    const [local, domain] = this._value.split('@');
    const maskedLocal = local.length > 1 ? local[0] + '*'.repeat(local.length - 1) : local;
    const domainParts = domain.split('.');
    const maskedDomain = domainParts[0].length > 1 ? domainParts[0][0] + '*'.repeat(domainParts[0].length - 1) : domainParts[0];
    const maskedTLD = domainParts[1] || '';
    
    return `${maskedLocal}@${maskedDomain}.${maskedTLD}`;
  }

  /**
   * Get a normalized version (lowercase, trimmed)
   */
  get normalized(): string {
    return this._value.toLowerCase().trim();
  }

  /**
   * Check if a string represents a valid email
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
   * Get all disposable email domains
   */
  static getDisposableDomains(): readonly string[] {
    return Email.DISPOSABLE_DOMAINS;
  }
}
