import { injectable, inject } from 'tsyringe';
import { Result } from '@carbonteq/fp';
import type { IAuthHandler } from '../../../../ports/output/IAuthHandler.js';
import type { IAuthStrategy } from '../../../../ports/output/IAuthStrategy.js';
import type { IUserRepository } from '../../database/interfaces/user.repository.interface.js';
import type { ILogger } from '../../../../ports/output/ILogger.js';
import { AuthError } from '../../../../shared/errors/index.js';
import { User } from '../../../../domain/entities/User.js';
import { 
  LoginCredentials, 
  RegisterData, 
  DecodedToken, 
  AuthResult 
} from '../../../../ports/output/IAuthHandler.js';

@injectable()
export class AuthHandler implements IAuthHandler {
  constructor(
    @inject('IAuthStrategy') private authStrategy: IAuthStrategy,
    @inject('IUserRepository') private userRepository: IUserRepository,
    @inject('ILogger') private logger: ILogger
  ) {
    this.logger = this.logger.child({ service: 'AuthHandler' });
  }

  async login(credentials: LoginCredentials): Promise<Result<AuthResult, AuthError>> {
    this.logger.info('Authentication attempt', { 
      email: credentials.email, 
      strategy: this.authStrategy.getStrategyName() 
    });
    
    try {
      const result = await this.authStrategy.authenticate(credentials);
      
      if (result.isOk()) {
        this.logger.info('Authentication successful', { 
          userId: result.unwrap().user.id, 
          email: result.unwrap().user.email 
        });
      } else {
        this.logger.warn('Authentication failed', { 
          email: credentials.email, 
          error: result.unwrapErr().message 
        });
      }
      
      return result;
    } catch (error) {
      this.logger.logError(error as Error, { email: credentials.email });
      return Result.Err(new AuthError(
        'AuthHandler.login',
        error instanceof Error ? error.message : 'Authentication failed',
        { email: credentials.email }
      ));
    }
  }

  async register(userData: RegisterData): Promise<Result<User, AuthError>> {
    this.logger.info('Registration attempt', { 
      email: userData.email, 
      strategy: this.authStrategy.getStrategyName() 
    });
    
    try {
      const result = await this.authStrategy.register(userData);
      
      if (result.isOk()) {
        this.logger.info('Registration successful', { 
          userId: result.unwrap().user.id, 
          email: result.unwrap().user.email 
        });
        return Result.Ok(result.unwrap().user);
      } else {
        this.logger.warn('Registration failed', { 
          email: userData.email, 
          error: result.unwrapErr().message 
        });
        return Result.Err(result.unwrapErr());
      }
    } catch (error) {
      this.logger.logError(error as Error, { email: userData.email });
      return Result.Err(new AuthError(
        'AuthHandler.register',
        error instanceof Error ? error.message : 'Registration failed',
        { email: userData.email }
      ));
    }
  }

  async validateToken(token: string): Promise<Result<DecodedToken, AuthError>> {
    this.logger.debug('Token validation attempt', { 
      strategy: this.authStrategy.getStrategyName() 
    });
    
    try {
      const result = await this.authStrategy.verifyToken(token);
      
      if (result.isOk()) {
        this.logger.debug('Token validation successful', { 
          userId: result.unwrap().sub 
        });
      } else {
        this.logger.warn('Token validation failed', { 
          error: result.unwrapErr().message 
        });
      }
      
      return result;
    } catch (error) {
      this.logger.logError(error as Error, { token: token.substring(0, 20) + '...' });
      return Result.Err(new AuthError(
        'AuthHandler.validateToken',
        error instanceof Error ? error.message : 'Token validation failed',
        { token: token.substring(0, 20) + '...' }
      ));
    }
  }

