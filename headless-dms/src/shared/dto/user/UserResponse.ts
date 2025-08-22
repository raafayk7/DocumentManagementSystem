import { z } from 'zod';
import { AppResult } from '@carbonteq/hexapp';
import { nestWithKey, extractId, toSerialized } from '@carbonteq/hexapp';
import { BaseDto, type DtoValidationResult } from '../base/index.js';

export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['user', 'admin']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserResponse = z.infer<typeof UserResponseSchema>;

/**
 * User Response DTO that extends BaseDto
 * Provides structured response for user data
 */
export class UserResponseDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestUser = nestWithKey('user');
  private readonly nestUserData = nestWithKey('data');

  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly role: 'user' | 'admin',
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {
    super();
  }

  /**
   * Create UserResponseDto from user entity using hexapp composition
   */
  static fromEntity(user: any): UserResponseDto {
    const serialized = toSerialized(user) as any;
    return new UserResponseDto(
      extractId(user),
      serialized.email,
      serialized.role,
      serialized.createdAt,
      serialized.updatedAt
    );
  }

  /**
   * Create UserResponseDto from user entity data
   */
  static create(
    id: string,
    email: string,
    role: 'user' | 'admin',
    createdAt: Date,
    updatedAt: Date
  ): UserResponseDto {
    return new UserResponseDto(id, email, role, createdAt, updatedAt);
  }

  /**
   * Create nested user response using nestWithKey
   */
  toNestedResponse() {
    return this.nestUser(this.toPlain());
  }

  /**
   * Create nested data response using nestWithKey
   */
  toNestedData() {
    return this.nestUserData(this.toPlain());
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): UserResponse {
    return {
      id: this.id,
      email: this.email,
      role: this.role,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Validate user response structure
   */
  static validateStructure(data: unknown): DtoValidationResult<UserResponse> {
    return BaseDto.validate(UserResponseSchema, data);
  }
}

// For authentication responses
export const AuthenticateUserResponseSchema = z.object({
  token: z.string(),
  user: UserResponseSchema,
  expiresAt: z.date(),
});

export type AuthenticateUserResponse = z.infer<typeof AuthenticateUserResponseSchema>;

/**
 * Authenticate User Response DTO that extends BaseDto
 * Provides structured response for user authentication
 */
export class AuthenticateUserResponseDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestAuth = nestWithKey('auth');
  private readonly nestAuthData = nestWithKey('data');

  constructor(
    public readonly token: string,
    public readonly user: UserResponseDto,
    public readonly expiresAt: Date
  ) {
    super();
  }

  /**
   * Create AuthenticateUserResponseDto from authentication data
   */
  static create(
    token: string,
    user: UserResponseDto,
    expiresAt: Date
  ): AuthenticateUserResponseDto {
    return new AuthenticateUserResponseDto(token, user, expiresAt);
  }

  /**
   * Create nested auth response using nestWithKey
   */
  toNestedResponse() {
    return this.nestAuth(this.toPlain());
  }

  /**
   * Create nested data response using nestWithKey
   */
  toNestedData() {
    return this.nestAuthData(this.toPlain());
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): AuthenticateUserResponse {
    return {
      token: this.token,
      user: this.user.toPlain(),
      expiresAt: this.expiresAt
    };
  }

  /**
   * Validate authentication response structure
   */
  static validateStructure(data: unknown): DtoValidationResult<AuthenticateUserResponse> {
    return BaseDto.validate(AuthenticateUserResponseSchema, data);
  }
}

export const ChangeUserPasswordResponseSchema = z.object({
    success: z.boolean(),
    message: z.string(),
});

export type ChangeUserPasswordResponse = z.infer<typeof ChangeUserPasswordResponseSchema>;

/**
 * Change User Password Response DTO that extends BaseDto
 * Provides structured response for password change operations
 */
export class ChangeUserPasswordResponseDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestPassword = nestWithKey('password');
  private readonly nestChange = nestWithKey('change');
  private readonly nestResult = nestWithKey('result');

  constructor(
    public readonly success: boolean,
    public readonly message: string
  ) {
    super();
  }

  /**
   * Create ChangeUserPasswordResponseDto from operation result
   */
  static create(success: boolean, message: string): ChangeUserPasswordResponseDto {
    return new ChangeUserPasswordResponseDto(success, message);
  }

  /**
   * Create success response
   */
  static success(message: string = 'Password changed successfully'): ChangeUserPasswordResponseDto {
    return new ChangeUserPasswordResponseDto(true, message);
  }

  /**
   * Create error response
   */
  static error(message: string): ChangeUserPasswordResponseDto {
    return new ChangeUserPasswordResponseDto(false, message);
  }

  /**
   * Create nested password response using nestWithKey
   */
  toNestedPassword() {
    return this.nestPassword(this.toPlain());
  }

  /**
   * Create nested change response using nestWithKey
   */
  toNestedChange() {
    return this.nestChange(this.toPlain());
  }

  /**
   * Create nested result response using nestWithKey
   */
  toNestedResult() {
    return this.nestResult(this.toPlain());
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): ChangeUserPasswordResponse {
    return {
      success: this.success,
      message: this.message
    };
  }
}

export const ChangeUserRoleResponseSchema = z.object({
    success: z.boolean(),
    message: z.string(),
});

export type ChangeUserRoleResponse = z.infer<typeof ChangeUserRoleResponseSchema>;

/**
 * Change User Role Response DTO that extends BaseDto
 * Provides structured response for role change operations
 */
export class ChangeUserRoleResponseDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestRole = nestWithKey('role');
  private readonly nestChange = nestWithKey('change');
  private readonly nestResult = nestWithKey('result');

  constructor(
    public readonly success: boolean,
    public readonly message: string
  ) {
    super();
  }

  /**
   * Create ChangeUserRoleResponseDto from operation result
   */
  static create(success: boolean, message: string): ChangeUserRoleResponseDto {
    return new ChangeUserRoleResponseDto(success, message);
  }

  /**
   * Create success response
   */
  static success(message: string = 'User role changed successfully'): ChangeUserRoleResponseDto {
    return new ChangeUserRoleResponseDto(true, message);
  }

  /**
   * Create error response
   */
  static error(message: string): ChangeUserRoleResponseDto {
    return new ChangeUserRoleResponseDto(false, message);
  }

  /**
   * Create nested role response using nestWithKey
   */
  toNestedRole() {
    return this.nestRole(this.toPlain());
  }

  /**
   * Create nested change response using nestWithKey
   */
  toNestedChange() {
    return this.nestChange(this.toPlain());
  }

  /**
   * Create nested result response using nestWithKey
   */
  toNestedResult() {
    return this.nestResult(this.toPlain());
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): ChangeUserRoleResponse {
    return {
      success: this.success,
      message: this.message
    };
  }
}

export const DeleteUserResponseSchema = z.object({
    success: z.boolean(),
    message: z.string(),
});

export type DeleteUserResponse = z.infer<typeof DeleteUserResponseSchema>;

/**
 * Delete User Response DTO that extends BaseDto
 * Provides structured response for user deletion operations
 */
export class DeleteUserResponseDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestDelete = nestWithKey('delete');
  private readonly nestRemoval = nestWithKey('removal');
  private readonly nestResult = nestWithKey('result');

  constructor(
    public readonly success: boolean,
    public readonly message: string
  ) {
    super();
  }

  /**
   * Create DeleteUserResponseDto from operation result
   */
  static create(success: boolean, message: string): DeleteUserResponseDto {
    return new DeleteUserResponseDto(success, message);
  }

  /**
   * Create success response
   */
  static success(message: string = 'User deleted successfully'): DeleteUserResponseDto {
    return new DeleteUserResponseDto(true, message);
  }

  /**
   * Create error response
   */
  static error(message: string): DeleteUserResponseDto {
    return new DeleteUserResponseDto(false, message);
  }

  /**
   * Create nested delete response using nestWithKey
   */
  toNestedDelete() {
    return this.nestDelete(this.toPlain());
  }

  /**
   * Create nested removal response using nestWithKey
   */
  toNestedRemoval() {
    return this.nestRemoval(this.toPlain());
  }

  /**
   * Create nested result response using nestWithKey
   */
  toNestedResult() {
    return this.nestResult(this.toPlain());
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): DeleteUserResponse {
    return {
      success: this.success,
      message: this.message
    };
  }
}

