import { inject, injectable } from "tsyringe";
import { Result } from "@carbonteq/fp";
import type { IDocumentRepository } from "../../../documents/repositories/documents.repository.interface.js";
import type { ILogger } from "../../../infrastructure/interfaces/ILogger.js";
import type { GetDocumentsByMimeTypeRequest, GetDocumentsByMimeTypeResponse } from "../../dto/document/index.js";
import { ApplicationError } from "../../errors/ApplicationError.js";

@injectable()
export class GetDocumentsByMimeTypeUseCase {
  constructor(
    @inject("IDocumentRepository") private documentRepository: IDocumentRepository,
    @inject("ILogger") private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'GetDocumentsByMimeTypeUseCase' });
  }

  async execute(request: GetDocumentsByMimeTypeRequest): Promise<Result<GetDocumentsByMimeTypeResponse, ApplicationError>> {
    this.logger.info('Getting documents by MIME type', { mimeType: request.mimeType });

    try {
      // 1. Get documents by MIME type from repository
      const documents = await this.documentRepository.findByMimeType(request.mimeType);

      // 2. Transform to response DTOs
      const documentResponses = documents.map(document => ({
        id: document.id,
        name: document.name,
        filePath: document.filePath,
        mimeType: document.mimeType,
        size: document.size,
        tags: document.tags,
        metadata: document.metadata,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      }));

      // 3. Build response
      const response: GetDocumentsByMimeTypeResponse = {
        documents: documentResponses,
        total: documents.length,
      };

      this.logger.info('Documents retrieved by MIME type successfully', { 
        mimeType: request.mimeType,
        count: documents.length
      });
      return Result.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { mimeType: request.mimeType });
      return Result.Err(new ApplicationError(
        'GetDocumentsByMimeTypeUseCase.execute',
        error instanceof Error ? error.message : 'Failed to get documents by MIME type',
        { mimeType: request.mimeType }
      ));
    }
  }
}
