import { injectable, inject } from 'tsyringe';
import { Result } from '@carbonteq/fp';
import { User } from '../../domain/entities/User.js';
import { 
  AuthDomainService, 
  SecurityValidation, 
  PasswordStrength, 
  SessionValidation,
  TokenValidation
} from '../../domain/services/AuthDomainService.js';
import { 
  UserDomainService 
} from '../../domain/services/UserDomainService.js';
import type { IUserRepository } from '../../auth/repositories/user.repository.interface.js';
import type { ILogger } from '../../infrastructure/interfaces/ILogger.js';
import { ApplicationError } from '../errors/ApplicationError.js';

@injectable()
export class AuthApplicationService {
  constructor(
    @inject("IUserRepository") private userRepository: IUserRepository,
    @inject("AuthDomainService") private authDomainService: AuthDomainService,
    @inject("UserDomainService") private userDomainService: UserDomainService,
    @inject("ILogger") private logger: ILogger,
  ) {
    this.logger = this.logger.child({ service: 'AuthApplicationService' });
  }

  /**
   * Authenticate user with comprehensive security validation
   */
  async authenticateUser(email: string, password: string): Promise<Result<User, ApplicationError>> {
    this.logger.info('Authenticating user', { email });
    
    try {
      // Find user
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        this.logger.warn('User not found for authentication', { email });
        return Result.Err(new ApplicationError(
          'AuthApplicationService.userNotFound',
          'Invalid credentials',
          { email }
        ));
      }

      // Validate password
      const isValidPassword = await user.verifyPassword(password);
      if (!isValidPassword) {
        this.logger.warn('Invalid password for user', { email });
        return Result.Err(new ApplicationError(
          'AuthApplicationService.invalidPassword',
          'Invalid credentials',
          { email }
        ));
      }

      // Validate user security posture
      const securityValidation = this.authDomainService.validateUserSecurity(user);
      if (securityValidation.riskLevel === 'high') {
        this.logger.warn('High risk user authentication', { 
          userId: user.id, 
          riskLevel: securityValidation.riskLevel,
          issues: securityValidation.issues 
        });
      }

      // Check if additional authentication is required
      const requiresAdditionalAuth = this.authDomainService.requiresAdditionalAuth(user, 'login');
      if (requiresAdditionalAuth) {
        this.logger.warn('Additional authentication required', { userId: user.id });
        return Result.Err(new ApplicationError(
          'AuthApplicationService.additionalAuthRequired',
          'Additional authentication required',
          { userId: user.id }
        ));
      }

      this.logger.info('User authenticated successfully', { userId: user.id, email });
      return Result.Ok(user);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { email });
      return Result.Err(new ApplicationError(
        'AuthApplicationService.authenticateUser',
        error instanceof Error ? error.message : 'Failed to authenticate user',
        { email }
      ));
    }
  }

  /**
   * Validate password strength
   */
  async validatePasswordStrength(password: string): Promise<Result<PasswordStrength, ApplicationError>> {
    this.logger.info('Validating password strength');
    
    try {
      const passwordStrength = this.authDomainService.validatePasswordStrength(password);
      
      this.logger.info('Password strength validated', { 
        score: passwordStrength.score, 
        level: passwordStrength.level 
      });
      return Result.Ok(passwordStrength);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error');
      return Result.Err(new ApplicationError(
        'AuthApplicationService.validatePasswordStrength',
        error instanceof Error ? error.message : 'Failed to validate password strength'
      ));
    }
  }

  /**
   * Validate user security posture
   */
  async validateUserSecurity(userId: string): Promise<Result<SecurityValidation, ApplicationError>> {
    this.logger.info('Validating user security', { userId });
    
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.warn('User not found for security validation', { userId });
        return Result.Err(new ApplicationError(
          'AuthApplicationService.userNotFound',
          'User not found',
          { userId }
        ));
      }

      const securityValidation = this.authDomainService.validateUserSecurity(user);
      
      this.logger.info('User security validated', { 
        userId, 
        riskLevel: securityValidation.riskLevel,
        isValid: securityValidation.isValid 
      });
      return Result.Ok(securityValidation);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { userId });
      return Result.Err(new ApplicationError(
        'AuthApplicationService.validateUserSecurity',
        error instanceof Error ? error.message : 'Failed to validate user security',
        { userId }
      ));
    }
  }

  /**
   * Validate authentication attempt patterns
   */
  async validateAuthAttempt(
    email: string, 
    attemptCount: number, 
    lastAttemptTime?: Date
  ): Promise<Result<{ shouldAllow: boolean; reason: string; cooldownMinutes?: number }, ApplicationError>> {
    this.logger.info('Validating authentication attempt', { email, attemptCount });
    
    try {
      const validation = this.authDomainService.validateAuthAttempt(email, attemptCount, lastAttemptTime);
      
      this.logger.info('Authentication attempt validated', { 
        email, 
        shouldAllow: validation.shouldAllow,
        reason: validation.reason 
      });
      return Result.Ok(validation);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { email });
      return Result.Err(new ApplicationError(
        'AuthApplicationService.validateAuthAttempt',
        error instanceof Error ? error.message : 'Failed to validate authentication attempt',
        { email }
      ));
    }
  }

  /**
   * Validate session security
   */
  async validateSession(
    userId: string, 
    lastActivity: Date, 
    sessionDuration: number = 30
  ): Promise<Result<SessionValidation, ApplicationError>> {
    this.logger.info('Validating session', { userId });
    
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.warn('User not found for session validation', { userId });
        return Result.Err(new ApplicationError(
          'AuthApplicationService.userNotFound',
          'User not found',
          { userId }
        ));
      }

      const sessionValidation = this.authDomainService.validateSession(lastActivity, sessionDuration);
      
      this.logger.info('Session validated', { 
        userId, 
        isValid: sessionValidation.isValid,
        sessionAge: sessionValidation.sessionAge 
      });
      return Result.Ok(sessionValidation);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { userId });
      return Result.Err(new ApplicationError(
        'AuthApplicationService.validateSession',
        error instanceof Error ? error.message : 'Failed to validate session',
        { userId }
      ));
    }
  }

  /**
   * Calculate token expiration for user
   */
  async calculateTokenExpiration(
    userId: string, 
    securityLevel: 'low' | 'medium' | 'high'
  ): Promise<Result<number, ApplicationError>> {
    this.logger.info('Calculating token expiration', { userId, securityLevel });
    
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.warn('User not found for token expiration calculation', { userId });
        return Result.Err(new ApplicationError(
          'AuthApplicationService.userNotFound',
          'User not found',
          { userId }
        ));
      }

      const expirationMinutes = this.authDomainService.calculateTokenExpiration(user, securityLevel);
      
      this.logger.info('Token expiration calculated', { 
        userId, 
        expirationMinutes,
        securityLevel 
      });
      return Result.Ok(expirationMinutes);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { userId });
      return Result.Err(new ApplicationError(
        'AuthApplicationService.calculateTokenExpiration',
        error instanceof Error ? error.message : 'Failed to calculate token expiration',
        { userId }
      ));
    }
  }

  /**
   * Validate if user can perform sensitive operations
   */
  async canPerformSensitiveOperation(
    userId: string, 
    operation: 'password_change' | 'role_change' | 'account_deletion' | 'system_config'
  ): Promise<Result<boolean, ApplicationError>> {
    this.logger.info('Validating sensitive operation permission', { userId, operation });
    
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.warn('User not found for sensitive operation validation', { userId });
        return Result.Err(new ApplicationError(
          'AuthApplicationService.userNotFound',
          'User not found',
          { userId }
        ));
      }

      const canPerform = this.authDomainService.canPerformSensitiveOperation(user, operation);
      
      this.logger.info('Sensitive operation permission validated', { 
        userId, 
        operation,
        canPerform 
      });
      return Result.Ok(canPerform);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { userId });
      return Result.Err(new ApplicationError(
        'AuthApplicationService.canPerformSensitiveOperation',
        error instanceof Error ? error.message : 'Failed to validate sensitive operation permission',
        { userId }
      ));
    }
  }

  /**
   * Calculate security risk score for user
   */
  async calculateSecurityRiskScore(userId: string): Promise<Result<number, ApplicationError>> {
    this.logger.info('Calculating security risk score', { userId });
    
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.warn('User not found for risk score calculation', { userId });
        return Result.Err(new ApplicationError(
          'AuthApplicationService.userNotFound',
          'User not found',
          { userId }
        ));
      }

      const riskScore = this.authDomainService.calculateSecurityRiskScore(user);
      
      this.logger.info('Security risk score calculated', { 
        userId, 
        riskScore 
      });
      return Result.Ok(riskScore);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { userId });
      return Result.Err(new ApplicationError(
        'AuthApplicationService.calculateSecurityRiskScore',
        error instanceof Error ? error.message : 'Failed to calculate security risk score',
        { userId }
      ));
    }
  }

  /**
   * Check if additional authentication is required for operation
   */
  async requiresAdditionalAuth(
    userId: string, 
    operation: 'login' | 'sensitive_operation' | 'admin_action'
  ): Promise<Result<boolean, ApplicationError>> {
    this.logger.info('Checking if additional auth is required', { userId, operation });
    
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.warn('User not found for additional auth check', { userId });
        return Result.Err(new ApplicationError(
          'AuthApplicationService.userNotFound',
          'User not found',
          { userId }
        ));
      }

      const requiresAdditionalAuth = this.authDomainService.requiresAdditionalAuth(user, operation);
      
      this.logger.info('Additional auth requirement checked', { 
        userId, 
        operation,
        requiresAdditionalAuth 
      });
      return Result.Ok(requiresAdditionalAuth);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { userId });
      return Result.Err(new ApplicationError(
        'AuthApplicationService.requiresAdditionalAuth',
        error instanceof Error ? error.message : 'Failed to check additional auth requirement',
        { userId }
      ));
    }
  }

  /**
   * Validate user permissions for specific actions
   */
  async validateUserPermissions(
    userId: string, 
    action: 'create' | 'read' | 'update' | 'delete' | 'share',
    resource: 'document' | 'user' | 'system'
  ): Promise<Result<boolean, ApplicationError>> {
    this.logger.info('Validating user permissions', { userId, action, resource });
    
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.warn('User not found for permission validation', { userId });
        return Result.Err(new ApplicationError(
          'AuthApplicationService.userNotFound',
          'User not found',
          { userId }
        ));
      }

      const canPerform = this.userDomainService.canUserPerformAction(user, action, resource);
      
      this.logger.info('User permissions validated', { 
        userId, 
        action,
        resource,
        canPerform 
      });
      return Result.Ok(canPerform);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { userId });
      return Result.Err(new ApplicationError(
        'AuthApplicationService.validateUserPermissions',
        error instanceof Error ? error.message : 'Failed to validate user permissions',
        { userId }
      ));
    }
  }
}
