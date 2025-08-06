// src/validation/pipeline/error-formatter.ts
import { ValidationError } from './orchestrator.js';

export interface FormattedError {
  field: string;
  message: string;
  code: string;
  type: 'technical' | 'business';
  severity: 'error' | 'warning';
  userMessage: string;
  actionableMessage: string;
}

export interface ErrorSummary {
  totalErrors: number;
  technicalErrors: number;
  businessErrors: number;
  hasTechnicalErrors: boolean;
  hasBusinessErrors: boolean;
  primaryMessage: string;
  actionableMessage: string;
}

export class ErrorFormatter {
  /**
   * Format validation errors for HTTP response
   */
  static formatForHttpResponse(errors: ValidationError[]) {
    const technicalErrors = errors.filter(e => e.type === 'technical');
    const businessErrors = errors.filter(e => e.type === 'business');

    return {
      success: false,
      errors: {
        technical: technicalErrors.map(error => this.formatError(error)),
        business: businessErrors.map(error => this.formatError(error)),
        total: errors.length,
      },
      summary: this.createErrorSummary(errors),
      message: this.createPrimaryMessage(errors),
    };
  }

  /**
   * Format individual error with user-friendly messages
   */
  static formatError(error: ValidationError): FormattedError {
    return {
      field: error.field,
      message: error.message,
      code: error.code,
      type: error.type,
      severity: error.severity,
      userMessage: this.createUserMessage(error),
      actionableMessage: this.createActionableMessage(error),
    };
  }

  /**
   * Create user-friendly error message
   */
  private static createUserMessage(error: ValidationError): string {
    const userMessages: Record<string, string> = {
      // Technical errors
      'INVALID_EMAIL_FORMAT': 'Please enter a valid email address',
      'INVALID_PASSWORD_FORMAT': 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
      'INVALID_FILE_UPLOAD': 'Please select a valid file to upload',
      'INVALID_FILE_TYPE': 'This file type is not supported. Please choose a different file',
      'INVALID_TAGS_FORMAT': 'Please enter tags in the correct format',
      'INVALID_METADATA_FORMAT': 'Please enter metadata in valid JSON format',

      // Business errors
      'INVALID_USER_ROLE': 'Please select a valid user role',
      'EMAIL_ALREADY_EXISTS': 'This email address is already registered',
      'INVALID_DOCUMENT_NAME': 'Please enter a valid document name (2-255 characters)',
      'FILE_SIZE_EXCEEDED': 'File size is too large. Please choose a smaller file',
      'FILE_TYPE_NOT_ALLOWED': 'This file type is not allowed for security reasons',
      'DOCUMENT_NAME_EXISTS': 'A document with this name already exists',
      'INSUFFICIENT_PERMISSIONS': 'You do not have permission to perform this action',
      'TECHNICAL_VALIDATION_ERROR': 'There was an issue with the input format',
      'BUSINESS_VALIDATION_ERROR': 'This action violates a business rule',
    };

    return userMessages[error.code] || error.message;
  }

  /**
   * Create actionable error message
   */
  private static createActionableMessage(error: ValidationError): string {
    const actionableMessages: Record<string, string> = {
      // Technical errors
      'INVALID_EMAIL_FORMAT': 'Enter your email in format: user@domain.com',
      'INVALID_PASSWORD_FORMAT': 'Use at least 8 characters including uppercase, lowercase, number, and special character',
      'INVALID_FILE_UPLOAD': 'Select a file and try uploading again',
      'INVALID_FILE_TYPE': 'Choose a file with supported format: text, csv, pdf, json, images, word documents',
      'INVALID_TAGS_FORMAT': 'Enter tags separated by commas or as a JSON array',
      'INVALID_METADATA_FORMAT': 'Enter metadata as valid JSON: {"key": "value"}',

      // Business errors
      'INVALID_USER_ROLE': 'Select either "user" or "admin" role',
      'EMAIL_ALREADY_EXISTS': 'Use a different email address or try logging in',
      'INVALID_DOCUMENT_NAME': 'Enter a descriptive name between 2 and 255 characters',
      'FILE_SIZE_EXCEEDED': 'Choose a file smaller than the maximum allowed size',
      'FILE_TYPE_NOT_ALLOWED': 'Choose a file type that is allowed for security',
      'DOCUMENT_NAME_EXISTS': 'Choose a different document name or rename the existing document',
      'INSUFFICIENT_PERMISSIONS': 'Contact an administrator to grant you the required permissions',
      'TECHNICAL_VALIDATION_ERROR': 'Check the input format and try again',
      'BUSINESS_VALIDATION_ERROR': 'Review the business rules and try again',
    };

    return actionableMessages[error.code] || 'Please review the error and try again';
  }

