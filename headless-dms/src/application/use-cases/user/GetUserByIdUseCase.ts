import { inject, injectable } from "tsyringe";
import { Result } from "@carbonteq/fp";
import { UserApplicationService } from "../../services/UserApplicationService.js";
import type { ILogger } from "../../../ports/output/ILogger.js";
import type { GetUserByIdRequest, GetUserByIdResponse } from "../../../shared/dto/user/index.js";
import { ApplicationError } from "../../../shared/errors/ApplicationError.js";

@injectable()
export class GetUserByIdUseCase {
  constructor(
    @inject("UserApplicationService") private userApplicationService: UserApplicationService,
    @inject("ILogger") private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'GetUserByIdUseCase' });
  }

  async execute(request: GetUserByIdRequest): Promise<Result<GetUserByIdResponse, ApplicationError>> {
    this.logger.info('Getting user by ID', { userId: request.userId });

    try {
      // Delegate to UserApplicationService
      const userResult = await this.userApplicationService.getUserById(request.userId);
      
      if (userResult.isErr()) {
        this.logger.warn('User not found by ID', { userId: request.userId });
        return userResult;
      }

      const user = userResult.unwrap();

      // 2. Transform to response DTO
      const response: GetUserByIdResponse = {
        user: {
          id: user.id,
          email: user.email.value,
          role: user.role.value,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      };

      this.logger.info('User retrieved by ID successfully', { userId: request.userId });
      return Result.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { userId: request.userId });
      return Result.Err(new ApplicationError(
        'GetUserByIdUseCase.execute',
        error instanceof Error ? error.message : 'Failed to get user by ID',
        { userId: request.userId }
      ));
    }
  }
} 