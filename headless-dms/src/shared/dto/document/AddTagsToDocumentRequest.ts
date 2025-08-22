import { z } from 'zod';
import { AppResult } from '@carbonteq/hexapp';
import { nestWithKey, extractId, toSerialized } from '@carbonteq/hexapp';
import { BaseDto, type DtoValidationResult } from '../base/index.js';

export const AddTagsToDocumentRequestSchema = z.object({
    documentId: z.string().uuid('Invalid document ID'),
    tags: z.array(z.string()).min(1, 'At least one tag is required'),
    userId: z.string().uuid('Invalid user ID'),
});

export type AddTagsToDocumentRequest = z.infer<typeof AddTagsToDocumentRequestSchema>;

/**
 * Add Tags to Document Request DTO that extends BaseDto
 * Provides validation for adding tags to document requests
 */
export class AddTagsToDocumentRequestDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestTags = nestWithKey('tags');
  private readonly nestDocument = nestWithKey('document');
  private readonly nestUpdate = nestWithKey('update');

  constructor(
    public readonly documentId: string,
    public readonly tags: string[],
    public readonly userId: string
  ) {
    super();
  }

  /**
   * Validate and create AddTagsToDocumentRequestDto from unknown data
   */
  static create(data: unknown): DtoValidationResult<AddTagsToDocumentRequestDto> {
    const validationResult = this.validate(AddTagsToDocumentRequestSchema, data);
    
    if (validationResult.isErr()) {
      return validationResult as DtoValidationResult<AddTagsToDocumentRequestDto>;
    }

    const validated = validationResult.unwrap();
    const dto = new AddTagsToDocumentRequestDto(
      validated.documentId,
      validated.tags,
      validated.userId
    );

    return AppResult.Ok(dto);
  }

  /**
   * Create nested tags request using nestWithKey
   */
  toNestedTags() {
    return this.nestTags(this.toPlain());
  }

  /**
   * Create nested document request using nestWithKey
   */
  toNestedDocument() {
    return this.nestDocument(this.toPlain());
  }

  /**
   * Create nested update request using nestWithKey
   */
  toNestedUpdate() {
    return this.nestUpdate(this.toPlain());
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): AddTagsToDocumentRequest {
    return {
      documentId: this.documentId,
      tags: this.tags,
      userId: this.userId
    };
  }
}

