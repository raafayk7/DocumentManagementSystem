import { Result } from '@carbonteq/fp';
import { User } from '../../domain/entities/User.js';
import { ApplicationError } from '../../shared/errors/ApplicationError.js';

export interface IAuthApplicationService {
  /**
   * Authenticate user with comprehensive security validation
   */
  authenticateUser(email: string, password: string): Promise<Result<User, ApplicationError>>;

  /**
   * Validate user credentials
   */
  validateUserCredentials(email: string, password: string): Promise<Result<boolean, ApplicationError>>;
}
