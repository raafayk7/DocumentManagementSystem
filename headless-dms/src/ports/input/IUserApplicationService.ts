import { Result } from '@carbonteq/fp';
import { User } from '../../domain/entities/User.js';
import { ApplicationError } from '../../shared/errors/ApplicationError.js';

export interface IUserApplicationService {
  /**
   * Create a new user with validation
   */
  createUser(email: string, password: string, role?: 'user' | 'admin'): Promise<Result<User, ApplicationError>>;

  /**
   * Authenticate user with security validation
   */
  authenticateUser(email: string, password: string): Promise<Result<User, ApplicationError>>;

  /**
   * Change user password with validation
   */
  changeUserPassword(userId: string, currentPassword: string, newPassword: string): Promise<Result<User, ApplicationError>>;

  /**
   * Change user role with permission validation
   */
  changeUserRole(currentUserId: string, targetUserId: string, newRole: 'user' | 'admin'): Promise<Result<User, ApplicationError>>;

  /**
   * Get user by ID
   */
  getUserById(userId: string): Promise<Result<User, ApplicationError>>;

  /**
   * Get user by email
   */
  getUserByEmail(email: string): Promise<Result<User, ApplicationError>>;

  /**
   * Get users with enhanced filtering
   */
  getUsers(
    page?: number,
    limit?: number,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
    filters?: {
      search?: string;
      email?: string;
      role?: 'user' | 'admin';
    }
  ): Promise<Result<User[], ApplicationError>>;

  /**
   * Get users by role
   */
  getUsersByRole(role: 'user' | 'admin'): Promise<Result<User[], ApplicationError>>;

  /**
   * Delete user with validation
   */
  deleteUser(currentUserId: string, targetUserId: string): Promise<Result<void, ApplicationError>>;
}
