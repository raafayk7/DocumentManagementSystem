import { injectable, inject } from 'tsyringe';
import { Result } from '@carbonteq/fp';
import { UserApplicationService } from '../../services/UserApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';
import type { ChangeUserPasswordRequest, ChangeUserPasswordResponse } from '../../../shared/dto/user/index.js';
import { ApplicationError } from '../../../shared/errors/ApplicationError.js';

@injectable()
export class ChangeUserPasswordUseCase {
  constructor(
    @inject('UserApplicationService') private userApplicationService: UserApplicationService,
    @inject('ILogger') private logger: ILogger
  ) {
    this.logger = this.logger.child({ useCase: 'ChangeUserPasswordUseCase' });
  }

  async execute(request: ChangeUserPasswordRequest): Promise<Result<ChangeUserPasswordResponse, ApplicationError>> {
    this.logger.info('Changing user password', { userId: request.userId });

    try {
      // Delegate password change to UserApplicationService
      const userResult = await this.userApplicationService.changeUserPassword(
        request.userId,
        request.currentPassword,
        request.newPassword
      );
      
      if (userResult.isErr()) {
        this.logger.warn('Password change failed', { 
          userId: request.userId, 
          error: userResult.unwrapErr().message 
        });
        return userResult;
      }

      // Return response DTO
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