  async refreshToken(token: string): Promise<Result<string, AuthError>> {
    this.logger.info('Token refresh attempt', { 
      strategy: this.authStrategy.getStrategyName() 
    });
    
    try {
      const result = await this.authStrategy.refreshToken(token);
      
      if (result.isOk()) {
        this.logger.info('Token refresh successful');
      } else {
        this.logger.warn('Token refresh failed', { 
          error: result.unwrapErr().message 
        });
      }
      
      return result;
    } catch (error) {
      this.logger.logError(error as Error, { token: token.substring(0, 20) + '...' });
      return Result.Err(new AuthError(
        'AuthHandler.refreshToken',
        error instanceof Error ? error.message : 'Token refresh failed',
        { token: token.substring(0, 20) + '...' }
      ));
    }
  }

  async logout(token: string): Promise<Result<void, AuthError>> {
    this.logger.info('Logout attempt', { 
      strategy: this.authStrategy.getStrategyName() 
    });
    
    try {
      const result = await this.authStrategy.invalidateToken(token);
      
      if (result.isOk()) {
        this.logger.info('Logout successful');
      } else {
        this.logger.warn('Logout failed', { 
          error: result.unwrapErr().message 
        });
      }
      
      return result;
    } catch (error) {
      this.logger.logError(error as Error, { token: token.substring(0, 20) + '...' });
      return Result.Err(new AuthError(
        'AuthHandler.logout',
        error instanceof Error ? error.message : 'Logout failed',
        { token: token.substring(0, 20) + '...' }
      ));
    }
  }

  async changeUserPassword(userId: string, newPassword: string): Promise<Result<User, AuthError>> {
    this.logger.info('Password change attempt', { 
      userId, 
      strategy: this.authStrategy.getStrategyName() 
    });
    
    try {
      // Find user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.warn('Password change failed - user not found', { userId });
        return Result.Err(new AuthError(
          'AuthHandler.changeUserPassword.userNotFound',
          'User not found',
          { userId }
        ));
      }

      // Change password using entity method
      const updatedUser = await user.changePassword(newPassword);
      if (updatedUser.isErr()) {
        this.logger.warn('Password change failed - validation error', { 
          userId, 
          error: updatedUser.unwrapErr() 
        });
        return Result.Err(new AuthError(
          'AuthHandler.changeUserPassword.validation',
          updatedUser.unwrapErr(),
          { userId }
        ));
      }

      // Save updated user
      const savedUser = await this.userRepository.saveUser(updatedUser.unwrap());
      
      this.logger.info('Password change successful', { userId });
      return Result.Ok(savedUser);
    } catch (error) {
      this.logger.logError(error as Error, { userId });
      return Result.Err(new AuthError(
        'AuthHandler.changeUserPassword',
        error instanceof Error ? error.message : 'Password change failed',
        { userId }
      ));
    }
  }

  async changeUserRole(userId: string, newRole: 'user' | 'admin'): Promise<Result<User, AuthError>> {
    this.logger.info('Role change attempt', { 
      userId, 
      newRole,
      strategy: this.authStrategy.getStrategyName() 
    });
    
    try {
      // Find user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.warn('Role change failed - user not found', { userId });
        return Result.Err(new AuthError(
          'AuthHandler.changeUserRole.userNotFound',
          'User not found',
          { userId }
        ));
      }

      // Change role using entity method
      const updatedUser = user.changeRole(newRole);
      if (updatedUser.isErr()) {
        this.logger.warn('Role change failed - validation error', { 
          userId, 
          newRole,
          error: updatedUser.unwrapErr() 
        });
        return Result.Err(new AuthError(
          'AuthHandler.changeUserRole.validation',
          updatedUser.unwrapErr(),
          { userId, newRole }
        ));
      }

      // Save updated user
      const savedUser = await this.userRepository.saveUser(updatedUser.unwrap());
      
      this.logger.info('Role change successful', { userId, newRole });
      return Result.Ok(savedUser);
    } catch (error) {
      this.logger.logError(error as Error, { userId, newRole });
      return Result.Err(new AuthError(
        'AuthHandler.changeUserRole',
        error instanceof Error ? error.message : 'Role change failed',
        { userId, newRole }
      ));
    }
  }

  getStrategyName(): string {
    return this.authStrategy.getStrategyName();
  }
} 