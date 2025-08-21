import { AppResult, BaseEntity, UUID } from '@carbonteq/hexapp';
import * as bcrypt from 'bcrypt';
import { Email } from '../value-objects/Email.js';
import { Password } from '../value-objects/Password.js';
import { UserRole } from '../value-objects/UserRole.js';

export interface UserProps {
  email: Email;
  passwordHash: string;
  role: UserRole;
}

export class User extends BaseEntity {
  private readonly _email: Email;
  private readonly _passwordHash: string;
  private readonly _role: UserRole;

  private constructor(props: UserProps) {
    super();
    this._email = props.email;
    this._passwordHash = props.passwordHash;
    this._role = props.role;
  }

  // Getters (read-only access)
  get email(): Email { return this._email; }
  get passwordHash(): string { return this._passwordHash; }
  get role(): UserRole { return this._role; }

  // Factory method for creating new users
  static async create(email: string, password: string, role: string): Promise<AppResult<User>> {
    // Validate email using Email value object
    const emailResult = Email.create(email);
    if (emailResult.isErr()) {
      return AppResult.Err(emailResult.unwrapErr());
    }

    // Validate password using Password value object
    const passwordResult = Password.create(password);
    if (passwordResult.isErr()) {
      return AppResult.Err(passwordResult.unwrapErr());
    }

    // Validate role using UserRole value object
    const roleResult = UserRole.create(role);
    if (roleResult.isErr()) {
      return AppResult.Err(roleResult.unwrapErr());
    }

    // Hash password
    const passwordHash = await User.hashPassword(password);

    const userProps: UserProps = {
      email: emailResult.unwrap(),
      passwordHash,
      role: roleResult.unwrap()
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
      return AppResult.Err(emailResult.unwrapErr());
    }

    // Validate role
    const roleResult = UserRole.create(props.role);
    if (roleResult.isErr()) {
      return AppResult.Err(roleResult.unwrapErr());
    }

    const user = new User({
      email: emailResult.unwrap(),
      passwordHash: props.passwordHash,
      role: roleResult.unwrap()
    });

    // Set the base properties from repository data
    user._fromSerialized({
      id: props.id,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt
    });

    return AppResult.Ok(user);
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
      return AppResult.Err(passwordResult.unwrapErr());
    }

    const newPasswordHash = await User.hashPassword(newPassword);
    const updatedProps: UserProps = {
      email: this._email,
      passwordHash: newPasswordHash,
      role: this._role
    };

    const updatedUser = new User(updatedProps);
    updatedUser._copyBaseProps(this);
    updatedUser.markUpdated();

    return AppResult.Ok(updatedUser);
  }

  changeRole(newRole: string): AppResult<User> {
    // Validate new role using UserRole value object
    const roleResult = UserRole.create(newRole);
    if (roleResult.isErr()) {
      return AppResult.Err(roleResult.unwrapErr());
    }

    const updatedProps: UserProps = {
      email: this._email,
      passwordHash: this._passwordHash,
      role: roleResult.unwrap()
    };

    const updatedUser = new User(updatedProps);
    updatedUser._copyBaseProps(this);
    updatedUser.markUpdated();

    return AppResult.Ok(updatedUser);
  }

  changeEmail(newEmail: string): AppResult<User> {
    // Validate new email using Email value object
    const emailResult = Email.create(newEmail);
    if (emailResult.isErr()) {
      return AppResult.Err(emailResult.unwrapErr());
    }

    const updatedProps: UserProps = {
      email: emailResult.unwrap(),
      passwordHash: this._passwordHash,
      role: this._role
    };

    const updatedUser = new User(updatedProps);
    updatedUser._copyBaseProps(this);
    updatedUser.markUpdated();

    return AppResult.Ok(updatedUser);
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
    return this.createdAt < cutoffDate;
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
      id: this.id,
      email: this._email.value,
      passwordHash: this._passwordHash,
      role: this._role.value,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Implement serialize method for hexapp BaseEntity
  serialize() {
    return {
      ...super._serialize(),
      email: this._email.value,
      passwordHash: this._passwordHash,
      role: this._role.value
    };
  }
} 