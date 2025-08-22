import { z } from 'zod';
import { AppResult } from '@carbonteq/hexapp';
import { BaseDto, type DtoValidationResult } from '../base/index.js';

export const GetDocumentByIdRequestSchema = z.object({
    documentId: z.string().uuid('Invalid document ID'),
});

export type GetDocumentByIdRequest = z.infer<typeof GetDocumentByIdRequestSchema>;

/**
 * Get Document By ID Request DTO that extends BaseDto
 * Provides validation for document lookup requests
 */
export class GetDocumentByIdRequestDto extends BaseDto {
  constructor(
    public readonly documentId: string
  ) {
    super();
  }

  /**
   * Validate and create GetDocumentByIdRequestDto from unknown data
   */
  static create(data: unknown): DtoValidationResult<GetDocumentByIdRequestDto> {
    const validationResult = this.validate(GetDocumentByIdRequestSchema, data);
    
    if (validationResult.isErr()) {
      return validationResult as DtoValidationResult<GetDocumentByIdRequestDto>;
    }

    const validated = validationResult.unwrap();
    const dto = new GetDocumentByIdRequestDto(validated.documentId);

    return AppResult.Ok(dto);
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): GetDocumentByIdRequest {
    return {
      documentId: this.documentId
    };
  }
}

