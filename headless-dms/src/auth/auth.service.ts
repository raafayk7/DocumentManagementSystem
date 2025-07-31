import { IUserRepository } from './repositories/user.repository.interface.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import bcrypt from 'bcrypt';
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

  async register(registerDto: RegisterDto): Promise<Result<{
    id: string;
    email: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  }, AuthError>> {
    this.logger.info('User registration attempt', { email: registerDto.email, role: registerDto.role });
    
    try {
      const user = await this.userRepository.save(registerDto);
      this.logger.info('User registered successfully', { userId: user.id, email: user.email });
      return Result.Ok(user);
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
  
    // Compare password
    const isMatch = await bcrypt.compare(loginDto.password, user.passwordHash);
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

  async findAllUsers(query?: { email?: string; role?: string }, pagination?: PaginationInput): Promise<Result<PaginationOutput<{
    id: string; email: string; role: string; createdAt: Date; updatedAt: Date;
  }>, AuthError>> {
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
  }