import { z } from 'zod';

export const GetUsersRequestSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  search: z.string().optional(),
  email: z.string().email().optional(),
  role: z.enum(['user', 'admin']).optional(),
  sortBy: z.enum(['email', 'role', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type GetUsersRequest = z.infer<typeof GetUsersRequestSchema>; 