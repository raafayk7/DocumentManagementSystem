import { injectable, inject } from 'tsyringe';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { ReplaceTagsInDocumentRequest, ReplaceTagsInDocumentResponse } from '../../../shared/dto/document/index.js';
import type { IDocumentApplicationService } from '../../../ports/input/IDocumentApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';

@injectable()
export class ReplaceTagsInDocumentUseCase {
  constructor(
    @inject('IDocumentApplicationService') private documentApplicationService: IDocumentApplicationService,
    @inject('ILogger') private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'ReplaceTagsInDocumentUseCase' });
  }

  async execute(request: ReplaceTagsInDocumentRequest): Promise<AppResult<ReplaceTagsInDocumentResponse>> {
    this.logger.info('Executing replace tags in document use case', { 
      documentId: request.documentId, 
      tags: request.tags,
      userId: request.userId 
    });

    try {
      const replaceTagsResult = await this.documentApplicationService.replaceTagsInDocument(
        request.documentId,
        request.tags,
        request.userId
      );
      
      if (replaceTagsResult.isErr()) {
        this.logger.warn('Document tags replacement failed', { 
          documentId: request.documentId, 
          tags: request.tags,
          userId: request.userId 
        });
        return AppResult.Err(AppError.InvalidOperation(
          `Document tags replacement failed for document ID: ${request.documentId} with tags: ${request.tags.join(', ')}`
        ));
      }

      const document = replaceTagsResult.unwrap();
      const response: ReplaceTagsInDocumentResponse = {
        id: document.id,
        tags: document.tags,
        message: `Tags replaced successfully in document: ${request.tags.join(', ')}`
      };

      this.logger.info('Document tags replaced successfully', { 
        documentId: document.id, 
        newTags: request.tags,
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
        `Failed to execute replace tags in document use case for document ID: ${request.documentId}`
      ));
    }
  }
}
