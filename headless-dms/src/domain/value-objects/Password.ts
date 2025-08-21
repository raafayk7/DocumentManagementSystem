import { AppResult, BaseValueObject } from '@carbonteq/hexapp';

/**
 * Password value object representing passwords with strength validation and security rules.
 * 
 * Characteristics:
 * - Immutable: Once created, password cannot be changed
 * - No Identity: Two "SecurePass123!" passwords are considered equal
 * - Value Comparison: Equality is based on password value, not instance
 * - Self-validating: Only valid passwords can be created
 * - Easily testable: Simple to test all scenarios
 * - Extends hexapp's BaseValueObject for framework consistency
 */
export class Password extends BaseValueObject<string> {
  // Password strength requirements
  private static readonly MIN_LENGTH = 8;
  private static readonly MAX_LENGTH = 128;
  
  // Character type requirements
  private static readonly HAS_LOWERCASE = /[a-z]/;
  private static readonly HAS_UPPERCASE = /[A-Z]/;
  private static readonly HAS_NUMBERS = /\d/;
  private static readonly HAS_SPECIAL_CHARS = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/;
  
  // Private constructor ensures immutability
  private constructor(private readonly _value: string) {
    super();
  }

  /**
   * Factory method to create a Password with validation.
   * Returns AppResult<T> for consistent error handling.
   */
  static create(value: string): AppResult<Password> {
    // Validation logic - self-validating
    if (!value || typeof value !== 'string') {
      return AppResult.Err(new Error('Password is required and must be a string'));
    }

    // Length validation
    if (value.length < Password.MIN_LENGTH) {
      return AppResult.Err(new Error(`Password must be at least ${Password.MIN_LENGTH} characters long`));
    }

    if (value.length > Password.MAX_LENGTH) {
      return AppResult.Err(new Error(`Password cannot exceed ${Password.MAX_LENGTH} characters`));
    }

    // Character type validation
    const validationErrors: string[] = [];

    if (!Password.HAS_LOWERCASE.test(value)) {
      validationErrors.push('at least one lowercase letter');
    }

    if (!Password.HAS_UPPERCASE.test(value)) {
      validationErrors.push('at least one uppercase letter');
    }

    if (!Password.HAS_NUMBERS.test(value)) {
      validationErrors.push('at least one number');
    }

    if (!Password.HAS_SPECIAL_CHARS.test(value)) {
      validationErrors.push('at least one special character');
    }

    if (validationErrors.length > 0) {
      return AppResult.Err(new Error(`Password must contain ${validationErrors.join(', ')}`));
    }

    // Check for common weak patterns
    if (Password.isCommonPassword(value)) {
      return AppResult.Err(new Error('Password is too common and easily guessable'));
    }

    // Check for sequential characters
    if (Password.hasSequentialChars(value)) {
      return AppResult.Err(new Error('Password contains sequential characters (e.g., 123, abc)'));
    }

    // Check for repeated characters
    if (Password.hasRepeatedChars(value)) {
      return AppResult.Err(new Error('Password contains too many repeated characters'));
    }

    return AppResult.Ok(new Password(value));
  }

  /**
   * Create a password with custom strength requirements
   */
  static createWithCustomRequirements(
    value: string, 
    requirements: {
      minLength?: number;
      requireLowercase?: boolean;
      requireUppercase?: boolean;
      requireNumbers?: boolean;
      requireSpecialChars?: boolean;
      allowCommonPasswords?: boolean;
      allowSequentialChars?: boolean;
      allowRepeatedChars?: boolean;
    } = {}
  ): AppResult<Password> {
    // Validation logic - self-validating
    if (!value || typeof value !== 'string') {
      return AppResult.Err(new Error('Password is required and must be a string'));
    }

    const minLength = requirements.minLength ?? Password.MIN_LENGTH;
    const requireLowercase = requirements.requireLowercase ?? true;
    const requireUppercase = requirements.requireUppercase ?? true;
    const requireNumbers = requirements.requireNumbers ?? true;
    const requireSpecialChars = requirements.requireSpecialChars ?? true;
    const allowCommonPasswords = requirements.allowCommonPasswords ?? false;
    const allowSequentialChars = requirements.allowSequentialChars ?? false;
    const allowRepeatedChars = requirements.allowRepeatedChars ?? false;

    // Length validation
    if (value.length < minLength) {
      return AppResult.Err(new Error(`Password must be at least ${minLength} characters long`));
    }

    if (value.length > Password.MAX_LENGTH) {
      return AppResult.Err(new Error(`Password cannot exceed ${Password.MAX_LENGTH} characters`));
    }

    // Character type validation
    const validationErrors: string[] = [];

    if (requireLowercase && !Password.HAS_LOWERCASE.test(value)) {
      validationErrors.push('at least one lowercase letter');
    }

    if (requireUppercase && !Password.HAS_UPPERCASE.test(value)) {
      validationErrors.push('at least one uppercase letter');
    }

    if (requireNumbers && !Password.HAS_NUMBERS.test(value)) {
      validationErrors.push('at least one number');
    }

    if (requireSpecialChars && !Password.HAS_SPECIAL_CHARS.test(value)) {
      validationErrors.push('at least one special character');
    }

    if (validationErrors.length > 0) {
      return AppResult.Err(new Error(`Password must contain ${validationErrors.join(', ')}`));
    }

    // Check for common weak patterns (if not allowed)
    if (!allowCommonPasswords && Password.isCommonPassword(value)) {
      return AppResult.Err(new Error('Password is too common and easily guessable'));
    }

    // Check for sequential characters (if not allowed)
    if (!allowSequentialChars && Password.hasSequentialChars(value)) {
      return AppResult.Err(new Error('Password contains sequential characters (e.g., 123, abc)'));
    }

    // Check for repeated characters (if not allowed)
    if (!allowRepeatedChars && Password.hasRepeatedChars(value)) {
      return AppResult.Err(new Error('Password contains too many repeated characters'));
    }

    return AppResult.Ok(new Password(value));
  }

