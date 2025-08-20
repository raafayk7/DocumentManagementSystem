import { inject, injectable } from "tsyringe";
import { Result } from "@carbonteq/fp";
import { DocumentApplicationService } from "../../services/DocumentApplicationService.js";
import type { ILogger } from '../../../ports/output/ILogger.js';
import type { ReplaceTagsinDocumentRequest, ReplaceTagsinDocumentResponse } from "../../../shared/dto/document/index.js";
import { ApplicationError } from "../../../shared/errors/ApplicationError.js";

@injectable()
export class ReplaceTagsInDocumentUseCase {
  constructor(
    @inject("DocumentApplicationService") private documentApplicationService: DocumentApplicationService,
    @inject("ILogger") private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'ReplaceTagsInDocumentUseCase' });
  }

  async execute(request: ReplaceTagsinDocumentRequest): Promise<Result<ReplaceTagsinDocumentResponse, ApplicationError>> {
    this.logger.info('Replacing tags in document', { 
      documentId: request.documentId, 
      tags: request.tags 
    });

    try {
      // Delegate to DocumentApplicationService
      const documentResult = await this.documentApplicationService.replaceTagsInDocument(
        request.documentId,
        request.tags,
        request.userId
      );
      
      if (documentResult.isErr()) {
        this.logger.warn('Document tag replacement failed', {
          documentId: request.documentId,
          error: documentResult.unwrapErr().message
        });
        return documentResult;
      }

      const savedDocument = documentResult.unwrap();

      // 4. Return response DTO
      const response: ReplaceTagsinDocumentResponse = {
        success: true,
        message: 'Tags replaced in document successfully',
      };

      this.logger.info('Tags replaced in document successfully', { 
        documentId: request.documentId, 
        tags: request.tags 
      });
      return Result.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId: request.documentId });
      return Result.Err(new ApplicationError(
        'ReplaceTagsInDocumentUseCase.execute',
        error instanceof Error ? error.message : 'Failed to replace tags in document',
        { documentId: request.documentId, tags: request.tags }
      ));
    }
  }
}
