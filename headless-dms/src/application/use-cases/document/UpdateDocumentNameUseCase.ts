import { inject, injectable } from "tsyringe";
import { Result } from "@carbonteq/fp";
import type { IDocumentRepository } from "../../../documents/repositories/documents.repository.interface.js";
import type { ILogger } from "../../../infrastructure/interfaces/ILogger.js";
import type { UpdateDocumentNameRequest, UpdateDocumentNameResponse } from "../../dto/document/index.js";
import { ApplicationError } from "../../errors/ApplicationError.js";

@injectable()
export class UpdateDocumentNameUseCase {
  constructor(
    @inject("IDocumentRepository") private documentRepository: IDocumentRepository,
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
      // 1. Find document by ID
      const document = await this.documentRepository.findById(request.documentId);
      if (!document) {
        this.logger.warn('Document not found for name update', { documentId: request.documentId });
        return Result.Err(new ApplicationError(
          'UpdateDocumentNameUseCase.documentNotFound',
          'Document not found',
          { documentId: request.documentId }
        ));
      }

      // 2. Use Document entity's state-changing operation
      const updatedDocumentResult = document.updateName(request.name);
      if (updatedDocumentResult.isErr()) {
        this.logger.warn('Document name update failed - validation error', {
          documentId: request.documentId,
          error: updatedDocumentResult.unwrapErr()
        });
        return Result.Err(new ApplicationError(
          'UpdateDocumentNameUseCase.nameValidation',
          updatedDocumentResult.unwrapErr(),
          { documentId: request.documentId, newName: request.name }
        ));
      }

      // 3. Save updated document
      const savedDocument = await this.documentRepository.saveWithNameCheck(updatedDocumentResult.unwrap());

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
