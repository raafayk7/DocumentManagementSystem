import { AppResult } from '@carbonteq/hexapp';
import { User } from '../../domain/entities/User.js';
import { ApplicationError } from '../../shared/errors/ApplicationError.js';

export interface IUserApplicationService {
  /**
   * Create a new user with validation
   */
  createUser(email: string, password: string, role?: 'user' | 'admin'): Promise<AppResult<User>>;

  /**
   * Authenticate user with security validation
   */
  authenticateUser(email: string, password: string): Promise<AppResult<User>>;

  /**
   * Validate user credentials
   */
  validateUserCredentials(email: string, password: string): Promise<AppResult<boolean>>;

  /**
   * Change user password with validation
   */
  changeUserPassword(userId: string, currentPassword: string, newPassword: string): Promise<AppResult<User>>;

  /**
   * Change user role with permission validation
   */
  changeUserRole(currentUserId: string, targetUserId: string, newRole: 'user' | 'admin'): Promise<AppResult<User>>;

  /**
   * Get user by ID
   */
  getUserById(userId: string): Promise<AppResult<User>>;

  /**
   * Get user by email
   */
  getUserByEmail(email: string): Promise<AppResult<User>>;

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
  ): Promise<AppResult<User[]>>;

  /**
   * Get users by role
   */
  getUsersByRole(role: 'user' | 'admin'): Promise<AppResult<User[]>>;

  /**
   * Delete user with validation
   */
  deleteUser(currentUserId: string, targetUserId: string): Promise<AppResult<void>>;
}
