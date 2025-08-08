import { injectable, inject } from 'tsyringe';
import { Result } from '@carbonteq/fp';
import type { IUserRepository } from '../../../auth/repositories/user.repository.interface.js';
import type { ILogger } from '../../../infrastructure/interfaces/ILogger.js';
import type { AuthenticateUserRequest, AuthenticateUserResponse } from '../../dto/user/index.js';
import { ApplicationError } from '../../errors/ApplicationError.js';

@injectable()
export class AuthenticateUserUseCase {
  constructor(
    @inject('IUserRepository') private userRepository: IUserRepository,
    @inject('ILogger') private logger: ILogger
  ) {
    this.logger = this.logger.child({ useCase: 'AuthenticateUserUseCase' });
  }

  async execute(request: AuthenticateUserRequest): Promise<Result<AuthenticateUserResponse, ApplicationError>> {
    this.logger.info('User login attempt', { email: request.email });
    
    try {
      // 1. Find user by email
      const user = await this.userRepository.findOne({ email: request.email });
      if (!user) {
        this.logger.warn('Login failed - user not found', { email: request.email });
        return Result.Err(new ApplicationError(
          'AuthenticateUserUseCase.findUser',
          'User not found',
          { email: request.email }
        ));
      }
  
      // 2. Verify password using domain entity
      const isMatch = await user.verifyPassword(request.password);
      if (!isMatch) {
        this.logger.warn('Login failed - invalid password', { email: request.email });
        return Result.Err(new ApplicationError(
          'AuthenticateUserUseCase.validatePassword',
          'Invalid password',
          { email: request.email }
        ));
      }
  
      // 3. Generate authentication response (token generation will be handled by infrastructure)
      const authResponse: AuthenticateUserResponse = {
        token: '', // Will be set by infrastructure layer
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      };

      this.logger.info('User authenticated successfully', { userId: user.id, email: user.email });
      return Result.Ok(authResponse);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { email: request.email });
      return Result.Err(new ApplicationError(
        'AuthenticateUserUseCase.execute',
        error instanceof Error ? error.message : 'Failed to authenticate user',
        { email: request.email }
      ));
    }
  }
}
