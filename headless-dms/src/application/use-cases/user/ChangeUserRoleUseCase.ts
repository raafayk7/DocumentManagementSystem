import { injectable, inject } from 'tsyringe';
import { Result } from '@carbonteq/fp';
import { UserApplicationService } from '../../services/UserApplicationService.js';
import type { ILogger } from '../../../domain/interfaces/ILogger.js';
import type { ChangeUserRoleRequest, ChangeUserRoleResponse } from '../../dto/user/index.js';
import { ApplicationError } from '../../errors/ApplicationError.js';

@injectable()
export class ChangeUserRoleUseCase {
  constructor(
    @inject('UserApplicationService') private userApplicationService: UserApplicationService,
    @inject('ILogger') private logger: ILogger
  ) {
    this.logger = this.logger.child({ useCase: 'ChangeUserRoleUseCase' });
  }

  async execute(request: ChangeUserRoleRequest): Promise<Result<ChangeUserRoleResponse, ApplicationError>> {
    this.logger.info('Changing user role', { userId: request.userId, newRole: request.newRole });

    try {
      // Delegate role change to UserApplicationService
      const userResult = await this.userApplicationService.changeUserRole(
        request.currentUserId,
        request.userId,
        request.newRole
      );
      
      if (userResult.isErr()) {
        this.logger.warn('Role change failed', { 
          userId: request.userId, 
          error: userResult.unwrapErr().message 
        });
        return userResult;
      }

      // Return response DTO
      const response: ChangeUserRoleResponse = {
        success: true,
        message: 'Role changed successfully',
      };

      this.logger.info('User role changed successfully', { userId: request.userId, newRole: request.newRole });
      return Result.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { userId: request.userId });
      return Result.Err(new ApplicationError(
        'ChangeUserRoleUseCase.execute',
        error instanceof Error ? error.message : 'Failed to change role',
        { userId: request.userId, newRole: request.newRole }
      ));
    }
  }
}