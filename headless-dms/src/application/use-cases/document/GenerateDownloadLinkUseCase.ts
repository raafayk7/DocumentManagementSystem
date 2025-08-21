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
      // userId: request.userId 
      expiresInMinutes: request.expiresInMinutes
    });

    try {
      const downloadLinkResult = await this.documentApplicationService.generateDownloadLink(
        request.documentId,
        // request.userId
        request.expiresInMinutes
      );
      
      if (downloadLinkResult.isErr()) {
        this.logger.warn('Download link generation failed', { 
          documentId: request.documentId,
          // userId: request.userId 
          expiresInMinutes: request.expiresInMinutes
        });
        return AppResult.Err(AppError.InvalidOperation(
          `Download link generation failed for document ID: ${request.documentId}`
        ));
      }

      const downloadInfo = downloadLinkResult.unwrap();
      const response: GenerateDownloadLinkResponse = {
        downloadUrl: '',
        expiresAt: new Date(Date.now() + request.expiresInMinutes * 60000),
        token: downloadInfo
        // message: 'Download link generated successfully'
      };

      this.logger.info('Download link generated successfully', { 
        documentId: request.documentId,
        // userId: request.userId,
        expiresAt: response.expiresAt
      });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { 
        documentId: request.documentId,
        // userId: request.userId 
      });
      return AppResult.Err(AppError.Generic(
        `Failed to execute generate download link use case for document ID: ${request.documentId}`
      ));
    }
  }
}