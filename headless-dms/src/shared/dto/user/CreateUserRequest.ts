import { z } from 'zod';
import { AppResult } from '@carbonteq/hexapp';
import { BaseDto, type DtoValidationResult } from '../base/index.js';

// Reusing existing RegisterSchema from src/auth/dto/register.dto.ts
export const CreateUserRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['user', 'admin']),
});

export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

/**
 * Create User Request DTO that extends BaseDto
 * Provides validation for user creation requests
 */
export class CreateUserRequestDto extends BaseDto {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly role: 'user' | 'admin'
  ) {
    super();
  }

  /**
   * Validate and create CreateUserRequestDto from unknown data
   */
  static create(data: unknown): DtoValidationResult<CreateUserRequestDto> {
    const validationResult = this.validate(CreateUserRequestSchema, data);
    
    if (validationResult.isErr()) {
      return validationResult as DtoValidationResult<CreateUserRequestDto>;
    }

    const validated = validationResult.unwrap();
    const dto = new CreateUserRequestDto(
      validated.email,
      validated.password,
      validated.role
    );

    return AppResult.Ok(dto);
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): CreateUserRequest {
    return {
      email: this.email,
      password: this.password,
      role: this.role
    };
  }
}
