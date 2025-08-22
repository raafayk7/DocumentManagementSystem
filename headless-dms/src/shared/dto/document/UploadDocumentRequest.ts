import { z } from 'zod';
import { AppResult } from '@carbonteq/hexapp';
import { BaseDto, type DtoValidationResult } from '../base/index.js';

// For file upload use cases
export const UploadDocumentRequestSchema = z.object({
  name: z.string().min(1, 'Document name cannot be empty'),
  file: z.instanceof(Buffer), // File data
  filename: z.string().min(1, 'Filename cannot be empty'),
  mimeType: z.string().min(1, 'MIME type cannot be empty'),
  size: z.number().positive('File size must be positive'),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  userId: z.string().uuid('Invalid user ID'),
});

export type UploadDocumentRequest = z.infer<typeof UploadDocumentRequestSchema>;

/**
 * Upload Document Request DTO that extends BaseDto
 * Provides validation for document upload requests
 */
export class UploadDocumentRequestDto extends BaseDto {
  constructor(
    public readonly name: string,
    public readonly file: Buffer,
    public readonly filename: string,
    public readonly mimeType: string,
    public readonly size: number,
    public readonly userId: string,
    public readonly tags: string[] = [],
    public readonly metadata: Record<string, string> = {}
  ) {
    super();
  }

  /**
   * Validate and create UploadDocumentRequestDto from unknown data
   */
  static create(data: unknown): DtoValidationResult<UploadDocumentRequestDto> {
    const validationResult = this.validate(UploadDocumentRequestSchema, data);
    
    if (validationResult.isErr()) {
      return validationResult as DtoValidationResult<UploadDocumentRequestDto>;
    }

    const validated = validationResult.unwrap();
    const dto = new UploadDocumentRequestDto(
      validated.name,
      validated.file,
      validated.filename,
      validated.mimeType,
      validated.size,
      validated.userId,
      validated.tags || [],
      validated.metadata || {}
    );

    return AppResult.Ok(dto);
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): UploadDocumentRequest {
    return {
      name: this.name,
      file: this.file,
      filename: this.filename,
      mimeType: this.mimeType,
      size: this.size,
      userId: this.userId,
      tags: this.tags,
      metadata: this.metadata
    };
  }
}
