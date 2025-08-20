// src/validation/pipeline/validator.pipeline.ts
import { InputValidator } from '../technical/input.validator.js';
import { FormatValidator } from '../technical/format.validator.js';
import { UserValidator } from '../../../../domain/validators/UserValidator.js';
import { DocumentValidator } from '../../../../domain/validators/DocumentValidator.js';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors: string[];
  technicalErrors: string[];
  businessErrors: string[];
}

export class ValidatorPipeline {
  /**
   * Validate user registration input
   */
  static async validateUserRegistration(input: {
    email: string;
    password: string;
    role?: string;
  }): Promise<ValidationResult<{
    email: string;
    password: string;
    role: 'user' | 'admin';
  }>> {
    const errors: string[] = [];
    const technicalErrors: string[] = [];
    const businessErrors: string[] = [];

    // 1. Technical validation
    const emailResult = InputValidator.validateEmail(input.email);
    if (!InputValidator.isValid(emailResult)) {
      technicalErrors.push(...InputValidator.getErrors(emailResult));
    }

    const passwordResult = InputValidator.validatePassword(input.password);
    if (!InputValidator.isValid(passwordResult)) {
      technicalErrors.push(...InputValidator.getErrors(passwordResult));
    }

    // 2. Business validation (only if technical validation passes)
    if (technicalErrors.length === 0) {
      const roleResult = UserValidator.validateRole(input.role || 'user');
      if (roleResult.isErr()) {
        businessErrors.push(roleResult.unwrapErr());
      }
    }

    // 3. Combine all errors
    errors.push(...technicalErrors, ...businessErrors);

    return {
      success: errors.length === 0,
      data: errors.length === 0 ? {
        email: emailResult.success ? emailResult.data : input.email,
        password: passwordResult.success ? passwordResult.data : input.password,
        role: input.role as 'user' | 'admin' || 'user',
      } : undefined,
      errors,
      technicalErrors,
      businessErrors,
    };
  }

  /**
   * Validate document upload input
   */
  static async validateDocumentUpload(input: {
    name: string;
    file: any;
    tags?: string;
    metadata?: string;
  }): Promise<ValidationResult<{
    name: string;
    file: any;
    tags: string[];
    metadata: Record<string, string>;
  }>> {
    const errors: string[] = [];
    const technicalErrors: string[] = [];
    const businessErrors: string[] = [];

    // 1. Technical validation
    const fileResult = InputValidator.validateFileUpload(input.file);
    if (!InputValidator.isValid(fileResult)) {
      technicalErrors.push(...InputValidator.getErrors(fileResult));
    }

    const fileTypeResult = InputValidator.validateFileType(input.file);
    if (!InputValidator.isValid(fileTypeResult)) {
      technicalErrors.push(...InputValidator.getErrors(fileTypeResult));
    }

    const tagsResult = InputValidator.validateTags(input.tags || '');
    if (!InputValidator.isValid(tagsResult)) {
      technicalErrors.push(...InputValidator.getErrors(tagsResult));
    }

    const metadataResult = InputValidator.validateMetadata(input.metadata || '');
    if (!InputValidator.isValid(metadataResult)) {
      technicalErrors.push(...InputValidator.getErrors(metadataResult));
    }

    // 2. Business validation (only if technical validation passes)
    if (technicalErrors.length === 0) {
      const nameResult = DocumentValidator.validateName(input.name);
      if (nameResult.isErr()) {
        businessErrors.push(nameResult.unwrapErr());
      }

      const fileSizeResult = DocumentValidator.validateFileSize(input.file.size);
      if (fileSizeResult.isErr()) {
        businessErrors.push(fileSizeResult.unwrapErr());
      }

      const fileTypeResult = DocumentValidator.validateFileType(input.file.mimeType);
      if (fileTypeResult.isErr()) {
        businessErrors.push(fileTypeResult.unwrapErr());
      }
    }

    // 3. Combine all errors
    errors.push(...technicalErrors, ...businessErrors);

    return {
      success: errors.length === 0,
      data: errors.length === 0 ? {
        name: input.name,
        file: fileResult.success ? fileResult.data : input.file,
        tags: tagsResult.success ? tagsResult.data : [],
        metadata: metadataResult.success ? metadataResult.data : {},
      } : undefined,
      errors,
      technicalErrors,
      businessErrors,
    };
  }

  /**
   * Validate login input
   */
  static async validateLogin(input: {
    email: string;
    password: string;
  }): Promise<ValidationResult<{
    email: string;
    password: string;
  }>> {
    const errors: string[] = [];
    const technicalErrors: string[] = [];

    // 1. Technical validation only (login doesn't have complex business rules)
    const emailResult = InputValidator.validateEmail(input.email);
    if (!InputValidator.isValid(emailResult)) {
      technicalErrors.push(...InputValidator.getErrors(emailResult));
    }

    const passwordResult = InputValidator.validatePassword(input.password);
    if (!InputValidator.isValid(passwordResult)) {
      technicalErrors.push(...InputValidator.getErrors(passwordResult));
    }

    // 2. Combine errors
    errors.push(...technicalErrors);

    return {
      success: errors.length === 0,
      data: errors.length === 0 ? {
        email: emailResult.success ? emailResult.data : input.email,
        password: passwordResult.success ? passwordResult.data : input.password,
      } : undefined,
      errors,
      technicalErrors,
      businessErrors: [],
    };
  }

  /**
   * Generic validation pipeline
   */
  static async validate<T>(
    input: any,
    technicalValidators: ((input: any) => any)[],
    businessValidators: ((input: any) => any)[]
  ): Promise<ValidationResult<T>> {
    const errors: string[] = [];
    const technicalErrors: string[] = [];
    const businessErrors: string[] = [];

    // 1. Technical validation
    for (const validator of technicalValidators) {
      try {
        const result = validator(input);
        if (result && result.errors) {
          technicalErrors.push(...result.errors);
        }
      } catch (error) {
        technicalErrors.push(error instanceof Error ? error.message : 'Technical validation failed');
      }
    }

    // 2. Business validation (only if technical validation passes)
    if (technicalErrors.length === 0) {
      for (const validator of businessValidators) {
        try {
          const result = validator(input);
          if (result && result.errors) {
            businessErrors.push(...result.errors);
          }
        } catch (error) {
          businessErrors.push(error instanceof Error ? error.message : 'Business validation failed');
        }
      }
    }

    // 3. Combine all errors
    errors.push(...technicalErrors, ...businessErrors);

    return {
      success: errors.length === 0,
      data: errors.length === 0 ? input : undefined,
      errors,
      technicalErrors,
      businessErrors,
    };
  }
} 