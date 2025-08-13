import { injectable } from 'tsyringe';
import { IAuthStrategy } from '../auth/interfaces/IAuthStrategy.js';
import { User } from '../../domain/entities/User.js';

export interface MockAuthResult {
  token: string;
  expiresAt: Date;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@injectable()
export class MockAuthService implements IAuthStrategy {
  private mockUsers: Map<string, User> = new Map();
  private mockTokens: Map<string, { userId: string; expiresAt: Date }> = new Map();
  private tokenCounter = 1;

  constructor() {
    this.seedMockUsers();
  }

  async authenticate(email: string, password: string): Promise<MockAuthResult | null> {
    // Find user by email
    const user = Array.from(this.mockUsers.values()).find(u => u.email.value === email);
    
    if (!user) {
      return null;
    }

    // Simple password check (in real tests you'd use proper hashing)
    if (password !== 'password123') {
      return null;
    }

    // Generate mock token
    const token = `mock-token-${this.tokenCounter++}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store token mapping
    this.mockTokens.set(token, {
      userId: user.id,
      expiresAt
    });

    return {
      token,
      expiresAt,
      user: {
        id: user.id,
        email: user.email.value,
        role: user.role.value
      }
    };
  }

  async verifyToken(token: string): Promise<{ userId: string; email: string; role: string } | null> {
    const tokenData = this.mockTokens.get(token);
    
    if (!tokenData) {
      return null;
    }

    // Check if token is expired
    if (tokenData.expiresAt < new Date()) {
      this.mockTokens.delete(token);
      return null;
    }

    const user = this.mockUsers.get(tokenData.userId);
    if (!user) {
      return null;
    }

    return {
      userId: user.id,
      email: user.email.value,
      role: user.role.value
    };
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
