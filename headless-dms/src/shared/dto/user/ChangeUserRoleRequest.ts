import { z } from 'zod';

export const ChangeUserRoleRequestSchema = z.object({
  currentUserId: z.string().uuid('Invalid current user ID'),
  userId: z.string().uuid('Invalid user ID'),
  newRole: z.enum(['user', 'admin'], 'Invalid role'),
});

export type ChangeUserRoleRequest = z.infer<typeof ChangeUserRoleRequestSchema>; 