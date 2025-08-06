import { Result } from '@carbonteq/fp';

export interface UserValidationContext {
  existingUsers?: { email: string; id: string }[];
  currentUserId?: string;
  operation?: 'create' | 'update' | 'role_change';
}

export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

export class UserValidator {
  // Domain-specific business rules

  /**
   * Business Rule: Password must meet minimum security requirements
   * Domain: Security policy requires minimum 8 characters
   */
  static validatePassword(password: string): Result<string, string> {
    if (!password) {
      return Result.Err('Password is required');
    }
    
    if (password.length < 8) {
      return Result.Err('Password must be at least 8 characters for security');
    }
    
    return Result.Ok(password);
  }

  /**
   * Business Rule: Role must be valid in the system hierarchy
   * Domain: Role hierarchy defines user permissions
   */
  static validateRole(role: string): Result<'user' | 'admin', string> {
    if (!role) {
      return Result.Err('Role is required');
    }
    
    if (role !== 'user' && role !== 'admin') {
      return Result.Err('Role must be either "user" or "admin"');
    }
    
    return Result.Ok(role as 'user' | 'admin');
  }

  /**
   * Business Rule: Users cannot change their own role
   * Domain: Security policy prevents self-promotion
   */
  static validateRoleChange(
    currentUserId: string, 
    targetUserId: string, 
    newRole: 'user' | 'admin'
  ): Result<'user' | 'admin', string> {
    if (currentUserId === targetUserId) {
      return Result.Err('Users cannot change their own role for security reasons');
    }
    
    return Result.Ok(newRole);
  }

  /**
   * Business Rule: Account must be older than specified days for certain operations
   * Domain: Business policy for account maturity
   */
  static validateAccountAge(
    accountCreatedAt: Date, 
    requiredDays: number
  ): Result<boolean, string> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - requiredDays);
    
    if (accountCreatedAt > cutoffDate) {
      return Result.Err(`Account must be older than ${requiredDays} days for this operation`);
    }
    
    return Result.Ok(true);
  }

  /**
   * Business Rule: Email must be unique across all users
   * Domain: Business constraint - no duplicate emails allowed
   */
  static validateEmailUniqueness(
    email: string, 
    existingUsers: { email: string; id: string }[]
  ): Result<string, string> {
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = existingUsers.find(user => 
      user.email.toLowerCase().trim() === normalizedEmail
    );
    
    if (existingUser) {
      return Result.Err('Email already exists in the system');
    }
    
    return Result.Ok(normalizedEmail);
  }

  /**
   * Business Rule: User must have required permissions for operation
   * Domain: Role-based access control policy
   */
  static validatePermission(
    userRole: 'user' | 'admin',
    requiredRole: 'user' | 'admin',
    operation: string
  ): Result<boolean, string> {
    if (requiredRole === 'admin' && userRole !== 'admin') {
      return Result.Err(`Admin role required for operation: ${operation}`);
    }
    
    return Result.Ok(true);
  }

  // Invariant checking methods

  /**
   * Invariant: User must have valid email format
   * Domain: Data integrity - email must be properly formatted
   */
  static validateUserEmailInvariant(user: User): Result<User, string> {
    if (!user.email || !user.email.includes('@')) {
      return Result.Err('User must have a valid email address');
    }
    
    return Result.Ok(user);
  }

  /**
   * Invariant: User must have valid role
   * Domain: Data integrity - role must be valid enum value
   */
  static validateUserRoleInvariant(user: User): Result<User, string> {
    if (user.role !== 'user' && user.role !== 'admin') {
      return Result.Err('User must have a valid role (user or admin)');
    }
    
    return Result.Ok(user);
  }

  /**
   * Invariant: User must have valid timestamps
   * Domain: Data integrity - timestamps must be valid dates
   */
  static validateUserTimestampsInvariant(user: User): Result<User, string> {
    if (!(user.createdAt instanceof Date) || isNaN(user.createdAt.getTime())) {
      return Result.Err('User must have a valid creation timestamp');
    }
    
    if (!(user.updatedAt instanceof Date) || isNaN(user.updatedAt.getTime())) {
      return Result.Err('User must have a valid update timestamp');
    }
    
    if (user.updatedAt < user.createdAt) {
      return Result.Err('User update timestamp cannot be before creation timestamp');
    }
    
    return Result.Ok(user);
  }

  /**
   * Invariant: User must have valid ID
   * Domain: Data integrity - ID must be non-empty string
   */
  static validateUserIdInvariant(user: User): Result<User, string> {
    if (!user.id || typeof user.id !== 'string' || user.id.trim() === '') {
      return Result.Err('User must have a valid ID');
    }
    
    return Result.Ok(user);
  }

  /**
   * Comprehensive user invariant checking
   * Domain: Data integrity - all user invariants must be satisfied
   */
  static validateUserInvariants(user: User): Result<User, string> {
    // Check all invariants in sequence
    const idResult = this.validateUserIdInvariant(user);
    if (idResult.isErr()) return idResult;
    
    const emailResult = this.validateUserEmailInvariant(user);
    if (emailResult.isErr()) return emailResult;
    
    const roleResult = this.validateUserRoleInvariant(user);
    if (roleResult.isErr()) return roleResult;
    
    const timestampsResult = this.validateUserTimestampsInvariant(user);
    if (timestampsResult.isErr()) return timestampsResult;
    
    return Result.Ok(user);
  }

  /**
   * Business Rule: User cannot be deleted if they own documents
   * Domain: Data integrity - prevent orphaned documents
   */
  static validateUserDeletionInvariant(
    user: User, 
    userDocumentCount: number
  ): Result<boolean, string> {
    if (userDocumentCount > 0) {
      return Result.Err(`Cannot delete user with ${userDocumentCount} documents. Please transfer or delete documents first.`);
    }
    
    return Result.Ok(true);
  }

  /**
   * Business Rule: User cannot change role if they have admin privileges and are the only admin
   * Domain: Security - prevent system from having no admins
   */
  static validateAdminRoleChangeInvariant(
    user: User,
    isOnlyAdmin: boolean
  ): Result<boolean, string> {
    if (user.role === 'admin' && isOnlyAdmin) {
      return Result.Err('Cannot change role of the only admin user. Please create another admin first.');
    }
    
    return Result.Ok(true);
  }
}
