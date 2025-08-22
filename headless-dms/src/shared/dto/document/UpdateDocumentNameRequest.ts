import { z } from 'zod';
import { AppResult } from '@carbonteq/hexapp';
import { BaseDto, type DtoValidationResult } from '../base/index.js';

export const UpdateDocumentNameRequestSchema = z.object({
    documentId: z.string().uuid('Invalid document ID'),
    name: z.string().min(1, 'Document name cannot be empty'),
    userId: z.string().uuid('Invalid user ID'),
});

export type UpdateDocumentNameRequest = z.infer<typeof UpdateDocumentNameRequestSchema>;

/**
 * Update Document Name Request DTO that extends BaseDto
 * Provides validation for document name update requests
 */
export class UpdateDocumentNameRequestDto extends BaseDto {
  constructor(
    public readonly documentId: string,
    public readonly name: string,
    public readonly userId: string
  ) {
    super();
  }

  /**
   * Validate and create UpdateDocumentNameRequestDto from unknown data
   */
  static create(data: unknown): DtoValidationResult<UpdateDocumentNameRequestDto> {
    const validationResult = this.validate(UpdateDocumentNameRequestSchema, data);
    
    if (validationResult.isErr()) {
      return validationResult as DtoValidationResult<UpdateDocumentNameRequestDto>;
    }

    const validated = validationResult.unwrap();
    const dto = new UpdateDocumentNameRequestDto(
      validated.documentId,
      validated.name,
      validated.userId
    );

    return AppResult.Ok(dto);
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): UpdateDocumentNameRequest {
    return {
      documentId: this.documentId,
      name: this.name,
      userId: this.userId
    };
  }
}

