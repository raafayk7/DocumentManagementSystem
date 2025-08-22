import { z } from 'zod';
import { AppResult } from '@carbonteq/hexapp';
import { BaseDto, type DtoValidationResult } from '../base/index.js';

export const DownloadDocumentRequestSchema = z.object({
  documentId: z.string().uuid('Invalid document ID'),
  userId: z.string().uuid('Invalid user ID'),
});

export type DownloadDocumentRequest = z.infer<typeof DownloadDocumentRequestSchema>;

/**
 * Download Document Request DTO that extends BaseDto
 * Provides validation for document download requests
 */
export class DownloadDocumentRequestDto extends BaseDto {
  constructor(
    public readonly documentId: string,
    public readonly userId: string
  ) {
    super();
  }

  /**
   * Validate and create DownloadDocumentRequestDto from unknown data
   */
  static create(data: unknown): DtoValidationResult<DownloadDocumentRequestDto> {
    const validationResult = this.validate(DownloadDocumentRequestSchema, data);
    
    if (validationResult.isErr()) {
      return validationResult as DtoValidationResult<DownloadDocumentRequestDto>;
    }

    const validated = validationResult.unwrap();
    const dto = new DownloadDocumentRequestDto(
      validated.documentId,
      validated.userId
    );

    return AppResult.Ok(dto);
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): DownloadDocumentRequest {
    return {
      documentId: this.documentId,
      userId: this.userId
    };
  }
} 