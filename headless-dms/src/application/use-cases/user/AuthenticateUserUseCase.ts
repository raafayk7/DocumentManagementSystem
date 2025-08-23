import { injectable, inject } from 'tsyringe';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { AuthenticateUserRequest, AuthenticateUserResponse } from '../../../shared/dto/user/index.js';
import type { IUserApplicationService } from '../../../ports/input/IUserApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';
import type { IAuthStrategy } from '../../../ports/output/IAuthStrategy.js';

@injectable()
export class AuthenticateUserUseCase {
  constructor(
    @inject('IUserApplicationService') private userApplicationService: IUserApplicationService,
    @inject('IAuthStrategy') private authStrategy: IAuthStrategy,
    @inject('ILogger') private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'AuthenticateUserUseCase' });
  }

  async execute(request: AuthenticateUserRequest): Promise<AppResult<AuthenticateUserResponse>> {
    this.logger.info('Executing authenticate user use case', { email: request.email });

    try {
      // Use the auth strategy to authenticate and generate token
      const authResult = await this.authStrategy.authenticate({
        email: request.email,
        password: request.password
      });
      
      if (authResult.isErr()) {
        this.logger.warn('User authentication failed', { email: request.email });
        return AppResult.Err(authResult.unwrapErr());
      }

      const auth = authResult.unwrap();
      
      // Get the full user entity to access createdAt and updatedAt
      const userResult = await this.userApplicationService.getUserByEmail(request.email);
      if (userResult.isErr()) {
        this.logger.error('Failed to get user details after authentication', { email: request.email });
        return AppResult.Err(userResult.unwrapErr());
      }
      
      const user = userResult.unwrap();
      
      const response: AuthenticateUserResponse = {
        token: auth.token,
        user: {
          id: user.id,
          email: user.email.value,
          role: user.role.value,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        expiresAt: auth.expiresAt
      };

      this.logger.info('User authenticated successfully', { userId: user.id, email: user.email.value });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { email: request.email });
      // Preserve the original error message instead of wrapping it
      return AppResult.Err(error instanceof Error ? error : new Error('Unknown error'));
    }
  }
}
