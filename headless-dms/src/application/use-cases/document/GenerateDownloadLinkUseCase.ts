import { injectable, inject } from 'tsyringe';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { GenerateDownloadLinkRequest, GenerateDownloadLinkResponse } from '../../../shared/dto/document/index.js';
import type { IDocumentApplicationService } from '../../../ports/input/IDocumentApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';

@injectable()
export class GenerateDownloadLinkUseCase {
  constructor(
    @inject('IDocumentApplicationService') private documentApplicationService: IDocumentApplicationService,
    @inject('ILogger') private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'GenerateDownloadLinkUseCase' });
  }

  async execute(request: GenerateDownloadLinkRequest): Promise<AppResult<GenerateDownloadLinkResponse>> {
    this.logger.info('Executing generate download link use case', { 
      documentId: request.documentId,
      expiresInMinutes: request.expiresInMinutes
    });

    try {
      const downloadLinkResult = await this.documentApplicationService.generateDownloadLink(
        request.documentId,
        request.expiresInMinutes
      );
      
      if (downloadLinkResult.isErr()) {
        const error = downloadLinkResult.unwrapErr();
        this.logger.warn('Download link generation failed', { 
          documentId: request.documentId,
          expiresInMinutes: request.expiresInMinutes,
          error: error.message || error.toString()
        });
        // Preserve the original error message instead of wrapping it
        return AppResult.Err(error);
      }

      const token = downloadLinkResult.unwrap();
      
      // Construct the download URL using the JWT token
      const downloadUrl = `/documents/download?token=${encodeURIComponent(token)}`;
      
      const response: GenerateDownloadLinkResponse = {
        downloadUrl,
        expiresAt: new Date(Date.now() + (request.expiresInMinutes || 5) * 60000),
        token
      };

      this.logger.info('Download link generated successfully', { 
        documentId: request.documentId,
        downloadUrl,
        expiresAt: response.expiresAt
      });
      
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { 
        documentId: request.documentId,
        expiresInMinutes: request.expiresInMinutes
      });
      // Preserve the original error message instead of wrapping it
      return AppResult.Err(error instanceof Error ? error : new Error('Unknown error'));
    }
  }
}