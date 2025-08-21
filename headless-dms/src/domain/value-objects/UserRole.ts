import { AppResult } from '@carbonteq/hexapp';

/**
 * UserRole value object representing user roles in the system.
 * 
 * Characteristics:
 * - Immutable: Once created, role cannot be changed
 * - No Identity: Two admin roles are considered equal
 * - Value Comparison: Equality is based on role value, not instance
 * - Self-validating: Only valid roles can be created
 * - Easily testable: Simple to test all scenarios
 */
export class UserRole {
  // Valid role values
  private static readonly VALID_ROLES = ['user', 'admin'] as const;
  
  // Private constructor ensures immutability
  private constructor(private readonly _value: 'user' | 'admin') {}

  /**
   * Factory method to create a UserRole with validation.
   * Returns AppResult<T> for consistent error handling.
   */
  static create(value: string): AppResult<UserRole> {
    // Validation logic - self-validating
    if (!value || typeof value !== 'string') {
      return AppResult.Err(new Error('Role value is required and must be a string'));
    }

    const normalizedValue = value.toLowerCase().trim();
    
    if (!UserRole.VALID_ROLES.includes(normalizedValue as any)) {
      return AppResult.Err(new Error(`Invalid role: '${value}'. Valid roles are: ${UserRole.VALID_ROLES.join(', ')}`));
    }

    return AppResult.Ok(new UserRole(normalizedValue as 'user' | 'admin'));
  }

  /**
   * Create a user role (non-admin)
   */
  static user(): UserRole {
    return new UserRole('user');
  }

  /**
   * Create an admin role
   */
  static admin(): UserRole {
    return new UserRole('admin');
  }

  /**
   * Get the role value (immutable accessor)
   */
  get value(): 'user' | 'admin' {
    return this._value;
  }

  /**
   * Check if this role is an admin role
   */
  get isAdmin(): boolean {
    return this._value === 'admin';
  }

  /**
   * Check if this role is a regular user role
   */
  get isUser(): boolean {
    return this._value === 'user';
  }

  /**
   * Value equality - compares by value, not instance
   */
  equals(other: UserRole): boolean {
    if (!other) return false;
    return this._value === other._value;
  }

  /**
   * Check if this role has higher privileges than another role
   */
  hasHigherPrivilegesThan(other: UserRole): boolean {
    if (this._value === 'admin' && other._value === 'user') {
      return true;
    }
    return false;
  }

  /**
   * String representation for serialization
   */
  toString(): string {
    return this._value;
  }

  /**
   * Get all valid role values (useful for validation, forms, etc.)
   */
  static getValidRoles(): readonly string[] {
    return UserRole.VALID_ROLES;
  }

  /**
   * Check if a string value represents a valid role
   */
  static isValid(value: string): boolean {
    return UserRole.create(value).isOk();
  }
}
