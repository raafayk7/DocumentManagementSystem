import { injectable, inject } from 'tsyringe';
import { Result } from '@carbonteq/fp';
import { IAuthStrategy } from '../../auth/interfaces/IAuthStrategy.js';
import { IUserRepository } from '../database/interfaces/user.repository.interface.js';
import { ILogger } from '../../common/services/logger.service.interface.js';
import { AuthError } from '../../common/errors/application.errors.js';
import { User } from '../../domain/entities/User.js';
import { 
  LoginCredentials, 
  RegisterData, 
  DecodedToken, 
  AuthResult 
} from '../../auth/interfaces/IAuthHandler.js';

interface MockUser {
  id: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
}

@injectable()
export class LocalAuthStrategy implements IAuthStrategy {
  private mockUsers: MockUser[] = [
    { id: '1', email: 'admin@test.com', password: 'admin123', role: 'admin' },
    { id: '2', email: 'user@test.com', password: 'user123', role: 'user' },
    { id: '3', email: 'test@test.com', password: 'test123', role: 'user' }
  ];

  private tokenExpirationMs: number = 60 * 60 * 1000; // 1 hour default
  private shouldFail: boolean = false;
  private delayMs: number = 0; // Simulate network delay

  constructor(
    @inject('IUserRepository') private userRepository: IUserRepository,
    @inject('ILogger') private logger: ILogger
  ) {
    this.logger = this.logger.child({ strategy: 'LocalAuthStrategy' });
  }

  // Configuration methods for testing
  setMockUsers(users: MockUser[]): void {
    this.mockUsers = users;
  }

  setTokenExpiration(ms: number): void {
    this.tokenExpirationMs = ms;
  }

  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  setDelay(ms: number): void {
    this.delayMs = ms;
  }

