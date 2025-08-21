import { injectable, inject } from 'tsyringe';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { GetDocumentByIdRequest, GetDocumentByIdResponse } from '../../../shared/dto/document/index.js';
import type { IDocumentApplicationService } from '../../../ports/input/IDocumentApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';

@injectable()
export class GetDocumentByIdUseCase {
  constructor(
    @inject('IDocumentApplicationService') private documentApplicationService: IDocumentApplicationService,
    @inject('ILogger') private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'GetDocumentByIdUseCase' });
  }

  async execute(request: GetDocumentByIdRequest): Promise<AppResult<GetDocumentByIdResponse>> {
    this.logger.info('Executing get document by ID use case', { 
      documentId: request.documentId,
      userId: 'dummy-user-id' // TODO: Get from request when available
    });

    try {
      const documentResult = await this.documentApplicationService.getDocumentById(
        request.documentId,
        'dummy-user-id' // TODO: Get from request when available
      );
      
      if (documentResult.isErr()) {
        this.logger.warn('Document not found', { documentId: request.documentId });
        return AppResult.Err(AppError.NotFound(
          `Document not found with ID: ${request.documentId}`
        ));
      }

      const document = documentResult.unwrap();
      const response: GetDocumentByIdResponse = {
        id: document.id,
        name: document.name.value,
        filePath: document.filePath,
        mimeType: document.mimeType.value,
        size: document.size.bytes.toString(),
        tags: document.tags,
        metadata: document.metadata,
        userId: document.userId,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt
      };

      this.logger.info('Document retrieved successfully', { 
        documentId: document.id, 
        name: document.name.value 
      });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId: request.documentId });
      return AppResult.Err(AppError.Generic(
        `Failed to execute get document by ID use case for document ID: ${request.documentId}`
      ));
    }
  }
}
