import { z } from 'zod';
import { AppResult } from '@carbonteq/hexapp';
import { nestWithKey, extractId, toSerialized } from '@carbonteq/hexapp';
import { BaseDto, type DtoValidationResult } from '../base/index.js';

export const DeleteDocumentRequestSchema = z.object({
    documentId: z.string().uuid('Invalid document ID'),
    userId: z.string().uuid('Invalid user ID'),
});

export type DeleteDocumentRequest = z.infer<typeof DeleteDocumentRequestSchema>;

/**
 * Delete Document Request DTO that extends BaseDto
 * Provides validation for document deletion requests
 */
export class DeleteDocumentRequestDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestDelete = nestWithKey('delete');
  private readonly nestDocument = nestWithKey('document');
  private readonly nestRemoval = nestWithKey('removal');

  constructor(
    public readonly documentId: string,
    public readonly userId: string
  ) {
    super();
  }

  /**
   * Validate and create DeleteDocumentRequestDto from unknown data
   */
  static create(data: unknown): DtoValidationResult<DeleteDocumentRequestDto> {
    const validationResult = this.validate(DeleteDocumentRequestSchema, data);
    
    if (validationResult.isErr()) {
      return validationResult as DtoValidationResult<DeleteDocumentRequestDto>;
    }

    const validated = validationResult.unwrap();
    const dto = new DeleteDocumentRequestDto(
      validated.documentId,
      validated.userId
    );

    return AppResult.Ok(dto);
  }

  /**
   * Create nested delete request using nestWithKey
   */
  toNestedDelete() {
    return this.nestDelete(this.toPlain());
  }

  /**
   * Create nested document request using nestWithKey
   */
  toNestedDocument() {
    return this.nestDocument(this.toPlain());
  }

  /**
   * Create nested removal request using nestWithKey
   */
  toNestedRemoval() {
    return this.nestRemoval(this.toPlain());
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): DeleteDocumentRequest {
    return {
      documentId: this.documentId,
      userId: this.userId
    };
  }
}

