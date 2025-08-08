import { injectable, inject } from 'tsyringe';
import { Result } from '@carbonteq/fp';
import { User } from '../../../domain/entities/User.js';
import { UserValidator } from '../../../domain/validators/UserValidator.js';
import { EmailValidator } from '../../../domain/validators/EmailValidator.js';
import type { IUserRepository } from '../../../auth/repositories/user.repository.interface.js';
import type { ILogger } from '../../../infrastructure/interfaces/ILogger.js';
import type { CreateUserRequest, UserResponse } from '../../dto/user/index.js';
import { ApplicationError } from '../../errors/ApplicationError.js';

@injectable()
export class CreateUserUseCase {
  constructor(
    @inject('IUserRepository') private userRepository: IUserRepository,
    @inject('ILogger') private logger: ILogger,
    @inject('EmailValidator') private emailValidator: EmailValidator
  ) {
    this.logger = this.logger.child({ useCase: 'CreateUserUseCase' });
  }

  async execute(request: CreateUserRequest): Promise<Result<UserResponse, ApplicationError>> {
    this.logger.info('User registration attempt', { email: request.email, role: request.role });
    
    try {
      // 1. Validate email format
      const emailValidation = this.emailValidator.validate(request.email);
      if (emailValidation.isErr()) {
        this.logger.warn('User registration failed - email validation error', { email: request.email });
        return Result.Err(new ApplicationError(
          'CreateUserUseCase.emailValidation',
          emailValidation.unwrapErr(),
          { email: request.email }
        ));
      }

      // 2. Check email uniqueness
      const emailExists = await this.userRepository.exists({ email: request.email });
      if (emailExists) {
        this.logger.warn('User registration failed - email already exists', { email: request.email });
        return Result.Err(new ApplicationError(
          'CreateUserUseCase.emailExists',
          'Email already in use',
          { email: request.email }
        ));
      }

      // 3. Validate password
      const passwordValidation = UserValidator.validatePassword(request.password);
      if (passwordValidation.isErr()) {
        this.logger.warn('User creation failed - password validation error', { 
          email: request.email, 
          error: passwordValidation.unwrapErr() 
        });
        return Result.Err(new ApplicationError(
          'CreateUserUseCase.passwordValidation',
          passwordValidation.unwrapErr(),
          { email: request.email }
        ));
      }

      // 4. Validate role
      const roleValidation = UserValidator.validateRole(request.role);
      if (roleValidation.isErr()) {
        this.logger.warn('User creation failed - role validation error', { 
          email: request.email,
          error: roleValidation.unwrapErr() 
        });
        return Result.Err(new ApplicationError(
          'CreateUserUseCase.roleValidation',
          roleValidation.unwrapErr(),
          { email: request.email, role: request.role }
        ));
      }

      // 5. Create user entity (domain logic)
      const userResult = await User.create(request.email, request.password, request.role);
      if (userResult.isErr()) {
        this.logger.warn('User creation failed - entity creation error', { 
          email: request.email,
          error: userResult.unwrapErr() 
        });
        return Result.Err(new ApplicationError(
          'CreateUserUseCase.entityCreation',
          userResult.unwrapErr(),
          { email: request.email }
        ));
      }

      const user = userResult.unwrap();
      
      // 6. Save user to repository
      const savedUser = await this.userRepository.saveUser(user);
      
      // 7. Return response DTO
      const userResponse: UserResponse = {
        id: savedUser.id,
        email: savedUser.email,
        role: savedUser.role,
        createdAt: savedUser.createdAt,
        updatedAt: savedUser.updatedAt,
      };

      this.logger.info('User registered successfully', { userId: savedUser.id, email: savedUser.email });
      return Result.Ok(userResponse);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { email: request.email });
      return Result.Err(new ApplicationError(
        'CreateUserUseCase.execute',
        error instanceof Error ? error.message : 'Failed to create user',
        { email: request.email, role: request.role }
      ));
    }
  }
}
