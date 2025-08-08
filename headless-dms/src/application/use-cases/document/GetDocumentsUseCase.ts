import { inject, injectable } from "tsyringe";
import { Result } from "@carbonteq/fp";
import type { IDocumentRepository } from "../../../documents/repositories/documents.repository.interface.js";
import type { ILogger } from "../../../infrastructure/interfaces/ILogger.js";
import type { GetDocumentsRequest, GetDocumentsResponse } from "../../dto/document/index.js";
import { ApplicationError } from "../../errors/ApplicationError.js";

@injectable()
export class GetDocumentsUseCase {
  constructor(
    @inject("IDocumentRepository") private documentRepository: IDocumentRepository,
    @inject("ILogger") private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'GetDocumentsUseCase' });
  }

  async execute(request: GetDocumentsRequest): Promise<Result<GetDocumentsResponse, ApplicationError>> {
    this.logger.info("Getting documents", { 
      page: request.page, 
      limit: request.limit,
      search: request.search,
      sortBy: request.sortBy,
      sortOrder: request.sortOrder
    });

    try {
      // 1. Build query parameters - convert search to name filter
      const queryParams = request.search ? {
        name: request.search,
      } : undefined;

      const paginationParams = {
        page: request.page,
        limit: request.limit,
        sort: request.sortBy,
        order: request.sortOrder,
      };

      // 2. Get paginated documents from repository
      const result = await this.documentRepository.find(queryParams, paginationParams);
      
      // 3. Transform to response DTOs
      const documents = result.data.map(document => ({
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

      // 4. Build response
      const response: GetDocumentsResponse = {
        document: documents,
        pagination: {
          page: result.pagination.page,
          limit: result.pagination.limit,
          total: result.pagination.total,
        },
      };

      this.logger.info("Documents retrieved successfully", { 
        count: documents.length, 
        total: result.pagination.total,
        page: request.page 
      });
      return Result.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { 
        page: request.page, 
        limit: request.limit 
      });
      return Result.Err(new ApplicationError(
        'GetDocumentsUseCase.execute',
        error instanceof Error ? error.message : 'Failed to get documents',
        { page: request.page, limit: request.limit }
      ));
    }
  }
}