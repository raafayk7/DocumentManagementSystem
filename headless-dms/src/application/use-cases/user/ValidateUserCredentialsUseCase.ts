import { inject, injectable } from "tsyringe";
import { Result } from "@carbonteq/fp";
import { AuthApplicationService } from "../../services/AuthApplicationService.js";
import type { ILogger } from "../../../ports/output/ILogger.js";
import type { ValidateUserCredentialsRequest, ValidateUserCredentialsResponse } from "../../../shared/dto/user/index.js";
import { ApplicationError } from "../../../shared/errors/ApplicationError.js";

@injectable()
export class ValidateUserCredentialsUseCase {
  constructor(
    @inject("AuthApplicationService") private authApplicationService: AuthApplicationService,
    @inject("ILogger") private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'ValidateUserCredentialsUseCase' });
  }

  async execute(request: ValidateUserCredentialsRequest): Promise<Result<ValidateUserCredentialsResponse, ApplicationError>> {
    this.logger.info('Validating user credentials', { email: request.email });

    try {
      // Delegate credential validation to AuthApplicationService
      const isValidResult = await this.authApplicationService.validateUserCredentials(request.email, request.password);
      
      if (isValidResult.isErr()) {
        this.logger.warn('Credential validation failed', { 
          email: request.email, 
          error: isValidResult.unwrapErr().message 
        });
        return isValidResult;
      }

      const isValid = isValidResult.unwrap();
      
      if (!isValid) {
        this.logger.warn('Invalid credentials provided', { email: request.email });
        return Result.Err(new ApplicationError(
          'ValidateUserCredentialsUseCase.invalidCredentials',
          'Invalid credentials',
          { email: request.email }
        ));
      }

      // Get user details for response
      const userResult = await this.authApplicationService.authenticateUser(request.email, request.password);
      if (userResult.isErr()) {
        this.logger.error('Failed to get user after credential validation', { email: request.email });
        return Result.Err(new ApplicationError(
          'ValidateUserCredentialsUseCase.userRetrievalFailed',
          'Failed to retrieve user details',
          { email: request.email }
        ));
      }

      const user = userResult.unwrap();

      // 3. Return response DTO
      const response: ValidateUserCredentialsResponse = {
        isValid: true,
        user: {
          id: user.id,
          email: user.email.value,
          role: user.role.value,
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