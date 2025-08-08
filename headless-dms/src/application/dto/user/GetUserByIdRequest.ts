import { z } from 'zod';

export const GetUserByIdRequestSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

export type GetUserByIdRequest = z.infer<typeof GetUserByIdRequestSchema>; 