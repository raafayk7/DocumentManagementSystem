import { z } from 'zod';
import { AppResult } from '@carbonteq/hexapp';
import { nestWithKey, extractId, toSerialized } from '@carbonteq/hexapp';
import { BaseDto, type DtoValidationResult } from '../base/index.js';

export const RemoveTagsFromDocumentRequestSchema = z.object({
    documentId: z.string().uuid('Invalid document ID'),
    tags: z.array(z.string()).min(1, 'At least one tag is required'),
    userId: z.string().uuid('Invalid user ID'),
});

export type RemoveTagsFromDocumentRequest = z.infer<typeof RemoveTagsFromDocumentRequestSchema>;

/**
 * Remove Tags from Document Request DTO that extends BaseDto
 * Provides validation for removing tags from document requests
 */
export class RemoveTagsFromDocumentRequestDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestTags = nestWithKey('tags');
  private readonly nestRemove = nestWithKey('remove');
  private readonly nestUpdate = nestWithKey('update');

  constructor(
    public readonly documentId: string,
    public readonly tags: string[],
    public readonly userId: string
  ) {
    super();
  }

  /**
   * Validate and create RemoveTagsFromDocumentRequestDto from unknown data
   */
  static create(data: unknown): DtoValidationResult<RemoveTagsFromDocumentRequestDto> {
    const validationResult = this.validate(RemoveTagsFromDocumentRequestSchema, data);
    
    if (validationResult.isErr()) {
      return validationResult as DtoValidationResult<RemoveTagsFromDocumentRequestDto>;
    }

    const validated = validationResult.unwrap();
    const dto = new RemoveTagsFromDocumentRequestDto(
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
   * Create nested remove request using nestWithKey
   */
  toNestedRemove() {
    return this.nestRemove(this.toPlain());
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
  toPlain(): RemoveTagsFromDocumentRequest {
    return {
      documentId: this.documentId,
      tags: this.tags,
      userId: this.userId
    };
  }
}

    