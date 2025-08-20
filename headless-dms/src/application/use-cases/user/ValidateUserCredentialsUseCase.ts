import { injectable, inject } from 'tsyringe';
import { AppResult } from '@carbonteq/hexapp';
import { ValidateUserCredentialsRequest, ValidateUserCredentialsResponse } from '../../../shared/dto/user/index.js';
import type { IUserApplicationService } from '../../../ports/input/IUserApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';
import { ApplicationError } from '../../../shared/errors/ApplicationError.js';

@injectable()
export class ValidateUserCredentialsUseCase {
  constructor(
    @inject('IUserApplicationService') private userApplicationService: IUserApplicationService,
    @inject('ILogger') private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'ValidateUserCredentialsUseCase' });
  }

  async execute(request: ValidateUserCredentialsRequest): Promise<AppResult<ValidateUserCredentialsResponse>> {
    this.logger.info('Validating user credentials', { email: request.email });

    try {
      const isValid = await this.userApplicationService.validateUserCredentials(request.email, request.password);
      
      if (isValid.isErr()) {
        this.logger.warn('Failed to validate user credentials', { email: request.email, error: isValid.unwrapErr().message });
        return AppResult.Err(new ApplicationError(
          'ValidateUserCredentialsUseCase.validationFailed',
          'Failed to validate user credentials',
          { email: request.email }
        ));
      }

      // For now, we'll return a simple response since we don't have the full user data
      // The DTO expects { isValid: boolean, user: UserResponse } but we only have isValid
      const response: ValidateUserCredentialsResponse = {
        isValid: isValid.unwrap(),
        user: null as any // This is a temporary fix - ideally we'd return the user data
      };
      
      this.logger.info('User credentials validated successfully', { email: request.email, isValid: response.isValid });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error('Unexpected error during credential validation', { 
        email: request.email, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return AppResult.Err(new ApplicationError(
        'ValidateUserCredentialsUseCase.unexpectedError',
        'Unexpected error during credential validation',
        { email: request.email }
      ));
    }
  }
} 