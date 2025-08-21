import { AppResult } from '@carbonteq/hexapp';
import { User } from '../../domain/entities/User.js';
import { AuthError } from '../../shared/errors/index.js';

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
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface AuthResult {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
  expiresAt: Date;
}

export interface IAuthHandler {
  login(credentials: LoginCredentials): Promise<AppResult<AuthResult>>;
  register(userData: RegisterData): Promise<AppResult<{ id: string; email: string; role: string }>>;
  validateToken(token: string): Promise<AppResult<DecodedToken>>;
  refreshToken(token: string): Promise<AppResult<string>>;
  logout(token: string): Promise<AppResult<void>>;
} 