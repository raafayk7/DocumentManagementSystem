import { injectable, inject } from 'tsyringe';
import { AppResult } from '@carbonteq/hexapp';
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
import { ApplicationError } from '../../shared/errors/ApplicationError.js';
import type { IUserApplicationService } from '../../ports/input/IUserApplicationService.js';

@injectable()
export class UserApplicationService implements IUserApplicationService {
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
    this.logger.info('Creating new user', { email, role });
    
    try {
      // Validate password strength
      const passwordValidation = this.authDomainService.validatePasswordStrength(password);
      if (passwordValidation.level === 'weak') {
        this.logger.warn('Weak password detected', { email, score: passwordValidation.score });
        return AppResult.Err(new ApplicationError(
          'UserApplicationService.weakPassword',
          'Password does not meet security requirements',
          { issues: passwordValidation.issues }
        ));
      }

      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        this.logger.warn('User already exists', { email });
        return AppResult.Err(new ApplicationError(
          'UserApplicationService.userExists',
          'User with this email already exists',
          { email }
        ));
      }

      // Create user entity
      const userResult = await User.create(email, password, role);
      if (userResult.isErr()) {
        this.logger.error('Failed to create user entity', { email, error: userResult.unwrapErr() });
        return AppResult.Err(new ApplicationError(
          'UserApplicationService.entityCreation',
          userResult.unwrapErr(),
          { email }
        ));
      }

      const user = userResult.unwrap();
      
      // Save user
      const savedUser = await this.userRepository.saveUser(user);
      
      // Validate user state after creation
      const stateValidation = this.userDomainService.validateUserState(savedUser);
      if (!stateValidation.isValid) {
        this.logger.warn('User state validation issues', { 
          userId: savedUser.id, 
          issues: stateValidation.issues 
        });
      }

