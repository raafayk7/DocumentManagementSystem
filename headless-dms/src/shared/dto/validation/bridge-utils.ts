/**
 * Bridge utilities that mimic hexapp's safeParseResult and handleZodErr
 * These provide compatibility between our custom BaseDto and hexapp patterns
 */
import { z, ZodError } from 'zod';
import { AppResult } from '@carbonteq/hexapp';
import { DtoValidationError } from '../base/index.js';

/**
 * Mimics hexapp's safeParseResult utility
 * Safely parses Zod schemas and returns AppResult
 */
export function safeParseResult<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): AppResult<T> {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return AppResult.Ok(result.data);
  }
  
  const validationError = DtoValidationError.fromZodError(result.error);
  return AppResult.Err(validationError);
}

/**
 * Mimics hexapp's handleZodErr utility
 * Transforms ZodError into standardized error format
 */
export function handleZodErr(error: ZodError): DtoValidationError {
  return DtoValidationError.fromZodError(error);
}

/**
 * Enhanced validation utilities for middleware integration
 */
export class ValidationBridge {
  /**
   * Validates request body using DTO classes
   */
  static validateRequestBody<T>(
    DtoClass: { create: (data: unknown) => AppResult<T> },
    requestBody: unknown
  ): AppResult<T> {
    return DtoClass.create(requestBody);
  }

  /**
   * Validates query parameters using Zod schema
   */
  static validateQueryParams<T>(
    schema: z.ZodSchema<T>,
    queryParams: unknown
  ): AppResult<T> {
    return safeParseResult(schema, queryParams);
  }

  /**
   * Validates path parameters using Zod schema
   */
  static validatePathParams<T>(
    schema: z.ZodSchema<T>,
    pathParams: unknown
  ): AppResult<T> {
    return safeParseResult(schema, pathParams);
  }

  /**
   * Formats validation errors for HTTP responses
   */
  static formatValidationError(error: DtoValidationError) {
    return {
      success: false,
      message: 'Validation failed',
      error: error.message,
      details: error.zodError ? {
        issues: error.zodError.issues.map(issue => ({
          field: issue.path.join('.') || 'root',
          message: issue.message,
          code: issue.code,
          received: issue.received
        }))
      } : undefined
    };
  }

  /**
   * Creates validation middleware for request bodies
   */
  static createBodyValidationMiddleware<T>(
    DtoClass: { create: (data: unknown) => AppResult<T> }
  ) {
    return (request: any, reply: any, done: any) => {
      const validationResult = ValidationBridge.validateRequestBody(DtoClass, request.body);
      
      if (validationResult.isOk()) {
        // Store validated data for the route handler
        request.validatedBody = validationResult.unwrap();
        done();
      } else {
        const error = validationResult.unwrapErr();
        const formattedError = ValidationBridge.formatValidationError(error);
        reply.code(400).send(formattedError);
      }
    };
  }

  /**
   * Creates validation middleware for query parameters
   */
  static createQueryValidationMiddleware<T>(
    schema: z.ZodSchema<T>
  ) {
    return (request: any, reply: any, done: any) => {
      const validationResult = ValidationBridge.validateQueryParams(schema, request.query);
      
      if (validationResult.isOk()) {
        // Store validated query parameters
        request.validatedQuery = validationResult.unwrap();
        done();
      } else {
        const error = validationResult.unwrapErr();
        const formattedError = ValidationBridge.formatValidationError(error);
        reply.code(400).send(formattedError);
      }
    };
  }

  /**
   * Creates validation middleware for path parameters
   */
  static createParamsValidationMiddleware<T>(
    schema: z.ZodSchema<T>
  ) {
    return (request: any, reply: any, done: any) => {
      const validationResult = ValidationBridge.validatePathParams(schema, request.params);
      
      if (validationResult.isOk()) {
        // Store validated path parameters
        request.validatedParams = validationResult.unwrap();
        done();
      } else {
        const error = validationResult.unwrapErr();
        const formattedError = ValidationBridge.formatValidationError(error);
        reply.code(400).send(formattedError);
      }
    };
  }
}

/**
 * Legacy compatibility utilities
 * These help bridge the gap between old validation system and new DTO patterns
 */
export class LegacyBridge {
  /**
   * Converts DTO validation result to legacy ValidationResult format
   */
  static toLegacyValidationResult<T>(
    appResult: AppResult<T>,
    technicalOnly: boolean = false
  ) {
    if (appResult.isOk()) {
      return {
        success: true,
        data: appResult.unwrap(),
        errors: [],
        technicalErrors: [],
        businessErrors: [],
        message: 'Validation successful'
      };
    }

    const error = appResult.unwrapErr();
    const validationError = {
      field: 'input',
      message: error.message,
      code: 'VALIDATION_ERROR',
      type: technicalOnly ? 'technical' as const : 'business' as const,
      severity: 'error' as const
    };

    return {
      success: false,
      errors: [validationError],
      technicalErrors: technicalOnly ? [validationError] : [],
      businessErrors: technicalOnly ? [] : [validationError],
      message: error.message
    };
  }

  /**
   * Wraps a DTO validation in legacy orchestrator format
   */
  static wrapDtoValidation<T>(
    DtoClass: { create: (data: unknown) => AppResult<T> },
    data: unknown,
    context?: any
  ) {
    const result = DtoClass.create(data);
    return LegacyBridge.toLegacyValidationResult(result, true); // Mark as technical validation
  }
}
