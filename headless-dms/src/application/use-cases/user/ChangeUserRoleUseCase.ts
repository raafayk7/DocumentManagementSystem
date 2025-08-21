import { injectable, inject } from 'tsyringe';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { ChangeUserRoleRequest, ChangeUserRoleResponse } from '../../../shared/dto/user/index.js';
import type { IUserApplicationService } from '../../../ports/input/IUserApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';

@injectable()
export class ChangeUserRoleUseCase {
  constructor(
    @inject('IUserApplicationService') private userApplicationService: IUserApplicationService,
    @inject('ILogger') private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'ChangeUserRoleUseCase' });
  }

  async execute(request: ChangeUserRoleRequest): Promise<AppResult<ChangeUserRoleResponse>> {
    this.logger.info('Executing change user role use case', { 
      currentUserId: request.currentUserId, 
      userId: request.userId, 
      newRole: request.newRole 
    });

    try {
      const userResult = await this.userApplicationService.changeUserRole(
        request.currentUserId,
        request.userId,
        request.newRole
      );
      
      if (userResult.isErr()) {
        this.logger.warn('User role change failed', { 
          currentUserId: request.currentUserId, 
          userId: request.userId, 
          newRole: request.newRole 
        });
        return AppResult.Err(AppError.InvalidOperation(
          `User role change failed for user ID: ${request.userId} to role: ${request.newRole}`
        ));
      }

      const user = userResult.unwrap();
      const response: ChangeUserRoleResponse = {
        success: true,
        message: `User role changed successfully to ${request.newRole}`
      };

      this.logger.info('User role changed successfully', { 
        userId: user.id, 
        oldRole: user.role.value, 
        newRole: request.newRole 
      });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { 
        currentUserId: request.currentUserId, 
        userId: request.userId, 
        newRole: request.newRole 
      });
      return AppResult.Err(AppError.Generic(
        `Failed to execute change user role use case for user ID: ${request.userId}`
      ));
    }
  }
}