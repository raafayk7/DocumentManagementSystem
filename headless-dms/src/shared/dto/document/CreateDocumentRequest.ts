import { z } from 'zod';
import { AppResult } from '@carbonteq/hexapp';
import { nestWithKey, extractId, toSerialized } from '@carbonteq/hexapp';
import { BaseDto, type DtoValidationResult } from '../base/index.js';

// Reusing existing CreateDocumentSchema from src/documents/dto/documents.dto.ts
export const CreateDocumentRequestSchema = z.object({
  name: z.string().min(1, 'Document name cannot be empty'),
  filePath: z.string().url('File path must be a valid URL'),
  mimeType: z.string().min(1, 'MIME type cannot be empty'),
  size: z.string().min(1, 'Size cannot be empty'),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  userId: z.string().uuid('Invalid user ID'),
});

export type CreateDocumentRequest = z.infer<typeof CreateDocumentRequestSchema>;

/**
 * Create Document Request DTO that extends BaseDto
 * Provides validation for document creation requests
 */
export class CreateDocumentRequestDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestDocument = nestWithKey('document');
  private readonly nestFile = nestWithKey('file');
  private readonly nestUpload = nestWithKey('upload');

  constructor(
    public readonly name: string,
    public readonly filePath: string,
    public readonly mimeType: string,
    public readonly size: string,
    public readonly userId: string,
    public readonly tags: string[] = [],
    public readonly metadata: Record<string, string> = {}
  ) {
    super();
  }

  /**
   * Validate and create CreateDocumentRequestDto from unknown data
   */
  static create(data: unknown): DtoValidationResult<CreateDocumentRequestDto> {
    const validationResult = this.validate(CreateDocumentRequestSchema, data);
    
    if (validationResult.isErr()) {
      return validationResult as DtoValidationResult<CreateDocumentRequestDto>;
    }

    const validated = validationResult.unwrap();
    const dto = new CreateDocumentRequestDto(
      validated.name,
      validated.filePath,
      validated.mimeType,
      validated.size,
      validated.userId,
      validated.tags || [],
      validated.metadata || {}
    );

    return AppResult.Ok(dto);
  }

  /**
   * Create nested document request using nestWithKey
   */
  toNestedDocument() {
    return this.nestDocument(this.toPlain());
  }

  /**
   * Create nested file request using nestWithKey
   */
  toNestedFile() {
    return this.nestFile(this.toPlain());
  }

  /**
   * Create nested upload request using nestWithKey
   */
  toNestedUpload() {
    return this.nestUpload(this.toPlain());
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): CreateDocumentRequest {
    return {
      name: this.name,
      filePath: this.filePath,
      mimeType: this.mimeType,
      size: this.size,
      userId: this.userId,
      tags: this.tags,
      metadata: this.metadata
    };
  }
}
