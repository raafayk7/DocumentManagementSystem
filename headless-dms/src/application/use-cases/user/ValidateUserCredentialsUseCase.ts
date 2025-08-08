import { inject, injectable } from "tsyringe";
import { Result } from "@carbonteq/fp";
import type { IUserRepository } from "../../../auth/repositories/user.repository.interface.js";
import type { ILogger } from "../../../infrastructure/interfaces/ILogger.js";
import type { ValidateUserCredentialsRequest, ValidateUserCredentialsResponse } from "../../dto/user/index.js";
import { ApplicationError } from "../../errors/ApplicationError.js";

@injectable()
export class ValidateUserCredentialsUseCase {
  constructor(
    @inject("IUserRepository") private userRepository: IUserRepository,
    @inject("ILogger") private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'ValidateUserCredentialsUseCase' });
  }

  async execute(request: ValidateUserCredentialsRequest): Promise<Result<ValidateUserCredentialsResponse, ApplicationError>> {
    this.logger.info('Validating user credentials', { email: request.email });

    try {
      // 1. Find user by email
      const user = await this.userRepository.findByEmail(request.email);
      if (!user) {
        this.logger.warn('User not found for credential validation', { email: request.email });
        return Result.Err(new ApplicationError(
          'ValidateUserCredentialsUseCase.userNotFound',
          'Invalid credentials',
          { email: request.email }
        ));
      }

      // 2. Verify password using domain entity
      const isValidPassword = await user.verifyPassword(request.password);
      if (!isValidPassword) {
        this.logger.warn('Invalid password for user', { email: request.email });
        return Result.Err(new ApplicationError(
          'ValidateUserCredentialsUseCase.invalidPassword',
          'Invalid credentials',
          { email: request.email }
        ));
      }

      // 3. Return response DTO
      const response: ValidateUserCredentialsResponse = {
        isValid: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      };

      this.logger.info('User credentials validated successfully', { email: request.email });
      return Result.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { email: request.email });
      return Result.Err(new ApplicationError(
        'ValidateUserCredentialsUseCase.execute',
        error instanceof Error ? error.message : 'Failed to validate user credentials',
        { email: request.email }
      ));
    }
  }
} 