// src/validation/pipeline/error.handler.ts
import { z } from 'zod';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  type: 'technical' | 'business';
}

export class ValidationErrorHandler {
  /**
   * Format Zod validation errors
   */
  static formatZodErrors(zodError: z.ZodError): ValidationError[] {
    return zodError.issues.map((error: z.ZodIssue) => ({
      field: error.path.join('.'),
      message: error.message,
      code: 'VALIDATION_ERROR',
      type: 'technical' as const,
    }));
  }

  /**
   * Format technical validation errors
   */
  static formatTechnicalErrors(errors: string[]): ValidationError[] {
    return errors.map(error => ({
      field: 'input',
      message: error,
      code: 'TECHNICAL_VALIDATION_ERROR',
      type: 'technical' as const,
    }));
  }

  /**
   * Format business validation errors
   */
  static formatBusinessErrors(errors: string[]): ValidationError[] {
    return errors.map(error => ({
      field: 'business_rule',
      message: error,
      code: 'BUSINESS_VALIDATION_ERROR',
      type: 'business' as const,
    }));
  }

  /**
   * Format validation result for HTTP response
   */
  static formatForHttpResponse(errors: ValidationError[]) {
    const technicalErrors = errors.filter(e => e.type === 'technical');
    const businessErrors = errors.filter(e => e.type === 'business');

    return {
      success: false,
      errors: {
        technical: technicalErrors,
        business: businessErrors,
        total: errors.length,
      },
      message: 'Validation failed',
    };
  }

  /**
   * Create user-friendly error messages
   */
  static createUserFriendlyMessage(errors: ValidationError[]): string {
    if (errors.length === 0) return 'Validation successful';

    const technicalCount = errors.filter(e => e.type === 'technical').length;
    const businessCount = errors.filter(e => e.type === 'business').length;

    if (technicalCount > 0 && businessCount > 0) {
      return `Please fix ${technicalCount} input error(s) and ${businessCount} business rule violation(s)`;
    } else if (technicalCount > 0) {
      return `Please fix ${technicalCount} input error(s)`;
    } else {
      return `Please fix ${businessCount} business rule violation(s)`;
    }
  }

  /**
   * Group errors by type
   */
  static groupErrors(errors: ValidationError[]) {
    return {
      technical: errors.filter(e => e.type === 'technical'),
      business: errors.filter(e => e.type === 'business'),
    };
  }

  /**
   * Check if errors are only technical
   */
  static isOnlyTechnicalErrors(errors: ValidationError[]): boolean {
    return errors.every(e => e.type === 'technical');
  }

  /**
   * Check if errors are only business
   */
  static isOnlyBusinessErrors(errors: ValidationError[]): boolean {
    return errors.every(e => e.type === 'business');
  }

  /**
   * Get error summary
   */
  static getErrorSummary(errors: ValidationError[]) {
    const grouped = this.groupErrors(errors);
    
    return {
      totalErrors: errors.length,
      technicalErrors: grouped.technical.length,
      businessErrors: grouped.business.length,
      hasTechnicalErrors: grouped.technical.length > 0,
      hasBusinessErrors: grouped.business.length > 0,
    };
  }
} 