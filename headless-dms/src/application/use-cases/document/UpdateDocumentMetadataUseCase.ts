import { injectable, inject } from 'tsyringe';
import { AppResult } from '@carbonteq/hexapp';
import { UpdateDocumentMetadataRequest, UpdateDocumentMetadataResponse } from '../../../shared/dto/document/index.js';
import type { IDocumentApplicationService } from '../../../ports/input/IDocumentApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';
import { ApplicationError } from '../../../shared/errors/ApplicationError.js';

@injectable()
export class UpdateDocumentMetadataUseCase {
  constructor(
    @inject('IDocumentApplicationService') private documentApplicationService: IDocumentApplicationService,
    @inject('ILogger') private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'UpdateDocumentMetadataUseCase' });
  }

  async execute(request: UpdateDocumentMetadataRequest): Promise<AppResult<UpdateDocumentMetadataResponse>> {
    this.logger.info('Executing update document metadata use case', { 
      documentId: request.documentId, 
      metadata: request.metadata 
    });

    try {
      const documentResult = await this.documentApplicationService.updateDocumentMetadata(
        request.documentId,
        request.metadata || {},
        request.userId
      );
      
      if (documentResult.isErr()) {
        this.logger.warn('Document metadata update failed', { 
          documentId: request.documentId, 
          metadata: request.metadata,
          error: documentResult.unwrapErr().message 
        });
        return AppResult.Err(new ApplicationError(
          'UpdateDocumentMetadataUseCase.metadataUpdateFailed',
          'Document metadata update failed',
          { documentId: request.documentId, metadata: request.metadata }
        ));
      }

      const document = documentResult.unwrap();
      const response: UpdateDocumentMetadataResponse = {
        success: true,
        message: 'Document metadata updated successfully'
      };

      this.logger.info('Document metadata updated successfully', { 
        documentId: document.id, 
        metadata: request.metadata 
      });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { 
        documentId: request.documentId, 
        metadata: request.metadata 
      });
      return AppResult.Err(new ApplicationError(
        'UpdateDocumentMetadataUseCase.execute',
        error instanceof Error ? error.message : 'Failed to execute update document metadata use case',
        { documentId: request.documentId, metadata: request.metadata }
      ));
    }
  }
}
