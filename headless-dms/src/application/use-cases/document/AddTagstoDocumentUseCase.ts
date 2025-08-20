import { inject, injectable } from "tsyringe";
import { Result } from "@carbonteq/fp";
import { DocumentApplicationService } from "../../services/DocumentApplicationService.js";
import type { ILogger } from '../../../ports/output/ILogger.js';
import type { AddTagsToDocumentRequest, AddTagsToDocumentResponse } from "../../../shared/dto/document/index.js";
import { ApplicationError } from "../../../shared/errors/ApplicationError.js";

@injectable()
export class AddTagsToDocumentUseCase {
  constructor(
    @inject("DocumentApplicationService") private documentApplicationService: DocumentApplicationService,
    @inject("ILogger") private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'AddTagsToDocumentUseCase' });
  }

  async execute(request: AddTagsToDocumentRequest): Promise<Result<AddTagsToDocumentResponse, ApplicationError>> {
    this.logger.info('Adding tags to document', { 
      documentId: request.documentId, 
      tags: request.tags 
    });

    try {
      // Delegate to DocumentApplicationService
      const documentResult = await this.documentApplicationService.addTagsToDocument(
        request.documentId,
        request.tags,
        request.userId
      );
      
      if (documentResult.isErr()) {
        this.logger.warn('Document tag addition failed', {
          documentId: request.documentId,
          error: documentResult.unwrapErr().message
        });
        return documentResult;
      }

      const savedDocument = documentResult.unwrap();

      // 4. Return response DTO
      const response: AddTagsToDocumentResponse = {
        success: true,
        message: 'Tags added to document successfully',
      };

      this.logger.info('Tags added to document successfully', { 
        documentId: request.documentId, 
        tags: request.tags 
      });
      return Result.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId: request.documentId });
      return Result.Err(new ApplicationError(
        'AddTagsToDocumentUseCase.execute',
        error instanceof Error ? error.message : 'Failed to add tags to document',
        { documentId: request.documentId, tags: request.tags }
      ));
    }
  }
}
