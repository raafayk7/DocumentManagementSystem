import { injectable, inject } from 'tsyringe';
import { AppResult } from '@carbonteq/hexapp';
import { GetDocumentsRequest, GetDocumentsResponse } from '../../../shared/dto/document/index.js';
import type { IDocumentApplicationService } from '../../../ports/input/IDocumentApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';
import { ApplicationError } from '../../../shared/errors/ApplicationError.js';

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
      filters: request 
    });

    try {
      const documents = await this.documentApplicationService.getDocuments(
        request.page,
        request.limit,
        request.sortBy,
        request.sortOrder,
        {
          name: request.name,
          mimeType: request.mimeType,
          tags: request.tags,
          metadata: request.metadata,
          from: request.fromDate,
          to: request.toDate
        }
      );

      if (documents.isErr()) {
        this.logger.warn('Documents retrieval failed', { 
          page: request.page, 
          limit: request.limit,
          error: documents.unwrapErr().message 
        });
        return AppResult.Err(new ApplicationError(
          'GetDocumentsUseCase.documentsRetrievalFailed',
          'Documents retrieval failed',
          { page: request.page, limit: request.limit }
        ));
      }

      const documentsData = documents.unwrap();
      
      const response: GetDocumentsResponse = {
        document: documentsData.map((doc: any) => ({
          id: doc.id,
          name: doc.name.value,
          filePath: doc.filePath,
          mimeType: doc.mimeType.value,
          size: doc.size.bytes.toString(),
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          tags: doc.tags,
          metadata: doc.metadata
        })),
        pagination: {
          page: request.page,
          limit: request.limit,
          total: documentsData.length
        }
      };
      
      this.logger.info('Documents retrieved successfully', { 
        page: request.page, 
        limit: request.limit,
        totalDocuments: documentsData.length,
        returnedDocuments: documentsData.length
      });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { 
        page: request.page, 
        limit: request.limit 
      });
      return AppResult.Err(new ApplicationError(
        'GetDocumentsUseCase.execute',
        error instanceof Error ? error.message : 'Failed to execute get documents use case',
        { page: request.page, limit: request.limit }
      ));
    }
  }
}