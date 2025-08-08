import { inject, injectable } from "tsyringe";
import { Result } from "@carbonteq/fp";
import type { IUserRepository } from "../../../auth/repositories/user.repository.interface.js";
import type { ILogger } from "../../../infrastructure/interfaces/ILogger.js";
import type { GetUserByIdRequest, GetUserByIdResponse } from "../../dto/user/index.js";
import { ApplicationError } from "../../errors/ApplicationError.js";

@injectable()
export class GetUserByIdUseCase {
  constructor(
    @inject("IUserRepository") private userRepository: IUserRepository,
    @inject("ILogger") private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'GetUserByIdUseCase' });
  }

  async execute(request: GetUserByIdRequest): Promise<Result<GetUserByIdResponse, ApplicationError>> {
    this.logger.info('Getting user by ID', { userId: request.userId });

    try {
      // 1. Find user by ID
      const user = await this.userRepository.findById(request.userId);
      if (!user) {
        this.logger.warn('User not found by ID', { userId: request.userId });
        return Result.Err(new ApplicationError(
          'GetUserByIdUseCase.userNotFound',
          'User not found',
          { userId: request.userId }
        ));
      }

      // 2. Transform to response DTO
      const response: GetUserByIdResponse = {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
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