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

  async execute(targetUserId: string, request: ChangeUserPasswordRequest): Promise<AppResult<ChangeUserPasswordResponse>> {
    this.logger.info('Executing change user password use case', { userId: targetUserId });

    try {
      const passwordChangeResult = await this.userApplicationService.changeUserPassword(
        targetUserId,
        request.currentPassword,
        request.newPassword
      );
      
      if (passwordChangeResult.isErr()) {
        const error = passwordChangeResult.unwrapErr();
        this.logger.warn('User password change failed', { userId: targetUserId });
        // Preserve the original error message instead of wrapping it
        return AppResult.Err(error);
      }

      const response: ChangeUserPasswordResponse = {
        success: true,
        message: 'Password changed successfully'
      };

      this.logger.info('User password changed successfully', { userId: targetUserId });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { userId: targetUserId });
      // Preserve the original error message instead of wrapping it
      return AppResult.Err(error instanceof Error ? error : new Error('Unknown error'));
    }
  }
}