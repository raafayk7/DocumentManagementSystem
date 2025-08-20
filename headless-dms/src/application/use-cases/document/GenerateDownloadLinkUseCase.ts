import { injectable, inject } from 'tsyringe';
import { AppResult } from '@carbonteq/hexapp';
import { GenerateDownloadLinkRequest, GenerateDownloadLinkResponse } from '../../../shared/dto/document/index.js';
import type { IDocumentApplicationService } from '../../../ports/input/IDocumentApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';
import { ApplicationError } from '../../../shared/errors/ApplicationError.js';

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
      const linkResult = await this.documentApplicationService.generateDownloadLink(
        request.documentId,
        request.expiresInMinutes
      );
      
      if (linkResult.isErr()) {
        this.logger.warn('Download link generation failed', { 
          documentId: request.documentId, 
          expiresInMinutes: request.expiresInMinutes,
          error: linkResult.unwrapErr().message 
        });
        return AppResult.Err(new ApplicationError(
          'GenerateDownloadLinkUseCase.linkGenerationFailed',
          'Download link generation failed',
          { documentId: request.documentId, expiresInMinutes: request.expiresInMinutes }
        ));
      }

      const link = linkResult.unwrap();
      const response: GenerateDownloadLinkResponse = {
        downloadUrl: link,
        expiresAt: new Date(Date.now() + request.expiresInMinutes * 60 * 1000),
        token: 'dummy-token' // This should come from the actual service
      };

      this.logger.info('Download link generated successfully', { 
        documentId: request.documentId, 
        expiresInMinutes: request.expiresInMinutes 
      });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { 
        documentId: request.documentId, 
        expiresInMinutes: request.expiresInMinutes 
      });
      return AppResult.Err(new ApplicationError(
        'GenerateDownloadLinkUseCase.execute',
        error instanceof Error ? error.message : 'Failed to execute generate download link use case',
        { documentId: request.documentId, expiresInMinutes: request.expiresInMinutes }
      ));
    }
  }
}