import { z } from 'zod';
import { AppResult } from '@carbonteq/hexapp';
import { nestWithKey, extractId, toSerialized } from '@carbonteq/hexapp';
import { BaseDto, type DtoValidationResult } from '../base/index.js';

export const ReplaceTagsinDocumentRequestSchema = z.object({
    documentId: z.string().uuid('Invalid document ID'),
    tags: z.array(z.string()).min(1, 'At least one tag is required'),
    userId: z.string().uuid('Invalid user ID'),
});

export type ReplaceTagsinDocumentRequest = z.infer<typeof ReplaceTagsinDocumentRequestSchema>;

/**
 * Replace Tags in Document Request DTO that extends BaseDto
 * Provides validation for replacing all tags in document requests
 */
export class ReplaceTagsinDocumentRequestDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestTags = nestWithKey('tags');
  private readonly nestReplace = nestWithKey('replace');
  private readonly nestUpdate = nestWithKey('update');

  constructor(
    public readonly documentId: string,
    public readonly tags: string[],
    public readonly userId: string
  ) {
    super();
  }

  /**
   * Validate and create ReplaceTagsinDocumentRequestDto from unknown data
   */
  static create(data: unknown): DtoValidationResult<ReplaceTagsinDocumentRequestDto> {
    const validationResult = this.validate(ReplaceTagsinDocumentRequestSchema, data);
    
    if (validationResult.isErr()) {
      return validationResult as DtoValidationResult<ReplaceTagsinDocumentRequestDto>;
    }

    const validated = validationResult.unwrap();
    const dto = new ReplaceTagsinDocumentRequestDto(
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
   * Create nested replace request using nestWithKey
   */
  toNestedReplace() {
    return this.nestReplace(this.toPlain());
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
  toPlain(): ReplaceTagsinDocumentRequest {
    return {
      documentId: this.documentId,
      tags: this.tags,
      userId: this.userId
    };
  }
}

    