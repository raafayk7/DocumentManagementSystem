import { injectable, inject } from 'tsyringe';
import { Result } from '@carbonteq/fp';
import { UserApplicationService } from '../../services/UserApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';
import type { DeleteUserRequest, DeleteUserResponse } from '../../../shared/dto/user/index.js';
import { ApplicationError } from '../../../shared/errors/ApplicationError.js';

@injectable()
export class DeleteUserUseCase {
  constructor(
    @inject('UserApplicationService') private userApplicationService: UserApplicationService,
    @inject('ILogger') private logger: ILogger
  ) {
    this.logger = this.logger.child({ useCase: 'DeleteUserUseCase' });
  }

  async execute(request: DeleteUserRequest): Promise<Result<DeleteUserResponse, ApplicationError>> {
    this.logger.info('Removing user', { userId: request.userId });

    try {
      // Delegate user deletion to UserApplicationService
      const result = await this.userApplicationService.deleteUser(
        request.currentUserId,
        request.userId
      );
      
      if (result.isErr()) {
        this.logger.warn('User deletion failed', { 
          userId: request.userId, 
          error: result.unwrapErr().message 
        });
        return result;
      }

      this.logger.info('User removed successfully', { userId: request.userId });
      return Result.Ok({ 
        success: true, 
        message: 'User deleted successfully' 
      });
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { userId: request.userId });
      return Result.Err(new ApplicationError(
        'DeleteUserUseCase.execute',
        error instanceof Error ? error.message : 'Failed to remove user',
        { userId: request.userId }
      ));
    }
  }
}