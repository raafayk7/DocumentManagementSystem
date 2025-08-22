import { z } from 'zod';
import { AppResult } from '@carbonteq/hexapp';
import { BaseDto, type DtoValidationResult } from '../base/index.js';

// Reusing existing LoginSchema from src/auth/dto/login.dto.ts
export const AuthenticateUserRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type AuthenticateUserRequest = z.infer<typeof AuthenticateUserRequestSchema>;

/**
 * Authenticate User Request DTO that extends BaseDto
 * Provides validation for user authentication requests
 */
export class AuthenticateUserRequestDto extends BaseDto {
  constructor(
    public readonly email: string,
    public readonly password: string
  ) {
    super();
  }

  /**
   * Validate and create AuthenticateUserRequestDto from unknown data
   */
  static create(data: unknown): DtoValidationResult<AuthenticateUserRequestDto> {
    const validationResult = this.validate(AuthenticateUserRequestSchema, data);
    
    if (validationResult.isErr()) {
      return validationResult as DtoValidationResult<AuthenticateUserRequestDto>;
    }

    const validated = validationResult.unwrap();
    const dto = new AuthenticateUserRequestDto(
      validated.email,
      validated.password
    );

    return AppResult.Ok(dto);
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): AuthenticateUserRequest {
    return {
      email: this.email,
      password: this.password
    };
  }
}
