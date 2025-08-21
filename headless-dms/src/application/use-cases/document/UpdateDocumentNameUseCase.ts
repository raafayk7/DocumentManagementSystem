import { injectable, inject } from 'tsyringe';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { UpdateDocumentNameRequest, UpdateDocumentNameResponse } from '../../../shared/dto/document/index.js';
import type { IDocumentApplicationService } from '../../../ports/input/IDocumentApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';

@injectable()
export class UpdateDocumentNameUseCase {
  constructor(
    @inject('IDocumentApplicationService') private documentApplicationService: IDocumentApplicationService,
    @inject('ILogger') private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'UpdateDocumentNameUseCase' });
  }

  async execute(request: UpdateDocumentNameRequest): Promise<AppResult<UpdateDocumentNameResponse>> {
    this.logger.info('Executing update document name use case', { 
      documentId: request.documentId, 
      newName: request.newName,
      userId: request.userId 
    });

    try {
      const nameUpdateResult = await this.documentApplicationService.updateDocumentName(
        request.documentId,
        request.newName,
        request.userId
      );
      
      if (nameUpdateResult.isErr()) {
        this.logger.warn('Document name update failed', { 
          documentId: request.documentId, 
          newName: request.newName,
          userId: request.userId 
        });
        return AppResult.Err(AppError.InvalidOperation(
          `Document name update failed for document ID: ${request.documentId} to name: ${request.newName}`
        ));
      }

      const document = nameUpdateResult.unwrap();
      const response: UpdateDocumentNameResponse = {
        id: document.id,
        name: document.name.value,
        message: `Document name updated successfully to: ${request.newName}`
      };

      this.logger.info('Document name updated successfully', { 
        documentId: document.id, 
        oldName: document.name.value,
        newName: request.newName 
      });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { 
        documentId: request.documentId, 
        newName: request.newName,
        userId: request.userId 
      });
      return AppResult.Err(AppError.Generic(
        `Failed to execute update document name use case for document ID: ${request.documentId}`
      ));
    }
  }
}