      this.logger.info('User created successfully', { userId: savedUser.id, email });
      return AppResult.Ok(savedUser);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { email });
      return AppResult.Err(new ApplicationError(
        'UserApplicationService.createUser',
        error instanceof Error ? error.message : 'Failed to create user',
        { email }
      ));
    }
  }

  /**
   * Authenticate user with security validation
   */
  async authenticateUser(email: string, password: string): Promise<AppResult<User>> {
    this.logger.info('Authenticating user', { email });
    
    try {
      // Find user
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        this.logger.warn('User not found for authentication', { email });
        return AppResult.Err(new ApplicationError(
          'UserApplicationService.userNotFound',
          'Invalid credentials',
          { email }
        ));
      }

      // Validate password
      const isValidPassword = await user.verifyPassword(password);
      if (!isValidPassword) {
        this.logger.warn('Invalid password for user', { email });
        return AppResult.Err(new ApplicationError(
          'UserApplicationService.invalidPassword',
          'Invalid credentials',
          { email }
        ));
      }

      // Validate user security posture
      const securityValidation = this.authDomainService.validateUserSecurity(user);
      if (securityValidation.riskLevel === 'high') {
        this.logger.warn('High risk user authentication', { 
          userId: user.id, 
          riskLevel: securityValidation.riskLevel 
        });
      }

      this.logger.info('User authenticated successfully', { userId: user.id, email });
      return AppResult.Ok(user);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { email });
      return AppResult.Err(new ApplicationError(
        'UserApplicationService.authenticateUser',
        error instanceof Error ? error.message : 'Failed to authenticate user',
        { email }
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
        return AppResult.Err(new ApplicationError(
          'UserApplicationService.userNotFound',
          'User not found',
          { userId }
        ));
      }

      // Validate current password
      const isValidCurrentPassword = await user.verifyPassword(currentPassword);
      if (!isValidCurrentPassword) {
        this.logger.warn('Invalid current password', { userId });
        return AppResult.Err(new ApplicationError(
          'UserApplicationService.invalidCurrentPassword',
          'Current password is incorrect',
          { userId }
        ));
      }

      // Validate new password strength
      const passwordValidation = this.authDomainService.validatePasswordStrength(newPassword);
      if (passwordValidation.level === 'weak') {
        this.logger.warn('Weak new password', { userId, score: passwordValidation.score });
        return AppResult.Err(new ApplicationError(
          'UserApplicationService.weakNewPassword',
          'New password does not meet security requirements',
          { issues: passwordValidation.issues }
        ));
      }

      // Update password
      const changePasswordResult = await user.changePassword(newPassword);
      if (changePasswordResult.isErr()) {
        this.logger.error('Failed to change password', { userId, error: changePasswordResult.unwrapErr() });
        return AppResult.Err(new ApplicationError(
          'UserApplicationService.passwordChangeFailed',
          changePasswordResult.unwrapErr(),
          { userId }
        ));
      }

      const updatedUser = changePasswordResult.unwrap();
      const savedUser = await this.userRepository.saveUser(updatedUser);

      this.logger.info('User password changed successfully', { userId });
      return AppResult.Ok(savedUser);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { userId });
      return AppResult.Err(new ApplicationError(
        'UserApplicationService.changeUserPassword',
        error instanceof Error ? error.message : 'Failed to change password',
        { userId }
      ));
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
        return AppResult.Err(new ApplicationError(
          'UserApplicationService.currentUserNotFound',
          'Current user not found',
          { currentUserId }
        ));
      }

      // Get target user
      const targetUser = await this.userRepository.findById(targetUserId);
      if (!targetUser) {
        this.logger.warn('Target user not found', { targetUserId });
        return AppResult.Err(new ApplicationError(
          'UserApplicationService.targetUserNotFound',
          'Target user not found',
          { targetUserId }
        ));
      }

      // Validate role change permission
      const canChangeRole = this.userDomainService.canUserChangeRole(currentUser, targetUser, newRole);
      if (!canChangeRole) {
        this.logger.warn('Role change not permitted', { currentUserId, targetUserId, newRole });
        return AppResult.Err(new ApplicationError(
          'UserApplicationService.roleChangeNotPermitted',
          'Role change not permitted',
          { currentUserId, targetUserId, newRole }
        ));
      }

      // Update role
      const changeRoleResult = targetUser.changeRole(newRole);
      if (changeRoleResult.isErr()) {
        this.logger.error('Failed to change role', { targetUserId, error: changeRoleResult.unwrapErr() });
        return AppResult.Err(new ApplicationError(
          'UserApplicationService.roleChangeFailed',
          changeRoleResult.unwrapErr(),
          { targetUserId, newRole }
        ));
      }

      const updatedUser = changeRoleResult.unwrap();
      const savedUser = await this.userRepository.saveUser(updatedUser);

      this.logger.info('User role changed successfully', { targetUserId, newRole });
      return AppResult.Ok(savedUser);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { currentUserId, targetUserId });
      return AppResult.Err(new ApplicationError(
        'UserApplicationService.changeUserRole',
        error instanceof Error ? error.message : 'Failed to change user role',
        { currentUserId, targetUserId }
      ));
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<AppResult<User>> {
    this.logger.info('Getting user by ID', { userId });
    
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.warn('User not found', { userId });
        return AppResult.Err(new ApplicationError(
          'UserApplicationService.userNotFound',
          'User not found',
          { userId }
        ));
      }

      this.logger.info('User retrieved successfully', { userId });
      return AppResult.Ok(user);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { userId });
      return AppResult.Err(new ApplicationError(
        'UserApplicationService.getUserById',
        error instanceof Error ? error.message : 'Failed to get user',
        { userId }
      ));
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<AppResult<User>> {
    this.logger.info('Getting user by email', { email });
    
    try {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        this.logger.warn('User not found', { email });
        return AppResult.Err(new ApplicationError(
          'UserApplicationService.userNotFound',
          'User not found',
          { email }
        ));
      }

      this.logger.info('User retrieved successfully', { email });
      return AppResult.Ok(user);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { email });
      return AppResult.Err(new ApplicationError(
        'UserApplicationService.getUserByEmail',
        error instanceof Error ? error.message : 'Failed to get user',
        { email }
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
      return AppResult.Err(new ApplicationError(
        'UserApplicationService.getUsers',
        error instanceof Error ? error.message : 'Failed to get users',
        { page, limit, filters }
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
      return AppResult.Err(new ApplicationError(
        'UserApplicationService.getUsersByRole',
        error instanceof Error ? error.message : 'Failed to get users by role',
        { role }
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
        return AppResult.Err(new ApplicationError(
          'UserApplicationService.userNotFound',
          'User not found',
          { email }
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
      return AppResult.Err(new ApplicationError(
        'UserApplicationService.validateUserCredentials',
        error instanceof Error ? error.message : 'Failed to validate user credentials',
        { email }
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
        return AppResult.Err(new ApplicationError(
          'UserApplicationService.currentUserNotFound',
          'Current user not found',
          { currentUserId }
        ));
      }

      // Get target user
      const targetUser = await this.userRepository.findById(targetUserId);
      if (!targetUser) {
        this.logger.warn('Target user not found for deletion', { targetUserId });
        return AppResult.Err(new ApplicationError(
          'UserApplicationService.targetUserNotFound',
          'Target user not found',
          { targetUserId }
        ));
      }

      // Validate deletion permission
      const canDelete = this.userDomainService.canUserPerformAction(currentUser, 'delete', 'user');
      if (!canDelete) {
        this.logger.warn('User deletion not permitted', { currentUserId, targetUserId });
        return AppResult.Err(new ApplicationError(
          'UserApplicationService.deletionNotPermitted',
          'User deletion not permitted',
          { currentUserId, targetUserId }
        ));
      }

      // Prevent self-deletion
      if (currentUserId === targetUserId) {
        this.logger.warn('Attempted self-deletion', { userId: currentUserId });
        return AppResult.Err(new ApplicationError(
          'UserApplicationService.selfDeletionNotAllowed',
          'Self-deletion is not allowed',
          { userId: currentUserId }
        ));
      }

      // Delete user
      const deleted = await this.userRepository.delete(targetUserId);
      if (!deleted) {
        this.logger.warn('Failed to delete user', { targetUserId });
        return AppResult.Err(new ApplicationError(
          'UserApplicationService.deleteFailed',
          'Failed to delete user',
          { targetUserId }
        ));
      }

      this.logger.info('User deleted successfully', { targetUserId });
      return AppResult.Ok(undefined);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { currentUserId, targetUserId });
      return AppResult.Err(new ApplicationError(
        'UserApplicationService.deleteUser',
        error instanceof Error ? error.message : 'Failed to delete user',
        { currentUserId, targetUserId }
      ));
    }
  }
}
