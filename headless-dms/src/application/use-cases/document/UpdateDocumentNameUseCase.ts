import { injectable, inject } from 'tsyringe';
import { AppResult } from '@carbonteq/hexapp';
import { UpdateDocumentNameRequest, UpdateDocumentNameResponse } from '../../../shared/dto/document/index.js';
import type { IDocumentApplicationService } from '../../../ports/input/IDocumentApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';
import { ApplicationError } from '../../../shared/errors/ApplicationError.js';

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
      name: request.name 
    });

    try {
      const documentResult = await this.documentApplicationService.updateDocumentName(
        request.documentId,
        request.name,
        request.userId
      );
      
      if (documentResult.isErr()) {
        this.logger.warn('Document name update failed', { 
          documentId: request.documentId, 
          name: request.name,
          error: documentResult.unwrapErr().message 
        });
        return AppResult.Err(new ApplicationError(
          'UpdateDocumentNameUseCase.nameUpdateFailed',
          'Document name update failed',
          { documentId: request.documentId, name: request.name }
        ));
      }

      const document = documentResult.unwrap();
      const response: UpdateDocumentNameResponse = {
        success: true,
        message: 'Document name updated successfully'
      };

      this.logger.info('Document name updated successfully', { 
        documentId: document.id, 
        newName: request.name 
      });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { 
        documentId: request.documentId, 
        name: request.name 
      });
      return AppResult.Err(new ApplicationError(
        'UpdateDocumentNameUseCase.execute',
        error instanceof Error ? error.message : 'Failed to execute update document name use case',
        { documentId: request.documentId, name: request.name }
      ));
    }
  }
}
