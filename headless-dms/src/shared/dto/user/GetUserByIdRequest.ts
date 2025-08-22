import { z } from 'zod';
import { AppResult } from '@carbonteq/hexapp';
import { BaseDto, type DtoValidationResult } from '../base/index.js';

export const GetUserByIdRequestSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

export type GetUserByIdRequest = z.infer<typeof GetUserByIdRequestSchema>;

/**
 * Get User By ID Request DTO that extends BaseDto
 * Provides validation for user lookup requests
 */
export class GetUserByIdRequestDto extends BaseDto {
  constructor(
    public readonly userId: string
  ) {
    super();
  }

  /**
   * Validate and create GetUserByIdRequestDto from unknown data
   */
  static create(data: unknown): DtoValidationResult<GetUserByIdRequestDto> {
    const validationResult = this.validate(GetUserByIdRequestSchema, data);
    
    if (validationResult.isErr()) {
      return validationResult as DtoValidationResult<GetUserByIdRequestDto>;
    }

    const validated = validationResult.unwrap();
    const dto = new GetUserByIdRequestDto(validated.userId);

    return AppResult.Ok(dto);
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): GetUserByIdRequest {
    return {
      userId: this.userId
    };
  }
} 