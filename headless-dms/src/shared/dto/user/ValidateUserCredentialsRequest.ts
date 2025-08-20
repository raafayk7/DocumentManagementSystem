import { z } from 'zod';

export const ValidateUserCredentialsRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password cannot be empty'),
});

export type ValidateUserCredentialsRequest = z.infer<typeof ValidateUserCredentialsRequestSchema>; 