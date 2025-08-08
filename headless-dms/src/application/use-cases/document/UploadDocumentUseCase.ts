import { inject, injectable } from "tsyringe";
import { Result } from "@carbonteq/fp";
import { Document } from "../../../domain/entities/Document.js";
import type { IDocumentRepository } from "../../../documents/repositories/documents.repository.interface.js";
import type { IFileService } from "../../interfaces/IFileService.js";
import type { ILogger } from "../../../infrastructure/interfaces/ILogger.js";
import type { UploadDocumentRequest, UploadDocumentResponse } from "../../dto/document/index.js";
import { ApplicationError } from "../../errors/ApplicationError.js";

@injectable()
export class UploadDocumentUseCase {
  constructor(
    @inject("IDocumentRepository") private documentRepository: IDocumentRepository,
    @inject("IFileService") private fileService: IFileService,
    @inject("ILogger") private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'UploadDocumentUseCase' });
  }

  async execute(request: UploadDocumentRequest): Promise<Result<UploadDocumentResponse, ApplicationError>> {
    this.logger.info('Document upload started', { filename: request.filename });

    try {
      // 1. Create document using entity factory directly from request
      const documentResult = Document.create(
        request.name,
        request.filename, // Use filename as filePath for now
        request.mimeType,
        request.size.toString(),
        request.tags || [],
        request.metadata || {}
      );

      if (documentResult.isErr()) {
        this.logger.warn('Document upload failed - entity creation error', { 
          filename: request.filename, 
          error: documentResult.unwrapErr() 
        });
        return Result.Err(new ApplicationError(
          'UploadDocumentUseCase.entityCreation',
          documentResult.unwrapErr(),
          { filename: request.filename }
        ));
      }

      const document = documentResult.unwrap();

      // 2. Save file using file service (this would need to be adapted for the custom DTO)
      // For now, we'll assume the file is already saved and we just need to save the document
      
      // 3. Atomic save with name uniqueness check (thread-safe)
      const savedDocument = await this.documentRepository.saveWithNameCheck(document);
      
      // 4. Convert to response DTO
      const response: UploadDocumentResponse = {
        success: true,
        message: 'Document uploaded successfully',
      };

      this.logger.info('Document uploaded successfully', { 
        documentId: savedDocument.id, 
        name: savedDocument.name 
      });
      return Result.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { filename: request.filename });
      return Result.Err(new ApplicationError(
        'UploadDocumentUseCase.execute',
        error instanceof Error ? error.message : 'Failed to upload document',
        { filename: request.filename }
      ));
    }
  }
}
