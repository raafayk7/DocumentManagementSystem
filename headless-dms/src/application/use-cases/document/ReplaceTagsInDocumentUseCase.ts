import { injectable, inject } from 'tsyringe';
import { AppResult } from '@carbonteq/hexapp';
import { ReplaceTagsinDocumentRequest, ReplaceTagsinDocumentResponse } from '../../../shared/dto/document/index.js';
import type { IDocumentApplicationService } from '../../../ports/input/IDocumentApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';
import { ApplicationError } from '../../../shared/errors/ApplicationError.js';

@injectable()
export class ReplaceTagsInDocumentUseCase {
  constructor(
    @inject('IDocumentApplicationService') private documentApplicationService: IDocumentApplicationService,
    @inject('ILogger') private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'ReplaceTagsInDocumentUseCase' });
  }

  async execute(request: ReplaceTagsinDocumentRequest): Promise<AppResult<ReplaceTagsinDocumentResponse>> {
    this.logger.info('Executing replace tags in document use case', { 
      documentId: request.documentId, 
      tags: request.tags 
    });

    try {
      const documentResult = await this.documentApplicationService.replaceTagsInDocument(
        request.documentId,
        request.tags,
        request.userId
      );
      
      if (documentResult.isErr()) {
        this.logger.warn('Tag replacement failed', { 
          documentId: request.documentId, 
          tags: request.tags,
          error: documentResult.unwrapErr().message 
        });
        return AppResult.Err(new ApplicationError(
          'ReplaceTagsInDocumentUseCase.tagReplacementFailed',
          'Tag replacement failed',
          { documentId: request.documentId, tags: request.tags }
        ));
      }

      const document = documentResult.unwrap();
      const response: ReplaceTagsinDocumentResponse = {
        success: true,
        message: 'Tags replaced successfully'
      };

      this.logger.info('Tags replaced successfully', { 
        documentId: document.id, 
        newTags: request.tags 
      });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { 
        documentId: request.documentId, 
        tags: request.tags 
      });
      return AppResult.Err(new ApplicationError(
        'ReplaceTagsInDocumentUseCase.execute',
        error instanceof Error ? error.message : 'Failed to execute replace tags in document use case',
        { documentId: request.documentId, tags: request.tags }
      ));
    }
  }
}
