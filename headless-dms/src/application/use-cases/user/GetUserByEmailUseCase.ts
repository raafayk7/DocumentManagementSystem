import { inject, injectable } from "tsyringe";
import { Result } from "@carbonteq/fp";
import type { IUserRepository } from "../../../auth/repositories/user.repository.interface.js";
import type { ILogger } from "../../../infrastructure/interfaces/ILogger.js";
import type { GetUserByEmailRequest, GetUserByEmailResponse } from "../../dto/user/index.js";
import { ApplicationError } from "../../errors/ApplicationError.js";

@injectable()
export class GetUserByEmailUseCase {
  constructor(
    @inject("IUserRepository") private userRepository: IUserRepository,
    @inject("ILogger") private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'GetUserByEmailUseCase' });
  }

  async execute(request: GetUserByEmailRequest): Promise<Result<GetUserByEmailResponse, ApplicationError>> {
    this.logger.info('Getting user by email', { email: request.email });

    try {
      // 1. Find user by email
      const user = await this.userRepository.findByEmail(request.email);
      if (!user) {
        this.logger.warn('User not found by email', { email: request.email });
        return Result.Err(new ApplicationError(
          'GetUserByEmailUseCase.userNotFound',
          'User not found',
          { email: request.email }
        ));
      }

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