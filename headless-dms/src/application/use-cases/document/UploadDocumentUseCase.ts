import { injectable, inject } from 'tsyringe';
import { AppResult } from '@carbonteq/hexapp';
import { UploadDocumentRequest, UploadDocumentResponse } from '../../../shared/dto/document/index.js';
import type { IDocumentApplicationService } from '../../../ports/input/IDocumentApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';
import { ApplicationError } from '../../../shared/errors/ApplicationError.js';

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
      mimeType: request.mimeType,
      userId: request.userId 
    });

    try {
      const documentResult = await this.documentApplicationService.uploadDocument(
        request.file,
        request.name,
        request.mimeType,
        request.userId,
        request.tags,
        request.metadata
      );
      
      if (documentResult.isErr()) {
        this.logger.warn('Document upload failed', { 
          name: request.name, 
          mimeType: request.mimeType,
          error: documentResult.unwrapErr().message 
        });
        return AppResult.Err(new ApplicationError(
          'UploadDocumentUseCase.documentUploadFailed',
          'Document upload failed',
          { name: request.name, mimeType: request.mimeType }
        ));
      }

      const document = documentResult.unwrap();
      const response: UploadDocumentResponse = {
        success: true,
        message: 'Document uploaded successfully'
      };

      this.logger.info('Document uploaded successfully', { 
        documentId: document.id, 
        name: document.name.value 
      });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { 
        name: request.name, 
        mimeType: request.mimeType 
      });
      return AppResult.Err(new ApplicationError(
        'UploadDocumentUseCase.execute',
        error instanceof Error ? error.message : 'Failed to execute upload document use case',
        { name: request.name, mimeType: request.mimeType }
      ));
    }
  }
}
