import { injectable, inject } from 'tsyringe';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { AddTagsToDocumentRequest, AddTagsToDocumentResponse } from '../../../shared/dto/document/index.js';
import type { IDocumentApplicationService } from '../../../ports/input/IDocumentApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';

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
      tags: request.tags,
      userId: request.userId 
    });

    try {
      const addTagsResult = await this.documentApplicationService.addTagsToDocument(
        request.documentId,
        request.tags,
        request.userId
      );
      
      if (addTagsResult.isErr()) {
        this.logger.warn('Document tags addition failed', { 
          documentId: request.documentId, 
          tags: request.tags,
          userId: request.userId 
        });
        return AppResult.Err(AppError.InvalidOperation(
          `Document tags addition failed for document ID: ${request.documentId} with tags: ${request.tags.join(', ')}`
        ));
      }

      const document = addTagsResult.unwrap();
      const response: AddTagsToDocumentResponse = {
        id: document.id,
        tags: document.tags,
        message: `Tags added successfully to document: ${request.tags.join(', ')}`
      };

      this.logger.info('Document tags added successfully', { 
        documentId: document.id, 
        addedTags: request.tags,
        totalTags: document.tags.length 
      });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { 
        documentId: request.documentId, 
        tags: request.tags,
        userId: request.userId 
      });
      return AppResult.Err(AppError.Generic(
        `Failed to execute add tags to document use case for document ID: ${request.documentId}`
      ));
    }
  }
}
