import { injectable, inject } from 'tsyringe';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { GetDocumentsRequest, GetDocumentsResponse } from '../../../shared/dto/document/index.js';
import type { IDocumentApplicationService } from '../../../ports/input/IDocumentApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';
import { calculatePaginationMetadata } from '../../../shared/dto/common/pagination.dto.js';

@injectable()
export class GetDocumentsUseCase {
  constructor(
    @inject('IDocumentApplicationService') private documentApplicationService: IDocumentApplicationService,
    @inject('ILogger') private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'GetDocumentsUseCase' });
  }

  async execute(request: GetDocumentsRequest): Promise<AppResult<GetDocumentsResponse>> {
    this.logger.info('Executing get documents use case', { 
      page: request.page, 
      limit: request.limit,
      name: request.name,
      mimeType: request.mimeType,
      tags: request.tags,
      fromDate: request.fromDate,
      toDate: request.toDate
    });

    try {
      const documentsResult = await this.documentApplicationService.getDocuments(
        request.page,
        request.limit,
        'createdAt', // sortBy
        'desc',      // sortOrder
        {
          name: request.name,
          mimeType: request.mimeType,
          tags: request.tags,
          from: request.fromDate,
          to: request.toDate
        }
      );
      
      if (documentsResult.isErr()) {
        this.logger.warn('Documents retrieval failed', { 
          page: request.page, 
          limit: request.limit,
          name: request.name,
          mimeType: request.mimeType
        });
        return AppResult.Err(AppError.InvalidOperation(
          `Documents retrieval failed with page: ${request.page}, limit: ${request.limit}`
        ));
      }

      const documents = documentsResult.unwrap();
      
      // Apply pagination manually since the service returns all documents
      const startIndex = (request.page - 1) * request.limit;
      const endIndex = startIndex + request.limit;
      const paginatedDocuments = documents.slice(startIndex, endIndex);
      
      const response: GetDocumentsResponse = {
        document: paginatedDocuments.map(document => ({
          id: document.id,
          name: document.name.value,
          filePath: document.filePath,
          mimeType: document.mimeType.value,
          size: document.size.bytes.toString(),
          tags: document.tags,
          metadata: document.metadata,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt
        })),
        pagination: calculatePaginationMetadata(request.page, request.limit, documents.length)
      };

      this.logger.info('Documents retrieved successfully', { 
        documentCount: paginatedDocuments.length, 
        totalDocuments: documents.length,
        page: request.page, 
        limit: request.limit 
      });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { 
        page: request.page, 
        limit: request.limit,
        name: request.name,
        mimeType: request.mimeType
      });
      return AppResult.Err(AppError.Generic(
        `Failed to execute get documents use case with page: ${request.page}, limit: ${request.limit}`
      ));
    }
  }
}