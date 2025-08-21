import { injectable, inject } from 'tsyringe';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { ChangeUserPasswordRequest, ChangeUserPasswordResponse } from '../../../shared/dto/user/index.js';
import type { IUserApplicationService } from '../../../ports/input/IUserApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';

@injectable()
export class ChangeUserPasswordUseCase {
  constructor(
    @inject('IUserApplicationService') private userApplicationService: IUserApplicationService,
    @inject('ILogger') private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'ChangeUserPasswordUseCase' });
  }

  async execute(request: ChangeUserPasswordRequest): Promise<AppResult<ChangeUserPasswordResponse>> {
    this.logger.info('Executing change user password use case', { userId: request.userId });

    try {
      const passwordChangeResult = await this.userApplicationService.changeUserPassword(
        request.userId,
        request.currentPassword,
        request.newPassword
      );
      
      if (passwordChangeResult.isErr()) {
        this.logger.warn('User password change failed', { userId: request.userId });
        return AppResult.Err(AppError.InvalidOperation(
          `Password change failed for user ID: ${request.userId}`
        ));
      }

      const response: ChangeUserPasswordResponse = {
        success: true,
        message: 'Password changed successfully'
      };

      this.logger.info('User password changed successfully', { userId: request.userId });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { userId: request.userId });
      return AppResult.Err(AppError.Generic(
        `Failed to execute change user password use case for user ID: ${request.userId}`
      ));
    }
  }
}