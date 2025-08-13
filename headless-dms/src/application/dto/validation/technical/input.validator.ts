// src/validation/technical/input.validator.ts
import { z } from 'zod';
import { 
  EmailSchema, 
  PasswordSchema, 
  FileUploadSchema, 
  FileTypeSchema,
  JsonSchema,
  UuidSchema,
  DateSchema,
  TagsSchema,
  MetadataSchema
} from '../schemas/common.schemas.js';

export class InputValidator {
  /**
   * Validate email format
   */
  static validateEmail(email: string): z.ZodSafeParseResult<string> {
    return EmailSchema.safeParse(email);
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): z.ZodSafeParseResult<string> {
    return PasswordSchema.safeParse(password);
  }

  /**
   * Validate file upload data
   */
  static validateFileUpload(fileData: any): z.ZodSafeParseResult<any> {
    return FileUploadSchema.safeParse(fileData);
  }

  /**
   * Validate file type and size
   */
  static validateFileType(fileData: any): z.ZodSafeParseResult<any> {
    return FileTypeSchema.safeParse(fileData);
  }

  /**
   * Validate JSON string
   */
  static validateJson(jsonString: string): z.ZodSafeParseResult<any> {
    return JsonSchema.safeParse(jsonString);
  }

  /**
   * Validate UUID format
   */
  static validateUuid(uuid: string): z.ZodSafeParseResult<string> {
    return UuidSchema.safeParse(uuid);
  }

  /**
   * Validate date string
   */
  static validateDate(dateString: string): z.ZodSafeParseResult<Date> {
    return DateSchema.safeParse(dateString);
  }

  /**
   * Validate tags string (converts to array)
   */
  static validateTags(tagsString: string): z.ZodSafeParseResult<string[]> {
    return TagsSchema.safeParse(tagsString);
  }

  /**
   * Validate metadata string (converts to object)
   */
  static validateMetadata(metadataString: string): z.ZodSafeParseResult<Record<string, string>> {
    return MetadataSchema.safeParse(metadataString);
  }

  /**
   * Validate multiple fields at once
   */
  static validateMultiple(data: Record<string, any>): {
    email?: z.ZodSafeParseResult<string>;
    password?: z.ZodSafeParseResult<string>;
    file?: z.ZodSafeParseResult<any>;
    tags?: z.ZodSafeParseResult<string[]>;
    metadata?: z.ZodSafeParseResult<Record<string, string>>;
  } {
    return {
      email: data.email ? this.validateEmail(data.email) : undefined,
      password: data.password ? this.validatePassword(data.password) : undefined,
      file: data.file ? this.validateFileUpload(data.file) : undefined,
      tags: data.tags ? this.validateTags(data.tags) : undefined,
      metadata: data.metadata ? this.validateMetadata(data.metadata) : undefined,
    };
  }

  /**
   * Check if validation passed
   */
  static isValid<T>(result: z.ZodSafeParseResult<T>): result is z.ZodSafeParseSuccess<T> {
    return result.success;
  }

  /**
   * Get validation errors
   */
  static getErrors<T>(result: z.ZodSafeParseResult<T>): string[] {
    if (result.success) return [];
    return result.error.issues.map((err: z.ZodIssue) => err.message);
  }
} 