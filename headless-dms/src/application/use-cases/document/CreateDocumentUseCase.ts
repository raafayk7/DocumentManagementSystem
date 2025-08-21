import { injectable, inject } from 'tsyringe';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { CreateDocumentRequest, DocumentResponse } from '../../../shared/dto/document/index.js';
import type { IDocumentApplicationService } from '../../../ports/input/IDocumentApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';

@injectable()
export class CreateDocumentUseCase {
  constructor(
    @inject('IDocumentApplicationService') private documentApplicationService: IDocumentApplicationService,
    @inject('ILogger') private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'CreateDocumentUseCase' });
  }

  async execute(request: CreateDocumentRequest): Promise<AppResult<DocumentResponse>> {
    this.logger.info('Executing create document use case', { 
      name: request.name, 
      filePath: request.filePath,
      userId: request.userId 
    });

          try {
        const documentResult = await this.documentApplicationService.createDocument(
          request.userId,
          request.name,
          request.filePath,
          request.mimeType,
          request.size,
          request.tags || [],
          request.metadata
        );
      
      if (documentResult.isErr()) {
        this.logger.warn('Document creation failed', { 
          name: request.name, 
          filePath: request.filePath,
          userId: request.userId 
        });
        return AppResult.Err(AppError.InvalidData(
          `Document creation failed for name: ${request.name}, filePath: ${request.filePath}`
        ));
      }

      const document = documentResult.unwrap();
      const response: DocumentResponse = {
        id: document.id,
        name: document.name.value,
        filePath: document.filePath,
        mimeType: document.mimeType.value,
        size: document.size.bytes.toString(),
        tags: document.tags,
        metadata: document.metadata,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt
      };

      this.logger.info('Document created successfully', { 
        documentId: document.id, 
        name: document.name.value,
        userId: request.userId 
      });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { 
        name: request.name, 
        filePath: request.filePath,
        userId: request.userId 
      });
      return AppResult.Err(AppError.Generic(
        `Failed to execute create document use case for name: ${request.name}, filePath: ${request.filePath}`
      ));
    }
  }
}