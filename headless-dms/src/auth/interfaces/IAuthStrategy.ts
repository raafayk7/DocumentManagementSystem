import { Result } from '@carbonteq/fp';
import { AuthError } from '../../common/errors/application.errors.js';
import { LoginCredentials, RegisterData, DecodedToken, AuthResult } from './IAuthHandler.js';

export interface IAuthStrategy {
  /**
   * Authenticate user with credentials
   */
  authenticate(credentials: LoginCredentials): Promise<Result<AuthResult, AuthError>>;

  /**
   * Generate a token for a user
   */
  generateToken(payload: any): Promise<Result<string, AuthError>>;

  /**
   * Verify and decode a token
   */
  verifyToken(token: string): Promise<Result<DecodedToken, AuthError>>;

  /**
   * Register a new user
   */
  register(userData: RegisterData): Promise<Result<AuthResult, AuthError>>;

  /**
   * Refresh an expired token
   */
  refreshToken(token: string): Promise<Result<string, AuthError>>;

  /**
   * Invalidate a token
   */
  invalidateToken(token: string): Promise<Result<void, AuthError>>;

  /**
   * Get the name of this authentication strategy
   */
  getStrategyName(): string;

  /**
   * Check if this strategy supports a specific operation
   */
  supportsOperation(operation: 'login' | 'register' | 'refresh' | 'logout'): boolean;
} 