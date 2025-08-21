import { injectable, inject } from 'tsyringe';
import { AppResult, AppError } from '@carbonteq/hexapp';
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
import type { IAuthApplicationService } from '../../ports/input/IAuthApplicationService.js';

@injectable()
export class AuthApplicationService implements IAuthApplicationService {
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
  async authenticateUser(email: string, password: string): Promise<AppResult<User>> {
    this.logger.info('Authenticating user', { email });
    
    try {
      // Find user
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        this.logger.warn('User not found for authentication', { email });
        return AppResult.Err(AppError.Unauthorized(
          `Invalid credentials for email: ${email}`
        ));
      }

      // Validate password
      const isValidPassword = await user.verifyPassword(password);
      if (!isValidPassword) {
        this.logger.warn('Invalid password for user', { email });
        return AppResult.Err(AppError.Unauthorized(
          `Invalid credentials for email: ${email}`
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
        return AppResult.Err(AppError.Unauthorized(
          `Additional authentication required for user: ${user.id}`
        ));
      }

      this.logger.info('User authenticated successfully', { userId: user.id, email });
      return AppResult.Ok(user);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { email });
      return AppResult.Err(AppError.Generic(
        `Failed to authenticate user with email: ${email}`
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
}
