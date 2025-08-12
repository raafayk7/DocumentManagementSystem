import { injectable, inject } from 'tsyringe';
import { Result } from '@carbonteq/fp';
import { DocumentApplicationService } from '../../services/DocumentApplicationService.js';
import type { ILogger } from '../../../domain/interfaces/ILogger.js';
import type { GetDocumentsByIdRequest, GetDocumentByIdResponse } from '../../dto/document/index.js';
import { ApplicationError } from '../../errors/ApplicationError.js';

@injectable()
export class GetDocumentByIdUseCase {
  constructor(
    @inject('DocumentApplicationService') private documentApplicationService: DocumentApplicationService,
    @inject('ILogger') private logger: ILogger
  ) {
    this.logger = this.logger.child({ useCase: 'GetDocumentByIdUseCase' });
  }

  async execute(request: GetDocumentsByIdRequest): Promise<Result<GetDocumentByIdResponse, ApplicationError>> {
    this.logger.info('Getting document by ID', { documentId: request.documentId });

    try {
      // Delegate to DocumentApplicationService
      const documentResult = await this.documentApplicationService.getDocumentById(request.documentId);
      
      if (documentResult.isErr()) {
        this.logger.warn('Document not found', { documentId: request.documentId });
        return documentResult;
      }

      const document = documentResult.unwrap();

      // 2. Transform to response DTO
      const response: GetDocumentByIdResponse = {
        document: {
          id: document.id,
          name: document.name.value,
          filePath: document.filePath,
                      mimeType: document.mimeType.value,
            size: document.size.bytes.toString(),
          tags: document.tags,
          metadata: document.metadata,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
        },
      };

      this.logger.info('Document retrieved successfully', { documentId: request.documentId });
      return Result.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId: request.documentId });
      return Result.Err(new ApplicationError(
        'GetDocumentByIdUseCase.execute',
        error instanceof Error ? error.message : 'Failed to get document',
        { documentId: request.documentId }
      ));
    }
  }
}
