import { AppResult } from '@carbonteq/hexapp';

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
  static validatePassword(password: string): AppResult<string> {
    if (!password) {
      return AppResult.Err(new Error('Password is required'));
    }
    
    if (password.length < 8) {
      return AppResult.Err(new Error('Password must be at least 8 characters for security'));
    }
    
    return AppResult.Ok(password);
  }

  /**
   * Business Rule: Role must be valid in the system hierarchy
   * Domain: Role hierarchy defines user permissions
   */
  static validateRole(role: string): AppResult<'user' | 'admin'> {
    if (!role) {
      return AppResult.Err(new Error('Role is required'));
    }
    
    if (role !== 'user' && role !== 'admin') {
      return AppResult.Err(new Error('Role must be either "user" or "admin"'));
    }
    
    return AppResult.Ok(role as 'user' | 'admin');
  }

  /**
   * Business Rule: Users cannot change their own role
   * Domain: Security policy prevents self-promotion
   */
  static validateRoleChange(
    currentUserId: string, 
    targetUserId: string, 
    newRole: 'user' | 'admin'
  ): AppResult<'user' | 'admin'> {
    if (currentUserId === targetUserId) {
      return AppResult.Err(new Error('Users cannot change their own role for security reasons'));
    }
    
    return AppResult.Ok(newRole);
  }

  /**
   * Business Rule: Account must be older than specified days for certain operations
   * Domain: Business policy for account maturity
   */
  static validateAccountAge(
    accountCreatedAt: Date, 
    requiredDays: number
  ): AppResult<boolean> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - requiredDays);
    
    if (accountCreatedAt > cutoffDate) {
      return AppResult.Err(new Error(`Account must be older than ${requiredDays} days for this operation`));
    }
    
    return AppResult.Ok(true);
  }

  /**
   * Business Rule: Email must be unique across all users
   * Domain: Business constraint - no duplicate emails allowed
   */
  static validateEmailUniqueness(
    email: string, 
    existingUsers: { email: string; id: string }[]
  ): AppResult<string> {
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = existingUsers.find(user => 
      user.email.toLowerCase().trim() === normalizedEmail
    );
    
    if (existingUser) {
      return AppResult.Err(new Error('Email already exists in the system'));
    }
    
    return AppResult.Ok(normalizedEmail);
  }

  /**
   * Business Rule: User must have required role for operation
   * Domain: Security policy - role-based access control
   */
  static validateUserRoleForOperation(
    userRole: 'user' | 'admin',
    requiredRole: 'user' | 'admin',
    operation: string
  ): AppResult<boolean> {
    if (requiredRole === 'admin' && userRole !== 'admin') {
      return AppResult.Err(new Error(`Admin role required for operation: ${operation}`));
    }
    
    return AppResult.Ok(true);
  }

  /**
   * Business Rule: User must have valid email format
   * Domain: Data integrity - email must be properly formatted
   */
  static validateUserEmailInvariant(user: User): AppResult<User> {
    if (!user.email || !user.email.includes('@')) {
      return AppResult.Err(new Error('User must have a valid email address'));
    }
    
    return AppResult.Ok(user);
  }

  /**
   * Business Rule: User must have valid role enum value
   * Domain: Data integrity - role must be valid enum value
   */
  static validateUserRoleInvariant(user: User): AppResult<User> {
    if (user.role !== 'user' && user.role !== 'admin') {
      return AppResult.Err(new Error('User must have a valid role (user or admin)'));
    }
    
    return AppResult.Ok(user);
  }

  /**
   * Business Rule: User must have valid timestamps
   * Domain: Data integrity - timestamps must be valid dates
   */
  static validateUserTimestampsInvariant(user: User): AppResult<User> {
    if (!(user.createdAt instanceof Date) || isNaN(user.createdAt.getTime())) {
      return AppResult.Err(new Error('User must have a valid creation timestamp'));
    }
    
    if (!(user.updatedAt instanceof Date) || isNaN(user.updatedAt.getTime())) {
      return AppResult.Err(new Error('User must have a valid update timestamp'));
    }
    
    if (user.updatedAt < user.createdAt) {
      return AppResult.Err(new Error('User update timestamp cannot be before creation timestamp'));
    }
    
    return AppResult.Ok(user);
  }

  /**
   * Business Rule: User must have valid ID
   * Domain: Data integrity - ID must be non-empty string
   */
  static validateUserIdInvariant(user: User): AppResult<User> {
    if (!user.id || typeof user.id !== 'string' || user.id.trim() === '') {
      return AppResult.Err(new Error('User must have a valid ID'));
    }
    
    return AppResult.Ok(user);
  }

  /**
   * Business Rule: All user invariants must be satisfied
   * Domain: Data integrity - all user invariants must be satisfied
   */
  static validateUserInvariants(user: User): AppResult<User> {
    // Check all invariants in sequence
    const idResult = this.validateUserIdInvariant(user);
    if (idResult.isErr()) return idResult;
    
    const emailResult = this.validateUserEmailInvariant(user);
    if (emailResult.isErr()) return emailResult;
    
    const roleResult = this.validateUserRoleInvariant(user);
    if (roleResult.isErr()) return roleResult;
    
    const timestampsResult = this.validateUserTimestampsInvariant(user);
    if (timestampsResult.isErr()) return timestampsResult;
    
    return AppResult.Ok(user);
  }

  /**
   * Business Rule: User cannot be deleted if they have documents
   * Domain: Data integrity - prevent orphaned documents
   */
  static validateUserDeletion(
    user: User, 
    userDocumentCount: number
  ): AppResult<boolean> {
    if (userDocumentCount > 0) {
      return AppResult.Err(new Error(`Cannot delete user with ${userDocumentCount} documents. Please transfer or delete documents first.`));
    }
    
    return AppResult.Ok(true);
  }

  /**
   * Business Rule: Cannot change role of only admin user
   * Domain: Security policy - maintain system administration
   */
  static validateAdminRoleChange(
    user: User,
    isOnlyAdmin: boolean
  ): AppResult<boolean> {
    if (user.role === 'admin' && isOnlyAdmin) {
      return AppResult.Err(new Error('Cannot change role of the only admin user. Please create another admin first.'));
    }
    
    return AppResult.Ok(true);
  }
}
