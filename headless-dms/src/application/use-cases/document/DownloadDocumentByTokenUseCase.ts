import { injectable, inject } from 'tsyringe';
import { AppResult } from '@carbonteq/hexapp';
import { DownloadDocumentByTokenRequest, DownloadDocumentByTokenResponse } from '../../../shared/dto/document/index.js';
import type { IDocumentApplicationService } from '../../../ports/input/IDocumentApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';
import { ApplicationError } from '../../../shared/errors/ApplicationError.js';

@injectable()
export class DownloadDocumentByTokenUseCase {
  constructor(
    @inject('IDocumentApplicationService') private documentApplicationService: IDocumentApplicationService,
    @inject('ILogger') private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'DownloadDocumentByTokenUseCase' });
  }

  async execute(request: DownloadDocumentByTokenRequest): Promise<AppResult<DownloadDocumentByTokenResponse>> {
    this.logger.info('Executing download document by token use case', { token: request.token });

    try {
      const downloadResult = await this.documentApplicationService.downloadDocumentByToken(request.token);
      
      if (downloadResult.isErr()) {
        this.logger.warn('Document download by token failed', { 
          token: request.token,
          error: downloadResult.unwrapErr().message 
        });
        return AppResult.Err(new ApplicationError(
          'DownloadDocumentByTokenUseCase.documentDownloadFailed',
          'Document download failed',
          { token: request.token }
        ));
      }

      const { document, file } = downloadResult.unwrap();
      const response: DownloadDocumentByTokenResponse = {
        document: {
          id: document.id,
          name: document.name.value,
          filePath: document.filePath,
          mimeType: document.mimeType.value,
          size: document.size.bytes.toString(),
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
          tags: document.tags,
          metadata: document.metadata
        },
        file: file
      };

      this.logger.info('Document downloaded successfully by token', { 
        documentId: document.id, 
        token: request.token 
      });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { token: request.token });
      return AppResult.Err(new ApplicationError(
        'DownloadDocumentByTokenUseCase.execute',
        error instanceof Error ? error.message : 'Failed to execute download document by token use case',
        { token: request.token }
      ));
    }
  }
}

