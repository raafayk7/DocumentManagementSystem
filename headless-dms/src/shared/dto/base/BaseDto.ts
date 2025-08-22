import { type ZodType, type ZodError, z } from 'zod';
import { AppResult, AppError } from '@carbonteq/hexapp';

/**
 * Validation error for DTO validation failures
 * Mimics hexapp's DtoValidationError but adapted for our Zod version
 */
export class DtoValidationError extends Error {
  constructor(message: string, public readonly zodError?: ZodError) {
    super(message);
    this.name = 'DtoValidationError';
  }

  static fromZodError(error: ZodError): DtoValidationError {
    const prettyMessage = error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    
    return new DtoValidationError(`Validation failed: ${prettyMessage}`, error);
  }
}

/**
 * Result type for DTO validation
 */
export type DtoValidationResult<T> = AppResult<T>;

/**
 * Base DTO class that mimics hexapp's BaseDto but works with Zod 4.x
 * Provides validation functionality for all DTOs
 */
export abstract class BaseDto {
  protected constructor() {}

  /**
   * Validate data against a schema and return AppResult
   * Mimics hexapp's BaseDto.validate() method
   */
  protected static validate<T>(
    schema: ZodType<T>,
    data: unknown
  ): DtoValidationResult<T> {
    try {
      const result = schema.safeParse(data);
      
      if (result.success) {
        return AppResult.Ok(result.data);
      } else {
        const validationError = DtoValidationError.fromZodError(result.error);
        return AppResult.Err(AppError.InvalidData(validationError.message));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown validation error';
      return AppResult.Err(AppError.Generic(`Validation failed: ${message}`));
    }
  }

  /**
   * Utility method to handle Zod errors consistently
   * Mimics hexapp's handleZodErr utility
   */
  protected static handleZodErr(error: ZodError): AppError {
    const validationError = DtoValidationError.fromZodError(error);
    return AppError.InvalidData(validationError.message);
  }

  /**
   * Safe parse utility that mimics hexapp's safeParseResult
   * Returns AppResult instead of Result for consistency with our architecture
   */
  protected static safeParseResult<T>(
    schema: ZodType<T>,
    data: unknown
  ): DtoValidationResult<T> {
    return this.validate(schema, data);
  }
}
