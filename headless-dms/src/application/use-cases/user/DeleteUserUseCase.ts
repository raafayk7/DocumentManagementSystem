import { injectable, inject } from 'tsyringe';
import { Result } from '@carbonteq/fp';
import type { IUserRepository } from '../../../auth/repositories/user.repository.interface.js';
import type { ILogger } from '../../../infrastructure/interfaces/ILogger.js';
import type { DeleteUserRequest, DeleteUserResponse } from '../../dto/user/index.js';
import { ApplicationError } from '../../errors/ApplicationError.js';

@injectable()
export class DeleteUserUseCase {
  constructor(
    @inject('IUserRepository') private userRepository: IUserRepository,
    @inject('ILogger') private logger: ILogger
  ) {
    this.logger = this.logger.child({ useCase: 'DeleteUserUseCase' });
  }

  async execute(request: DeleteUserRequest): Promise<Result<DeleteUserResponse, ApplicationError>> {
    this.logger.info('Removing user', { userId: request.userId });

    try {
      // 1. Check if user exists
      const user = await this.userRepository.findById(request.userId);
      if (!user) {
        this.logger.warn('User not found for deletion', { userId: request.userId });
        return Result.Err(new ApplicationError(
          'DeleteUserUseCase.userNotFound',
          'User not found',
          { userId: request.userId }
        ));
      }

      // 2. Delete user from repository
      const result = await this.userRepository.delete(request.userId);
      if (!result) {
        this.logger.warn('Failed to delete user', { userId: request.userId });
        return Result.Err(new ApplicationError(
          'DeleteUserUseCase.deleteFailed',
          'Failed to delete user',
          { userId: request.userId }
        ));
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