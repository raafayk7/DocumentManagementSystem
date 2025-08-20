import { injectable, inject } from 'tsyringe';
import { Result } from '@carbonteq/fp';
import jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { IAuthStrategy } from '../../../../ports/output/IAuthStrategy.js';
import { IUserRepository } from '../../database/interfaces/user.repository.interface.js';
import { ILogger } from '../../../../ports/output/ILogger.js';
import { AuthError } from '../../../../shared/errors/index.js';
import { User } from '../../../../domain/entities/User.js';
import { 
  LoginCredentials, 
  RegisterData, 
  DecodedToken, 
  AuthResult 
} from '../../../../ports/output/IAuthHandler.js';
import { UserValidator, EmailValidator } from '../../../../domain/validators/index.js';

@injectable()
export class JwtAuthStrategy implements IAuthStrategy {
  constructor(
    @inject('IUserRepository') private userRepository: IUserRepository,
    @inject('ILogger') private logger: ILogger,
    @inject('EmailValidator') private emailValidator: EmailValidator
  ) {
    this.logger = this.logger.child({ strategy: 'JwtAuthStrategy' });
  }

  async authenticate(credentials: LoginCredentials): Promise<Result<AuthResult, AuthError>> {
    this.logger.info('JWT authentication attempt', { email: credentials.email });
    
    try {
      // Find user by email
      const user = await this.userRepository.findByEmail(credentials.email);
      if (!user) {
        this.logger.warn('JWT authentication failed - user not found', { email: credentials.email });
        return Result.Err(new AuthError(
          'JwtAuthStrategy.authenticate.userNotFound',
          'Invalid credentials',
          { email: credentials.email }
        ));
      }

      // Verify password
      const isValidPassword = await user.verifyPassword(credentials.password);
      if (!isValidPassword) {
        this.logger.warn('JWT authentication failed - invalid password', { email: credentials.email });
        return Result.Err(new AuthError(
          'JwtAuthStrategy.authenticate.invalidPassword',
          'Invalid credentials',
          { email: credentials.email }
        ));
      }

      // Generate JWT token
      this.logger.info('About to generate JWT token for user', { 
        userId: user.id, 
        email: user.email.value, 
        role: user.role.value 
      });
      
      const tokenResult = await this.generateToken({
        sub: user.id,
        email: user.email.value, // Use primitive string value
        role: user.role.value    // Use primitive string value
      });
      
      this.logger.info('JWT token generation result', { 
        isOk: tokenResult.isOk(),
        isErr: tokenResult.isErr(),
        error: tokenResult.isErr() ? tokenResult.unwrapErr().message : 'none'
      });

      if (tokenResult.isErr()) {
        return Result.Err(tokenResult.unwrapErr());
      }

      const token = tokenResult.unwrap();
      const expiresAt = new Date(Date.now() + (60 * 60 * 1000)); // 1 hour

      const authResult: AuthResult = {
        token,
        user,
        expiresAt,
        strategy: this.getStrategyName(),
        metadata: {
          tokenType: 'Bearer',
          algorithm: 'HS256'
        }
      };

      this.logger.info('JWT authentication successful', { userId: user.id, email: user.email });
      return Result.Ok(authResult);
    } catch (error) {
      this.logger.logError(error as Error, { email: credentials.email });
      return Result.Err(new AuthError(
        'JwtAuthStrategy.authenticate',
        error instanceof Error ? error.message : 'Authentication failed',
        { email: credentials.email }
      ));
    }
  }

