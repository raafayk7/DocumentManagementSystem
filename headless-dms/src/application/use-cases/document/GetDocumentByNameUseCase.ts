import { inject, injectable } from "tsyringe";
import { Result } from "@carbonteq/fp";
import { DocumentApplicationService } from "../../services/DocumentApplicationService.js";
import type { ILogger } from "../../../infrastructure/interfaces/ILogger.js";
import type { GetDocumentByNameRequest, GetDocumentByNameResponse } from "../../dto/document/index.js";
import { ApplicationError } from "../../errors/ApplicationError.js";

@injectable()
export class GetDocumentByNameUseCase {
  constructor(
    @inject("DocumentApplicationService") private documentApplicationService: DocumentApplicationService,
    @inject("ILogger") private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'GetDocumentByNameUseCase' });
  }

  async execute(request: GetDocumentByNameRequest): Promise<Result<GetDocumentByNameResponse, ApplicationError>> {
    this.logger.info('Getting document by name', { name: request.name });

    try {
      // Delegate to DocumentApplicationService
      const documentResult = await this.documentApplicationService.getDocumentByName(request.name);
      
      if (documentResult.isErr()) {
        this.logger.warn('Document not found by name', { name: request.name });
        return documentResult;
      }

      const document = documentResult.unwrap();

      // 2. Transform to response DTO
      const response: GetDocumentByNameResponse = {
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

      this.logger.info('Document retrieved by name successfully', { name: request.name });
      return Result.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { name: request.name });
      return Result.Err(new ApplicationError(
        'GetDocumentByNameUseCase.execute',
        error instanceof Error ? error.message : 'Failed to get document by name',
        { name: request.name }
      ));
    }
  }
} 