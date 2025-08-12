import { inject, injectable } from "tsyringe";
import { Result } from "@carbonteq/fp";
import { DocumentApplicationService } from "../../services/DocumentApplicationService.js";
import type { ILogger } from '../../../domain/interfaces/ILogger.js';
import type { UpdateDocumentMetadataRequest, UpdateDocumentMetadataResponse } from "../../dto/document/index.js";
import { ApplicationError } from "../../errors/ApplicationError.js";

@injectable()
export class UpdateDocumentMetadataUseCase {
  constructor(
    @inject("DocumentApplicationService") private documentApplicationService: DocumentApplicationService,
    @inject("ILogger") private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'UpdateDocumentMetadataUseCase' });
  }

  async execute(request: UpdateDocumentMetadataRequest): Promise<Result<UpdateDocumentMetadataResponse, ApplicationError>> {
    this.logger.info('Updating document metadata', { 
      documentId: request.documentId, 
      metadata: request.metadata 
    });

    try {
      // Delegate to DocumentApplicationService
      const documentResult = await this.documentApplicationService.updateDocumentMetadata(
        request.documentId,
        request.metadata || {},
        request.userId
      );
      
      if (documentResult.isErr()) {
        this.logger.warn('Document metadata update failed', {
          documentId: request.documentId,
          error: documentResult.unwrapErr().message
        });
        return documentResult;
      }

      const savedDocument = documentResult.unwrap();

      // 4. Return response DTO
      const response: UpdateDocumentMetadataResponse = {
        success: true,
        message: 'Document metadata updated successfully',
      };

      this.logger.info('Document metadata updated successfully', { 
        documentId: request.documentId, 
        metadata: request.metadata 
      });
      return Result.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId: request.documentId });
      return Result.Err(new ApplicationError(
        'UpdateDocumentMetadataUseCase.execute',
        error instanceof Error ? error.message : 'Failed to update document metadata',
        { documentId: request.documentId, metadata: request.metadata }
      ));
    }
  }
}
