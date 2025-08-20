import { z } from 'zod';

// Reusing existing RegisterSchema from src/auth/dto/register.dto.ts
export const CreateUserRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['user', 'admin']),
});

export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
