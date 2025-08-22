import { z } from 'zod';
import { AppResult } from '@carbonteq/hexapp';
import { nestWithKey, extractId, toSerialized } from '@carbonteq/hexapp';
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
  // Hexapp composition utilities
  private readonly nestDocument = nestWithKey('document');
  private readonly nestLookup = nestWithKey('lookup');
  private readonly nestQuery = nestWithKey('query');

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
   * Create nested document request using nestWithKey
   */
  toNestedDocument() {
    return this.nestDocument(this.toPlain());
  }

  /**
   * Create nested lookup request using nestWithKey
   */
  toNestedLookup() {
    return this.nestLookup(this.toPlain());
  }

  /**
   * Create nested query request using nestWithKey
   */
  toNestedQuery() {
    return this.nestQuery(this.toPlain());
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

