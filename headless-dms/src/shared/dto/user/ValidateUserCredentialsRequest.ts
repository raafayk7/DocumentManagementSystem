import { z } from 'zod';
import { AppResult } from '@carbonteq/hexapp';
import { BaseDto, type DtoValidationResult } from '../base/index.js';

export const ValidateUserCredentialsRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password cannot be empty'),
});

export type ValidateUserCredentialsRequest = z.infer<typeof ValidateUserCredentialsRequestSchema>;

/**
 * Validate User Credentials Request DTO that extends BaseDto
 * Provides validation for credential validation requests
 */
export class ValidateUserCredentialsRequestDto extends BaseDto {
  constructor(
    public readonly email: string,
    public readonly password: string
  ) {
    super();
  }

  /**
   * Validate and create ValidateUserCredentialsRequestDto from unknown data
   */
  static create(data: unknown): DtoValidationResult<ValidateUserCredentialsRequestDto> {
    const validationResult = this.validate(ValidateUserCredentialsRequestSchema, data);
    
    if (validationResult.isErr()) {
      return validationResult as DtoValidationResult<ValidateUserCredentialsRequestDto>;
    }

    const validated = validationResult.unwrap();
    const dto = new ValidateUserCredentialsRequestDto(
      validated.email,
      validated.password
    );

    return AppResult.Ok(dto);
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): ValidateUserCredentialsRequest {
    return {
      email: this.email,
      password: this.password
    };
  }
} 