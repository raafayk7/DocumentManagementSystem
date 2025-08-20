import { injectable, inject } from 'tsyringe';
import { Result } from '@carbonteq/fp';
import { UserApplicationService } from '../../services/UserApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';
import type { CreateUserRequest, UserResponse } from '../../../shared/dto/user/index.js';
import { ApplicationError } from '../../../shared/errors/ApplicationError.js';

@injectable()
export class CreateUserUseCase {
  constructor(
    @inject('UserApplicationService') private userApplicationService: UserApplicationService,
    @inject('ILogger') private logger: ILogger
  ) {
    this.logger = this.logger.child({ useCase: 'CreateUserUseCase' });
  }

  async execute(request: CreateUserRequest): Promise<Result<UserResponse, ApplicationError>> {
    this.logger.info('User registration attempt', { email: request.email, role: request.role });
    
    try {
      // Delegate user creation to UserApplicationService
      const userResult = await this.userApplicationService.createUser(
        request.email,
        request.password,
        request.role
      );
      
      if (userResult.isErr()) {
        this.logger.warn('User registration failed', { 
          email: request.email, 
          error: userResult.unwrapErr().message 
        });
        return userResult;
      }

      const user = userResult.unwrap();
      
      // Create response DTO
      const userResponse: UserResponse = {
        id: user.id,
        email: user.email.value,
        role: user.role.value,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      this.logger.info('User registered successfully', { userId: user.id, email: user.email.value });
      return Result.Ok(userResponse);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { email: request.email });
      return Result.Err(new ApplicationError(
        'CreateUserUseCase.execute',
        error instanceof Error ? error.message : 'Failed to create user',
        { email: request.email, role: request.role }
      ));
    }
  }
}
