import { z } from 'zod';
import { AppResult } from '@carbonteq/hexapp';
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

