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
      filePath: request.filename,
      mimeType: request.mimeType,
      size: request.size,
      userId: request.userId 
    });

    try {
      const documentResult = await this.documentApplicationService.createDocument(
        request.userId,
        request.name,
        request.filename,
        request.mimeType,
        request.size.toString(),
        request.tags,
        request.metadata
      );
      
      if (documentResult.isErr()) {
        this.logger.warn('Document upload failed', { 
          name: request.name, 
          filePath: request.filename,
          userId: request.userId 
        });
        return AppResult.Err(AppError.InvalidData(
          `Document upload failed for name: ${request.name}, filePath: ${request.filename}`
        ));
      }

      const document = documentResult.unwrap();
      const response: UploadDocumentResponse = {
        success: true,
        message: 'Document uploaded successfully'
      };

      this.logger.info('Document uploaded successfully', { 
        name: request.name, 
        userId: request.userId 
      });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { 
        name: request.name, 
        filePath: request.filename,
        userId: request.userId 
      });
      return AppResult.Err(AppError.Generic(
        `Failed to execute upload document use case for name: ${request.name}, filePath: ${request.filename}`
      ));
    }
  }
}
