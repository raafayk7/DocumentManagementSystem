import { inject, injectable } from "tsyringe";
import { Result } from "@carbonteq/fp";
import { UserApplicationService } from "../../services/UserApplicationService.js";
import type { ILogger } from "../../../infrastructure/interfaces/ILogger.js";
import type { GetUsersByRoleRequest, GetUsersByRoleResponse } from "../../dto/user/index.js";
import { ApplicationError } from "../../errors/ApplicationError.js";

@injectable()
export class GetUsersByRoleUseCase {
  constructor(
    @inject("UserApplicationService") private userApplicationService: UserApplicationService,
    @inject("ILogger") private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'GetUsersByRoleUseCase' });
  }

  async execute(request: GetUsersByRoleRequest): Promise<Result<GetUsersByRoleResponse, ApplicationError>> {
    this.logger.info('Getting users by role', { role: request.role });

    try {
      // Delegate to UserApplicationService
      const usersResult = await this.userApplicationService.getUsersByRole(request.role);
      
      if (usersResult.isErr()) {
        this.logger.error('Failed to get users by role', { 
          role: request.role,
          error: usersResult.unwrapErr().message 
        });
        return usersResult;
      }

      const users = usersResult.unwrap();

      // Transform to response DTOs
      const userResponses = users.map(user => ({
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));

      // Build response
      const response: GetUsersByRoleResponse = {
        users: userResponses,
        total: users.length,
      };

      this.logger.info('Users retrieved by role successfully', { 
        role: request.role,
        count: users.length
      });
      return Result.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { role: request.role });
      return Result.Err(new ApplicationError(
        'GetUsersByRoleUseCase.execute',
        error instanceof Error ? error.message : 'Failed to get users by role',
        { role: request.role }
      ));
    }
  }
} 