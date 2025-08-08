import { inject, injectable } from "tsyringe";
import { Result } from "@carbonteq/fp";
import type { IDocumentRepository } from "../../../documents/repositories/documents.repository.interface.js";
import type { ILogger } from "../../../infrastructure/interfaces/ILogger.js";
import type { RemoveTagsFromDocumentRequest, RemoveTagsFromDocumentResponse } from "../../dto/document/index.js";
import { ApplicationError } from "../../errors/ApplicationError.js";

@injectable()
export class RemoveTagsFromDocumentUseCase {
  constructor(
    @inject("IDocumentRepository") private documentRepository: IDocumentRepository,
    @inject("ILogger") private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'RemoveTagsFromDocumentUseCase' });
  }

  async execute(request: RemoveTagsFromDocumentRequest): Promise<Result<RemoveTagsFromDocumentResponse, ApplicationError>> {
    this.logger.info('Removing tags from document', { 
      documentId: request.documentId, 
      tags: request.tags 
    });

    try {
      // 1. Find document by ID
      const document = await this.documentRepository.findById(request.documentId);
      if (!document) {
        this.logger.warn('Document not found for tag removal', { documentId: request.documentId });
        return Result.Err(new ApplicationError(
          'RemoveTagsFromDocumentUseCase.documentNotFound',
          'Document not found',
          { documentId: request.documentId }
        ));
      }

      // 2. Use Document entity's state-changing operation
      const updatedDocumentResult = document.removeTags(request.tags);
      if (updatedDocumentResult.isErr()) {
        this.logger.warn('Document tag removal failed - validation error', {
          documentId: request.documentId,
          error: updatedDocumentResult.unwrapErr()
        });
        return Result.Err(new ApplicationError(
          'RemoveTagsFromDocumentUseCase.tagValidation',
          updatedDocumentResult.unwrapErr(),
          { documentId: request.documentId, tags: request.tags }
        ));
      }

      // 3. Save updated document
      const savedDocument = await this.documentRepository.update(updatedDocumentResult.unwrap());

      // 4. Return response DTO
      const response: RemoveTagsFromDocumentResponse = {
        success: true,
        message: 'Tags removed from document successfully',
      };

      this.logger.info('Tags removed from document successfully', { 
        documentId: request.documentId, 
        tags: request.tags 
      });
      return Result.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId: request.documentId });
      return Result.Err(new ApplicationError(
        'RemoveTagsFromDocumentUseCase.execute',
        error instanceof Error ? error.message : 'Failed to remove tags from document',
        { documentId: request.documentId, tags: request.tags }
      ));
    }
  }
}
