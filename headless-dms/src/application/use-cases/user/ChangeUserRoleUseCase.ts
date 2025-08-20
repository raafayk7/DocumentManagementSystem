import { injectable, inject } from 'tsyringe';
import { AppResult } from '@carbonteq/hexapp';
import { ChangeUserRoleRequest, ChangeUserRoleResponse } from '../../../shared/dto/user/index.js';
import type { IUserApplicationService } from '../../../ports/input/IUserApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';
import { ApplicationError } from '../../../shared/errors/ApplicationError.js';

@injectable()
export class ChangeUserRoleUseCase {
  constructor(
    @inject('IUserApplicationService') private userApplicationService: IUserApplicationService,
    @inject('ILogger') private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'ChangeUserRoleUseCase' });
  }

  async execute(request: ChangeUserRoleRequest): Promise<AppResult<ChangeUserRoleResponse>> {
    this.logger.info('Changing user role', { 
      currentUserId: request.currentUserId, 
      targetUserId: request.userId, 
      newRole: request.newRole 
    });

    try {
      const updatedUser = await this.userApplicationService.changeUserRole(
        request.currentUserId,
        request.userId,
        request.newRole
      );

      if (updatedUser.isErr()) {
        this.logger.warn('Failed to change user role', { 
          currentUserId: request.currentUserId, 
          targetUserId: request.userId, 
          error: updatedUser.unwrapErr().message 
        });
        return AppResult.Err(new ApplicationError(
          'ChangeUserRoleUseCase.roleChangeFailed',
          'Failed to change user role',
          { currentUserId: request.currentUserId, targetUserId: request.userId, newRole: request.newRole }
        ));
      }

      const user = updatedUser.unwrap();
      const response: ChangeUserRoleResponse = {
        success: true,
        message: 'User role changed successfully'
      };
      
      this.logger.info('User role changed successfully', { 
        currentUserId: request.currentUserId, 
        targetUserId: request.userId, 
        newRole: request.newRole 
      });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error('Unexpected error during role change', { 
        currentUserId: request.currentUserId, 
        targetUserId: request.userId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return AppResult.Err(new ApplicationError(
        'ChangeUserRoleUseCase.unexpectedError',
        'Unexpected error during role change',
        { currentUserId: request.currentUserId, targetUserId: request.userId, newRole: request.newRole }
      ));
    }
  }
}