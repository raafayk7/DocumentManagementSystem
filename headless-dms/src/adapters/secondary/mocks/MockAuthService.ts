import { injectable } from 'tsyringe';
import { AppResult, AppError } from '@carbonteq/hexapp';
import type { IAuthStrategy } from '../../../ports/output/IAuthStrategy.js';
import type { LoginCredentials, RegisterData, DecodedToken, AuthResult } from '../../../ports/output/IAuthHandler.js';
import { User } from '../../../domain/entities/User.js';


@injectable()
export class MockAuthService implements IAuthStrategy {
  private mockUsers: Map<string, User> = new Map();
  private mockTokens: Map<string, { userId: string; expiresAt: Date }> = new Map();
  private tokenCounter = 1;

  constructor() {
    this.seedMockUsers();
  }

  async authenticate(credentials: LoginCredentials): Promise<AppResult<AuthResult>> {
    // Find user by email
    const user = Array.from(this.mockUsers.values()).find(u => u.email.value === credentials.email);
    
    if (!user) {
      return AppResult.Err(AppError.Unauthorized(
        `Invalid credentials for email: ${credentials.email}`
      ));
    }

    // Simple password check (in real tests you'd use proper hashing)
    if (credentials.password !== 'password123') {
      return AppResult.Err(AppError.Unauthorized(
        `Invalid credentials for email: ${credentials.email}`
      ));
    }

    // Generate mock token
    const token = `mock-token-${this.tokenCounter++}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store token mapping
    this.mockTokens.set(token, {
      userId: user.id,
      expiresAt
    });

    const authResult: AuthResult = {
      token,
      expiresAt,
      user: {
        id: user.id,
        email: user.email.value,
        role: user.role.value
      }
    };

    return AppResult.Ok(authResult);
  }

  async verifyToken(token: string): Promise<AppResult<DecodedToken>> {
    const tokenData = this.mockTokens.get(token);
    
    if (!tokenData) {
      return AppResult.Err(AppError.Unauthorized(
        'Invalid token'
      ));
    }

    // Check if token is expired
    if (tokenData.expiresAt < new Date()) {
      this.mockTokens.delete(token);
      return AppResult.Err(AppError.Unauthorized(
        'Token expired'
      ));
    }

    const user = this.mockUsers.get(tokenData.userId);
    if (!user) {
      return AppResult.Err(AppError.Unauthorized(
        'User not found'
      ));
    }

    const decodedToken: DecodedToken = {
      userId: user.id,
      email: user.email.value,
      role: user.role.value,
      iat: Math.floor(tokenData.expiresAt.getTime() / 1000) - 24 * 60 * 60, // 24 hours ago
      exp: Math.floor(tokenData.expiresAt.getTime() / 1000)
    };

    return AppResult.Ok(decodedToken);
  }

  // Required IAuthStrategy methods
  getStrategyName(): string {
    return 'MOCK';
  }

  async generateToken(payload: any): Promise<AppResult<string>> {
    try {
      const token = `mock-token-${this.tokenCounter++}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      const userId = payload.userId || payload.sub || 'mock-user';
      this.mockTokens.set(token, {
        userId: userId || 'mock-user',
        expiresAt
      });
      
      return AppResult.Ok(token);
    } catch (error) {
      return AppResult.Err(AppError.Generic(
        'Token generation failed'
      ));
    }
  }

  async register(userData: RegisterData): Promise<AppResult<AuthResult>> {
    try {
      // Check if user already exists
      const existingUser = Array.from(this.mockUsers.values()).find(u => u.email.value === userData.email);
      if (existingUser) {
        return AppResult.Err(AppError.AlreadyExists(
          `Email already in use: ${userData.email}`
        ));
      }

      // Create new mock user (simplified for testing)
      const newUser = User.fromRepository({
        id: `mock-${Date.now()}`,
        email: userData.email,
        passwordHash: 'mock_hash_' + userData.password,
        role: userData.role as 'user' | 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const user = newUser.unwrap(); // Unwrap the result first
      this.mockUsers.set(user.id, user);
      //this.mockUsers.set(newUser.id, newUser);

      // Generate token
      const tokenResult = await this.generateToken({ userId: user.id });
      if (tokenResult.isErr()) {
        return AppResult.Err(tokenResult.unwrapErr());
      }

      const token = tokenResult.unwrap();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const authResult: AuthResult = {
        token,
        expiresAt,
        user: {
          id: user.id,
          email: user.email.value,
          role: user.role.value
        }
      };

      return AppResult.Ok(authResult);
    } catch (error) {
      return AppResult.Err(AppError.Generic(
        'Registration failed'
      ));
    }
  }

  async refreshToken(token: string): Promise<AppResult<string>> {
    try {
      // Verify current token
      const decodedResult = await this.verifyToken(token);
      if (decodedResult.isErr()) {
        return AppResult.Err(decodedResult.unwrapErr());
      }

      const decoded = decodedResult.unwrap();
      
      // Generate new token
      const newTokenResult = await this.generateToken({ userId: decoded.userId });
      if (newTokenResult.isErr()) {
        return AppResult.Err(newTokenResult.unwrapErr());
      }

      return AppResult.Ok(newTokenResult.unwrap());
    } catch (error) {
      return AppResult.Err(AppError.Generic(
        'Token refresh failed'
      ));
    }
  }

  async invalidateToken(token: string): Promise<AppResult<void>> {
    try {
      this.mockTokens.delete(token);
      return AppResult.Ok(undefined);
    } catch (error) {
      return AppResult.Err(AppError.Generic(
        'Token invalidation failed'
      ));
    }
  }

  // Mock-specific methods for testing
  clearTokens(): void {
    this.mockTokens.clear();
    this.tokenCounter = 1;
  }

  addMockUser(user: User): void {
    this.mockUsers.set(user.id, user);
  }

  removeMockUser(userId: string): void {
    this.mockUsers.delete(userId);
  }

  getMockUsers(): User[] {
    return Array.from(this.mockUsers.values());
  }

  setMockUsers(users: User[]): void {
    this.mockUsers.clear();
    users.forEach(user => this.mockUsers.set(user.id, user));
  }

  getMockTokens(): Map<string, { userId: string; expiresAt: Date }> {
    return new Map(this.mockTokens);
  }

  // Seed with some initial test users
  private seedMockUsers(): void {
    // This will be populated by tests as needed
  }

  // Helper method to create a valid token for testing
  createValidToken(userId: string, expiresInHours: number = 24): string {
    const token = `mock-token-${this.tokenCounter++}`;
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    
    this.mockTokens.set(token, { userId, expiresAt });
    return token;
  }

  // Helper method to create an expired token for testing
  createExpiredToken(userId: string): string {
    const token = `mock-token-${this.tokenCounter++}`;
    const expiresAt = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    
    this.mockTokens.set(token, { userId, expiresAt });
    return token;
  }

  // Helper method to create an invalid token for testing
  createInvalidToken(): string {
    return 'invalid-mock-token';
  }
}
