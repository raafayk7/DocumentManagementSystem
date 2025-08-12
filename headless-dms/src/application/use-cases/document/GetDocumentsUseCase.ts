import { inject, injectable } from "tsyringe";
import { Result } from "@carbonteq/fp";
import { DocumentApplicationService } from "../../services/DocumentApplicationService.js";
import type { ILogger } from '../../../domain/interfaces/ILogger.js';
import type { GetDocumentsRequest, GetDocumentsResponse } from "../../dto/document/index.js";
import { ApplicationError } from "../../errors/ApplicationError.js";

@injectable()
export class GetDocumentsUseCase {
  constructor(
    @inject("DocumentApplicationService") private documentApplicationService: DocumentApplicationService,
    @inject("ILogger") private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'GetDocumentsUseCase' });
  }

  async execute(request: GetDocumentsRequest): Promise<Result<GetDocumentsResponse, ApplicationError>> {
    this.logger.info("Getting documents", { 
      page: request.page, 
      limit: request.limit,
      sortBy: request.sortBy,
      sortOrder: request.sortOrder,
      // Log filter parameters
      name: request.name,
      mimeType: request.mimeType,
      tags: request.tags,
      metadata: request.metadata,
      fromDate: request.fromDate,
      toDate: request.toDate
    });

    try {
      // Delegate to DocumentApplicationService with enhanced filtering
      const documentsResult = await this.documentApplicationService.getDocuments(
        request.page,
        request.limit,
        request.sortBy,
        request.sortOrder,
        {
          name: request.name,
          mimeType: request.mimeType,
          tags: request.tags,
          metadata: request.metadata,
          fromDate: request.fromDate,
          toDate: request.toDate
        }
      );
      
      if (documentsResult.isErr()) {
        this.logger.error('Failed to get documents', { error: documentsResult.unwrapErr().message });
        return documentsResult;
      }

      const documents = documentsResult.unwrap();
      
      // Transform to response DTOs
      const documentDtos = documents.map(document => ({
        id: document.id,
        name: document.name.value,
        filePath: document.filePath,
        mimeType: document.mimeType.value,
        size: document.size.bytes.toString(),
        tags: document.tags,
        metadata: document.metadata,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      }));

      // Build response (simplified pagination for now)
      const response: GetDocumentsResponse = {
        document: documentDtos,
        pagination: {
          page: request.page,
          limit: request.limit,
          total: documents.length,
        },
      };

      this.logger.info("Documents retrieved successfully", { 
        count: documents.length, 
        total: documents.length,
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