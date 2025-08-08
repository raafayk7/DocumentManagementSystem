import { inject, injectable } from "tsyringe";
import { Result } from "@carbonteq/fp";
import type { IDocumentRepository } from "../../../documents/repositories/documents.repository.interface.js";
import type { IFileService } from "../../interfaces/IFileService.js";
import type { ILogger } from "../../../infrastructure/interfaces/ILogger.js";
import type { DownloadDocumentRequest, DownloadDocumentResponse } from "../../dto/document/index.js";
import { ApplicationError } from "../../errors/ApplicationError.js";

@injectable()
export class DownloadDocumentUseCase {
  constructor(
    @inject("IDocumentRepository") private documentRepository: IDocumentRepository,
    @inject("IFileService") private fileService: IFileService,
    @inject("ILogger") private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'DownloadDocumentUseCase' });
  }

  async execute(request: DownloadDocumentRequest): Promise<Result<DownloadDocumentResponse, ApplicationError>> {
    this.logger.info('Downloading document', { documentId: request.documentId });

    try {
      // 1. Find document by ID
      const document = await this.documentRepository.findById(request.documentId);
      if (!document) {
        this.logger.warn('Document not found for download', { documentId: request.documentId });
        return Result.Err(new ApplicationError(
          'DownloadDocumentUseCase.documentNotFound',
          'Document not found',
          { documentId: request.documentId }
        ));
      }

      // 2. Check if file exists
      const fileExistsResult = await this.fileService.fileExists(document.filePath);
      if (fileExistsResult.isErr() || !fileExistsResult.unwrap()) {
        return Result.Err(new ApplicationError(
          'DownloadDocumentUseCase.fileNotFound',
          'File not found',
          { documentId: request.documentId }
        ));
      }

      // 3. Return response DTO (file streaming will be handled by infrastructure layer)
      const response: DownloadDocumentResponse = {
        filePath: document.filePath,
        filename: document.name,
        mimeType: document.mimeType,
        size: parseInt(document.size),
      };

      this.logger.info('Document downloaded successfully', { documentId: request.documentId });
      return Result.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId: request.documentId });
      return Result.Err(new ApplicationError(
        'DownloadDocumentUseCase.execute',
        error instanceof Error ? error.message : 'Failed to download document',
        { documentId: request.documentId }
      ));
    }
  }
}