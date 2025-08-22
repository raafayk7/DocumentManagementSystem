import { z } from 'zod';
import { AppResult } from '@carbonteq/hexapp';
import { BaseDto, type DtoValidationResult } from '../base/index.js';

export const DownloadDocumentByTokenRequestSchema = z.object({
    token: z.string().min(1, 'Token cannot be empty'),
});

export type DownloadDocumentByTokenRequest = z.infer<typeof DownloadDocumentByTokenRequestSchema>;

/**
 * Download Document By Token Request DTO that extends BaseDto
 * Provides validation for token-based document download requests
 */
export class DownloadDocumentByTokenRequestDto extends BaseDto {
  constructor(
    public readonly token: string
  ) {
    super();
  }

  /**
   * Validate and create DownloadDocumentByTokenRequestDto from unknown data
   */
  static create(data: unknown): DtoValidationResult<DownloadDocumentByTokenRequestDto> {
    const validationResult = this.validate(DownloadDocumentByTokenRequestSchema, data);
    
    if (validationResult.isErr()) {
      return validationResult as DtoValidationResult<DownloadDocumentByTokenRequestDto>;
    }

    const validated = validationResult.unwrap();
    const dto = new DownloadDocumentByTokenRequestDto(validated.token);

    return AppResult.Ok(dto);
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): DownloadDocumentByTokenRequest {
    return {
      token: this.token
    };
  }
}