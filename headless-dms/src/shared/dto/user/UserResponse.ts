import { z } from 'zod';

export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['user', 'admin']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserResponse = z.infer<typeof UserResponseSchema>;

// For authentication responses
export const AuthenticateUserResponseSchema = z.object({
  token: z.string(),
  user: UserResponseSchema,
  expiresAt: z.date(),
});

export type AuthenticateUserResponse = z.infer<typeof AuthenticateUserResponseSchema>;

export const ChangeUserPasswordResponseSchema = z.object({
    success: z.boolean(),
    message: z.string(),
});

export type ChangeUserPasswordResponse = z.infer<typeof ChangeUserPasswordResponseSchema>;

export const ChangeUserRoleResponseSchema = z.object({
    success: z.boolean(),
    message: z.string(),
});

export type ChangeUserRoleResponse = z.infer<typeof ChangeUserRoleResponseSchema>;

export const DeleteUserResponseSchema = z.object({
    success: z.boolean(),
    message: z.string(),
});

export type DeleteUserResponse = z.infer<typeof DeleteUserResponseSchema>;

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

// For single user responses
export const GetUserByIdResponseSchema = z.object({
  user: UserResponseSchema,
});

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

export type GetUserByIdResponse = z.infer<typeof GetUserByIdResponseSchema>;

export const GetUserByEmailResponseSchema = z.object({
  user: UserResponseSchema,
});

export type GetUserByEmailResponse = z.infer<typeof GetUserByEmailResponseSchema>;

// For users by role responses
export const GetUsersByRoleResponseSchema = z.object({
  users: z.array(UserResponseSchema),
  total: z.number(),
});

export type GetUsersByRoleResponse = z.infer<typeof GetUsersByRoleResponseSchema>;

// For credential validation responses
export const ValidateUserCredentialsResponseSchema = z.object({
  isValid: z.boolean(),
  user: UserResponseSchema.optional(),
});

export type ValidateUserCredentialsResponse = z.infer<typeof ValidateUserCredentialsResponseSchema>;