// For paginated user responses
export const PaginatedUsersResponseSchema = z.object({
  users: z.array(UserResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

export type PaginatedUsersResponse = z.infer<typeof PaginatedUsersResponseSchema>;

/**
 * Paginated Users Response DTO that extends BaseDto
 * Provides structured response for paginated user lists
 */
export class PaginatedUsersResponseDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestUsers = nestWithKey('users');
  private readonly nestData = nestWithKey('data');
  private readonly nestPaginated = nestWithKey('paginated');

  constructor(
    public readonly users: UserResponseDto[],
    public readonly pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    }
  ) {
    super();
  }

  /**
   * Create PaginatedUsersResponseDto from users and pagination info
   */
  static create(
    users: UserResponseDto[],
    page: number,
    limit: number,
    total: number
  ): PaginatedUsersResponseDto {
    const totalPages = Math.ceil(total / limit);
    const pagination = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
    
    return new PaginatedUsersResponseDto(users, pagination);
  }

  /**
   * Create nested users response using nestWithKey
   */
  toNestedUsers() {
    return this.nestUsers(this.toPlain());
  }

  /**
   * Create nested data response using nestWithKey
   */
  toNestedData() {
    return this.nestData(this.toPlain());
  }

  /**
   * Create nested paginated response using nestWithKey
   */
  toNestedPaginated() {
    return this.nestPaginated(this.toPlain());
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): PaginatedUsersResponse {
    return {
      users: this.users.map(user => user.toPlain()),
      pagination: this.pagination
    };
  }
}

// For single user responses
export const GetUserByIdResponseSchema = z.object({
  user: UserResponseSchema,
});

export type GetUserByIdResponse = z.infer<typeof GetUserByIdResponseSchema>;

/**
 * Get User By ID Response DTO that extends BaseDto
 * Provides structured response for single user lookup
 */
export class GetUserByIdResponseDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestUser = nestWithKey('user');
  private readonly nestData = nestWithKey('data');
  private readonly nestLookup = nestWithKey('lookup');

  constructor(
    public readonly user: UserResponseDto
  ) {
    super();
  }

  /**
   * Create GetUserByIdResponseDto from user data
   */
  static create(user: UserResponseDto): GetUserByIdResponseDto {
    return new GetUserByIdResponseDto(user);
  }

  /**
   * Create nested user response using nestWithKey
   */
  toNestedUser() {
    return this.nestUser(this.toPlain());
  }

  /**
   * Create nested data response using nestWithKey
   */
  toNestedData() {
    return this.nestData(this.toPlain());
  }

  /**
   * Create nested lookup response using nestWithKey
   */
  toNestedLookup() {
    return this.nestLookup(this.toPlain());
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): GetUserByIdResponse {
    return {
      user: this.user.toPlain()
    };
  }
}

