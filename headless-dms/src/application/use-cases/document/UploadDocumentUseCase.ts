import { inject, injectable } from "tsyringe";
import { Result } from "@carbonteq/fp";
import { DocumentApplicationService } from "../../services/DocumentApplicationService.js";
import type { ILogger } from "../../../infrastructure/interfaces/ILogger.js";
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
        request.filename,
        request.mimeType,
        request.userId
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
