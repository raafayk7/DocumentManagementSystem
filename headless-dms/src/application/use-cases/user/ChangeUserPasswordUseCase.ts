import { injectable, inject } from 'tsyringe';
import { Result } from '@carbonteq/fp';
import type { IUserRepository } from '../../../auth/repositories/user.repository.interface.js';
import type { ILogger } from '../../../infrastructure/interfaces/ILogger.js';
import type { ChangeUserPasswordRequest, ChangeUserPasswordResponse } from '../../dto/user/index.js';
import { ApplicationError } from '../../errors/ApplicationError.js';

@injectable()
export class ChangeUserPasswordUseCase {
  constructor(
    @inject('IUserRepository') private userRepository: IUserRepository,
    @inject('ILogger') private logger: ILogger
  ) {
    this.logger = this.logger.child({ useCase: 'ChangeUserPasswordUseCase' });
  }

  async execute(request: ChangeUserPasswordRequest): Promise<Result<ChangeUserPasswordResponse, ApplicationError>> {
    this.logger.info('Changing user password', { userId: request.userId });

    try {
      // 1. Find user by ID
      const user = await this.userRepository.findById(request.userId);
      if (!user) {
        this.logger.warn('User not found for password change', { userId: request.userId });
        return Result.Err(new ApplicationError(
          'ChangeUserPasswordUseCase.userNotFound',
          'User not found',
          { userId: request.userId }
        ));
      }

      // 2. Use User entity's state-changing operation
      const updatedUserResult = await user.changePassword(request.newPassword);
      if (updatedUserResult.isErr()) {
        this.logger.warn('Password change failed - validation error', { 
          userId: request.userId, 
          error: updatedUserResult.unwrapErr() 
        });
        return Result.Err(new ApplicationError(
          'ChangeUserPasswordUseCase.passwordValidation',
          updatedUserResult.unwrapErr(),
          { userId: request.userId }
        ));
      }

      // 3. Save updated user
      const savedUser = await this.userRepository.saveUser(updatedUserResult.unwrap());
      
      // 4. Return response DTO
      const response: ChangeUserPasswordResponse = {
        success: true,
        message: 'Password changed successfully',
      };

      this.logger.info('User password changed successfully', { userId: request.userId });
      return Result.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { userId: request.userId });
      return Result.Err(new ApplicationError(
        'ChangeUserPasswordUseCase.execute',
        error instanceof Error ? error.message : 'Failed to change password',
        { userId: request.userId }
      ));
    }
  }
}