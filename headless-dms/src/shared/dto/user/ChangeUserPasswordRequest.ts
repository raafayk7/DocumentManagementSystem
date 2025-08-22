import { z } from 'zod';
import { AppResult } from '@carbonteq/hexapp';
import { BaseDto, type DtoValidationResult } from '../base/index.js';

export const ChangeUserPasswordRequestSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export type ChangeUserPasswordRequest = z.infer<typeof ChangeUserPasswordRequestSchema>;

/**
 * Change User Password Request DTO that extends BaseDto
 * Provides validation for password change requests
 */
export class ChangeUserPasswordRequestDto extends BaseDto {
  constructor(
    public readonly userId: string,
    public readonly currentPassword: string,
    public readonly newPassword: string
  ) {
    super();
  }

  /**
   * Validate and create ChangeUserPasswordRequestDto from unknown data
   */
  static create(data: unknown): DtoValidationResult<ChangeUserPasswordRequestDto> {
    const validationResult = this.validate(ChangeUserPasswordRequestSchema, data);
    
    if (validationResult.isErr()) {
      return validationResult as DtoValidationResult<ChangeUserPasswordRequestDto>;
    }

    const validated = validationResult.unwrap();
    const dto = new ChangeUserPasswordRequestDto(
      validated.userId,
      validated.currentPassword,
      validated.newPassword
    );

    return AppResult.Ok(dto);
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): ChangeUserPasswordRequest {
    return {
      userId: this.userId,
      currentPassword: this.currentPassword,
      newPassword: this.newPassword
    };
  }
} 