export const GetUsersResponseSchema = z.object({
  users: z.array(UserResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

export type GetUsersResponse = z.infer<typeof GetUsersResponseSchema>;

/**
 * Get Users Response DTO that extends BaseDto (alias for PaginatedUsersResponseDto)
 * Provides structured response for user listing with pagination
 */
export class GetUsersResponseDto extends PaginatedUsersResponseDto {
  /**
   * Convert to GetUsersResponse type (same as PaginatedUsersResponse)
   */
  toPlain(): GetUsersResponse {
    return super.toPlain();
  }
}

export const GetUserByEmailResponseSchema = z.object({
  user: UserResponseSchema,
});

export type GetUserByEmailResponse = z.infer<typeof GetUserByEmailResponseSchema>;

/**
 * Get User By Email Response DTO that extends BaseDto
 * Provides structured response for user lookup by email
 */
export class GetUserByEmailResponseDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestUser = nestWithKey('user');
  private readonly nestEmail = nestWithKey('email');
  private readonly nestLookup = nestWithKey('lookup');

  constructor(
    public readonly user: UserResponseDto
  ) {
    super();
  }

  /**
   * Create GetUserByEmailResponseDto from user data
   */
  static create(user: UserResponseDto): GetUserByEmailResponseDto {
    return new GetUserByEmailResponseDto(user);
  }

  /**
   * Create nested user response using nestWithKey
   */
  toNestedUser() {
    return this.nestUser(this.toPlain());
  }

  /**
   * Create nested email response using nestWithKey
   */
  toNestedEmail() {
    return this.nestEmail(this.toPlain());
  }

  /**
   * Create nested lookup response using nestWithKey
   */
  toNestedLookup() {
    return this.nestLookup(this.toPlain());
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): GetUserByEmailResponse {
    return {
      user: this.user.toPlain()
    };
  }
}

// For users by role responses
export const GetUsersByRoleResponseSchema = z.object({
  users: z.array(UserResponseSchema),
  total: z.number(),
});

export type GetUsersByRoleResponse = z.infer<typeof GetUsersByRoleResponseSchema>;

/**
 * Get Users By Role Response DTO that extends BaseDto
 * Provides structured response for user lookup by role
 */
export class GetUsersByRoleResponseDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestUsers = nestWithKey('users');
  private readonly nestRole = nestWithKey('role');
  private readonly nestFilter = nestWithKey('filter');

  constructor(
    public readonly users: UserResponseDto[],
    public readonly total: number
  ) {
    super();
  }

  /**
   * Create GetUsersByRoleResponseDto from users data
   */
  static create(users: UserResponseDto[], total: number): GetUsersByRoleResponseDto {
    return new GetUsersByRoleResponseDto(users, total);
  }

  /**
   * Create nested users response using nestWithKey
   */
  toNestedUsers() {
    return this.nestUsers(this.toPlain());
  }

  /**
   * Create nested role response using nestWithKey
   */
  toNestedRole() {
    return this.nestRole(this.toPlain());
  }

  /**
   * Create nested filter response using nestWithKey
   */
  toNestedFilter() {
    return this.nestFilter(this.toPlain());
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): GetUsersByRoleResponse {
    return {
      users: this.users.map(user => user.toPlain()),
      total: this.total
    };
  }
}

// For credential validation responses
export const ValidateUserCredentialsResponseSchema = z.object({
  isValid: z.boolean(),
  user: UserResponseSchema.optional(),
});

export type ValidateUserCredentialsResponse = z.infer<typeof ValidateUserCredentialsResponseSchema>;

/**
 * Validate User Credentials Response DTO that extends BaseDto
 * Provides structured response for credential validation
 */
export class ValidateUserCredentialsResponseDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestValidation = nestWithKey('validation');
  private readonly nestCredentials = nestWithKey('credentials');
  private readonly nestVerify = nestWithKey('verify');

  constructor(
    public readonly isValid: boolean,
    public readonly user?: UserResponseDto
  ) {
    super();
  }

  /**
   * Create ValidateUserCredentialsResponseDto from validation result
   */
  static create(isValid: boolean, user?: UserResponseDto): ValidateUserCredentialsResponseDto {
    return new ValidateUserCredentialsResponseDto(isValid, user);
  }

  /**
   * Create success response with user
   */
  static success(user: UserResponseDto): ValidateUserCredentialsResponseDto {
    return new ValidateUserCredentialsResponseDto(true, user);
  }

  /**
   * Create failure response
   */
  static failure(): ValidateUserCredentialsResponseDto {
    return new ValidateUserCredentialsResponseDto(false);
  }

  /**
   * Create nested validation response using nestWithKey
   */
  toNestedValidation() {
    return this.nestValidation(this.toPlain());
  }

  /**
   * Create nested credentials response using nestWithKey
   */
  toNestedCredentials() {
    return this.nestCredentials(this.toPlain());
  }

  /**
   * Create nested verify response using nestWithKey
   */
  toNestedVerify() {
    return this.nestVerify(this.toPlain());
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): ValidateUserCredentialsResponse {
    return {
      isValid: this.isValid,
      user: this.user?.toPlain()
    };
  }
}