import { z } from 'zod';

// Reusing existing LoginSchema from src/auth/dto/login.dto.ts
export const AuthenticateUserRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type AuthenticateUserRequest = z.infer<typeof AuthenticateUserRequestSchema>;
