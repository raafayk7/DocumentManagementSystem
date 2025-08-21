import { AppResult } from '@carbonteq/hexapp';
import * as bcrypt from 'bcrypt';
import { Email } from '../value-objects/Email.js';
import { Password } from '../value-objects/Password.js';
import { UserRole } from '../value-objects/UserRole.js';

export interface UserProps {
  id: string;
  email: Email;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  private readonly _id: string;
  private readonly _email: Email;
  private readonly _passwordHash: string;
  private readonly _role: UserRole;
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
  get email(): Email { return this._email; }
  get passwordHash(): string { return this._passwordHash; }
  get role(): UserRole { return this._role; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  // Factory method for creating new users
  static async create(email: string, password: string, role: string): Promise<AppResult<User>> {
    // Validate email using Email value object
    const emailResult = Email.create(email);
    if (emailResult.isErr()) {
      return AppResult.Err(new Error(emailResult.unwrapErr().message));
    }

    // Validate password using Password value object
    const passwordResult = Password.create(password);
    if (passwordResult.isErr()) {
      return AppResult.Err(new Error(passwordResult.unwrapErr().message));
    }

    // Validate role using UserRole value object
    const roleResult = UserRole.create(role);
    if (roleResult.isErr()) {
      return AppResult.Err(new Error(roleResult.unwrapErr().message));
    }

    // Hash password
    const passwordHash = await User.hashPassword(password);

    const userProps: UserProps = {
      id: crypto.randomUUID(),
      email: emailResult.unwrap(),
      passwordHash,
      role: roleResult.unwrap(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return AppResult.Ok(new User(userProps));
  }

  // Factory method for creating from repository data
  static fromRepository(props: {
    id: string;
    email: string;
    passwordHash: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  }): AppResult<User> {
    // Validate email
    const emailResult = Email.create(props.email);
    if (emailResult.isErr()) {
      return AppResult.Err(new Error(`Invalid email in repository data: ${emailResult.unwrapErr()}`));
    }

    // Validate role
    const roleResult = UserRole.create(props.role);
    if (roleResult.isErr()) {
      return AppResult.Err(new Error(`Invalid role in repository data: ${roleResult.unwrapErr()}`));
    }

    const userProps: UserProps = {
      id: props.id,
      email: emailResult.unwrap(),
      passwordHash: props.passwordHash,
      role: roleResult.unwrap(),
      createdAt: props.createdAt,
      updatedAt: props.updatedAt
    };

    return AppResult.Ok(new User(userProps));
  }

  // Password hashing using bcrypt
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }

  // State-changing operations
  async changePassword(newPassword: string): Promise<AppResult<User>> {
    // Validate new password using Password value object
    const passwordResult = Password.create(newPassword);
    if (passwordResult.isErr()) {
      return AppResult.Err(new Error(passwordResult.unwrapErr().message));
    }

    const newPasswordHash = await User.hashPassword(newPassword);
    const updatedProps: UserProps = {
      id: this._id,
      email: this._email,
      passwordHash: newPasswordHash,
      role: this._role,
      createdAt: this._createdAt,
      updatedAt: new Date()
    };

    return AppResult.Ok(new User(updatedProps));
  }

  changeRole(newRole: string): AppResult<User> {
    // Validate new role using UserRole value object
    const roleResult = UserRole.create(newRole);
    if (roleResult.isErr()) {
      return AppResult.Err(new Error(roleResult.unwrapErr().message));
    }

    const updatedProps: UserProps = {
      id: this._id,
      email: this._email,
      passwordHash: this._passwordHash,
      role: roleResult.unwrap(),
      createdAt: this._createdAt,
      updatedAt: new Date()
    };

    return AppResult.Ok(new User(updatedProps));
  }

  changeEmail(newEmail: string): AppResult<User> {
    // Validate new email using Email value object
    const emailResult = Email.create(newEmail);
    if (emailResult.isErr()) {
      return AppResult.Err(new Error(emailResult.unwrapErr().message));
    }

    const updatedProps: UserProps = {
      id: this._id,
      email: emailResult.unwrap(),
      passwordHash: this._passwordHash,
      role: this._role,
      createdAt: this._createdAt,
      updatedAt: new Date()
    };

    return AppResult.Ok(new User(updatedProps));
  }

  // Business rule: Password verification
  async verifyPassword(password: string): Promise<boolean> {
    return await bcrypt.compare(password, this._passwordHash);
  }

  // Business rule: Role-based permissions
  hasPermission(requiredRole: 'user' | 'admin'): boolean {
    if (requiredRole === 'user') {
      return this._role.isUser || this._role.isAdmin;
    }
    return this._role.isAdmin;
  }

  // Business rule: Account age validation
  isAccountOlderThan(days: number): boolean {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return this._createdAt < cutoffDate;
  }

  // Convert to plain object for repository
  toRepository(): {
    id: string;
    email: string;
    passwordHash: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: this._id,
      email: this._email.value,
      passwordHash: this._passwordHash,
      role: this._role.value,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }
} 