// src/validation/pipeline/orchestrator.ts
import { z } from 'zod';
import { AppResult } from '@carbonteq/hexapp';
import { InputValidator } from '../technical/input.validator.js';
import { UserValidator } from '../../../../domain/validators/UserValidator.js';
import { DocumentValidator } from '../../../../domain/validators/DocumentValidator.js';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  type: 'technical' | 'business';
  severity: 'error' | 'warning';
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors: ValidationError[];
  technicalErrors: ValidationError[];
  businessErrors: ValidationError[];
  message: string;
}

export interface ValidationContext {
  userRole?: 'user' | 'admin';
  currentUserId?: string;
  currentDocumentId?: string;
  operation?: 'create' | 'update' | 'delete';
  existingData?: any;
}

export class ValidationOrchestrator {
  /**
   * Validate user registration with technical and business validation
   */
  static async validateUserRegistration(
    input: {
      email: string;
      password: string;
      role?: string;
    },
    context: ValidationContext = {}
  ): Promise<ValidationResult<{
    email: string;
    password: string;
    role: 'user' | 'admin';
  }>> {
    const errors: ValidationError[] = [];
    const technicalErrors: ValidationError[] = [];
    const businessErrors: ValidationError[] = [];

    // Step 1: Technical Validation (Fail-fast)
    const emailResult = InputValidator.validateEmail(input.email);
    if (!InputValidator.isValid(emailResult)) {
      const technicalError: ValidationError = {
        field: 'email',
        message: 'Email must be in valid format (user@domain.com)',
        code: 'INVALID_EMAIL_FORMAT',
        type: 'technical',
        severity: 'error'
      };
      technicalErrors.push(technicalError);
      errors.push(technicalError);
    }

    const passwordResult = InputValidator.validatePassword(input.password);
    if (!InputValidator.isValid(passwordResult)) {
      const technicalError: ValidationError = {
        field: 'password',
        message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
        code: 'INVALID_PASSWORD_FORMAT',
        type: 'technical',
        severity: 'error'
      };
      technicalErrors.push(technicalError);
      errors.push(technicalError);
    }

    // Fail fast if technical validation fails
    if (technicalErrors.length > 0) {
      return {
        success: false,
        errors,
        technicalErrors,
        businessErrors,
        message: 'Please fix the input format errors before proceeding'
      };
    }

    // Step 2: Business Validation (Only if technical passes)
    const roleResult = UserValidator.validateRole(input.role || 'user');
    if (roleResult.isErr()) {
      const businessError: ValidationError = {
        field: 'role',
        message: roleResult.unwrapErr().message,
        code: 'INVALID_USER_ROLE',
        type: 'business',
        severity: 'error'
      };
      businessErrors.push(businessError);
      errors.push(businessError);
    }

    // Step 3: Cross-field Business Validation
    if (context.existingData?.users) {
      const emailUniquenessResult = UserValidator.validateEmailUniqueness(
        emailResult.data!,
        context.existingData.users
      );
      if (emailUniquenessResult.isErr()) {
        const businessError: ValidationError = {
          field: 'email',
          message: emailUniquenessResult.unwrapErr().message,
          code: 'EMAIL_ALREADY_EXISTS',
          type: 'business',
          severity: 'error'
        };
        businessErrors.push(businessError);
        errors.push(businessError);
      }
    }

    // Step 4: Return Result
    if (errors.length === 0) {
      return {
        success: true,
        data: {
          email: emailResult.data!,
          password: passwordResult.data!,
          role: roleResult.unwrap()
        },
        errors: [],
        technicalErrors: [],
        businessErrors: [],
        message: 'Validation successful'
      };
    }

    return {
      success: false,
      errors,
      technicalErrors,
      businessErrors,
      message: this.createUserFriendlyMessage(errors)
    };
  }

