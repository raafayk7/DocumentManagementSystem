import { ZodSchema } from 'zod';

export function zodValidate<T>(schema: ZodSchema<T>, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (error: any) {
    // Zod errors have a .errors property
    if (error.errors) {
      const message = error.errors.map((e: any) => e.message).join(', ');
      const err = new Error(message);
      (err as any).statusCode = 400;
      throw err;
    }
    const err = new Error(error.message || 'Validation failed');
    (err as any).statusCode = 400;
    throw err;
  }
}
