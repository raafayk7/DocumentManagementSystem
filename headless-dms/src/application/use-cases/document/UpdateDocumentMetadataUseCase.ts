import { inject, injectable } from "tsyringe";
import { Result } from "@carbonteq/fp";
import type { IDocumentRepository } from "../../../documents/repositories/documents.repository.interface.js";
import type { ILogger } from "../../../infrastructure/interfaces/ILogger.js";
import type { UpdateDocumentMetadataRequest, UpdateDocumentMetadataResponse } from "../../dto/document/index.js";
import { ApplicationError } from "../../errors/ApplicationError.js";

@injectable()
export class UpdateDocumentMetadataUseCase {
  constructor(
    @inject("IDocumentRepository") private documentRepository: IDocumentRepository,
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
      // 1. Find document by ID
      const document = await this.documentRepository.findById(request.documentId);
      if (!document) {
        this.logger.warn('Document not found for metadata update', { documentId: request.documentId });
        return Result.Err(new ApplicationError(
          'UpdateDocumentMetadataUseCase.documentNotFound',
          'Document not found',
          { documentId: request.documentId }
        ));
      }

      // 2. Use Document entity's state-changing operation
      const updatedDocumentResult = document.updateMetadata(request.metadata || {});
      if (updatedDocumentResult.isErr()) {
        this.logger.warn('Document metadata update failed - validation error', {
          documentId: request.documentId,
          error: updatedDocumentResult.unwrapErr()
        });
        return Result.Err(new ApplicationError(
          'UpdateDocumentMetadataUseCase.metadataValidation',
          updatedDocumentResult.unwrapErr(),
          { documentId: request.documentId, metadata: request.metadata }
        ));
      }

      // 3. Save updated document
      const savedDocument = await this.documentRepository.update(updatedDocumentResult.unwrap());

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
