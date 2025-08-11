import { z } from 'zod';

export const ChangeUserPasswordRequestSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export type ChangeUserPasswordRequest = z.infer<typeof ChangeUserPasswordRequestSchema>; 