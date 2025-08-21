import { injectable, inject } from 'tsyringe';
import { AppResult } from '@carbonteq/hexapp';
import jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import type { IAuthStrategy } from '../../../../ports/output/IAuthStrategy.js';
import type { IUserRepository } from '../../database/interfaces/user.repository.interface.js';
import type { ILogger } from '../../../../ports/output/ILogger.js';
import { AuthError } from '../../../../shared/errors/index.js';
import { User } from '../../../../domain/entities/User.js';
import type { 
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

  async authenticate(credentials: LoginCredentials): Promise<AppResult<AuthResult>> {
    this.logger.info('JWT authentication attempt', { email: credentials.email });
    
    try {
      // Find user by email
      const user = await this.userRepository.findByEmail(credentials.email);
      if (!user) {
        this.logger.warn('JWT authentication failed - user not found', { email: credentials.email });
        return AppResult.Err(new AuthError(
          'JwtAuthStrategy.authenticate.userNotFound',
          'Invalid credentials',
          { email: credentials.email }
        ));
      }

      // Verify password
      const isValidPassword = await user.verifyPassword(credentials.password);
      if (!isValidPassword) {
        this.logger.warn('JWT authentication failed - invalid password', { email: credentials.email });
        return AppResult.Err(new AuthError(
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
      
      const tokenAppResult = await this.generateToken({
        sub: user.id,
        email: user.email.value, // Use primitive string value
        role: user.role.value    // Use primitive string value
      });
      
      this.logger.info('JWT token generation result', { 
        isOk: tokenAppResult.isOk(),
        isErr: tokenAppResult.isErr(),
        error: tokenAppResult.isErr() ? tokenAppResult.unwrapErr().message : 'none'
      });

      if (tokenAppResult.isErr()) {
        return AppResult.Err(tokenAppResult.unwrapErr());
      }

      const token = tokenAppResult.unwrap();
      const expiresAt = new Date(Date.now() + (60 * 60 * 1000)); // 1 hour

      const authResult: AuthResult = {
        token,
        user: {
          id: user.id,
          email: user.email.value,
          role: user.role.value
        },
        expiresAt
      };

      this.logger.info('JWT authentication successful', { userId: user.id, email: user.email });
      return AppResult.Ok(authResult);
    } catch (error) {
      this.logger.logError(error as Error, { email: credentials.email });
      return AppResult.Err(new AuthError(
        'JwtAuthStrategy.authenticate',
        error instanceof Error ? error.message : 'Authentication failed',
        { email: credentials.email }
      ));
    }
  }

  async generateToken(payload: any): Promise<AppResult<string>> {
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
        return AppResult.Err(new AuthError(
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
      
      return AppResult.Ok(token);
    } catch (error) {
      this.logger.error('JWT token generation failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : 'No stack trace',
        payload 
      });
      return AppResult.Err(new AuthError(
        'JwtAuthStrategy.generateToken',
        error instanceof Error ? error.message : 'Token generation failed',
        { payload }
      ));
    }
  }

  async verifyToken(token: string): Promise<AppResult<DecodedToken>> {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return AppResult.Err(new AuthError(
          'JwtAuthStrategy.verifyToken',
          'JWT secret not configured'
        ));
      }

      const decoded = jwt.verify(token, secret) as DecodedToken;
      return AppResult.Ok(decoded);
    } catch (error) {
      this.logger.warn('JWT token verification failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return AppResult.Err(new AuthError(
        'JwtAuthStrategy.verifyToken',
        'Invalid or expired token'
      ));
    }
  }

  async register(userData: RegisterData): Promise<AppResult<AuthResult>> {
    this.logger.info('JWT registration attempt', { email: userData.email });
    
    try {
      // Validate email format
      const emailValidation = this.emailValidator.validate(userData.email);
      if (emailValidation.isErr()) {
        return AppResult.Err(new AuthError(
          'JwtAuthStrategy.register.emailValidation',
          emailValidation.unwrapErr(),
          { email: userData.email }
        ));
      }

      // Validate password
      const passwordValidation = UserValidator.validatePassword(userData.password);
      if (passwordValidation.isErr()) {
        return AppResult.Err(new AuthError(
          'JwtAuthStrategy.register.passwordValidation',
          passwordValidation.unwrapErr(),
          { email: userData.email }
        ));
      }

      // Validate role
      const roleValidation = UserValidator.validateRole(userData.role);
      if (roleValidation.isErr()) {
        return AppResult.Err(new AuthError(
          'JwtAuthStrategy.register.roleValidation',
          roleValidation.unwrapErr(),
          { email: userData.email, role: userData.role }
        ));
      }

      // Check email uniqueness
      const emailExists = await this.userRepository.exists({ email: userData.email });
      if (emailExists) {
        return AppResult.Err(new AuthError(
          'JwtAuthStrategy.register.emailExists',
          'Email already in use',
          { email: userData.email }
        ));
      }

      // Create user with default role if not provided
      const role = userData.role || 'user';
      const userAppResult = await User.create(userData.email, userData.password, role);
      if (userAppResult.isErr()) {
        return AppResult.Err(new AuthError(
          'JwtAuthStrategy.register.userCreation',
          userAppResult.unwrapErr(),
          { email: userData.email }
        ));
      }

      const user = userAppResult.unwrap();
      const savedUser = await this.userRepository.saveUser(user);

      // Generate token
      const tokenAppResult = await this.generateToken({
        sub: savedUser.id,
        email: savedUser.email.value, // Use primitive string value
        role: savedUser.role.value    // Use primitive string value
      });

      if (tokenAppResult.isErr()) {
        return AppResult.Err(tokenAppResult.unwrapErr());
      }

      const token = tokenAppResult.unwrap();
      const expiresAt = new Date(Date.now() + (60 * 60 * 1000)); // 1 hour

      const authAppResult: AuthResult = {
        token,
        user: {
          id: savedUser.id,
          email: savedUser.email.value,
          role: savedUser.role.value
        },
        expiresAt
      };

      this.logger.info('JWT registration successful', { userId: savedUser.id, email: savedUser.email });
      return AppResult.Ok(authAppResult);
    } catch (error) {
      this.logger.logError(error as Error, { email: userData.email });
      return AppResult.Err(new AuthError(
        'JwtAuthStrategy.register',
        error instanceof Error ? error.message : 'Registration failed',
        { email: userData.email }
      ));
    }
  }

  async refreshToken(token: string): Promise<AppResult<string>> {
    try {
      // Verify current token
      const decodedAppResult = await this.verifyToken(token);
      if (decodedAppResult.isErr()) {
        return AppResult.Err(decodedAppResult.unwrapErr());
      }

      const decoded = decodedAppResult.unwrap();
      
             // Generate new token with same payload
       const newTokenAppResult = await this.generateToken({
         userId: decoded.userId,
         email: decoded.email, // This is already a string from decoded token
         role: decoded.role    // This is already a string from decoded token
       });

      if (newTokenAppResult.isErr()) {
        return AppResult.Err(newTokenAppResult.unwrapErr());
      }

             this.logger.info('JWT token refreshed successfully', { userId: decoded.userId });
      return AppResult.Ok(newTokenAppResult.unwrap());
    } catch (error) {
      this.logger.logError(error as Error, { token });
      return AppResult.Err(new AuthError(
        'JwtAuthStrategy.refreshToken',
        error instanceof Error ? error.message : 'Token refresh failed',
        { token }
      ));
    }
  }

  async invalidateToken(token: string): Promise<AppResult<void>> {
    // For JWT, we can't actually invalidate tokens (they're stateless)
    // In a real implementation, you might add the token to a blacklist
    // For now, we'll just log the invalidation attempt
    this.logger.info('JWT token invalidation requested', { token: token.substring(0, 20) + '...' });
    return AppResult.Ok(undefined);
  }

  getStrategyName(): string {
    return 'JWT';
  }

  supportsOperation(operation: 'login' | 'register' | 'refresh' | 'logout'): boolean {
    return ['login', 'register', 'refresh', 'logout'].includes(operation);
  }
} 