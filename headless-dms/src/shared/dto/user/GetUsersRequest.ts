import { z } from 'zod';
import { AppResult } from '@carbonteq/hexapp';
import { nestWithKey, extractId, toSerialized } from '@carbonteq/hexapp';
import { BaseDto, type DtoValidationResult } from '../base/index.js';

export const GetUsersRequestSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  search: z.string().optional(),
  email: z.string().email().optional(),
  role: z.enum(['user', 'admin']).optional(),
  sortBy: z.enum(['email', 'role', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type GetUsersRequest = z.infer<typeof GetUsersRequestSchema>;

/**
 * Get Users Request DTO that extends BaseDto
 * Provides validation for user listing requests with filtering and pagination
 */
export class GetUsersRequestDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestUsers = nestWithKey('users');
  private readonly nestFilter = nestWithKey('filter');
  private readonly nestPagination = nestWithKey('pagination');

  constructor(
    public readonly page: number,
    public readonly limit: number,
    public readonly search?: string,
    public readonly email?: string,
    public readonly role?: 'user' | 'admin',
    public readonly sortBy: 'email' | 'role' | 'createdAt' | 'updatedAt' = 'createdAt',
    public readonly sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    super();
  }

  /**
   * Validate and create GetUsersRequestDto from unknown data
   */
  static create(data: unknown): DtoValidationResult<GetUsersRequestDto> {
    const validationResult = this.validate(GetUsersRequestSchema, data);
    
    if (validationResult.isErr()) {
      return validationResult as DtoValidationResult<GetUsersRequestDto>;
    }

    const validated = validationResult.unwrap();
    const dto = new GetUsersRequestDto(
      validated.page,
      validated.limit,
      validated.search,
      validated.email,
      validated.role,
      validated.sortBy,
      validated.sortOrder
    );

    return AppResult.Ok(dto);
  }

  /**
   * Create nested users request using nestWithKey
   */
  toNestedUsers() {
    return this.nestUsers(this.toPlain());
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
  toPlain(): GetUsersRequest {
    return {
      page: this.page,
      limit: this.limit,
      search: this.search,
      email: this.email,
      role: this.role,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder
    };
  }
} 