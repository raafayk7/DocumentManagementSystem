import { injectable, inject } from 'tsyringe';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { DownloadDocumentByTokenRequest, DownloadDocumentByTokenResponse } from '../../../shared/dto/document/index.js';
import type { IDocumentApplicationService } from '../../../ports/input/IDocumentApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';

@injectable()
export class DownloadDocumentByTokenUseCase {
  constructor(
    @inject('IDocumentApplicationService') private documentApplicationService: IDocumentApplicationService,
    @inject('ILogger') private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'DownloadDocumentByTokenUseCase' });
  }

  async execute(request: DownloadDocumentByTokenRequest): Promise<AppResult<DownloadDocumentByTokenResponse>> {
    this.logger.info('Executing download document by token use case', { 
      token: request.token.substring(0, 20) + '...' // Log partial token for security
    });

    try {
      const downloadResult = await this.documentApplicationService.downloadDocumentByToken(
        request.token
      );
      
      if (downloadResult.isErr()) {
        this.logger.warn('Document download by token failed', { 
          token: request.token.substring(0, 20) + '...' 
        });
        return AppResult.Err(AppError.InvalidOperation(
          'Document download by token failed - invalid or expired token'
        ));
      }

      const downloadInfo = downloadResult.unwrap();
      const response: DownloadDocumentByTokenResponse = {
        document: {
          id: downloadInfo.document.id,
          name: downloadInfo.document.name.value,
          filePath: downloadInfo.document.filePath,
          mimeType: downloadInfo.document.mimeType.value,
          size: downloadInfo.document.size.bytes.toString(),
          tags: downloadInfo.document.tags,
          metadata: downloadInfo.document.metadata,
          // userId: downloadInfo.document.userId,
          createdAt: downloadInfo.document.createdAt,
          updatedAt: downloadInfo.document.updatedAt
        },
        file: downloadInfo.file,
        // message: 'Document downloaded successfully by token'
      };

      this.logger.info('Document downloaded successfully by token', { 
        documentId: downloadInfo.document.id,
        fileSize: downloadInfo.file.length 
      });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { 
        token: request.token.substring(0, 20) + '...' 
      });
      return AppResult.Err(AppError.Generic(
        'Failed to execute download document by token use case'
      ));
    }
  }
}

