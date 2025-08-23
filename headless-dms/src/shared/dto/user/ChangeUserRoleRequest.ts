import { z } from 'zod';
import { AppResult } from '@carbonteq/hexapp';
import { nestWithKey, extractId, toSerialized } from '@carbonteq/hexapp';
import { BaseDto, type DtoValidationResult } from '../base/index.js';

export const ChangeUserRoleRequestSchema = z.object({
  newRole: z.enum(['user', 'admin'], 'Invalid role'),
});

export type ChangeUserRoleRequest = z.infer<typeof ChangeUserRoleRequestSchema>;

/**
 * Change User Role Request DTO that extends BaseDto
 * Provides validation for role change requests
 */
export class ChangeUserRoleRequestDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestRole = nestWithKey('role');
  private readonly nestPermissions = nestWithKey('permissions');
  private readonly nestAdmin = nestWithKey('admin');

  constructor(
    public readonly newRole: 'user' | 'admin'
  ) {
    super();
  }

  /**
   * Validate and create ChangeUserRoleRequestDto from unknown data
   */
  static create(data: unknown): DtoValidationResult<ChangeUserRoleRequestDto> {
    const validationResult = this.validate(ChangeUserRoleRequestSchema, data);
    
    if (validationResult.isErr()) {
      return validationResult as DtoValidationResult<ChangeUserRoleRequestDto>;
    }

    const validated = validationResult.unwrap();
    const dto = new ChangeUserRoleRequestDto(
      validated.newRole
    );

    return AppResult.Ok(dto);
  }

  /**
   * Create nested role request using nestWithKey
   */
  toNestedRole() {
    return this.nestRole(this.toPlain());
  }

  /**
   * Create nested permissions request using nestWithKey
   */
  toNestedPermissions() {
    return this.nestPermissions(this.toPlain());
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
  toPlain(): ChangeUserRoleRequest {
    return {
      newRole: this.newRole
    };
  }
} 