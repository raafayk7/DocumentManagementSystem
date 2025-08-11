import { injectable, inject } from 'tsyringe';
import { Result } from '@carbonteq/fp';
import { AuthApplicationService } from '../../services/AuthApplicationService.js';
import type { ILogger } from '../../../infrastructure/interfaces/ILogger.js';
import type { AuthenticateUserRequest, AuthenticateUserResponse } from '../../dto/user/index.js';
import { ApplicationError } from '../../errors/ApplicationError.js';

@injectable()
export class AuthenticateUserUseCase {
  constructor(
    @inject('AuthApplicationService') private authApplicationService: AuthApplicationService,
    @inject('ILogger') private logger: ILogger
  ) {
    this.logger = this.logger.child({ useCase: 'AuthenticateUserUseCase' });
  }

  async execute(request: AuthenticateUserRequest): Promise<Result<AuthenticateUserResponse, ApplicationError>> {
    this.logger.info('User login attempt', { email: request.email });
    
    try {
      // Delegate authentication to AuthApplicationService
      const userResult = await this.authApplicationService.authenticateUser(request.email, request.password);
      
      if (userResult.isErr()) {
        this.logger.warn('Login failed', { 
          email: request.email, 
          error: userResult.unwrapErr().message 
        });
        return userResult;
      }

      const user = userResult.unwrap();
  
      // 3. Generate authentication response (token generation will be handled by infrastructure)
      const authResponse: AuthenticateUserResponse = {
        token: '', // Will be set by infrastructure layer
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      };

      this.logger.info('User authenticated successfully', { userId: user.id, email: user.email });
      return Result.Ok(authResponse);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { email: request.email });
      return Result.Err(new ApplicationError(
        'AuthenticateUserUseCase.execute',
        error instanceof Error ? error.message : 'Failed to authenticate user',
        { email: request.email }
      ));
    }
  }
}
