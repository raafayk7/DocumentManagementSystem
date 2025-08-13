import { Result } from '@carbonteq/fp';
import { User } from '../../domain/entities/User.js';
import { AuthError } from '../errors/index.js';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  role: 'user' | 'admin';
}

export interface DecodedToken {
  sub: string; // User ID
  email: string;
  role: 'user' | 'admin';
  iat: number; // Issued at
  exp: number; // Expires at
}

export interface AuthResult {
  token: string;
  user: User;
  expiresAt: Date;
  refreshToken?: string;
  strategy: string;
  metadata?: Record<string, any>;
}

export interface IAuthHandler {
  /**
   * Authenticate user with credentials
   */
  login(credentials: LoginCredentials): Promise<Result<AuthResult, AuthError>>;

  /**
   * Register a new user
   */
  register(userData: RegisterData): Promise<Result<User, AuthError>>;

  /**
   * Validate and decode a token
   */
  validateToken(token: string): Promise<Result<DecodedToken, AuthError>>;

  /**
   * Refresh an expired token
   */
  refreshToken(token: string): Promise<Result<string, AuthError>>;

  /**
   * Invalidate a token (logout)
   */
  logout(token: string): Promise<Result<void, AuthError>>;

  /**
   * Change user password (admin operation)
   */
  changeUserPassword(userId: string, newPassword: string): Promise<Result<User, AuthError>>;

  /**
   * Change user role (admin operation)
   */
  changeUserRole(userId: string, newRole: 'user' | 'admin'): Promise<Result<User, AuthError>>;

  /**
   * Get current authentication strategy name
   */
  getStrategyName(): string;
} 