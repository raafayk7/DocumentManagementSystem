import { Result } from '@carbonteq/fp';
import * as bcrypt from 'bcrypt';

export interface UserProps {
  id: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  private readonly _id: string;
  private readonly _email: string;
  private readonly _passwordHash: string;
  private readonly _role: 'user' | 'admin';
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;

  private constructor(props: UserProps) {
    this._id = props.id;
    this._email = props.email;
    this._passwordHash = props.passwordHash;
    this._role = props.role;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  // Getters (read-only access)
  get id(): string { return this._id; }
  get email(): string { return this._email; }
  get passwordHash(): string { return this._passwordHash; }
  get role(): 'user' | 'admin' { return this._role; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  // Factory method for creating new users
  static async create(email: string, password: string, role: 'user' | 'admin'): Promise<Result<User, string>> {
    // Basic validation
    if (!User.validateEmail(email)) {
      return Result.Err('Invalid email format');
    }

    if (!User.validatePassword(password)) {
      return Result.Err('Password must be at least 8 characters');
    }

    if (!User.validateRole(role)) {
      return Result.Err('Role must be either "user" or "admin"');
    }

    // Hash password
    const passwordHash = await User.hashPassword(password);

    const userProps: UserProps = {
      id: crypto.randomUUID(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return Result.Ok(new User(userProps));
  }

  // Factory method for creating from repository data
  static fromRepository(props: UserProps): User {
    return new User(props);
  }

  // Validation methods
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePassword(password: string): boolean {
    return password.length >= 8;
  }

  static validateRole(role: string): role is 'user' | 'admin' {
    return role === 'user' || role === 'admin';
  }

  // Password hashing using bcrypt
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }

  // State-changing operations
  async changePassword(newPassword: string): Promise<Result<User, string>> {
    if (!User.validatePassword(newPassword)) {
      return Result.Err('Password must be at least 8 characters');
    }

    const newPasswordHash = await User.hashPassword(newPassword);
    const updatedProps: UserProps = {
      ...this.toRepository(),
      passwordHash: newPasswordHash,
      updatedAt: new Date()
    };

    return Result.Ok(new User(updatedProps));
  }

  changeRole(newRole: 'user' | 'admin'): Result<User, string> {
    if (!User.validateRole(newRole)) {
      return Result.Err('Role must be either "user" or "admin"');
    }

    const updatedProps: UserProps = {
      ...this.toRepository(),
      role: newRole,
      updatedAt: new Date()
    };

    return Result.Ok(new User(updatedProps));
  }

  changeEmail(newEmail: string): Result<User, string> {
    if (!User.validateEmail(newEmail)) {
      return Result.Err('Invalid email format');
    }

    const updatedProps: UserProps = {
      ...this.toRepository(),
      email: newEmail.toLowerCase().trim(),
      updatedAt: new Date()
    };

    return Result.Ok(new User(updatedProps));
  }

  // Business rule: Password verification
  async verifyPassword(password: string): Promise<boolean> {
    return await bcrypt.compare(password, this._passwordHash);
  }

  // Business rule: Role-based permissions
  hasPermission(requiredRole: 'user' | 'admin'): boolean {
    if (requiredRole === 'user') {
      return this._role === 'user' || this._role === 'admin';
    }
    return this._role === 'admin';
  }

  // Business rule: Account age validation
  isAccountOlderThan(days: number): boolean {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return this._createdAt < cutoffDate;
  }

  // Convert to plain object for repository
  toRepository(): UserProps {
    return {
      id: this._id,
      email: this._email,
      passwordHash: this._passwordHash,
      role: this._role,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }
} 