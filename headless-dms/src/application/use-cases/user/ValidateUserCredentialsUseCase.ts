import { injectable, inject } from 'tsyringe';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { ValidateUserCredentialsRequest, ValidateUserCredentialsResponse } from '../../../shared/dto/user/index.js';
import type { IUserApplicationService } from '../../../ports/input/IUserApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';

@injectable()
export class ValidateUserCredentialsUseCase {
  constructor(
    @inject('IUserApplicationService') private userApplicationService: IUserApplicationService,
    @inject('ILogger') private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'ValidateUserCredentialsUseCase' });
  }

  async execute(request: ValidateUserCredentialsRequest): Promise<AppResult<ValidateUserCredentialsResponse>> {
    this.logger.info('Executing validate user credentials use case', { email: request.email });

    try {
      const validationResult = await this.userApplicationService.validateUserCredentials(
        request.email,
        request.password
      );
      
      if (validationResult.isErr()) {
        this.logger.warn('User credentials validation failed', { email: request.email });
        return AppResult.Err(AppError.Unauthorized(
          `Credentials validation failed for email: ${request.email}`
        ));
      }

      const isValid = validationResult.unwrap();
      const response: ValidateUserCredentialsResponse = {
        isValid,
      };

      this.logger.info('User credentials validation completed', { 
        email: request.email, 
        isValid 
      });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { email: request.email });
      return AppResult.Err(AppError.Generic(
        `Failed to execute validate user credentials use case for email: ${request.email}`
      ));
    }
  }
} 