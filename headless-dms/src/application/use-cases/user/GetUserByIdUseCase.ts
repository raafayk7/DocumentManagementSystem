import { injectable, inject } from 'tsyringe';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { GetUserByIdRequest, GetUserByIdResponse } from '../../../shared/dto/user/index.js';
import type { IUserApplicationService } from '../../../ports/input/IUserApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';

@injectable()
export class GetUserByIdUseCase {
  constructor(
    @inject('IUserApplicationService') private userApplicationService: IUserApplicationService,
    @inject('ILogger') private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'GetUserByIdUseCase' });
  }

  async execute(request: GetUserByIdRequest): Promise<AppResult<GetUserByIdResponse>> {
    this.logger.info('Executing get user by ID use case', { userId: request.userId });

    try {
      const userResult = await this.userApplicationService.getUserById(request.userId);
      
      if (userResult.isErr()) {
        this.logger.warn('User not found', { userId: request.userId });
        return AppResult.Err(AppError.NotFound(
          `User not found with ID: ${request.userId}`
        ));
      }

      const user = userResult.unwrap();
      const response: GetUserByIdResponse = {
        user: {
          id: user.id,
          email: user.email.value,
          role: user.role.value,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      };

      this.logger.info('User retrieved successfully', { userId: user.id, email: user.email.value });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { userId: request.userId });
      return AppResult.Err(AppError.Generic(
        `Failed to execute get user by ID use case for user ID: ${request.userId}`
      ));
    }
  }
} 