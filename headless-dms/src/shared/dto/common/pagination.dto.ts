import { z } from 'zod';
import { AppResult } from '@carbonteq/hexapp';
import { nestWithKey, extractId, toSerialized } from '@carbonteq/hexapp';
import { BaseDto, type DtoValidationResult } from '../base/index.js';

// Pagination Input Schema
export const PaginationInputSchema = z.object({
  page: z.union([z.string(), z.number()]).transform((val) => parseInt(String(val), 10)).pipe(z.number().min(1)).default(1),
  limit: z.union([z.string(), z.number()]).transform((val) => parseInt(String(val), 10)).pipe(z.number().min(1).max(100)).default(10),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc')
});

export type PaginationInput = z.infer<typeof PaginationInputSchema>;

/**
 * Pagination Input DTO that extends BaseDto
 * Provides validation for pagination query parameters
 */
export class PaginationInputDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestPagination = nestWithKey('pagination');
  private readonly nestQuery = nestWithKey('query');

  constructor(
    public readonly page: number,
    public readonly limit: number,
    public readonly sort?: string,
    public readonly order: 'asc' | 'desc' = 'desc'
  ) {
    super();
  }

  /**
   * Validate and create PaginationInputDto from unknown data
   */
  static create(data: unknown): DtoValidationResult<PaginationInputDto> {
    const validationResult = this.validate(PaginationInputSchema, data);
    
    if (validationResult.isErr()) {
      return validationResult as DtoValidationResult<PaginationInputDto>;
    }

    const validated = validationResult.unwrap();
    const dto = new PaginationInputDto(
      validated.page,
      validated.limit,
      validated.sort,
      validated.order
    );

    return AppResult.Ok(dto);
  }

  /**
   * Create nested pagination response using nestWithKey
   */
  toNestedResponse() {
    return this.nestPagination(this.toPlain());
  }

  /**
   * Create nested query response using nestWithKey
   */
  toNestedQuery() {
    return this.nestQuery(this.toPlain());
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): PaginationInput {
    return {
      page: this.page,
      limit: this.limit,
      sort: this.sort,
      order: this.order
    };
  }
}

// Pagination Output Schema
export const PaginationOutputSchema = z.object({
  data: z.array(z.any()),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean()
  })
});

export type PaginationOutput<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

/**
 * Pagination Output DTO that extends BaseDto
 * Provides structured response for paginated data
 */
export class PaginationOutputDto<T> extends BaseDto {
  // Hexapp composition utilities
  private readonly nestData = nestWithKey('data');
  private readonly nestResponse = nestWithKey('response');
  private readonly nestResults = nestWithKey('results');

  constructor(
    public readonly data: T[],
    public readonly pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    }
  ) {
    super();
  }

  /**
   * Create PaginationOutputDto from data and pagination info
   */
  static create<T>(
    data: T[],
    page: number,
    limit: number,
    total: number
  ): PaginationOutputDto<T> {
    const paginationInfo = calculatePaginationMetadata(page, limit, total);
    
    return new PaginationOutputDto(data, paginationInfo);
  }

  /**
   * Create nested data response using nestWithKey
   */
  toNestedData() {
    return this.nestData(this.toPlain());
  }

  /**
   * Create nested response using nestWithKey
   */
  toNestedResponse() {
    return this.nestResponse(this.toPlain());
  }

  /**
   * Create nested results response using nestWithKey
   */
  toNestedResults() {
    return this.nestResults(this.toPlain());
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): PaginationOutput<T> {
    return {
      data: this.data,
      pagination: this.pagination
    };
  }

  /**
   * Validate pagination output structure
   * Note: This is mainly for response validation if needed
   */
  static validateStructure(data: unknown): DtoValidationResult<PaginationOutput<any>> {
    return BaseDto.validate(PaginationOutputSchema, data);
  }
}

// Helper function to calculate pagination metadata
export function calculatePaginationMetadata(
  page: number,
  limit: number,
  total: number
) {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
}