  /**
   * Create primary error message
   */
  private static createPrimaryMessage(errors: ValidationError[]): string {
    if (errors.length === 0) return 'Validation successful';

    const technicalCount = errors.filter(e => e.type === 'technical').length;
    const businessCount = errors.filter(e => e.type === 'business').length;

    if (technicalCount > 0 && businessCount > 0) {
      return `Please fix ${technicalCount} input format error(s) and ${businessCount} business rule violation(s)`;
    } else if (technicalCount > 0) {
      return `Please fix ${technicalCount} input format error(s)`;
    } else {
      return `Please fix ${businessCount} business rule violation(s)`;
    }
  }

  /**
   * Create error summary
   */
  private static createErrorSummary(errors: ValidationError[]): ErrorSummary {
    const technicalErrors = errors.filter(e => e.type === 'technical');
    const businessErrors = errors.filter(e => e.type === 'business');

    return {
      totalErrors: errors.length,
      technicalErrors: technicalErrors.length,
      businessErrors: businessErrors.length,
      hasTechnicalErrors: technicalErrors.length > 0,
      hasBusinessErrors: businessErrors.length > 0,
      primaryMessage: this.createPrimaryMessage(errors),
      actionableMessage: this.createActionableSummary(errors),
    };
  }

  /**
   * Create actionable summary message
   */
  private static createActionableSummary(errors: ValidationError[]): string {
    const technicalCount = errors.filter(e => e.type === 'technical').length;
    const businessCount = errors.filter(e => e.type === 'business').length;

    if (technicalCount > 0 && businessCount > 0) {
      return 'First fix the input format errors, then address the business rule violations';
    } else if (technicalCount > 0) {
      return 'Please correct the input format and try again';
    } else {
      return 'Please review the business rules and try again';
    }
  }

  /**
   * Group errors by type and severity
   */
  static groupErrors(errors: ValidationError[]) {
    return {
      technical: {
        errors: errors.filter(e => e.type === 'technical' && e.severity === 'error'),
        warnings: errors.filter(e => e.type === 'technical' && e.severity === 'warning'),
      },
      business: {
        errors: errors.filter(e => e.type === 'business' && e.severity === 'error'),
        warnings: errors.filter(e => e.type === 'business' && e.severity === 'warning'),
      },
    };
  }

  /**
   * Check if errors are critical (prevent operation)
   */
  static hasCriticalErrors(errors: ValidationError[]): boolean {
    return errors.some(error => error.severity === 'error');
  }

  /**
   * Check if errors are only warnings (allow operation with caution)
   */
  static hasOnlyWarnings(errors: ValidationError[]): boolean {
    return errors.length > 0 && errors.every(error => error.severity === 'warning');
  }

  /**
   * Get most important error for display
   */
  static getPrimaryError(errors: ValidationError[]): ValidationError | null {
    if (errors.length === 0) return null;

    // Prioritize technical errors over business errors
    const technicalErrors = errors.filter(e => e.type === 'technical');
    if (technicalErrors.length > 0) {
      return technicalErrors[0];
    }

    return errors[0];
  }
} 