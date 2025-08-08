import { inject, injectable } from "tsyringe";
import { Result } from "@carbonteq/fp";
import jwt from 'jsonwebtoken';
import type { IDocumentRepository } from "../../../documents/repositories/documents.repository.interface.js";
import type { ILogger } from "../../../infrastructure/interfaces/ILogger.js";
import type { GenerateDownloadLinkRequest, GenerateDownloadLinkResponse } from "../../dto/document/index.js";
import { ApplicationError } from "../../errors/ApplicationError.js";

@injectable()
export class GenerateDownloadLinkUseCase {
  constructor(
    @inject("IDocumentRepository") private documentRepository: IDocumentRepository,
    @inject("ILogger") private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'GenerateDownloadLinkUseCase' });
  }

  async execute(request: GenerateDownloadLinkRequest): Promise<Result<GenerateDownloadLinkResponse, ApplicationError>> {
    this.logger.info('Generating download link', { documentId: request.documentId });

    try {
      // 1. Find document by ID
      const document = await this.documentRepository.findById(request.documentId);
      if (!document) {
        this.logger.warn('Document not found for download link generation', { documentId: request.documentId });
        return Result.Err(new ApplicationError(
          'GenerateDownloadLinkUseCase.documentNotFound',
          'Document not found',
          { documentId: request.documentId }
        ));
      }

      // 2. Generate JWT token
      const payload = {
        documentId: document.id,
        exp: Math.floor(Date.now() / 1000) + (request.expiresInMinutes * 60) // Convert minutes to seconds
      };

      const token = jwt.sign(payload, process.env.DOWNLOAD_JWT_SECRET!);
      const downloadUrl = `/documents/download?token=${token}`;

      // 3. Return response DTO
      const response: GenerateDownloadLinkResponse = {
        downloadUrl,
        expiresAt: new Date(Date.now() + request.expiresInMinutes * 60 * 1000),
        token,
      };

      this.logger.info('Download link generated successfully', { documentId: request.documentId });
      return Result.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId: request.documentId });
      return Result.Err(new ApplicationError(
        'GenerateDownloadLinkUseCase.execute',
        error instanceof Error ? error.message : 'Failed to generate download link',
        { documentId: request.documentId }
      ));
    }
  }
}