import { z } from 'zod';

export const DeleteUserRequestSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

export type DeleteUserRequest = z.infer<typeof DeleteUserRequestSchema>; 