  /**
   * Validate document upload with technical and business validation
   */
  static async validateDocumentUpload(
    input: {
      name: string;
      file: any;
      tags?: string;
      metadata?: string;
    },
    context: ValidationContext = {}
  ): Promise<ValidationResult<{
    name: string;
    file: any;
    tags: string[];
    metadata: Record<string, string>;
  }>> {
    const errors: ValidationError[] = [];
    const technicalErrors: ValidationError[] = [];
    const businessErrors: ValidationError[] = [];

    // Step 1: Technical Validation (Fail-fast)
    const fileResult = InputValidator.validateFileUpload(input.file);
    if (!InputValidator.isValid(fileResult)) {
      const technicalError: ValidationError = {
        field: 'file',
        message: 'File upload data is invalid',
        code: 'INVALID_FILE_UPLOAD',
        type: 'technical',
        severity: 'error'
      };
      technicalErrors.push(technicalError);
      errors.push(technicalError);
    }

    const fileTypeResult = InputValidator.validateFileType(input.file);
    if (!InputValidator.isValid(fileTypeResult)) {
      const technicalError: ValidationError = {
        field: 'file',
        message: 'File type not supported. Allowed types: text, csv, pdf, json, images, word documents',
        code: 'INVALID_FILE_TYPE',
        type: 'technical',
        severity: 'error'
      };
      technicalErrors.push(technicalError);
      errors.push(technicalError);
    }

    const tagsResult = InputValidator.validateTags(input.tags || '');
    if (!InputValidator.isValid(tagsResult)) {
      const technicalError: ValidationError = {
        field: 'tags',
        message: 'Tags must be in valid format',
        code: 'INVALID_TAGS_FORMAT',
        type: 'technical',
        severity: 'error'
      };
      technicalErrors.push(technicalError);
      errors.push(technicalError);
    }

    const metadataResult = InputValidator.validateMetadata(input.metadata || '');
    if (!InputValidator.isValid(metadataResult)) {
      const technicalError: ValidationError = {
        field: 'metadata',
        message: 'Metadata must be in valid JSON format',
        code: 'INVALID_METADATA_FORMAT',
        type: 'technical',
        severity: 'error'
      };
      technicalErrors.push(technicalError);
      errors.push(technicalError);
    }

    // Fail fast if technical validation fails
    if (technicalErrors.length > 0) {
      return {
        success: false,
        errors,
        technicalErrors,
        businessErrors,
        message: 'Please fix the file upload format errors before proceeding'
      };
    }

    // Step 2: Business Validation (Only if technical passes)
    const nameResult = DocumentValidator.validateName(input.name);
    if (nameResult.isErr()) {
      const businessError: ValidationError = {
        field: 'name',
        message: nameResult.unwrapErr().message,
        code: 'INVALID_DOCUMENT_NAME',
        type: 'business',
        severity: 'error'
      };
      businessErrors.push(businessError);
      errors.push(businessError);
    }

    const fileSizeResult = DocumentValidator.validateFileSize(input.file.size.toString());
    if (fileSizeResult.isErr()) {
      const businessError: ValidationError = {
        field: 'file',
        message: fileSizeResult.unwrapErr().message,
        code: 'FILE_SIZE_EXCEEDED',
        type: 'business',
        severity: 'error'
      };
      businessErrors.push(businessError);
      errors.push(businessError);
    }

    const fileTypeBusinessResult = DocumentValidator.validateFileType(input.file.mimeType);
    if (fileTypeBusinessResult.isErr()) {
      const businessError: ValidationError = {
        field: 'file',
        message: fileTypeBusinessResult.unwrapErr().message,
        code: 'FILE_TYPE_NOT_ALLOWED',
        type: 'business',
        severity: 'error'
      };
      businessErrors.push(businessError);
      errors.push(businessError);
    }

    // Step 3: Cross-field Business Validation
    if (context.existingData?.documents) {
      const nameUniquenessResult = DocumentValidator.validateNameUniqueness(
        nameResult.unwrap(),
        context.existingData.documents,
        context.currentDocumentId
      );
      if (nameUniquenessResult.isErr()) {
        const businessError: ValidationError = {
          field: 'name',
          message: nameUniquenessResult.unwrapErr().message,
          code: 'DOCUMENT_NAME_EXISTS',
          type: 'business',
          severity: 'error'
        };
        businessErrors.push(businessError);
        errors.push(businessError);
      }
    }

    // Step 4: Permission Validation
    if (context.userRole && context.userRole !== 'admin') {
      const permissionResult = DocumentValidator.validateUploadPermission(context.userRole);
      if (permissionResult.isErr()) {
        const businessError: ValidationError = {
          field: 'permission',
          message: permissionResult.unwrapErr().message,
          code: 'INSUFFICIENT_PERMISSIONS',
          type: 'business',
          severity: 'error'
        };
        businessErrors.push(businessError);
        errors.push(businessError);
      }
    }

    // Step 5: Return Result
    if (errors.length === 0) {
      return {
        success: true,
        data: {
          name: nameResult.unwrap(),
          file: fileResult.data!,
          tags: tagsResult.data!,
          metadata: metadataResult.data!
        },
        errors: [],
        technicalErrors: [],
        businessErrors: [],
        message: 'Validation successful'
      };
    }

    return {
      success: false,
      errors,
      technicalErrors,
      businessErrors,
      message: this.createUserFriendlyMessage(errors)
    };
  }

  /**
   * Create user-friendly error message
   */
  private static createUserFriendlyMessage(errors: ValidationError[]): string {
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
   * Generic validation pipeline for any input
   */
  static async validate<T>(
    input: any,
    technicalValidators: ((input: any) => any)[],
    businessValidators: ((input: any) => any)[],
    context: ValidationContext = {}
  ): Promise<ValidationResult<T>> {
    const errors: ValidationError[] = [];
    const technicalErrors: ValidationError[] = [];
    const businessErrors: ValidationError[] = [];

    // Step 1: Technical Validation (Fail-fast)
    for (const validator of technicalValidators) {
      try {
        const result = validator(input);
        if (result && result.errors) {
          technicalErrors.push(...result.errors);
        }
      } catch (error) {
        technicalErrors.push({
          field: 'input',
          message: error instanceof Error ? error.message : 'Technical validation failed',
          code: 'TECHNICAL_VALIDATION_ERROR',
          type: 'technical',
          severity: 'error'
        });
      }
    }

    // Fail fast if technical validation fails
    if (technicalErrors.length > 0) {
      errors.push(...technicalErrors);
      return {
        success: false,
        errors,
        technicalErrors,
        businessErrors,
        message: 'Please fix the input format errors before proceeding'
      };
    }

    // Step 2: Business Validation (Only if technical passes)
    for (const validator of businessValidators) {
      try {
        const result = validator(input);
        if (result && result.errors) {
          businessErrors.push(...result.errors);
        }
      } catch (error) {
        businessErrors.push({
          field: 'business_rule',
          message: error instanceof Error ? error.message : 'Business validation failed',
          code: 'BUSINESS_VALIDATION_ERROR',
          type: 'business',
          severity: 'error'
        });
      }
    }

    // Step 3: Return Result
    errors.push(...businessErrors);

    if (errors.length === 0) {
      return {
        success: true,
        data: input,
        errors: [],
        technicalErrors: [],
        businessErrors: [],
        message: 'Validation successful'
      };
    }

    return {
      success: false,
      errors,
      technicalErrors,
      businessErrors,
      message: this.createUserFriendlyMessage(errors)
    };
  }
} 