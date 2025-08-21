import { injectable, inject } from 'tsyringe';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { UploadDocumentRequest, UploadDocumentResponse } from '../../../shared/dto/document/index.js';
import type { IDocumentApplicationService } from '../../../ports/input/IDocumentApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';

@injectable()
export class UploadDocumentUseCase {
  constructor(
    @inject('IDocumentApplicationService') private documentApplicationService: IDocumentApplicationService,
    @inject('ILogger') private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'UploadDocumentUseCase' });
  }

  async execute(request: UploadDocumentRequest): Promise<AppResult<UploadDocumentResponse>> {
    this.logger.info('Executing upload document use case', { 
      name: request.name, 
      filePath: request.filePath,
      mimeType: request.mimeType,
      size: request.size,
      userId: request.userId 
    });

    try {
      const documentResult = await this.documentApplicationService.createDocument(
        request.userId,
        request.name,
        request.filePath,
        request.mimeType,
        request.size,
        request.tags,
        request.metadata
      );
      
      if (documentResult.isErr()) {
        this.logger.warn('Document upload failed', { 
          name: request.name, 
          filePath: request.filePath,
          userId: request.userId 
        });
        return AppResult.Err(AppError.InvalidData(
          `Document upload failed for name: ${request.name}, filePath: ${request.filePath}`
        ));
      }

      const document = documentResult.unwrap();
      const response: UploadDocumentResponse = {
        id: document.id,
        name: document.name.value,
        filePath: document.filePath,
        mimeType: document.mimeType.value,
        size: document.size.bytes.toString(),
        tags: document.tags,
        metadata: document.metadata,
        userId: document.userId,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt
      };

      this.logger.info('Document uploaded successfully', { 
        documentId: document.id, 
        name: document.name.value,
        userId: document.userId 
      });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { 
        name: request.name, 
        filePath: request.filePath,
        userId: request.userId 
      });
      return AppResult.Err(AppError.Generic(
        `Failed to execute upload document use case for name: ${request.name}, filePath: ${request.filePath}`
      ));
    }
  }
}
