import { injectable, inject } from 'tsyringe';
import { AppResult } from '@carbonteq/hexapp';
import { AddTagsToDocumentRequest, AddTagsToDocumentResponse } from '../../../shared/dto/document/index.js';
import type { IDocumentApplicationService } from '../../../ports/input/IDocumentApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';
import { ApplicationError } from '../../../shared/errors/ApplicationError.js';

@injectable()
export class AddTagsToDocumentUseCase {
  constructor(
    @inject('IDocumentApplicationService') private documentApplicationService: IDocumentApplicationService,
    @inject('ILogger') private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'AddTagsToDocumentUseCase' });
  }

  async execute(request: AddTagsToDocumentRequest): Promise<AppResult<AddTagsToDocumentResponse>> {
    this.logger.info('Executing add tags to document use case', { 
      documentId: request.documentId, 
      tags: request.tags 
    });

    try {
      const documentResult = await this.documentApplicationService.addTagsToDocument(
        request.documentId,
        request.tags,
        request.userId
      );
      
      if (documentResult.isErr()) {
        this.logger.warn('Tag addition failed', { 
          documentId: request.documentId, 
          tags: request.tags,
          error: documentResult.unwrapErr().message 
        });
        return AppResult.Err(new ApplicationError(
          'AddTagsToDocumentUseCase.tagAdditionFailed',
          'Tag addition failed',
          { documentId: request.documentId, tags: request.tags }
        ));
      }

      const document = documentResult.unwrap();
      const response: AddTagsToDocumentResponse = {
        success: true,
        message: 'Tags added successfully'
      };

      this.logger.info('Tags added successfully', { 
        documentId: document.id, 
        addedTags: request.tags 
      });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { 
        documentId: request.documentId, 
        tags: request.tags 
      });
      return AppResult.Err(new ApplicationError(
        'AddTagsToDocumentUseCase.execute',
        error instanceof Error ? error.message : 'Failed to execute add tags to document use case',
        { documentId: request.documentId, tags: request.tags }
      ));
    }
  }
}
