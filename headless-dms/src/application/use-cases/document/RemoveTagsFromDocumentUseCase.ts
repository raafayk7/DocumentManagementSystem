import { inject, injectable } from "tsyringe";
import { Result } from "@carbonteq/fp";
import { DocumentApplicationService } from "../../services/DocumentApplicationService.js";
import type { ILogger } from "../../../infrastructure/interfaces/ILogger.js";
import type { RemoveTagsFromDocumentRequest, RemoveTagsFromDocumentResponse } from "../../dto/document/index.js";
import { ApplicationError } from "../../errors/ApplicationError.js";

@injectable()
export class RemoveTagsFromDocumentUseCase {
  constructor(
    @inject("DocumentApplicationService") private documentApplicationService: DocumentApplicationService,
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
      // Delegate to DocumentApplicationService
      const documentResult = await this.documentApplicationService.removeTagsFromDocument(
        request.documentId,
        request.tags,
        request.userId
      );
      
      if (documentResult.isErr()) {
        this.logger.warn('Document tag removal failed', {
          documentId: request.documentId,
          error: documentResult.unwrapErr().message
        });
        return documentResult;
      }

      const savedDocument = documentResult.unwrap();

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
