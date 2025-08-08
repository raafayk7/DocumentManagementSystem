import { z } from 'zod';

export const GetUserByEmailRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export type GetUserByEmailRequest = z.infer<typeof GetUserByEmailRequestSchema>; 