import { injectable, inject } from 'tsyringe';
import { Result } from '@carbonteq/fp';
import { Document } from '../../../domain/entities/Document.js';
import { DocumentValidator } from '../../../domain/validators/DocumentValidator.js';
import type { IDocumentRepository } from '../../../documents/repositories/documents.repository.interface.js';
import type { ILogger } from '../../../infrastructure/interfaces/ILogger.js';
import type { CreateDocumentRequest, DocumentResponse } from '../../dto/document/index.js';
import { ApplicationError } from '../../errors/ApplicationError.js';

@injectable()
export class CreateDocumentUseCase {
  constructor(
    @inject('IDocumentRepository') private documentRepository: IDocumentRepository,
    @inject('ILogger') private logger: ILogger
  ) {
    this.logger = this.logger.child({ useCase: 'CreateDocumentUseCase' });
  }

  async execute(request: CreateDocumentRequest): Promise<Result<DocumentResponse, ApplicationError>> {
    this.logger.info('Creating document', { name: request.name, size: request.size });

    try {
      // 1. Validate document name
      const nameValidation = DocumentValidator.validateName(request.name);
      if (nameValidation.isErr()) {
        this.logger.warn('Document creation failed - name validation error', { 
          name: request.name, 
          error: nameValidation.unwrapErr() 
        });
        return Result.Err(new ApplicationError(
          'CreateDocumentUseCase.nameValidation',
          nameValidation.unwrapErr(),
          { name: request.name }
        ));
      }

      // 2. Validate file size
      const fileSizeValidation = DocumentValidator.validateFileSize(request.size);
      if (fileSizeValidation.isErr()) {
        this.logger.warn('Document creation failed - file size validation error', { 
          name: request.name, 
          error: fileSizeValidation.unwrapErr() 
        });
        return Result.Err(new ApplicationError(
          'CreateDocumentUseCase.fileSizeValidation',
          fileSizeValidation.unwrapErr(),
          { name: request.name, size: request.size }
        ));
      }

      // 3. Validate file type
      const fileTypeValidation = DocumentValidator.validateFileType(request.mimeType);
      if (fileTypeValidation.isErr()) {
        this.logger.warn('Document creation failed - file type validation error', { 
          name: request.name, 
          error: fileTypeValidation.unwrapErr() 
        });
        return Result.Err(new ApplicationError(
          'CreateDocumentUseCase.fileTypeValidation',
          fileTypeValidation.unwrapErr(),
          { name: request.name, mimeType: request.mimeType }
        ));
      }

      // 4. Create document entity (domain logic)
      const documentResult = Document.create(
        request.name, 
        request.filePath, 
        request.mimeType, 
        request.size, 
        request.tags, 
        request.metadata
      );
      if (documentResult.isErr()) {
        this.logger.warn('Document creation failed - entity creation error', { 
          name: request.name, 
          error: documentResult.unwrapErr() 
        });
        return Result.Err(new ApplicationError(
          'CreateDocumentUseCase.entityCreation',
          documentResult.unwrapErr(),
          { name: request.name, size: request.size }
        ));
      }

      const document = documentResult.unwrap();
      
      // 5. Save document to repository with name uniqueness check
      const savedDocument = await this.documentRepository.saveWithNameCheck(document);
      
      // 6. Return response DTO
      const response: DocumentResponse = {
        id: savedDocument.id,
        name: savedDocument.name,
        filePath: savedDocument.filePath,
        mimeType: savedDocument.mimeType,
        size: savedDocument.size,
        tags: savedDocument.tags,
        metadata: savedDocument.metadata,
        createdAt: savedDocument.createdAt,
        updatedAt: savedDocument.updatedAt,
      };

      this.logger.info('Document created successfully', { documentId: savedDocument.id, name: savedDocument.name });
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