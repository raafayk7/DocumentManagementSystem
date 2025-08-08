import { z } from 'zod';

export const ChangeUserPasswordRequestSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export type ChangeUserPasswordRequest = z.infer<typeof ChangeUserPasswordRequestSchema>; 