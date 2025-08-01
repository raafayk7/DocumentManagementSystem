import { Result } from '@carbonteq/fp';

export interface UserValidationContext {
  existingUsers?: { email: string; id: string }[];
  currentUserId?: string;
  operation?: 'create' | 'update' | 'role_change';
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
}
