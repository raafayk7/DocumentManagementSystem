import { z } from 'zod';
import { AppResult } from '@carbonteq/hexapp';
import { nestWithKey, extractId, toSerialized } from '@carbonteq/hexapp';
import { BaseDto, type DtoValidationResult } from '../base/index.js';

export const GenerateDownloadLinkRequestSchema = z.object({
  documentId: z.string().uuid('Invalid document ID'),
  expiresInMinutes: z.number().min(1).max(1440).default(5), // 1 minute to 24 hours, default 5 minutes
});

export type GenerateDownloadLinkRequest = z.infer<typeof GenerateDownloadLinkRequestSchema>;

/**
 * Generate Download Link Request DTO that extends BaseDto
 * Provides validation for download link generation requests
 */
export class GenerateDownloadLinkRequestDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestLink = nestWithKey('link');
  private readonly nestGenerate = nestWithKey('generate');
  private readonly nestTemporary = nestWithKey('temporary');

  constructor(
    public readonly documentId: string,
    public readonly expiresInMinutes: number
  ) {
    super();
  }

  /**
   * Validate and create GenerateDownloadLinkRequestDto from unknown data
   */
  static create(data: unknown): DtoValidationResult<GenerateDownloadLinkRequestDto> {
    const validationResult = this.validate(GenerateDownloadLinkRequestSchema, data);
    
    if (validationResult.isErr()) {
      return validationResult as DtoValidationResult<GenerateDownloadLinkRequestDto>;
    }

    const validated = validationResult.unwrap();
    const dto = new GenerateDownloadLinkRequestDto(
      validated.documentId,
      validated.expiresInMinutes
    );

    return AppResult.Ok(dto);
  }

  /**
   * Create nested link request using nestWithKey
   */
  toNestedLink() {
    return this.nestLink(this.toPlain());
  }

  /**
   * Create nested generate request using nestWithKey
   */
  toNestedGenerate() {
    return this.nestGenerate(this.toPlain());
  }

  /**
   * Create nested temporary request using nestWithKey
   */
  toNestedTemporary() {
    return this.nestTemporary(this.toPlain());
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): GenerateDownloadLinkRequest {
    return {
      documentId: this.documentId,
      expiresInMinutes: this.expiresInMinutes
    };
  }
} 