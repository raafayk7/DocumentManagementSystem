import { inject, injectable } from "tsyringe";
import { Result } from "@carbonteq/fp";
import { UserApplicationService } from "../../services/UserApplicationService.js";
import type { ILogger } from "../../../infrastructure/interfaces/ILogger.js";
import type { GetUserByEmailRequest, GetUserByEmailResponse } from "../../dto/user/index.js";
import { ApplicationError } from "../../errors/ApplicationError.js";

@injectable()
export class GetUserByEmailUseCase {
  constructor(
    @inject("UserApplicationService") private userApplicationService: UserApplicationService,
    @inject("ILogger") private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'GetUserByEmailUseCase' });
  }

  async execute(request: GetUserByEmailRequest): Promise<Result<GetUserByEmailResponse, ApplicationError>> {
    this.logger.info('Getting user by email', { email: request.email });

    try {
      // Delegate to UserApplicationService
      const userResult = await this.userApplicationService.getUserByEmail(request.email);
      
      if (userResult.isErr()) {
        this.logger.warn('User not found by email', { email: request.email });
        return userResult;
      }

      const user = userResult.unwrap();

      // 2. Transform to response DTO
      const response: GetUserByEmailResponse = {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      };

      this.logger.info('User retrieved by email successfully', { email: request.email });
      return Result.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { email: request.email });
      return Result.Err(new ApplicationError(
        'GetUserByEmailUseCase.execute',
        error instanceof Error ? error.message : 'Failed to get user by email',
        { email: request.email }
      ));
    }
  }
} 