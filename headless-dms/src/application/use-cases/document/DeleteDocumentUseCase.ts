import { injectable, inject } from 'tsyringe';
import { Result } from '@carbonteq/fp';
import type { IDocumentRepository } from '../../../documents/repositories/documents.repository.interface.js';
import type { ILogger } from '../../../infrastructure/interfaces/ILogger.js';
import type { DeleteDocumentRequest, DeleteDocumentResponse } from '../../dto/document/index.js';
import { ApplicationError } from '../../errors/ApplicationError.js';

@injectable()
export class DeleteDocumentUseCase {
  constructor(
    @inject('IDocumentRepository') private documentRepository: IDocumentRepository,
    @inject('ILogger') private logger: ILogger
  ) {
    this.logger = this.logger.child({ useCase: 'DeleteDocumentUseCase' });
  }

  async execute(request: DeleteDocumentRequest): Promise<Result<DeleteDocumentResponse, ApplicationError>> {
    this.logger.info('Deleting document', { documentId: request.documentId });

    try {
      // 1. Check if document exists
      const document = await this.documentRepository.findById(request.documentId);
      if (!document) {
        this.logger.warn('Document not found for deletion', { documentId: request.documentId });
        return Result.Err(new ApplicationError(
          'DeleteDocumentUseCase.documentNotFound',
          'Document not found',
          { documentId: request.documentId }
        ));
      }

      // 2. Delete document from repository
      const result = await this.documentRepository.delete(request.documentId);
      if (!result) {
        this.logger.warn('Failed to delete document', { documentId: request.documentId });
        return Result.Err(new ApplicationError(
          'DeleteDocumentUseCase.deleteFailed',
          'Failed to delete document',
          { documentId: request.documentId }
        ));
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