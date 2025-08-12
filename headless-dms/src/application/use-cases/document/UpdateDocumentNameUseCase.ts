import { inject, injectable } from "tsyringe";
import { Result } from "@carbonteq/fp";
import { DocumentApplicationService } from "../../services/DocumentApplicationService.js";
import type { ILogger } from '../../../domain/interfaces/ILogger.js';
import type { UpdateDocumentNameRequest, UpdateDocumentNameResponse } from "../../dto/document/index.js";
import { ApplicationError } from "../../errors/ApplicationError.js";

@injectable()
export class UpdateDocumentNameUseCase {
  constructor(
    @inject("DocumentApplicationService") private documentApplicationService: DocumentApplicationService,
    @inject("ILogger") private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'UpdateDocumentNameUseCase' });
  }

  async execute(request: UpdateDocumentNameRequest): Promise<Result<UpdateDocumentNameResponse, ApplicationError>> {
    this.logger.info('Updating document name', { 
      documentId: request.documentId, 
      newName: request.name 
    });

    try {
      // Delegate to DocumentApplicationService
      const documentResult = await this.documentApplicationService.updateDocumentName(
        request.documentId,
        request.name,
        request.userId
      );
      
      if (documentResult.isErr()) {
        this.logger.warn('Document name update failed', {
          documentId: request.documentId,
          error: documentResult.unwrapErr().message
        });
        return documentResult;
      }

      const savedDocument = documentResult.unwrap();

      // 4. Return response DTO
      const response: UpdateDocumentNameResponse = {
        success: true,
        message: 'Document name updated successfully',
      };

      this.logger.info('Document name updated successfully', { 
        documentId: request.documentId, 
        newName: request.name 
      });
      return Result.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId: request.documentId });
      return Result.Err(new ApplicationError(
        'UpdateDocumentNameUseCase.execute',
        error instanceof Error ? error.message : 'Failed to update document name',
        { documentId: request.documentId, newName: request.name }
      ));
    }
  }
}
