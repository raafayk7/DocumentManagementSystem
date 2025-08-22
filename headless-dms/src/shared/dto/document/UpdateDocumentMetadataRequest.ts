import { z } from 'zod';
import { AppResult } from '@carbonteq/hexapp';
import { nestWithKey, extractId, toSerialized } from '@carbonteq/hexapp';
import { BaseDto, type DtoValidationResult } from '../base/index.js';

export const UpdateDocumentMetadataRequestSchema = z.object({
    documentId: z.string().uuid('Invalid document ID'),
    metadata: z.record(z.string(), z.string()).optional(),
    userId: z.string().uuid('Invalid user ID'),
});

export type UpdateDocumentMetadataRequest = z.infer<typeof UpdateDocumentMetadataRequestSchema>;

/**
 * Update Document Metadata Request DTO that extends BaseDto
 * Provides validation for updating document metadata requests
 */
export class UpdateDocumentMetadataRequestDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestMetadata = nestWithKey('metadata');
  private readonly nestUpdate = nestWithKey('update');
  private readonly nestDocument = nestWithKey('document');

  constructor(
    public readonly documentId: string,
    public readonly userId: string,
    public readonly metadata?: Record<string, string>
  ) {
    super();
  }

  /**
   * Validate and create UpdateDocumentMetadataRequestDto from unknown data
   */
  static create(data: unknown): DtoValidationResult<UpdateDocumentMetadataRequestDto> {
    const validationResult = this.validate(UpdateDocumentMetadataRequestSchema, data);
    
    if (validationResult.isErr()) {
      return validationResult as DtoValidationResult<UpdateDocumentMetadataRequestDto>;
    }

    const validated = validationResult.unwrap();
    const dto = new UpdateDocumentMetadataRequestDto(
      validated.documentId,
      validated.userId,
      validated.metadata
    );

    return AppResult.Ok(dto);
  }

  /**
   * Create nested metadata request using nestWithKey
   */
  toNestedMetadata() {
    return this.nestMetadata(this.toPlain());
  }

  /**
   * Create nested update request using nestWithKey
   */
  toNestedUpdate() {
    return this.nestUpdate(this.toPlain());
  }

  /**
   * Create nested document request using nestWithKey
   */
  toNestedDocument() {
    return this.nestDocument(this.toPlain());
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): UpdateDocumentMetadataRequest {
    return {
      documentId: this.documentId,
      metadata: this.metadata,
      userId: this.userId
    };
  }
}

