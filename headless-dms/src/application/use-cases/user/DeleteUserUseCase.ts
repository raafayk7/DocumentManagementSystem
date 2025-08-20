import { injectable, inject } from 'tsyringe';
import { AppResult } from '@carbonteq/hexapp';
import { DeleteUserRequest, DeleteUserResponse } from '../../../shared/dto/user/index.js';
import type { IUserApplicationService } from '../../../ports/input/IUserApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';
import { ApplicationError } from '../../../shared/errors/ApplicationError.js';

@injectable()
export class DeleteUserUseCase {
  constructor(
    @inject('IUserApplicationService') private userApplicationService: IUserApplicationService,
    @inject('ILogger') private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'DeleteUserUseCase' });
  }

  async execute(request: DeleteUserRequest): Promise<AppResult<DeleteUserResponse>> {
    this.logger.info('Deleting user', { 
      currentUserId: request.currentUserId, 
      targetUserId: request.userId 
    });

    try {
      const deleteResult = await this.userApplicationService.deleteUser(request.currentUserId, request.userId);

      if (deleteResult.isErr()) {
        this.logger.warn('Failed to delete user', { 
          currentUserId: request.currentUserId, 
          targetUserId: request.userId,
          error: deleteResult.unwrapErr().message 
        });
        return AppResult.Err(new ApplicationError(
          'DeleteUserUseCase.userDeletionFailed',
          'Failed to delete user',
          { currentUserId: request.currentUserId, targetUserId: request.userId }
        ));
      }

      const response: DeleteUserResponse = {
        success: true,
        message: 'User deleted successfully'
      };
      
      this.logger.info('User deleted successfully', { 
        currentUserId: request.currentUserId, 
        targetUserId: request.userId 
      });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error('Unexpected error during user deletion', { 
        currentUserId: request.currentUserId, 
        targetUserId: request.userId,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return AppResult.Err(new ApplicationError(
        'DeleteUserUseCase.unexpectedError',
        'Unexpected error during user deletion',
        { currentUserId: request.currentUserId, targetUserId: request.userId }
      ));
    }
  }
}