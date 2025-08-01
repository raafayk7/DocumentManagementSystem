import { IUserRepository } from './repositories/user.repository.interface.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { User } from '../domain/entities/User.js';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { injectable, inject } from 'tsyringe';
import { ILogger } from '../common/services/logger.service.interface.js';
import { PaginationInput, PaginationOutput } from '../common/dto/pagination.dto.js';
import { Result } from '@carbonteq/fp';
import { AuthError } from '../common/errors/application.errors.js';

interface LoginResult {
  access_token: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@injectable()
export class AuthService {
  constructor(
    @inject('IUserRepository') private userRepository: IUserRepository,
    @inject('ILogger') private logger: ILogger
  ) {
    this.logger = this.logger.child({ service: 'AuthService' });
  }

  async register(registerDto: RegisterDto): Promise<Result<User, AuthError>> {
    this.logger.info('User registration attempt', { email: registerDto.email, role: registerDto.role });
    
    try {
      // Use User entity factory to create and validate user
      const userResult = await User.create(registerDto.email, registerDto.password, registerDto.role);
      if (userResult.isErr()) {
        this.logger.warn('User creation failed - validation error', { 
          email: registerDto.email, 
          error: userResult.unwrapErr() 
        });
        return Result.Err(new AuthError(
          'AuthService.register.validation',
          userResult.unwrapErr(),
          { email: registerDto.email, role: registerDto.role }
        ));
      }

      const user = userResult.unwrap();
      
      // Save the validated entity to repository
      const savedUser = await this.userRepository.saveUser(user);
      this.logger.info('User registered successfully', { userId: savedUser.id, email: savedUser.email });
      return Result.Ok(savedUser);
    } catch (error) {
      this.logger.logError(error as Error, { email: registerDto.email });
      return Result.Err(new AuthError(
        'AuthService.register',
        error instanceof Error ? error.message : 'Failed to save user',
        { email: registerDto.email, role: registerDto.role }
      ));
    }
  }

  async login(loginDto: LoginDto): Promise<Result<LoginResult, AuthError>> {
    this.logger.info('User login attempt', { email: loginDto.email });
    
    try {
      // Find user by email
      const user = await this.userRepository.findOne({ email: loginDto.email });
      if (!user) {
        this.logger.warn('Login failed - user not found', { email: loginDto.email });
        return Result.Err(new AuthError(
          'AuthService.login.findUser',
          'User not found',
          { email: loginDto.email }
        ));
      }
  
      // Use User entity's password verification
      const isMatch = await user.verifyPassword(loginDto.password);
      if (!isMatch) {
        this.logger.warn('Login failed - invalid password', { email: loginDto.email });
        return Result.Err(new AuthError(
          'AuthService.login.validatePassword',
          'Invalid password',
          { email: loginDto.email }
        ));
      }
  
      // Generate JWT
      const payload = { sub: user.id, email: user.email, role: user.role };
      const access_token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '1h' });
  
