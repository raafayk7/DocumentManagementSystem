import { injectable, inject } from 'tsyringe';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { CreateUserRequest, UserResponse } from '../../../shared/dto/user/index.js';
import type { IUserApplicationService } from '../../../ports/input/IUserApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';

@injectable()
export class CreateUserUseCase {
  constructor(
    @inject('IUserApplicationService') private userApplicationService: IUserApplicationService,
    @inject('ILogger') private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'CreateUserUseCase' });
  }

  async execute(request: CreateUserRequest): Promise<AppResult<UserResponse>> {
    this.logger.info('Executing create user use case', { email: request.email });

    try {
      const userResult = await this.userApplicationService.createUser(
        request.email,
        request.password,
        request.role
      );
      
      if (userResult.isErr()) {
        const error = userResult.unwrapErr();
        this.logger.warn('User creation failed', { 
          email: request.email, 
          error: error.message || error.toString() 
        });
        // Preserve the original error message instead of wrapping it
        return AppResult.Err(error);
      }

      const user = userResult.unwrap();
      const response: UserResponse = {
        id: user.id,
        email: user.email.value,
        role: user.role.value,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      this.logger.info('User created successfully', { userId: user.id, email: user.email.value });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { email: request.email });
      return AppResult.Err(error instanceof Error ? error : new Error('Unknown error'));
    }
  }
}
