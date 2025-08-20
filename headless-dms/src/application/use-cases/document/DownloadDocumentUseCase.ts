import { injectable, inject } from 'tsyringe';
import { AppResult } from '@carbonteq/hexapp';
import { DownloadDocumentRequest, DownloadDocumentResponse } from '../../../shared/dto/document/index.js';
import type { IDocumentApplicationService } from '../../../ports/input/IDocumentApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';
import { ApplicationError } from '../../../shared/errors/ApplicationError.js';

@injectable()
export class DownloadDocumentUseCase {
  constructor(
    @inject('IDocumentApplicationService') private documentApplicationService: IDocumentApplicationService,
    @inject('ILogger') private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'DownloadDocumentUseCase' });
  }

  async execute(request: DownloadDocumentRequest): Promise<AppResult<DownloadDocumentResponse>> {
    this.logger.info('Executing download document use case', { 
      documentId: request.documentId, 
      userId: request.userId 
    });

    try {
      const downloadResult = await this.documentApplicationService.downloadDocument(
        request.documentId,
        request.userId
      );
      
      if (downloadResult.isErr()) {
        this.logger.warn('Document download failed', { 
          documentId: request.documentId, 
          userId: request.userId,
          error: downloadResult.unwrapErr().message 
        });
        return AppResult.Err(new ApplicationError(
          'DownloadDocumentUseCase.documentDownloadFailed',
          'Document download failed',
          { documentId: request.documentId, userId: request.userId }
        ));
      }

      const { document, file } = downloadResult.unwrap();
      const response: DownloadDocumentResponse = {
        filePath: document.filePath,
        filename: document.name.value,
        mimeType: document.mimeType.value,
        size: document.size.bytes
      };

      this.logger.info('Document downloaded successfully', { 
        documentId: document.id, 
        userId: request.userId 
      });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { 
        documentId: request.documentId, 
        userId: request.userId 
      });
      return AppResult.Err(new ApplicationError(
        'DownloadDocumentUseCase.execute',
        error instanceof Error ? error.message : 'Failed to execute download document use case',
        { documentId: request.documentId, userId: request.userId }
      ));
    }
  }
}