  private async simulateDelay(): Promise<void> {
    if (this.delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delayMs));
    }
  }

  async authenticate(credentials: LoginCredentials): Promise<Result<AuthResult, AuthError>> {
    this.logger.info('Local authentication attempt', { email: credentials.email });
    
    await this.simulateDelay();
    
    if (this.shouldFail) {
      return Result.Err(new AuthError(
        'LocalAuthStrategy.authenticate.simulatedFailure',
        'Simulated authentication failure',
        { email: credentials.email }
      ));
    }

    try {
      // Find mock user
      const mockUser = this.mockUsers.find(u => u.email === credentials.email);
      if (!mockUser) {
        this.logger.warn('Local authentication failed - user not found', { email: credentials.email });
        return Result.Err(new AuthError(
          'LocalAuthStrategy.authenticate.userNotFound',
          'Invalid credentials',
          { email: credentials.email }
        ));
      }

      // Check password
      if (mockUser.password !== credentials.password) {
        this.logger.warn('Local authentication failed - invalid password', { email: credentials.email });
        return Result.Err(new AuthError(
          'LocalAuthStrategy.authenticate.invalidPassword',
          'Invalid credentials',
          { email: credentials.email }
        ));
      }

      // Create User entity from mock data
      const user = User.fromRepository({
        id: mockUser.id,
        email: mockUser.email,
        passwordHash: 'mock_hash_' + mockUser.password, // Mock hash
        role: mockUser.role,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Generate mock token
      const tokenResult = await this.generateToken({
        sub: user.id,
        email: user.email,
        role: user.role
      });

      if (tokenResult.isErr()) {
        return Result.Err(tokenResult.unwrapErr());
      }

      const token = tokenResult.unwrap();
      const expiresAt = new Date(Date.now() + this.tokenExpirationMs);

      const authResult: AuthResult = {
        token,
        user,
        expiresAt,
        strategy: this.getStrategyName(),
        metadata: {
          tokenType: 'Mock',
          algorithm: 'Mock',
          isTest: true
        }
      };

      this.logger.info('Local authentication successful', { userId: user.id, email: user.email });
      return Result.Ok(authResult);
    } catch (error) {
      this.logger.logError(error as Error, { email: credentials.email });
      return Result.Err(new AuthError(
        'LocalAuthStrategy.authenticate',
        error instanceof Error ? error.message : 'Authentication failed',
        { email: credentials.email }
      ));
    }
  }

  async generateToken(payload: any): Promise<Result<string, AuthError>> {
    try {
      // Create a mock token that looks like JWT but isn't real
      const mockToken = `mock_${payload.sub}_${Date.now()}_${this.tokenExpirationMs}`;
      return Result.Ok(mockToken);
    } catch (error) {
      this.logger.logError(error as Error, { payload });
      return Result.Err(new AuthError(
        'LocalAuthStrategy.generateToken',
        error instanceof Error ? error.message : 'Token generation failed',
        { payload }
      ));
    }
  }

  async verifyToken(token: string): Promise<Result<DecodedToken, AuthError>> {
    try {
      // Parse mock token to extract payload
      if (!token.startsWith('mock_')) {
        return Result.Err(new AuthError(
          'LocalAuthStrategy.verifyToken',
          'Invalid token format'
        ));
      }

      const parts = token.split('_');
      if (parts.length < 3) {
        return Result.Err(new AuthError(
          'LocalAuthStrategy.verifyToken',
          'Invalid token structure'
        ));
      }

      const userId = parts[1];
      const issuedAt = parseInt(parts[2]);
      const expirationMs = parseInt(parts[3]);

      // Check if token is expired
      const now = Date.now();
      if (now > issuedAt + expirationMs) {
        return Result.Err(new AuthError(
          'LocalAuthStrategy.verifyToken',
          'Token expired'
        ));
      }

      // Find user to get email and role
      const mockUser = this.mockUsers.find(u => u.id === userId);
      if (!mockUser) {
        return Result.Err(new AuthError(
          'LocalAuthStrategy.verifyToken',
          'User not found'
        ));
      }

      const decoded: DecodedToken = {
        sub: userId,
        email: mockUser.email,
        role: mockUser.role,
        iat: Math.floor(issuedAt / 1000),
        exp: Math.floor((issuedAt + expirationMs) / 1000)
      };

      return Result.Ok(decoded);
    } catch (error) {
      this.logger.warn('Local token verification failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return Result.Err(new AuthError(
        'LocalAuthStrategy.verifyToken',
        'Invalid or expired token'
      ));
    }
  }

  async register(userData: RegisterData): Promise<Result<AuthResult, AuthError>> {
    this.logger.info('Local registration attempt', { email: userData.email });
    
    await this.simulateDelay();
    
    if (this.shouldFail) {
      return Result.Err(new AuthError(
        'LocalAuthStrategy.register.simulatedFailure',
        'Simulated registration failure',
        { email: userData.email }
      ));
    }

    try {
      // Check if user already exists
      const existingUser = this.mockUsers.find(u => u.email === userData.email);
      if (existingUser) {
        return Result.Err(new AuthError(
          'LocalAuthStrategy.register.emailExists',
          'Email already in use',
          { email: userData.email }
        ));
      }

      // Create new mock user
      const newUserId = (this.mockUsers.length + 1).toString();
      const newMockUser: MockUser = {
        id: newUserId,
        email: userData.email,
        password: userData.password,
        role: userData.role
      };

      this.mockUsers.push(newMockUser);

      // Create User entity
      const user = User.fromRepository({
        id: newMockUser.id,
        email: newMockUser.email,
        passwordHash: 'mock_hash_' + newMockUser.password,
        role: newMockUser.role,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Generate token
      const tokenResult = await this.generateToken({
        sub: user.id,
        email: user.email,
        role: user.role
      });

      if (tokenResult.isErr()) {
        return Result.Err(tokenResult.unwrapErr());
      }

      const token = tokenResult.unwrap();
      const expiresAt = new Date(Date.now() + this.tokenExpirationMs);

      const authResult: AuthResult = {
        token,
        user,
        expiresAt,
        strategy: this.getStrategyName(),
        metadata: {
          tokenType: 'Mock',
          algorithm: 'Mock',
          isTest: true
        }
      };

      this.logger.info('Local registration successful', { userId: user.id, email: user.email });
      return Result.Ok(authResult);
    } catch (error) {
      this.logger.logError(error as Error, { email: userData.email });
      return Result.Err(new AuthError(
        'LocalAuthStrategy.register',
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
        email: decoded.email,
        role: decoded.role
      });

      if (newTokenResult.isErr()) {
        return Result.Err(newTokenResult.unwrapErr());
      }

      this.logger.info('Local token refreshed successfully', { userId: decoded.sub });
      return Result.Ok(newTokenResult.unwrap());
    } catch (error) {
      this.logger.logError(error as Error, { token });
      return Result.Err(new AuthError(
        'LocalAuthStrategy.refreshToken',
        error instanceof Error ? error.message : 'Token refresh failed',
        { token }
      ));
    }
  }

  async invalidateToken(token: string): Promise<Result<void, AuthError>> {
    // For local strategy, we can't actually invalidate tokens
    // Just log the invalidation attempt
    this.logger.info('Local token invalidation requested', { token: token.substring(0, 20) + '...' });
    return Result.Ok(undefined);
  }

  getStrategyName(): string {
    return 'LOCAL';
  }

  supportsOperation(operation: 'login' | 'register' | 'refresh' | 'logout'): boolean {
    return ['login', 'register', 'refresh', 'logout'].includes(operation);
  }
} 