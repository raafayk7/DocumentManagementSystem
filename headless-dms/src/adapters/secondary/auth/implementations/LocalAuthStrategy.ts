import { injectable, inject } from 'tsyringe';
import { AppResult, AppError } from '@carbonteq/hexapp';
import type { IAuthStrategy } from '../../../../ports/output/IAuthStrategy.js';
import type { IUserRepository } from '../../database/interfaces/user.repository.interface.js';
import type { ILogger } from '../../../../ports/output/ILogger.js';
import { User } from '../../../../domain/entities/User.js';
import type { 
  LoginCredentials, 
  RegisterData, 
  DecodedToken, 
  AuthResult 
} from '../../../../ports/output/IAuthHandler.js';

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

  async authenticate(credentials: LoginCredentials): Promise<AppResult<AuthResult>> {
    this.logger.info('Local authentication attempt', { email: credentials.email });
    
    await this.simulateDelay();
    
    if (this.shouldFail) {
      return AppResult.Err(AppError.InvalidData(
        'Simulated authentication failure'
      ));
    }

    try {
      // Find mock user
      const mockUser = this.mockUsers.find(u => u.email === credentials.email);
      if (!mockUser) {
        this.logger.warn('Local authentication failed - user not found', { email: credentials.email });
        return AppResult.Err(AppError.Unauthorized(
          'Invalid credentials'
        ));
      }

      // Check password
      if (mockUser.password !== credentials.password) {
        this.logger.warn('Local authentication failed - invalid password', { email: credentials.email });
        return AppResult.Err(AppError.Unauthorized(
          'Invalid credentials'
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
      const tokenAppResult = await this.generateToken({
        sub: user.unwrap().id,
        email: user.unwrap().email.value,
        role: user.unwrap().role.value
      });

      if (tokenAppResult.isErr()) {
        return AppResult.Err(tokenAppResult.unwrapErr());
      }

      const token = tokenAppResult.unwrap();
      const expiresAt = new Date(Date.now() + this.tokenExpirationMs);

      const authAppResult: AuthResult = {
        token,
        user: {
          id: user.unwrap().id,
          email: user.unwrap().email.value,
          role: user.unwrap().role.value
        },
        expiresAt,
       
      };

      this.logger.info('Local authentication successful', { userId: user.unwrap().id, email: user.unwrap().email.value });
      return AppResult.Ok(authAppResult);
    } catch (error) {
      this.logger.logError(error as Error, { email: credentials.email });
      return AppResult.Err(AppError.InvalidData(
        error instanceof Error ? error.message : 'Authentication failed'
      ));
    }
  }

  async generateToken(payload: any): Promise<AppResult<string>> {
    try {
      // Create a mock token that looks like JWT but isn't real
      const mockToken = `mock_${payload.sub}_${Date.now()}_${this.tokenExpirationMs}`;
      return AppResult.Ok(mockToken);
    } catch (error) {
      this.logger.logError(error as Error, { payload });
      return AppResult.Err(AppError.InvalidData(
        error instanceof Error ? error.message : 'Token generation failed'
      ));
    }
  }

  async verifyToken(token: string): Promise<AppResult<DecodedToken>> {
    try {
      // Parse mock token to extract payload
      if (!token.startsWith('mock_')) {
        return AppResult.Err(AppError.Unauthorized(
          'Invalid token format'
        ));
      }

      const parts = token.split('_');
      if (parts.length < 3) {
        return AppResult.Err(AppError.Unauthorized(
          'Invalid token structure'
        ));
      }

      const userId = parts[1];
      const issuedAt = parseInt(parts[2]);
      const expirationMs = parseInt(parts[3]);

      // Check if token is expired
      const now = Date.now();
      if (now > issuedAt + expirationMs) {
        return AppResult.Err(AppError.Unauthorized(
          'Token expired'
        ));
      }

      // Find user to get email and role
      const mockUser = this.mockUsers.find(u => u.id === userId);
      if (!mockUser) {
        return AppResult.Err(AppError.Unauthorized(
          'User not found'
        ));
      }

      const decoded: DecodedToken = {
        userId: userId,
        email: mockUser.email,
        role: mockUser.role,

        iat: Math.floor(issuedAt / 1000),
        exp: Math.floor((issuedAt + expirationMs) / 1000)
      };

      return AppResult.Ok(decoded);
    } catch (error) {
      this.logger.warn('Local token verification failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return AppResult.Err(AppError.Unauthorized(
        'Invalid or expired token'
      ));
    }
  }

  async register(userData: RegisterData): Promise<AppResult<AuthResult>> {
    this.logger.info('Local registration attempt', { email: userData.email });
    
    await this.simulateDelay();
    
    if (this.shouldFail) {
      return AppResult.Err(AppError.InvalidData(
        'Simulated registration failure'
      ));
    }

    try {
      // Check if user already exists
      const existingUser = this.mockUsers.find(u => u.email === userData.email);
      if (existingUser) {
        return AppResult.Err(AppError.InvalidData(
          'Email already in use'
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
      const tokenAppResult = await this.generateToken({
        userId: user.unwrap().id,
        email: user.unwrap().email.value,
        role: user.unwrap().role.value
      });

      if (tokenAppResult.isErr()) {
        return AppResult.Err(tokenAppResult.unwrapErr());
      }

      const token = tokenAppResult.unwrap();
      const expiresAt = new Date(Date.now() + this.tokenExpirationMs);

      const authAppResult: AuthResult = {
        token,
        user: {
          id: user.unwrap().id,
          email: user.unwrap().email.value,
          role: user.unwrap().role.value
        },
        expiresAt,
       
      };

      this.logger.info('Local registration successful', { userId: user.unwrap().id, email: user.unwrap().email.value });
      return AppResult.Ok(authAppResult);
    } catch (error) {
      this.logger.logError(error as Error, { email: userData.email });
      return AppResult.Err(AppError.InvalidData(
        error instanceof Error ? error.message : 'Registration failed'
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
        email: decoded.email,
        role: decoded.role
      });

      if (newTokenAppResult.isErr()) {
        return AppResult.Err(newTokenAppResult.unwrapErr());
      }

      this.logger.info('Local token refreshed successfully', { userId: decoded.userId });
      return AppResult.Ok(newTokenAppResult.unwrap());
    } catch (error) {
      this.logger.logError(error as Error, { token });
      return AppResult.Err(AppError.Unauthorized(
        error instanceof Error ? error.message : 'Token refresh failed'
      ));
    }
  }

  async invalidateToken(token: string): Promise<AppResult<void>> {
    // For local strategy, we can't actually invalidate tokens
    // Just log the invalidation attempt
    this.logger.info('Local token invalidation requested', { token: token.substring(0, 20) + '...' });
    return AppResult.Ok(undefined);
  }

  getStrategyName(): string {
    return 'LOCAL';
  }

  supportsOperation(operation: 'login' | 'register' | 'refresh' | 'logout'): boolean {
    return ['login', 'register', 'refresh', 'logout'].includes(operation);
  }
} 