import { injectable, inject } from 'tsyringe';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { RemoveTagsFromDocumentRequest, RemoveTagsFromDocumentResponse } from '../../../shared/dto/document/index.js';
import type { IDocumentApplicationService } from '../../../ports/input/IDocumentApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';

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
      tags: request.tags,
      userId: request.userId 
    });

    try {
      const removeTagsResult = await this.documentApplicationService.removeTagsFromDocument(
        request.documentId,
        request.tags,
        request.userId
      );
      
      if (removeTagsResult.isErr()) {
        this.logger.warn('Document tags removal failed', { 
          documentId: request.documentId, 
          tags: request.tags,
          userId: request.userId 
        });
        return AppResult.Err(AppError.InvalidOperation(
          `Document tags removal failed for document ID: ${request.documentId} with tags: ${request.tags.join(', ')}`
        ));
      }

      const document = removeTagsResult.unwrap();
      const response: RemoveTagsFromDocumentResponse = {
        success: true,
        message: `Tags removed successfully from document: ${request.tags.join(', ')}`
      };

      this.logger.info('Document tags removed successfully', { 
        documentId: document.id, 
        removedTags: request.tags,
        remainingTags: document.tags.length 
      });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { 
        documentId: request.documentId, 
        tags: request.tags,
        userId: request.userId 
      });
      return AppResult.Err(AppError.Generic(
        `Failed to execute remove tags from document use case for document ID: ${request.documentId}`
      ));
    }
  }
}
