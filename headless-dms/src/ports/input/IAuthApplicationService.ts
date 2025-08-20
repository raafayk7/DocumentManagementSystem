import { AppResult } from '@carbonteq/hexapp';
import { User } from '../../domain/entities/User.js';
import { ApplicationError } from '../../shared/errors/ApplicationError.js';

export interface IAuthApplicationService {
  /**
   * Authenticate user with comprehensive security validation
   */
  authenticateUser(email: string, password: string): Promise<AppResult<User>>;

  /**
   * Validate user credentials
   */
  validateUserCredentials(email: string, password: string): Promise<AppResult<boolean>>;
}
