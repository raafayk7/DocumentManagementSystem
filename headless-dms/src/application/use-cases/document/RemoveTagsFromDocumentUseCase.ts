import { injectable, inject } from 'tsyringe';
import { AppResult } from '@carbonteq/hexapp';
import { RemoveTagsFromDocumentRequest, RemoveTagsFromDocumentResponse } from '../../../shared/dto/document/index.js';
import type { IDocumentApplicationService } from '../../../ports/input/IDocumentApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';
import { ApplicationError } from '../../../shared/errors/ApplicationError.js';

@injectable()
export class RemoveTagsFromDocumentUseCase {
  constructor(
    @inject('IDocumentApplicationService') private documentApplicationService: IDocumentApplicationService,
    @inject('ILogger') private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'RemoveTagsFromDocumentUseCase' });
  }

  async execute(request: RemoveTagsFromDocumentRequest): Promise<AppResult<RemoveTagsFromDocumentResponse>> {
    this.logger.info('Executing remove tags from document use case', { 
      documentId: request.documentId, 
      tags: request.tags 
    });

    try {
      const documentResult = await this.documentApplicationService.removeTagsFromDocument(
        request.documentId,
        request.tags,
        request.userId
      );
      
      if (documentResult.isErr()) {
        this.logger.warn('Tag removal failed', { 
          documentId: request.documentId, 
          tags: request.tags,
          error: documentResult.unwrapErr().message 
        });
        return AppResult.Err(new ApplicationError(
          'RemoveTagsFromDocumentUseCase.tagRemovalFailed',
          'Tag removal failed',
          { documentId: request.documentId, tags: request.tags }
        ));
      }

      const document = documentResult.unwrap();
      const response: RemoveTagsFromDocumentResponse = {
        success: true,
        message: 'Tags removed successfully'
      };

      this.logger.info('Tags removed successfully', { 
        documentId: document.id, 
        removedTags: request.tags 
      });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { 
        documentId: request.documentId, 
        tags: request.tags 
      });
      return AppResult.Err(new ApplicationError(
        'RemoveTagsFromDocumentUseCase.execute',
        error instanceof Error ? error.message : 'Failed to execute remove tags from document use case',
        { documentId: request.documentId, tags: request.tags }
      ));
    }
  }
}
