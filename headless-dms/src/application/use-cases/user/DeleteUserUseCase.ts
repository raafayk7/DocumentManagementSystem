import { injectable, inject } from 'tsyringe';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { DeleteUserRequest, DeleteUserResponse } from '../../../shared/dto/user/index.js';
import type { IUserApplicationService } from '../../../ports/input/IUserApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';

@injectable()
export class DeleteUserUseCase {
  constructor(
    @inject('IUserApplicationService') private userApplicationService: IUserApplicationService,
    @inject('ILogger') private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'DeleteUserUseCase' });
  }

  async execute(request: DeleteUserRequest): Promise<AppResult<DeleteUserResponse>> {
    this.logger.info('Executing delete user use case', { 
      currentUserId: request.currentUserId, 
      userId: request.userId 
    });

    try {
      const deleteResult = await this.userApplicationService.deleteUser(
        request.currentUserId,
        request.userId
      );
      
      if (deleteResult.isErr()) {
        this.logger.warn('User deletion failed', { 
          currentUserId: request.currentUserId, 
          userId: request.userId 
        });
        return AppResult.Err(AppError.InvalidOperation(
          `User deletion failed for user ID: ${request.userId}`
        ));
      }

      const response: DeleteUserResponse = {
        success: true,
        message: `User with ID ${request.userId} deleted successfully`
      };

      this.logger.info('User deleted successfully', { 
        currentUserId: request.currentUserId, 
        userId: request.userId 
      });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { 
        currentUserId: request.currentUserId, 
        userId: request.userId 
      });
      return AppResult.Err(AppError.Generic(
        `Failed to execute delete user use case for user ID: ${request.userId}`
      ));
    }
  }
}