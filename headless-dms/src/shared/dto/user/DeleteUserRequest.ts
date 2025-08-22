import { z } from 'zod';
import { AppResult } from '@carbonteq/hexapp';
import { nestWithKey, extractId, toSerialized } from '@carbonteq/hexapp';
import { BaseDto, type DtoValidationResult } from '../base/index.js';

export const DeleteUserRequestSchema = z.object({
  currentUserId: z.string().uuid('Invalid current user ID'),
  userId: z.string().uuid('Invalid user ID'),
});

export type DeleteUserRequest = z.infer<typeof DeleteUserRequestSchema>;

/**
 * Delete User Request DTO that extends BaseDto
 * Provides validation for user deletion requests
 */
export class DeleteUserRequestDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestDelete = nestWithKey('delete');
  private readonly nestRemoval = nestWithKey('removal');
  private readonly nestAdmin = nestWithKey('admin');

  constructor(
    public readonly currentUserId: string,
    public readonly userId: string
  ) {
    super();
  }

  /**
   * Validate and create DeleteUserRequestDto from unknown data
   */
  static create(data: unknown): DtoValidationResult<DeleteUserRequestDto> {
    const validationResult = this.validate(DeleteUserRequestSchema, data);
    
    if (validationResult.isErr()) {
      return validationResult as DtoValidationResult<DeleteUserRequestDto>;
    }

    const validated = validationResult.unwrap();
    const dto = new DeleteUserRequestDto(
      validated.currentUserId,
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
   * Create nested removal request using nestWithKey
   */
  toNestedRemoval() {
    return this.nestRemoval(this.toPlain());
  }

  /**
   * Create nested admin request using nestWithKey
   */
  toNestedAdmin() {
    return this.nestAdmin(this.toPlain());
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): DeleteUserRequest {
    return {
      currentUserId: this.currentUserId,
      userId: this.userId
    };
  }
} 