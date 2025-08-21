import { injectable, inject } from 'tsyringe';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { AuthenticateUserRequest, AuthenticateUserResponse } from '../../../shared/dto/user/index.js';
import type { IUserApplicationService } from '../../../ports/input/IUserApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';

@injectable()
export class AuthenticateUserUseCase {
  constructor(
    @inject('IUserApplicationService') private userApplicationService: IUserApplicationService,
    @inject('ILogger') private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'AuthenticateUserUseCase' });
  }

  async execute(request: AuthenticateUserRequest): Promise<AppResult<AuthenticateUserResponse>> {
    this.logger.info('Executing authenticate user use case', { email: request.email });

    try {
      const userResult = await this.userApplicationService.authenticateUser(request.email, request.password);
      
      if (userResult.isErr()) {
        this.logger.warn('User authentication failed', { email: request.email });
        return AppResult.Err(AppError.Unauthorized(
          `Authentication failed for email: ${request.email}`
        ));
      }

      const user = userResult.unwrap();
      const response: AuthenticateUserResponse = {
        token: 'dummy-token', // This should come from a proper auth service
        user: {
          id: user.id,
          email: user.email.value,
          role: user.role.value,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      };

      this.logger.info('User authenticated successfully', { userId: user.id, email: user.email.value });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { email: request.email });
      return AppResult.Err(AppError.Generic(
        `Failed to execute authenticate user use case for email: ${request.email}`
      ));
    }
  }
}
