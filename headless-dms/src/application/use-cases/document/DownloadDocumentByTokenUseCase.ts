import { inject, injectable } from "tsyringe";
import { Result } from "@carbonteq/fp";
import jwt from 'jsonwebtoken';
import type { IDocumentRepository } from "../../../documents/repositories/documents.repository.interface.js";
import type { IFileService } from "../../interfaces/IFileService.js";
import type { ILogger } from "../../../infrastructure/interfaces/ILogger.js";
import type { DownloadDocumentByTokenRequest, DownloadDocumentByTokenResponse } from "../../dto/document/index.js";
import { ApplicationError } from "../../errors/ApplicationError.js";

@injectable()
export class DownloadDocumentByTokenUseCase {
  constructor(
    @inject("IDocumentRepository") private documentRepository: IDocumentRepository,
    @inject("IFileService") private fileService: IFileService,
    @inject("ILogger") private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'DownloadDocumentByTokenUseCase' });
  }

  async execute(request: DownloadDocumentByTokenRequest): Promise<Result<DownloadDocumentByTokenResponse, ApplicationError>> {
    this.logger.info('Downloading document by token');

    try {
      // 1. Verify JWT token
      const payload = jwt.verify(request.token, process.env.DOWNLOAD_JWT_SECRET!) as any;
      const documentId = payload.documentId;

      // 2. Find document by ID
      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        this.logger.warn('Document not found for token download', { documentId });
        return Result.Err(new ApplicationError(
          'DownloadDocumentByTokenUseCase.documentNotFound',
          'Document not found',
          { documentId }
        ));
      }

      // 3. Check if file exists
      const fileExistsResult = await this.fileService.fileExists(document.filePath);
      if (fileExistsResult.isErr() || !fileExistsResult.unwrap()) {
        return Result.Err(new ApplicationError(
          'DownloadDocumentByTokenUseCase.fileNotFound',
          'File not found',
          { documentId }
        ));
      }

      // 4. Return response DTO (file streaming will be handled by infrastructure layer)
      const response: DownloadDocumentByTokenResponse = {
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

      this.logger.info('Document downloaded by token successfully', { documentId });
      return Result.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { token: request.token });
      return Result.Err(new ApplicationError(
        'DownloadDocumentByTokenUseCase.execute',
        error instanceof Error ? error.message : 'Failed to download document by token',
        { token: request.token }
      ));
    }
  }
}