      this.logger.info('User logged in successfully', { userId: user.id, email: user.email });
      return Result.Ok({
        access_token,
        user: { id: user.id, email: user.email, role: user.role }
      });
    } catch (error) {
      this.logger.logError(error as Error, { email: loginDto.email });
      return Result.Err(new AuthError(
        'AuthService.login',
        error instanceof Error ? error.message : 'Login failed',
        { email: loginDto.email }
      ));
    }
  }

  async findAllUsers(query?: {
    email?: string;
    role?: string;
  }, pagination?: PaginationInput): Promise<Result<PaginationOutput<User>, AuthError>> {
    this.logger.debug('Finding users', { query, pagination });
    
    try {
      const result = await this.userRepository.find(query, pagination);
      this.logger.info('Users found', { 
        count: result.data.length, 
        total: result.pagination.total,
        page: result.pagination.page,
        totalPages: result.pagination.totalPages
      });
      return Result.Ok(result);
    } catch (error) {
      this.logger.logError(error as Error, { query, pagination });
      return Result.Err(new AuthError(
        'AuthService.findAllUsers',
        error instanceof Error ? error.message : 'Failed to find users',
        { query, pagination }
      ));
    }
  }

  async removeUser(id: string): Promise<Result<{ deleted: boolean }, AuthError>> {
    this.logger.info('Removing user', { userId: id });
    
    try {
      const result = await this.userRepository.delete(id);
      if (!result) {
        this.logger.warn('User not found for deletion', { userId: id });
        return Result.Err(new AuthError(
          'AuthService.removeUser',
          'User not found',
          { userId: id }
        ));
      }
      this.logger.info('User removed successfully', { userId: id });
      return Result.Ok({ deleted: true });
    } catch (error) {
      this.logger.logError(error as Error, { userId: id });
      return Result.Err(new AuthError(
        'AuthService.removeUser',
        error instanceof Error ? error.message : 'Failed to remove user',
        { userId: id }
      ));
    }
  }

  // New methods leveraging User entity business rules
  async changeUserPassword(userId: string, newPassword: string): Promise<Result<User, AuthError>> {
    this.logger.info('Changing user password', { userId });
    
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.warn('User not found for password change', { userId });
        return Result.Err(new AuthError(
          'AuthService.changeUserPassword',
          'User not found',
          { userId }
        ));
      }

      // Use User entity's state-changing operation
      const updatedUser = await user.changePassword(newPassword);
      if (updatedUser.isErr()) {
        this.logger.warn('Password change failed - validation error', { 
          userId, 
          error: updatedUser.unwrapErr() 
        });
        return Result.Err(new AuthError(
          'AuthService.changeUserPassword.validation',
          updatedUser.unwrapErr(),
          { userId }
        ));
      }

      // Save updated user
      const savedUser = await this.userRepository.saveUser(updatedUser.unwrap());
      this.logger.info('User password changed successfully', { userId });
      return Result.Ok(savedUser);
    } catch (error) {
      this.logger.logError(error as Error, { userId });
      return Result.Err(new AuthError(
        'AuthService.changeUserPassword',
        error instanceof Error ? error.message : 'Failed to change password',
        { userId }
      ));
    }
  }

  async changeUserRole(userId: string, newRole: 'user' | 'admin'): Promise<Result<User, AuthError>> {
    this.logger.info('Changing user role', { userId, newRole });
    
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.warn('User not found for role change', { userId });
        return Result.Err(new AuthError(
          'AuthService.changeUserRole',
          'User not found',
          { userId }
        ));
      }

      // Use User entity's state-changing operation
      const updatedUser = user.changeRole(newRole);
      if (updatedUser.isErr()) {
        this.logger.warn('Role change failed - validation error', { 
          userId, 
          error: updatedUser.unwrapErr() 
        });
        return Result.Err(new AuthError(
          'AuthService.changeUserRole.validation',
          updatedUser.unwrapErr(),
          { userId, newRole }
        ));
      }

      // Save updated user
      const savedUser = await this.userRepository.saveUser(updatedUser.unwrap());
      this.logger.info('User role changed successfully', { userId, newRole });
      return Result.Ok(savedUser);
    } catch (error) {
      this.logger.logError(error as Error, { userId });
      return Result.Err(new AuthError(
        'AuthService.changeUserRole',
        error instanceof Error ? error.message : 'Failed to change role',
        { userId, newRole }
      ));
    }
  }

  async getUserById(userId: string): Promise<Result<User, AuthError>> {
    this.logger.debug('Getting user by ID', { userId });
    
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.warn('User not found', { userId });
        return Result.Err(new AuthError(
          'AuthService.getUserById',
          'User not found',
          { userId }
        ));
      }

      return Result.Ok(user);
    } catch (error) {
      this.logger.logError(error as Error, { userId });
      return Result.Err(new AuthError(
        'AuthService.getUserById',
        error instanceof Error ? error.message : 'Failed to get user',
        { userId }
      ));
    }
  }
}