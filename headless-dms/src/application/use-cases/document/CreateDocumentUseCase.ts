import { injectable, inject } from 'tsyringe';
import { AppResult } from '@carbonteq/hexapp';
import { CreateDocumentRequest, DocumentResponse } from '../../../shared/dto/document/index.js';
import type { IDocumentApplicationService } from '../../../ports/input/IDocumentApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';
import { ApplicationError } from '../../../shared/errors/ApplicationError.js';

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
        request.name,
        request.filePath,
        request.mimeType,
        request.size,
        request.userId,
        request.tags,
        request.metadata
      );
      
      if (documentResult.isErr()) {
        this.logger.warn('Document creation failed', { 
          name: request.name, 
          filePath: request.filePath,
          error: documentResult.unwrapErr().message 
        });
        return AppResult.Err(new ApplicationError(
          'CreateDocumentUseCase.documentCreationFailed',
          'Document creation failed',
          { name: request.name, filePath: request.filePath }
        ));
      }

      const document = documentResult.unwrap();
      const response: DocumentResponse = {
        id: document.id,
        name: document.name.value,
        filePath: document.filePath,
        mimeType: document.mimeType.value,
        size: document.size.bytes.toString(),
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        tags: document.tags,
        metadata: document.metadata
      };

      this.logger.info('Document created successfully', { 
        documentId: document.id, 
        name: document.name.value 
      });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { 
        name: request.name, 
        filePath: request.filePath 
      });
      return AppResult.Err(new ApplicationError(
        'CreateDocumentUseCase.execute',
        error instanceof Error ? error.message : 'Failed to execute create document use case',
        { name: request.name, filePath: request.filePath }
      ));
    }
  }
}