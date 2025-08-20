import { injectable, inject } from 'tsyringe';
import { AppResult } from '@carbonteq/hexapp';
import { ChangeUserPasswordRequest, ChangeUserPasswordResponse } from '../../../shared/dto/user/index.js';
import type { IUserApplicationService } from '../../../ports/input/IUserApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';
import { ApplicationError } from '../../../shared/errors/ApplicationError.js';

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
      const userResult = await this.userApplicationService.changeUserPassword(
        request.userId, 
        request.currentPassword, 
        request.newPassword
      );
      
      if (userResult.isErr()) {
        this.logger.warn('User password change failed', { userId: request.userId });
        return AppResult.Err(new ApplicationError(
          'ChangeUserPasswordUseCase.passwordChangeFailed',
          'Password change failed',
          { userId: request.userId }
        ));
      }

      const user = userResult.unwrap();
      const response: ChangeUserPasswordResponse = {
        success: true,
        message: 'Password changed successfully'
      };

      this.logger.info('User password changed successfully', { userId: user.id });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { userId: request.userId });
      return AppResult.Err(new ApplicationError(
        'ChangeUserPasswordUseCase.execute',
        error instanceof Error ? error.message : 'Failed to execute change user password use case',
        { userId: request.userId }
      ));
    }
  }
}