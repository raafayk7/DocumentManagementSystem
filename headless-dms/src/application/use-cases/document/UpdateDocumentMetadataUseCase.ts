import { injectable, inject } from 'tsyringe';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { UpdateDocumentMetadataRequest, UpdateDocumentMetadataResponse } from '../../../shared/dto/document/index.js';
import type { IDocumentApplicationService } from '../../../ports/input/IDocumentApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';

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
      metadata: request.metadata,
      userId: request.userId 
    });

    try {
      const metadataUpdateResult = await this.documentApplicationService.updateDocumentMetadata(
        request.documentId,
        request.metadata || {},
        request.userId
      );
      
      if (metadataUpdateResult.isErr()) {
        this.logger.warn('Document metadata update failed', { 
          documentId: request.documentId, 
          metadata: request.metadata,
          userId: request.userId 
        });
        return AppResult.Err(AppError.InvalidOperation(
          `Document metadata update failed for document ID: ${request.documentId}`
        ));
      }

      const document = metadataUpdateResult.unwrap();
      const response: UpdateDocumentMetadataResponse = {
        success: true,
        message: 'Document metadata updated successfully'
      };

      this.logger.info('Document metadata updated successfully', { 
        documentId: document.id, 
        metadataKeys: Object.keys(request.metadata || {}),
        totalMetadataKeys: Object.keys(document.metadata).length 
      });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { 
        documentId: request.documentId, 
        metadata: request.metadata,
        userId: request.userId 
      });
      return AppResult.Err(AppError.Generic(
        `Failed to execute update document metadata use case for document ID: ${request.documentId}`
      ));
    }
  }
}
