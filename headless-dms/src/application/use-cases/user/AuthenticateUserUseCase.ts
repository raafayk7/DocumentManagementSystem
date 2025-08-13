import { injectable, inject } from 'tsyringe';
import { Result } from '@carbonteq/fp';
import { AuthApplicationService } from '../../services/AuthApplicationService.js';
import type { ILogger } from '../../../domain/interfaces/ILogger.js';
import type { AuthenticateUserRequest, AuthenticateUserResponse } from '../../dto/user/index.js';
import { ApplicationError } from '../../errors/ApplicationError.js';
import type { IAuthStrategy } from '../../interfaces/IAuthStrategy.js';

@injectable()
export class AuthenticateUserUseCase {
  constructor(
    @inject('AuthApplicationService') private authApplicationService: AuthApplicationService,
    @inject('IAuthStrategy') private authStrategy: IAuthStrategy,
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
  
      // Generate authentication response using the auth strategy
      const authResult = await this.authStrategy.authenticate({
        email: request.email,
        password: request.password
      });
      
      if (authResult.isErr()) {
        this.logger.error('Auth strategy failed', { 
          email: request.email, 
          error: authResult.unwrapErr().message 
        });
        return Result.Err(new ApplicationError(
          'AuthenticateUserUseCase.authStrategyFailed',
          'Authentication strategy failed',
          { email: request.email }
        ));
      }
      
      const authData = authResult.unwrap();
      
      const authResponse: AuthenticateUserResponse = {
        token: authData.token,
        user: {
          id: user.id,
          email: user.email.value,
          role: user.role.value,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        expiresAt: authData.expiresAt,
      };

      this.logger.info('User authenticated successfully', { userId: user.id, email: user.email.value });
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
