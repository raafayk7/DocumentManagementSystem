import { Result } from '@carbonteq/fp';

/**
 * Password value object representing passwords with strength validation and security rules.
 * 
 * Characteristics:
 * - Immutable: Once created, password cannot be changed
 * - No Identity: Two "SecurePass123!" passwords are considered equal
 * - Value Comparison: Equality is based on password value, not instance
 * - Self-validating: Only valid passwords can be created
 * - Easily testable: Simple to test all scenarios
 */
export class Password {
  // Password strength requirements
  private static readonly MIN_LENGTH = 8;
  private static readonly MAX_LENGTH = 128;
  
  // Character type requirements
  private static readonly HAS_LOWERCASE = /[a-z]/;
  private static readonly HAS_UPPERCASE = /[A-Z]/;
  private static readonly HAS_NUMBERS = /\d/;
  private static readonly HAS_SPECIAL_CHARS = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/;
  
  // Private constructor ensures immutability
  private constructor(private readonly _value: string) {}

  /**
   * Factory method to create a Password with validation.
   * Returns Result<T, E> for consistent error handling.
   */
  static create(value: string): Result<Password, string> {
    // Validation logic - self-validating
    if (!value || typeof value !== 'string') {
      return Result.Err('Password is required and must be a string');
    }

    // Length validation
    if (value.length < Password.MIN_LENGTH) {
      return Result.Err(`Password must be at least ${Password.MIN_LENGTH} characters long`);
    }

    if (value.length > Password.MAX_LENGTH) {
      return Result.Err(`Password cannot exceed ${Password.MAX_LENGTH} characters`);
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
      return Result.Err(`Password must contain ${validationErrors.join(', ')}`);
    }

    // Check for common weak patterns
    if (Password.isCommonPassword(value)) {
      return Result.Err('Password is too common and easily guessable');
    }

    // Check for sequential characters
    if (Password.hasSequentialChars(value)) {
      return Result.Err('Password contains sequential characters (e.g., 123, abc)');
    }

    // Check for repeated characters
    if (Password.hasRepeatedChars(value)) {
      return Result.Err('Password contains too many repeated characters');
    }

    return Result.Ok(new Password(value));
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
  ): Result<Password, string> {
    if (!value || typeof value !== 'string') {
      return Result.Err('Password is required and must be a string');
    }

    const minLength = requirements.minLength || Password.MIN_LENGTH;
    const requireLowercase = requirements.requireLowercase ?? true;
    const requireUppercase = requirements.requireUppercase ?? true;
    const requireNumbers = requirements.requireNumbers ?? true;
    const requireSpecialChars = requirements.requireSpecialChars ?? true;
    const allowCommonPasswords = requirements.allowCommonPasswords ?? false;
    const allowSequentialChars = requirements.allowSequentialChars ?? false;
    const allowRepeatedChars = requirements.allowRepeatedChars ?? false;

    // Length validation
    if (value.length < minLength) {
      return Result.Err(`Password must be at least ${minLength} characters long`);
    }

    if (value.length > Password.MAX_LENGTH) {
      return Result.Err(`Password cannot exceed ${Password.MAX_LENGTH} characters`);
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
      return Result.Err(`Password must contain ${validationErrors.join(', ')}`);
    }

    // Optional validations
    if (!allowCommonPasswords && Password.isCommonPassword(value)) {
      return Result.Err('Password is too common and easily guessable');
    }

    if (!allowSequentialChars && Password.hasSequentialChars(value)) {
      return Result.Err('Password contains sequential characters (e.g., 123, abc)');
    }

    if (!allowRepeatedChars && Password.hasRepeatedChars(value)) {
      return Result.Err('Password contains too many repeated characters');
    }

    return Result.Ok(new Password(value));
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
   * Get password strength score (0-100)
   */
  get strengthScore(): number {
    let score = 0;

    // Base score for length
    score += Math.min(this._value.length * 2, 40);

    // Character variety bonus
    if (Password.HAS_LOWERCASE.test(this._value)) score += 10;
    if (Password.HAS_UPPERCASE.test(this._value)) score += 10;
    if (Password.HAS_NUMBERS.test(this._value)) score += 10;
    if (Password.HAS_SPECIAL_CHARS.test(this._value)) score += 10;

    // Length bonus
    if (this._value.length >= 12) score += 10;
    if (this._value.length >= 16) score += 10;

    // Penalties
    if (Password.hasSequentialChars(this._value)) score -= 20;
    if (Password.hasRepeatedChars(this._value)) score -= 15;
    if (Password.isCommonPassword(this._value)) score -= 30;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get password strength level
   */
  get strengthLevel(): 'very-weak' | 'weak' | 'medium' | 'strong' | 'very-strong' {
    const score = this.strengthScore;
    if (score < 20) return 'very-weak';
    if (score < 40) return 'weak';
    if (score < 60) return 'medium';
    if (score < 80) return 'strong';
    return 'very-strong';
  }

  /**
   * Check if password is strong enough
   */
  get isStrong(): boolean {
    return this.strengthScore >= 60;
  }

  /**
   * Check if password meets minimum requirements
   */
  get meetsMinimumRequirements(): boolean {
    return this.strengthScore >= 40;
  }

  /**
   * Check if password is weak
   */
  get isWeak(): boolean {
    return this.strengthScore < 40;
  }

  /**
   * Check if password is very weak
   */
  get isVeryWeak(): boolean {
    return this.strengthScore < 20;
  }

  /**
   * Value equality - compares by value, not instance
   */
  equals(other: Password): boolean {
    if (!other) return false;
    return this._value === other._value;
  }

  /**
   * Check if this password is stronger than another
   */
  isStrongerThan(other: Password): boolean {
    if (!other) return false;
    return this.strengthScore > other.strengthScore;
  }

  /**
   * Check if this password is weaker than another
   */
  isWeakerThan(other: Password): boolean {
    if (!other) return false;
    return this.strengthScore < other.strengthScore;
  }

  /**
   * String representation for serialization (masked for security)
   */
  toString(): string {
    return '*'.repeat(this._value.length);
  }

  /**
   * Get a masked version for security
   */
  get masked(): string {
    return '*'.repeat(this._value.length);
  }

  /**
   * Get password requirements summary
   */
  get requirementsSummary(): string {
    const requirements = [];
    
    if (this._value.length >= Password.MIN_LENGTH) {
      requirements.push(`✓ At least ${Password.MIN_LENGTH} characters`);
    } else {
      requirements.push(`✗ At least ${Password.MIN_LENGTH} characters`);
    }

    if (Password.HAS_LOWERCASE.test(this._value)) {
      requirements.push('✓ Lowercase letter');
    } else {
      requirements.push('✗ Lowercase letter');
    }

    if (Password.HAS_UPPERCASE.test(this._value)) {
      requirements.push('✓ Uppercase letter');
    } else {
      requirements.push('✗ Uppercase letter');
    }

    if (Password.HAS_NUMBERS.test(this._value)) {
      requirements.push('✓ Number');
    } else {
      requirements.push('✗ Number');
    }

    if (Password.HAS_SPECIAL_CHARS.test(this._value)) {
      requirements.push('✓ Special character');
    } else {
      requirements.push('✗ Special character');
    }

    return requirements.join('\n');
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
   * Check if password is a common weak password
   */
  private static isCommonPassword(password: string): boolean {
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey'
    ];
    return commonPasswords.includes(password.toLowerCase());
  }

  /**
   * Check if password contains sequential characters
   */
  private static hasSequentialChars(password: string): boolean {
    const sequences = ['123', 'abc', 'qwe', 'asd', 'zxc'];
    const lowerPassword = password.toLowerCase();
    return sequences.some(seq => lowerPassword.includes(seq));
  }

  /**
   * Check if password contains too many repeated characters
   */
  private static hasRepeatedChars(password: string): boolean {
    for (let i = 0; i < password.length - 2; i++) {
      if (password[i] === password[i + 1] && password[i] === password[i + 2]) {
        return true;
      }
    }
    return false;
  }
}
