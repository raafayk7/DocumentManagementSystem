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
import type { IUserRepository } from '../../ports/output/IUserRepository.js';
import type { ILogger } from '../../ports/output/ILogger.js';
import { ApplicationError } from '../../shared/errors/ApplicationError.js';

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
   * Validate user credentials
   */
  async validateUserCredentials(email: string, password: string): Promise<Result<boolean, ApplicationError>> {
    this.logger.info('Validating user credentials', { email });
    
    try {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        this.logger.warn('User not found for credential validation', { email });
        return Result.Err(new ApplicationError(
          'AuthApplicationService.userNotFound',
          'User not found',
          { email }
        ));
      }

      const isValid = await user.verifyPassword(password);
      
      this.logger.info('User credentials validated', { 
        email, 
        isValid 
      });
      return Result.Ok(isValid);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { email });
      return Result.Err(new ApplicationError(
        'AuthApplicationService.validateUserCredentials',
        error instanceof Error ? error.message : 'Failed to validate user credentials',
        { email }
      ));
    }
  }
}
