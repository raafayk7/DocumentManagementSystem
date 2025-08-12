import { injectable, inject } from 'tsyringe';
import { Result } from '@carbonteq/fp';
import { DocumentApplicationService } from '../../services/DocumentApplicationService.js';
import type { ILogger } from '../../../domain/interfaces/ILogger.js';
import type { CreateDocumentRequest, DocumentResponse } from '../../dto/document/index.js';
import { ApplicationError } from '../../errors/ApplicationError.js';

@injectable()
export class CreateDocumentUseCase {
  constructor(
    @inject('DocumentApplicationService') private documentApplicationService: DocumentApplicationService,
    @inject('ILogger') private logger: ILogger
  ) {
    this.logger = this.logger.child({ useCase: 'CreateDocumentUseCase' });
  }

  async execute(request: CreateDocumentRequest): Promise<Result<DocumentResponse, ApplicationError>> {
    this.logger.info('Creating document', { name: request.name, size: request.size });

    try {
      // Delegate to DocumentApplicationService
      const documentResult = await this.documentApplicationService.createDocument(
        request.name,
        request.filePath,
        request.mimeType,
        request.size,
        request.tags || [],
        request.metadata || {},
        request.userId
      );
      
      if (documentResult.isErr()) {
        this.logger.warn('Document creation failed', { 
          name: request.name, 
          error: documentResult.unwrapErr().message 
        });
        return documentResult;
      }

      const savedDocument = documentResult.unwrap();
      
      // 6. Return response DTO
      const response: DocumentResponse = {
        id: savedDocument.id,
        name: savedDocument.name.value,
        filePath: savedDocument.filePath,
        mimeType: savedDocument.mimeType.value,
        size: savedDocument.size.bytes.toString(),
        tags: savedDocument.tags,
        metadata: savedDocument.metadata,
        createdAt: savedDocument.createdAt,
        updatedAt: savedDocument.updatedAt,
      };

      this.logger.info('Document created successfully', { documentId: savedDocument.id, name: savedDocument.name.value });
      return Result.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { name: request.name });
      return Result.Err(new ApplicationError(
        'CreateDocumentUseCase.execute',
        error instanceof Error ? error.message : 'Failed to create document',
        { name: request.name, size: request.size }
      ));
    }
  }
}