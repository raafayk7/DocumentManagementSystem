import { z } from 'zod';
import { AppResult } from '@carbonteq/hexapp';
import { nestWithKey, extractId, toSerialized } from '@carbonteq/hexapp';
import { BaseDto, type DtoValidationResult } from '../base/index.js';

export const GetDocumentsRequestSchema = z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(10),
    sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    // Enhanced filter parameters
    name: z.string().optional(),
    mimeType: z.string().optional(),
    tags: z.array(z.string()).optional(),
    metadata: z.record(z.string(), z.string()).optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
});

export type GetDocumentsRequest = z.infer<typeof GetDocumentsRequestSchema>;

/**
 * Get Documents Request DTO that extends BaseDto
 * Provides validation for document listing requests with filtering and pagination
 */
export class GetDocumentsRequestDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestDocuments = nestWithKey('documents');
  private readonly nestFilter = nestWithKey('filter');
  private readonly nestPagination = nestWithKey('pagination');

  constructor(
    public readonly page: number,
    public readonly limit: number,
    public readonly sortBy: 'name' | 'createdAt' | 'updatedAt',
    public readonly sortOrder: 'asc' | 'desc',
    public readonly name?: string,
    public readonly mimeType?: string,
    public readonly tags?: string[],
    public readonly metadata?: Record<string, string>,
    public readonly fromDate?: string,
    public readonly toDate?: string
  ) {
    super();
  }

  /**
   * Validate and create GetDocumentsRequestDto from unknown data
   */
  static create(data: unknown): DtoValidationResult<GetDocumentsRequestDto> {
    const validationResult = this.validate(GetDocumentsRequestSchema, data);
    
    if (validationResult.isErr()) {
      return validationResult as DtoValidationResult<GetDocumentsRequestDto>;
    }

    const validated = validationResult.unwrap();
    const dto = new GetDocumentsRequestDto(
      validated.page,
      validated.limit,
      validated.sortBy,
      validated.sortOrder,
      validated.name,
      validated.mimeType,
      validated.tags,
      validated.metadata,
      validated.fromDate,
      validated.toDate
    );

    return AppResult.Ok(dto);
  }

  /**
   * Create nested documents request using nestWithKey
   */
  toNestedDocuments() {
    return this.nestDocuments(this.toPlain());
  }

  /**
   * Create nested filter request using nestWithKey
   */
  toNestedFilter() {
    return this.nestFilter(this.toPlain());
  }

  /**
   * Create nested pagination request using nestWithKey
   */
  toNestedPagination() {
    return this.nestPagination(this.toPlain());
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): GetDocumentsRequest {
    return {
      page: this.page,
      limit: this.limit,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
      name: this.name,
      mimeType: this.mimeType,
      tags: this.tags,
      metadata: this.metadata,
      fromDate: this.fromDate,
      toDate: this.toDate
    };
  }
}