  /**
   * Create a password from a trusted source (bypasses validation)
   * Use with caution - only for data that has already been validated
   */
  static fromTrusted(value: string): Password {
    return new Password(value);
  }

  /**
   * Get the password value (immutable accessor)
   */
  get value(): string {
    return this._value;
  }

  /**
   * Get the password length
   */
  get length(): number {
    return this._value.length;
  }

  /**
   * Check if the password is short (< 12 characters)
   */
  get isShort(): boolean {
    return this._value.length < 12;
  }

  /**
   * Check if the password is medium length (12-20 characters)
   */
  get isMedium(): boolean {
    return this._value.length >= 12 && this._value.length <= 20;
  }

  /**
   * Check if the password is long (> 20 characters)
   */
  get isLong(): boolean {
    return this._value.length > 20;
  }

  /**
   * Check if the password contains lowercase letters
   */
  get hasLowercase(): boolean {
    return Password.HAS_LOWERCASE.test(this._value);
  }

  /**
   * Check if the password contains uppercase letters
   */
  get hasUppercase(): boolean {
    return Password.HAS_UPPERCASE.test(this._value);
  }

  /**
   * Check if the password contains numbers
   */
  get hasNumbers(): boolean {
    return Password.HAS_NUMBERS.test(this._value);
  }

  /**
   * Check if the password contains special characters
   */
  get hasSpecialChars(): boolean {
    return Password.HAS_SPECIAL_CHARS.test(this._value);
  }

  /**
   * Get password strength score (0-100)
   */
  get strengthScore(): number {
    let score = 0;

    // Base score for length
    score += Math.min(this._value.length * 2, 40);

    // Character type diversity
    if (this.hasLowercase) score += 10;
    if (this.hasUppercase) score += 10;
    if (this.hasNumbers) score += 10;
    if (this.hasSpecialChars) score += 10;

    // Bonus for longer passwords
    if (this._value.length > 16) score += 10;

    // Penalty for common patterns
    if (Password.isCommonPassword(this._value)) score -= 20;
    if (Password.hasSequentialChars(this._value)) score -= 15;
    if (Password.hasRepeatedChars(this._value)) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get password strength level
   */
  get strengthLevel(): 'weak' | 'fair' | 'good' | 'strong' | 'excellent' {
    const score = this.strengthScore;
    if (score < 30) return 'weak';
    if (score < 50) return 'fair';
    if (score < 70) return 'good';
    if (score < 90) return 'strong';
    return 'excellent';
  }

  /**
   * Check if the password meets minimum security requirements
   */
  get meetsSecurityRequirements(): boolean {
    return this.strengthScore >= 60;
  }

  /**
   * Check if the password is considered strong
   */
  get isStrong(): boolean {
    return this.strengthScore >= 80;
  }

  /**
   * Check if the password is considered weak
   */
  get isWeak(): boolean {
    return this.strengthScore < 40;
  }

  /**
   * Value equality - compares by value, not instance
   */
  equals(other: Password): boolean {
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
   * Get a masked version for security (e.g., "********")
   */
  get masked(): string {
    return '*'.repeat(this._value.length);
  }

  /**
   * Get a partially masked version (e.g., "S*****3!")
   */
  get partiallyMasked(): string {
    if (this._value.length <= 2) {
      return this.masked;
    }
    return this._value[0] + '*'.repeat(this._value.length - 2) + this._value[this._value.length - 1];
  }

  /**
   * Check if a string represents a valid password
   */
  static isValid(value: string): boolean {
    return Password.create(value).isOk();
  }

  /**
   * Get the minimum required password length
   */
  static getMinLength(): number {
    return Password.MIN_LENGTH;
  }

  /**
   * Get the maximum allowed password length
   */
  static getMaxLength(): number {
    return Password.MAX_LENGTH;
  }

  /**
   * Check if a password is common/weak
   */
  private static isCommonPassword(password: string): boolean {
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
      'admin', 'letmein', 'welcome', 'monkey', 'dragon', 'master', 'football',
      'baseball', 'superman', 'trustno1', 'hello', 'freedom', 'whatever'
    ];
    return commonPasswords.includes(password.toLowerCase());
  }

  /**
   * Check if a password contains sequential characters
   */
  private static hasSequentialChars(password: string): boolean {
    const sequences = ['123', 'abc', 'qwe', 'asd', 'zxc', '789', '456', '321', 'cba', 'ewq', 'dsa', 'cxz'];
    const lowerPassword = password.toLowerCase();
    return sequences.some(seq => lowerPassword.includes(seq));
  }

  /**
   * Check if a password contains too many repeated characters
   */
  private static hasRepeatedChars(password: string): boolean {
    const maxRepeats = 3;
    for (let i = 0; i < password.length - maxRepeats + 1; i++) {
      if (password[i] === password[i + 1] && password[i] === password[i + 2]) {
        return true;
      }
    }
    return false;
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
    // Return a Zod schema for password validation at boundaries
    const { z } = require('zod');
    return z.string()
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password cannot exceed 128 characters')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/\d/, 'Password must contain at least one number')
      .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/, 'Password must contain at least one special character');
  }
}
