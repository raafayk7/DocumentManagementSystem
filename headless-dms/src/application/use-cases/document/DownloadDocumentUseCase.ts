import { injectable, inject } from 'tsyringe';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { DownloadDocumentRequest, DownloadDocumentResponse } from '../../../shared/dto/document/index.js';
import type { IDocumentApplicationService } from '../../../ports/input/IDocumentApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';

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
          userId: request.userId 
        });
        return AppResult.Err(AppError.InvalidOperation(
          `Document download failed for document ID: ${request.documentId}`
        ));
      }

      const downloadInfo = downloadResult.unwrap();
      const response: DownloadDocumentResponse = {
        document: {
          id: downloadInfo.document.id,
          name: downloadInfo.document.name.value,
          filePath: downloadInfo.document.filePath,
          mimeType: downloadInfo.document.mimeType.value,
          size: downloadInfo.document.size.bytes.toString(),
          tags: downloadInfo.document.tags,
          metadata: downloadInfo.document.metadata,
          userId: downloadInfo.document.userId,
          createdAt: downloadInfo.document.createdAt,
          updatedAt: downloadInfo.document.updatedAt
        },
        file: downloadInfo.file,
        message: 'Document downloaded successfully'
      };

      this.logger.info('Document downloaded successfully', { 
        documentId: request.documentId,
        userId: request.userId,
        fileSize: downloadInfo.file.length 
      });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { 
        documentId: request.documentId,
        userId: request.userId 
      });
      return AppResult.Err(AppError.Generic(
        `Failed to execute download document use case for document ID: ${request.documentId}`
      ));
    }
  }
}