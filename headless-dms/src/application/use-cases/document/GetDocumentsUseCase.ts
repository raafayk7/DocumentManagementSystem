import { inject, injectable } from "tsyringe";
import { Result } from "@carbonteq/fp";
import type { IDocumentRepository } from "../../interfaces/IDocumentRepository.js";
import type { ILogger } from '../../../domain/interfaces/ILogger.js';
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
      // Build filter query for repository
      const filterQuery: any = {};
      if (request.name) {
        filterQuery.name = request.name;
      }
      if (request.mimeType) {
        filterQuery.mimeType = request.mimeType;
      }
      if (request.tags) {
        filterQuery.tags = request.tags;
      }
      if (request.metadata) {
        filterQuery.metadata = request.metadata;
      }
      if (request.fromDate) {
        filterQuery.from = request.fromDate;
      }
      if (request.toDate) {
        filterQuery.to = request.toDate;
      }

      // Build pagination parameters for repository
      const paginationParams = {
        page: request.page,
        limit: request.limit,
        order: request.sortOrder,
        sort: request.sortBy
      };

      // Use repository directly to get full pagination information
      const documentsResult = await this.documentRepository.find(filterQuery, paginationParams);
      
      // Transform to response DTOs
      const documentDtos = documentsResult.data.map((document: any) => ({
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

      // Use the pagination metadata from repository
      const response: GetDocumentsResponse = {
        document: documentDtos,
        pagination: documentsResult.pagination,
      };

      this.logger.info("Documents retrieved successfully", { 
        count: documentDtos.length, 
        total: documentsResult.pagination.total,
        page: request.page,
        totalPages: documentsResult.pagination.totalPages,
        hasNext: documentsResult.pagination.hasNext,
        hasPrev: documentsResult.pagination.hasPrev
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