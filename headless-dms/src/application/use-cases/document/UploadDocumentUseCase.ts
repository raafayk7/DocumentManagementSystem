import { inject, injectable } from "tsyringe";
import { Result } from "@carbonteq/fp";
import { DocumentApplicationService } from "../../services/DocumentApplicationService.js";
import type { ILogger } from '../../../domain/interfaces/ILogger.js';
import type { UploadDocumentRequest, UploadDocumentResponse } from "../../dto/document/index.js";
import { ApplicationError } from "../../errors/ApplicationError.js";


@injectable()
export class UploadDocumentUseCase {
  constructor(
    @inject("DocumentApplicationService") private documentApplicationService: DocumentApplicationService,
    @inject("ILogger") private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'UploadDocumentUseCase' });
  }

  async execute(request: UploadDocumentRequest): Promise<Result<UploadDocumentResponse, ApplicationError>> {
    this.logger.info('Document upload started', { filename: request.filename });

    try {
      // Delegate to DocumentApplicationService
      const documentResult = await this.documentApplicationService.uploadDocument(
        request.file,
        request.name, // Use custom name from form field, not filename
        request.mimeType,
        request.userId,
        request.tags || [], // Pass tags from form field
        request.metadata || {} // Pass metadata from form field
      );
      
      if (documentResult.isErr()) {
        this.logger.warn('Document upload failed', { 
          filename: request.filename, 
          error: documentResult.unwrapErr().message 
        });
        return Result.Err(new ApplicationError(
          'UploadDocumentUseCase.uploadFailed',
          documentResult.unwrapErr().message,
          { filename: request.filename }
        ));
      }

      const savedDocument = documentResult.unwrap();
      
      // Log the uploaded document details
      this.logger.info('Document uploaded successfully', { 
        documentId: savedDocument.id, 
        name: savedDocument.name.value,
        tagsProvided: !!request.tags?.length,
        metadataProvided: !!request.metadata && Object.keys(request.metadata).length > 0
      });
      
      // Note: Tags and metadata can be updated separately using PATCH /documents/:id endpoints
      if (request.tags?.length || (request.metadata && Object.keys(request.metadata).length > 0)) {
        this.logger.info('Additional fields provided - use PATCH endpoints to update tags/metadata', {
          documentId: savedDocument.id,
          tags: request.tags,
          metadata: request.metadata
        });
      }
      
      // Convert to response DTO
      const response: UploadDocumentResponse = {
        success: true,
        message: 'Document uploaded successfully',
      };

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
