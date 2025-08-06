// src/validation/technical/simple.validator.ts
import { z } from 'zod';

/**
 * Simple Zod validation wrapper for backward compatibility
 * This replaces the old zodValidate function from pipes
 */
export function zodValidate<T>(schema: z.ZodSchema<T>, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (error: any) {
    // Zod errors have a .issues property in newer versions
    if (error.issues) {
      const message = error.issues.map((e: z.ZodIssue) => e.message).join(', ');
      const err = new Error(message);
      (err as any).statusCode = 400;
      throw err;
    }
    const err = new Error(error.message || 'Validation failed');
    (err as any).statusCode = 400;
    throw err;
  }
}

/**
 * Safe parse wrapper for non-throwing validation
 */
export function zodSafeValidate<T>(schema: z.ZodSchema<T>, value: unknown): z.ZodSafeParseResult<T> {
  return schema.safeParse(value);
} 