import { injectable, inject } from 'tsyringe';
import { AppResult } from '@carbonteq/hexapp';
import { GetDocumentsByIdRequest, GetDocumentByIdResponse } from '../../../shared/dto/document/index.js';
import type { IDocumentApplicationService } from '../../../ports/input/IDocumentApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';
import { ApplicationError } from '../../../shared/errors/ApplicationError.js';

@injectable()
export class GetDocumentByIdUseCase {
  constructor(
    @inject('IDocumentApplicationService') private documentApplicationService: IDocumentApplicationService,
    @inject('ILogger') private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'GetDocumentByIdUseCase' });
  }

  async execute(request: GetDocumentsByIdRequest): Promise<AppResult<GetDocumentByIdResponse>> {
    this.logger.info('Executing get document by ID use case', { 
      documentId: request.documentId 
    });

    try {
      const documentResult = await this.documentApplicationService.getDocument(
        request.documentId,
        'dummy-user-id' // This should come from the request or context
      );
      
      if (documentResult.isErr()) {
        this.logger.warn('Document retrieval failed', { 
          documentId: request.documentId,
          error: documentResult.unwrapErr().message 
        });
        return AppResult.Err(new ApplicationError(
          'GetDocumentByIdUseCase.documentRetrievalFailed',
          'Document retrieval failed',
          { documentId: request.documentId }
        ));
      }

      const document = documentResult.unwrap();
      const response: GetDocumentByIdResponse = {
        document: {
          id: document.id,
          name: document.name.value,
          filePath: document.filePath,
          mimeType: document.mimeType.value,
          size: document.size.bytes.toString(),
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
          tags: document.tags,
          metadata: document.metadata
        }
      };

      this.logger.info('Document retrieved successfully', { 
        documentId: document.id 
      });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { 
        documentId: request.documentId 
      });
      return AppResult.Err(new ApplicationError(
        'GetDocumentByIdUseCase.execute',
        error instanceof Error ? error.message : 'Failed to execute get document by ID use case',
        { documentId: request.documentId }
      ));
    }
  }
}
