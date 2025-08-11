import { inject, injectable } from "tsyringe";
import { Result } from "@carbonteq/fp";
import { DocumentApplicationService } from "../../services/DocumentApplicationService.js";
import type { ILogger } from "../../../infrastructure/interfaces/ILogger.js";
import type { GetDocumentsByTagsRequest, GetDocumentsByTagsResponse } from "../../dto/document/index.js";
import { ApplicationError } from "../../errors/ApplicationError.js";

@injectable()
export class GetDocumentsByTagsUseCase {
  constructor(
    @inject("DocumentApplicationService") private documentApplicationService: DocumentApplicationService,
    @inject("ILogger") private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'GetDocumentsByTagsUseCase' });
  }

  async execute(request: GetDocumentsByTagsRequest): Promise<Result<GetDocumentsByTagsResponse, ApplicationError>> {
    this.logger.info('Getting documents by tags', { tags: request.tags });

    try {
      // Delegate to DocumentApplicationService
      const documentsResult = await this.documentApplicationService.getDocumentsByTags(request.tags);
      
      if (documentsResult.isErr()) {
        this.logger.error('Failed to get documents by tags', { 
          tags: request.tags,
          error: documentsResult.unwrapErr().message 
        });
        return documentsResult;
      }

      const documents = documentsResult.unwrap();

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
      const response: GetDocumentsByTagsResponse = {
        documents: documentResponses,
        total: documents.length,
      };

      this.logger.info('Documents retrieved by tags successfully', { 
        tags: request.tags,
        count: documents.length
      });
      return Result.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { tags: request.tags });
      return Result.Err(new ApplicationError(
        'GetDocumentsByTagsUseCase.execute',
        error instanceof Error ? error.message : 'Failed to get documents by tags',
        { tags: request.tags }
      ));
    }
  }
}
