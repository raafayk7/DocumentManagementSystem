import { AppResult } from '@carbonteq/hexapp';
import { LoginCredentials, RegisterData, DecodedToken, AuthResult } from './IAuthHandler.js';
import { AuthError } from '../../shared/errors/index.js';

export interface IAuthStrategy {
  getStrategyName(): string;
  authenticate(credentials: LoginCredentials): Promise<AppResult<AuthResult>>;
  generateToken(payload: any): Promise<AppResult<string>>;
  verifyToken(token: string): Promise<AppResult<DecodedToken>>;
  register(userData: RegisterData): Promise<AppResult<AuthResult>>;
  refreshToken(token: string): Promise<AppResult<string>>;
  invalidateToken(token: string): Promise<AppResult<void>>;
} 