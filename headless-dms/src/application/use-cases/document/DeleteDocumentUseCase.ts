import { injectable, inject } from 'tsyringe';
import { Result } from '@carbonteq/fp';
import { DocumentApplicationService } from '../../services/DocumentApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';
import type { DeleteDocumentRequest, DeleteDocumentResponse } from '../../../shared/dto/document/index.js';
import { ApplicationError } from '../../../shared/errors/ApplicationError.js';

@injectable()
export class DeleteDocumentUseCase {
  constructor(
    @inject('DocumentApplicationService') private documentApplicationService: DocumentApplicationService,
    @inject('ILogger') private logger: ILogger
  ) {
    this.logger = this.logger.child({ useCase: 'DeleteDocumentUseCase' });
  }

  async execute(request: DeleteDocumentRequest): Promise<Result<DeleteDocumentResponse, ApplicationError>> {
    this.logger.info('Deleting document', { documentId: request.documentId });

    try {
      // Delegate to DocumentApplicationService
      const result = await this.documentApplicationService.deleteDocument(
        request.documentId,
        request.userId
      );
      
      if (result.isErr()) {
        this.logger.warn('Failed to delete document', { 
          documentId: request.documentId,
          error: result.unwrapErr().message
        });
        return result;
      }

      this.logger.info('Document deleted successfully', { documentId: request.documentId });
      return Result.Ok({ 
        success: true, 
        message: 'Document deleted successfully' 
      });
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId: request.documentId });
      return Result.Err(new ApplicationError(
        'DeleteDocumentUseCase.execute',
        error instanceof Error ? error.message : 'Failed to delete document',
        { documentId: request.documentId }
      ));
    }
  }
}