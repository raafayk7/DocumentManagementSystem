import { inject, injectable } from "tsyringe";
import { Result } from "@carbonteq/fp";
import type { IUserRepository } from "../../../auth/repositories/user.repository.interface.js";
import type { ILogger } from "../../../infrastructure/interfaces/ILogger.js";
import type { GetUsersByRoleRequest, GetUsersByRoleResponse } from "../../dto/user/index.js";
import { ApplicationError } from "../../errors/ApplicationError.js";

@injectable()
export class GetUsersByRoleUseCase {
  constructor(
    @inject("IUserRepository") private userRepository: IUserRepository,
    @inject("ILogger") private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'GetUsersByRoleUseCase' });
  }

  async execute(request: GetUsersByRoleRequest): Promise<Result<GetUsersByRoleResponse, ApplicationError>> {
    this.logger.info('Getting users by role', { role: request.role });

    try {
      // 1. Get users by role from repository
      const users = await this.userRepository.findByRole(request.role);

      // 2. Transform to response DTOs
      const userResponses = users.map(user => ({
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));

      // 3. Build response
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