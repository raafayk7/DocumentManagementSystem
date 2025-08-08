import { injectable, inject } from 'tsyringe';
import { Result } from '@carbonteq/fp';
import type { IUserRepository } from '../../../auth/repositories/user.repository.interface.js';
import type { ILogger } from '../../../infrastructure/interfaces/ILogger.js';
import type { ChangeUserRoleRequest, ChangeUserRoleResponse } from '../../dto/user/index.js';
import { ApplicationError } from '../../errors/ApplicationError.js';

@injectable()
export class ChangeUserRoleUseCase {
  constructor(
    @inject('IUserRepository') private userRepository: IUserRepository,
    @inject('ILogger') private logger: ILogger
  ) {
    this.logger = this.logger.child({ useCase: 'ChangeUserRoleUseCase' });
  }

  async execute(request: ChangeUserRoleRequest): Promise<Result<ChangeUserRoleResponse, ApplicationError>> {
    this.logger.info('Changing user role', { userId: request.userId, newRole: request.newRole });

    try {
      // 1. Find user by ID
      const user = await this.userRepository.findById(request.userId);
      if (!user) {
        this.logger.warn('User not found for role change', { userId: request.userId });
        return Result.Err(new ApplicationError(
          'ChangeUserRoleUseCase.userNotFound',
          'User not found',
          { userId: request.userId }
        ));
      }

      // 2. Use User entity's state-changing operation
      const updatedUserResult = user.changeRole(request.newRole);
      if (updatedUserResult.isErr()) {
        this.logger.warn('Role change failed - validation error', { 
          userId: request.userId, 
          error: updatedUserResult.unwrapErr() 
        });
        return Result.Err(new ApplicationError(
          'ChangeUserRoleUseCase.roleValidation',
          updatedUserResult.unwrapErr(),
          { userId: request.userId, newRole: request.newRole }
        ));
      }

      // 3. Save updated user
      const savedUser = await this.userRepository.saveUser(updatedUserResult.unwrap());
      
      // 4. Return response DTO
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