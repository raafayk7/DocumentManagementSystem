import { injectable, inject } from 'tsyringe';
import { AppError, AppResult } from '@carbonteq/hexapp';
import { matchRes } from '@carbonteq/fp';
import { extractProp, extractProps, extractId, toSerialized } from '@carbonteq/hexapp';
import { User } from '../../domain/entities/User.js';
import { 
  UserDomainService, 
  UserActivityScore, 
  UserPermission, 
  UserStateValidation 
} from '../../domain/services/UserDomainService.js';
import { 
  AuthDomainService, 
  SecurityValidation, 
  PasswordStrength 
} from '../../domain/services/AuthDomainService.js';
import type { IUserRepository } from '../../ports/output/IUserRepository.js';
import type { ILogger } from '../../ports/output/ILogger.js';
// import { ApplicationError } from '../../shared/errors/ApplicationError.js';
import type { IUserApplicationService } from '../../ports/input/IUserApplicationService.js';

@injectable()
export class UserApplicationService implements IUserApplicationService {
  // Hexapp composition utilities
  private readonly extractUserInfo = (user: User) => ({
    id: extractId(user),
    email: user.email.value,
    role: user.role.value
  });
  
  // Helper functions for common operations
  private readonly findUserById = async (userId: string) => {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return AppResult.Err(AppError.NotFound(`User not found with id: ${userId}`));
    }
    return AppResult.Ok(user);
  };

  private readonly findUserByEmail = async (email: string) => {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return AppResult.Err(AppError.NotFound(`User not found with email: ${email}`));
    }
    return AppResult.Ok(user);
  };

  private readonly validateUserAccess = (user: User, action: 'create' | 'read' | 'update' | 'delete' | 'share', resource: 'user' | 'document' | 'system') => {
    const canPerform = this.userDomainService.canUserPerformAction(user, action, resource);
    if (!canPerform) {
      return AppResult.Err(AppError.Unauthorized(
        `User with id: ${extractId(user)} does not have sufficient permissions to ${action} ${resource}`
      ));
    }
    return AppResult.Ok(undefined);
  };

  private readonly logUserAction = (action: string, userId: string, additional?: any) => {
    this.logger.info(`User ${action}`, { userId, ...additional });
  };

  constructor(
    @inject("IUserRepository") private userRepository: IUserRepository,
    @inject("UserDomainService") private userDomainService: UserDomainService,
    @inject("AuthDomainService") private authDomainService: AuthDomainService,
    @inject("ILogger") private logger: ILogger,
  ) {
    this.logger = this.logger.child({ service: 'UserApplicationService' });
  }

  /**
   * Create a new user with validation
   */
  async createUser(email: string, password: string, role: 'user' | 'admin' = 'user'): Promise<AppResult<User>> {
    this.logUserAction('creation attempt', 'new', { email, role });
    
    try {
      // Validate password strength
      const passwordValidation = this.authDomainService.validatePasswordStrength(password);
      if (passwordValidation.level === 'weak') {
        this.logger.warn('Weak password detected', { email, score: passwordValidation.score });
        return AppResult.Err(AppError.Generic(
          `Password does not meet security requirements for user with email: ${email}`
        ));
      }

      // Check if user already exists using composition helper
      const existingUserResult = await this.findUserByEmail(email);
      if (existingUserResult.isOk()) {
        this.logger.warn('User already exists', { email });
        return AppResult.Err(AppError.Generic(
          `User with this email already exists: ${email}`
        ));
      }

      // Create user entity
      const userResult = await User.create(email, password, role);
      if (userResult.isErr()) {
        const error = userResult.unwrapErr();
        this.logger.error('Failed to create user entity', { 
          email, 
          error: error.message || error.toString(),
          errorDetails: error
        });
        // Preserve the original error message instead of wrapping it
        return AppResult.Err(error);
      }

      const user = userResult.unwrap();
      
      // Save user using insert (new user)
      const saveResult = await this.userRepository.insert(user);
      
      return matchRes(saveResult, {
        Ok: (savedUser) => {
          // Validate user state after creation
          const stateValidation = this.userDomainService.validateUserState(savedUser);
          if (!stateValidation.isValid) {
            this.logger.warn('User state validation issues', { 
              userId: extractId(savedUser), 
              issues: stateValidation.issues 
            });
          }

          this.logUserAction('created successfully', extractId(savedUser), this.extractUserInfo(savedUser));
          return AppResult.Ok(savedUser);
        },
        Err: (error) => {
          this.logger.error('Failed to save user', { 
            email, 
            error: error.message || error.toString(),
            errorDetails: error
          });
          // Preserve the original error message instead of wrapping it
          return AppResult.Err(error);
        }
      });
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { email });
      return AppResult.Err(AppError.Generic(
        `Failed to create user with email: ${email}`
      ));
    }
  }

  /**
   * Authenticate user with security validation
   */
  async authenticateUser(email: string, password: string): Promise<AppResult<User>> {
    this.logUserAction('authentication attempt', 'unknown', { email });
    
    try {
      // Find user using composition helper
      const userResult = await this.findUserByEmail(email);
      if (userResult.isErr()) {
        return userResult;
      }
      const user = userResult.unwrap();

      // Validate password
      const isValidPassword = await user.verifyPassword(password);
      if (!isValidPassword) {
        this.logger.warn('Invalid password for user', { email });
        return AppResult.Err(AppError.Unauthorized(
          `Invalid password for user with email: ${email}`
        ));
      }

      // Validate user security posture
      const securityValidation = this.authDomainService.validateUserSecurity(user);
      if (securityValidation.riskLevel === 'high') {
        this.logger.warn('High risk user authentication', { 
          userId: extractId(user), 
          riskLevel: securityValidation.riskLevel 
        });
      }

      this.logUserAction('authenticated successfully', extractId(user), { email });
      return AppResult.Ok(user);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { email });
      return AppResult.Err(AppError.Generic(
        `Failed to authenticate user with email: ${email}`
      ));
    }
  }

  /**
   * Change user password with validation
   */
  async changeUserPassword(userId: string, currentPassword: string, newPassword: string): Promise<AppResult<User>> {
    this.logger.info('Changing user password', { userId });
    
    try {
      // Find user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.warn('User not found for password change', { userId });
        return AppResult.Err(AppError.NotFound(
          `User not found with id: ${userId}`
        ));
      }

      // Validate current password
      const isValidCurrentPassword = await user.verifyPassword(currentPassword);
      if (!isValidCurrentPassword) {
        this.logger.warn('Invalid current password', { userId });
        return AppResult.Err(AppError.Unauthorized(
          `Current password is incorrect for user with id: ${userId}`
        ));
      }

      // Validate new password strength
      const passwordValidation = this.authDomainService.validatePasswordStrength(newPassword);
      if (passwordValidation.level === 'weak') {
        this.logger.warn('Weak new password', { userId, score: passwordValidation.score });
        return AppResult.Err(AppError.Generic(
          `New password does not meet security requirements for user with id: ${userId}`
        ));
      }

      // Update password
      const changePasswordResult = await user.changePassword(newPassword);
      if (changePasswordResult.isErr()) {
        const error = changePasswordResult.unwrapErr();
        this.logger.error('Failed to change password', { userId, error: error.message || error.toString() });
        // Preserve the original error message instead of wrapping it
        return AppResult.Err(error);
      }

      const updatedUser = changePasswordResult.unwrap();
      const saveResult = await this.userRepository.update(updatedUser);
      
      return matchRes(saveResult, {
        Ok: (savedUser) => {
          this.logger.info('User password changed successfully', { userId });
          return AppResult.Ok(savedUser);
        },
        Err: (error) => {
          this.logger.error('Failed to save user after password change', { userId, error: error.message || error.toString() });
          // Preserve the original error message instead of wrapping it
          return AppResult.Err(error);
        }
      });
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { userId });
      // Preserve the original error message instead of wrapping it
      return AppResult.Err(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Change user role with permission validation
   */
  async changeUserRole(currentUserId: string, targetUserId: string, newRole: 'user' | 'admin'): Promise<AppResult<User>> {
    this.logger.info('Changing user role', { currentUserId, targetUserId, newRole });
    
    try {
      // Get current user (the one making the change)
      const currentUser = await this.userRepository.findById(currentUserId);
      if (!currentUser) {
        this.logger.warn('Current user not found', { currentUserId });
        return AppResult.Err(AppError.NotFound(
          `Current user not found with id: ${currentUserId}`
        ));
      }

      // Get target user
      const targetUser = await this.userRepository.findById(targetUserId);
      if (!targetUser) {
        this.logger.warn('Target user not found', { targetUserId });
        return AppResult.Err(AppError.NotFound(
          `Target user not found with id: ${targetUserId}`
        ));
      }

      // Validate role change permission
      const canChangeRole = this.userDomainService.canUserChangeRole(currentUser, targetUser, newRole);
      if (!canChangeRole) {
        this.logger.warn('Role change not permitted', { currentUserId, targetUserId, newRole });
        return AppResult.Err(AppError.Unauthorized(
          `Role change not permitted for user with id: ${targetUserId}`
        ));
      }

      // Update role
      const changeRoleResult = targetUser.changeRole(newRole);
      if (changeRoleResult.isErr()) {
        const error = changeRoleResult.unwrapErr();
        this.logger.error('Failed to change role', { targetUserId, error: error.message || error.toString() });
        // Preserve the original error message instead of wrapping it
        return AppResult.Err(error);
      }

      const updatedUser = changeRoleResult.unwrap();
      const saveResult = await this.userRepository.update(updatedUser);
      
      return matchRes(saveResult, {
        Ok: (savedUser) => {
          this.logger.info('User role changed successfully', { targetUserId, newRole });
          return AppResult.Ok(savedUser);
        },
        Err: (error) => {
          this.logger.error('Failed to save user after role change', { targetUserId, error: error.message || error.toString() });
          // Preserve the original error message instead of wrapping it
          return AppResult.Err(error);
        }
      });
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { currentUserId, targetUserId });
      // Preserve the original error message instead of wrapping it
      return AppResult.Err(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<AppResult<User>> {
    this.logUserAction('retrieval by ID', userId);
    
    try {
      const userResult = await this.findUserById(userId);
      if (userResult.isOk()) {
        this.logUserAction('retrieved successfully', userId);
      }
      return userResult;
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { userId });
      return AppResult.Err(AppError.Generic(
        `Failed to get user with id: ${userId}`
      ));
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<AppResult<User>> {
    this.logUserAction('retrieval by email', 'unknown', { email });
    
    try {
      const userResult = await this.findUserByEmail(email);
      if (userResult.isOk()) {
        this.logUserAction('retrieved successfully', extractId(userResult.unwrap()), { email });
      }
      return userResult;
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { email });
      return AppResult.Err(AppError.Generic(
        `Failed to get user with email: ${email}`
      ));
    }
  }

  /**
   * Get users with enhanced filtering
   */
    async getUsers(
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
    filters?: {
      search?: string;
      email?: string;
      role?: 'user' | 'admin';
    }
  ): Promise<AppResult<User[]>> {
    this.logger.info('Getting users with filters', {
      page,
      limit,
      sortBy,
      sortOrder,
      filters
    });
    
    try {
      // Build filter query for repository
      const filterQuery: any = {};
      if (filters) {
        if (filters.email) {
          filterQuery.email = filters.email;
        }
        if (filters.role) {
          filterQuery.role = filters.role;
        }
      }

      // Build pagination parameters for repository
      const paginationParams = {
        page,
        limit,
        order: sortOrder,
        sort: sortBy
      };

      // Use repository's find method with separate filter and pagination parameters
      const usersResult = await this.userRepository.find(filterQuery, paginationParams);
      
      this.logger.info('Users retrieved successfully', {
        count: usersResult.data.length,
        page,
        limit,
        filtersApplied: Object.keys(filters || {}).length
      });
      return AppResult.Ok(usersResult.data);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { page, limit, filters });
      return AppResult.Err(AppError.Generic(
        `Failed to get users with page: ${page}, limit: ${limit}, filters: ${JSON.stringify(filters)}`
      ));
    }
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role: 'user' | 'admin'): Promise<AppResult<User[]>> {
    this.logger.info('Getting users by role', { role });
    
    try {
      const users = await this.userRepository.findByRole(role);
      
      this.logger.info('Users retrieved successfully', { role, count: users.length });
      return AppResult.Ok(users);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { role });
      return AppResult.Err(AppError.Generic(
        `Failed to get users by role: ${role}`
      ));
    }
  }

  /**
   * Validate user credentials
   */
  async validateUserCredentials(email: string, password: string): Promise<AppResult<boolean>> {
    this.logger.info('Validating user credentials', { email });
    
    try {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        this.logger.warn('User not found for credential validation', { email });
        return AppResult.Err(AppError.NotFound(
          `User not found with email: ${email}`
        ));
      }

      const isValid = await user.verifyPassword(password);
      
      this.logger.info('User credentials validated', { 
        email, 
        isValid 
      });
      return AppResult.Ok(isValid);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { email });
      return AppResult.Err(AppError.Generic(
        `Failed to validate user credentials with email: ${email}`
      ));
    }
  }

  /**
   * Delete user with validation
   */
  async deleteUser(currentUserId: string, targetUserId: string): Promise<AppResult<void>> {
    this.logger.info('Deleting user', { currentUserId, targetUserId });
    
    try {
      // Get current user (the one making the deletion)
      const currentUser = await this.userRepository.findById(currentUserId);
      if (!currentUser) {
        this.logger.warn('Current user not found for deletion', { currentUserId });
        return AppResult.Err(AppError.NotFound(
          `Current user not found with id: ${currentUserId}`
        ));
      }

      // Get target user
      const targetUser = await this.userRepository.findById(targetUserId);
      if (!targetUser) {
        this.logger.warn('Target user not found for deletion', { targetUserId });
        return AppResult.Err(AppError.NotFound(
          `Target user not found with id: ${targetUserId}`
        ));
      }

      // Validate deletion permission
      const canDelete = this.userDomainService.canUserPerformAction(currentUser, 'delete', 'user');
      if (!canDelete) {
        this.logger.warn('User deletion not permitted', { currentUserId, targetUserId });
        return AppResult.Err(AppError.Unauthorized(
          `User deletion not permitted for user with id: ${targetUserId}`
        ));
      }

      // Prevent self-deletion
      if (currentUserId === targetUserId) {
        this.logger.warn('Attempted self-deletion', { userId: currentUserId });
        return AppResult.Err(AppError.Unauthorized(
          `Self-deletion is not allowed for user with id: ${currentUserId}`
        ));
      }

      // Delete user
      const deleted = await this.userRepository.delete(targetUserId);
      if (!deleted) {
        this.logger.warn('Failed to delete user', { targetUserId });
        return AppResult.Err(AppError.Generic(
          `Failed to delete user with id: ${targetUserId}`
        ));
      }

      this.logger.info('User deleted successfully', { targetUserId });
      return AppResult.Ok(undefined);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { currentUserId, targetUserId });
      return AppResult.Err(AppError.Generic(
        `Failed to delete user with id: ${targetUserId}`
      ));
    }
  }
}
