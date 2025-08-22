import { z } from 'zod';
import { AppResult } from '@carbonteq/hexapp';
import { nestWithKey, extractId, toSerialized } from '@carbonteq/hexapp';
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
  // Hexapp composition utilities
  private readonly nestValidation = nestWithKey('validation');
  private readonly nestCredentials = nestWithKey('credentials');
  private readonly nestVerify = nestWithKey('verify');

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
   * Create nested validation request using nestWithKey
   */
  toNestedValidation() {
    return this.nestValidation(this.toPlain());
  }

  /**
   * Create nested credentials request using nestWithKey
   */
  toNestedCredentials() {
    return this.nestCredentials(this.toPlain());
  }

  /**
   * Create nested verify request using nestWithKey
   */
  toNestedVerify() {
    return this.nestVerify(this.toPlain());
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