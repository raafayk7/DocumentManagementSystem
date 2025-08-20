import { inject, injectable } from "tsyringe";
import { Result } from "@carbonteq/fp";
import { DocumentApplicationService } from "../../services/DocumentApplicationService.js";
import type { ILogger } from '../../../ports/output/ILogger.js';
import type { DownloadDocumentByTokenRequest, DownloadDocumentByTokenResponse } from "../../../shared/dto/document/index.js";
import { ApplicationError } from "../../../shared/errors/ApplicationError.js";

@injectable()
export class DownloadDocumentByTokenUseCase {
  constructor(
    @inject("DocumentApplicationService") private documentApplicationService: DocumentApplicationService,
    @inject("ILogger") private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'DownloadDocumentByTokenUseCase' });
  }

  async execute(request: DownloadDocumentByTokenRequest): Promise<Result<DownloadDocumentByTokenResponse, ApplicationError>> {
    this.logger.info('Downloading document by token');

    try {
      // Delegate to DocumentApplicationService
      const result = await this.documentApplicationService.downloadDocumentByToken(request.token);
      
      if (result.isErr()) {
        this.logger.warn('Document download by token failed', {
          error: result.unwrapErr().message
        });
        return result;
      }

      const { document, file } = result.unwrap();

      // 4. Return response DTO with both document info and file content
      const response: DownloadDocumentByTokenResponse = {
        document: {
          id: document.id,
          name: document.name.value,
          filePath: document.filePath,
          mimeType: document.mimeType.value,
          size: document.size.bytes.toString(),
          tags: document.tags,
          metadata: document.metadata,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
        },
        file: file // Include the actual file content
      };

      this.logger.info('Document downloaded by token successfully', { documentId: document.id });
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