  async generateToken(payload: any): Promise<Result<string, AuthError>> {
    try {
      this.logger.info('JWT generateToken called with payload', { payload });
      
      const secret = process.env.JWT_SECRET;
      this.logger.info('JWT_SECRET from env', { 
        hasSecret: !!secret, 
        secretLength: secret ? secret.length : 0,
        secretPreview: secret ? `${secret.substring(0, 10)}...` : 'undefined'
      });
      
      if (!secret) {
        this.logger.error('JWT secret not configured');
        return Result.Err(new AuthError(
          'JwtAuthStrategy.generateToken',
          'JWT secret not configured',
          { payload }
        ));
      }

      this.logger.info('About to call jwt.sign with payload and secret');
      const token = jwt.sign(payload, secret, { expiresIn: '1h' });
      this.logger.info('jwt.sign completed successfully', { 
        tokenLength: token.length,
        tokenPreview: token.substring(0, 20) + '...'
      });
      
      return Result.Ok(token);
    } catch (error) {
      this.logger.error('JWT token generation failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : 'No stack trace',
        payload 
      });
      return Result.Err(new AuthError(
        'JwtAuthStrategy.generateToken',
        error instanceof Error ? error.message : 'Token generation failed',
        { payload }
      ));
    }
  }

  async verifyToken(token: string): Promise<Result<DecodedToken, AuthError>> {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return Result.Err(new AuthError(
          'JwtAuthStrategy.verifyToken',
          'JWT secret not configured'
        ));
      }

      const decoded = jwt.verify(token, secret) as DecodedToken;
      return Result.Ok(decoded);
    } catch (error) {
      this.logger.warn('JWT token verification failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return Result.Err(new AuthError(
        'JwtAuthStrategy.verifyToken',
        'Invalid or expired token'
      ));
    }
  }

  async register(userData: RegisterData): Promise<Result<AuthResult, AuthError>> {
    this.logger.info('JWT registration attempt', { email: userData.email });
    
    try {
      // Validate email format
      const emailValidation = this.emailValidator.validate(userData.email);
      if (emailValidation.isErr()) {
        return Result.Err(new AuthError(
          'JwtAuthStrategy.register.emailValidation',
          emailValidation.unwrapErr(),
          { email: userData.email }
        ));
      }

      // Validate password
      const passwordValidation = UserValidator.validatePassword(userData.password);
      if (passwordValidation.isErr()) {
        return Result.Err(new AuthError(
          'JwtAuthStrategy.register.passwordValidation',
          passwordValidation.unwrapErr(),
          { email: userData.email }
        ));
      }

      // Validate role
      const roleValidation = UserValidator.validateRole(userData.role);
      if (roleValidation.isErr()) {
        return Result.Err(new AuthError(
          'JwtAuthStrategy.register.roleValidation',
          roleValidation.unwrapErr(),
          { email: userData.email, role: userData.role }
        ));
      }

      // Check email uniqueness
      const emailExists = await this.userRepository.exists({ email: userData.email });
      if (emailExists) {
        return Result.Err(new AuthError(
          'JwtAuthStrategy.register.emailExists',
          'Email already in use',
          { email: userData.email }
        ));
      }

      // Create user
      const userResult = await User.create(userData.email, userData.password, userData.role);
      if (userResult.isErr()) {
        return Result.Err(new AuthError(
          'JwtAuthStrategy.register.userCreation',
          userResult.unwrapErr(),
          { email: userData.email }
        ));
      }

      const user = userResult.unwrap();
      const savedUser = await this.userRepository.saveUser(user);

      // Generate token
      const tokenResult = await this.generateToken({
        sub: savedUser.id,
        email: savedUser.email.value, // Use primitive string value
        role: savedUser.role.value    // Use primitive string value
      });

      if (tokenResult.isErr()) {
        return Result.Err(tokenResult.unwrapErr());
      }

      const token = tokenResult.unwrap();
      const expiresAt = new Date(Date.now() + (60 * 60 * 1000)); // 1 hour

      const authResult: AuthResult = {
        token,
        user: savedUser,
        expiresAt,
        strategy: this.getStrategyName(),
        metadata: {
          tokenType: 'Bearer',
          algorithm: 'HS256'
        }
      };

      this.logger.info('JWT registration successful', { userId: savedUser.id, email: savedUser.email });
      return Result.Ok(authResult);
    } catch (error) {
      this.logger.logError(error as Error, { email: userData.email });
      return Result.Err(new AuthError(
        'JwtAuthStrategy.register',
        error instanceof Error ? error.message : 'Registration failed',
        { email: userData.email }
      ));
    }
  }

  async refreshToken(token: string): Promise<Result<string, AuthError>> {
    try {
      // Verify current token
      const decodedResult = await this.verifyToken(token);
      if (decodedResult.isErr()) {
        return Result.Err(decodedResult.unwrapErr());
      }

      const decoded = decodedResult.unwrap();
      
      // Generate new token with same payload
      const newTokenResult = await this.generateToken({
        sub: decoded.sub,
        email: decoded.email, // This is already a string from decoded token
        role: decoded.role    // This is already a string from decoded token
      });

      if (newTokenResult.isErr()) {
        return Result.Err(newTokenResult.unwrapErr());
      }

      this.logger.info('JWT token refreshed successfully', { userId: decoded.sub });
      return Result.Ok(newTokenResult.unwrap());
    } catch (error) {
      this.logger.logError(error as Error, { token });
      return Result.Err(new AuthError(
        'JwtAuthStrategy.refreshToken',
        error instanceof Error ? error.message : 'Token refresh failed',
        { token }
      ));
    }
  }

  async invalidateToken(token: string): Promise<Result<void, AuthError>> {
    // For JWT, we can't actually invalidate tokens (they're stateless)
    // In a real implementation, you might add the token to a blacklist
    // For now, we'll just log the invalidation attempt
    this.logger.info('JWT token invalidation requested', { token: token.substring(0, 20) + '...' });
    return Result.Ok(undefined);
  }

  getStrategyName(): string {
    return 'JWT';
  }

  supportsOperation(operation: 'login' | 'register' | 'refresh' | 'logout'): boolean {
    return ['login', 'register', 'refresh', 'logout'].includes(operation);
  }
} 