import { injectable, inject } from 'tsyringe';
import { Result } from '@carbonteq/fp';
import type { IDocumentRepository } from '../../../documents/repositories/documents.repository.interface.js';
import type { ILogger } from '../../../infrastructure/interfaces/ILogger.js';
import type { GetDocumentsByIdRequest, GetDocumentByIdResponse } from '../../dto/document/index.js';
import { ApplicationError } from '../../errors/ApplicationError.js';

@injectable()
export class GetDocumentByIdUseCase {
  constructor(
    @inject('IDocumentRepository') private documentRepository: IDocumentRepository,
    @inject('ILogger') private logger: ILogger
  ) {
    this.logger = this.logger.child({ useCase: 'GetDocumentByIdUseCase' });
  }

  async execute(request: GetDocumentsByIdRequest): Promise<Result<GetDocumentByIdResponse, ApplicationError>> {
    this.logger.info('Getting document by ID', { documentId: request.documentId });

    try {
      // 1. Find document by ID
      const document = await this.documentRepository.findById(request.documentId);
      if (!document) {
        this.logger.warn('Document not found', { documentId: request.documentId });
        return Result.Err(new ApplicationError(
          'GetDocumentByIdUseCase.documentNotFound',
          'Document not found',
          { documentId: request.documentId }
        ));
      }

      // 2. Transform to response DTO
      const response: GetDocumentByIdResponse = {
        document: {
          id: document.id,
          name: document.name,
          filePath: document.filePath,
          mimeType: document.mimeType,
          size: document.size,
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
