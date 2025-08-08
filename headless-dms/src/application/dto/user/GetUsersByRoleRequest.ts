import { z } from 'zod';

export const GetUsersByRoleRequestSchema = z.object({
  role: z.enum(['user', 'admin'], 'Invalid role'),
});

export type GetUsersByRoleRequest = z.infer<typeof GetUsersByRoleRequestSchema>; 