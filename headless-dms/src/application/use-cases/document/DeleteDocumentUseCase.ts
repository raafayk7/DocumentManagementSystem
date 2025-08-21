import { injectable, inject } from 'tsyringe';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { DeleteDocumentRequest, DeleteDocumentResponse } from '../../../shared/dto/document/index.js';
import type { IDocumentApplicationService } from '../../../ports/input/IDocumentApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';

@injectable()
export class DeleteDocumentUseCase {
  constructor(
    @inject('IDocumentApplicationService') private documentApplicationService: IDocumentApplicationService,
    @inject('ILogger') private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'DeleteDocumentUseCase' });
  }

  async execute(request: DeleteDocumentRequest): Promise<AppResult<DeleteDocumentResponse>> {
    this.logger.info('Executing delete document use case', { 
      documentId: request.documentId,
      userId: request.userId 
    });

    try {
      const deleteResult = await this.documentApplicationService.deleteDocument(
        request.documentId,
        request.userId
      );
      
      if (deleteResult.isErr()) {
        this.logger.warn('Document deletion failed', { 
          documentId: request.documentId,
          userId: request.userId 
        });
        return AppResult.Err(AppError.InvalidOperation(
          `Document deletion failed for document ID: ${request.documentId}`
        ));
      }

      const response: DeleteDocumentResponse = {
        message: `Document with ID ${request.documentId} deleted successfully`
      };

      this.logger.info('Document deleted successfully', { 
        documentId: request.documentId,
        userId: request.userId 
      });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { 
        documentId: request.documentId,
        userId: request.userId 
      });
      return AppResult.Err(AppError.Generic(
        `Failed to execute delete document use case for document ID: ${request.documentId}`
      ));
    }
  }
}