import { inject, injectable } from "tsyringe";
import { Result } from "@carbonteq/fp";
import { DocumentApplicationService } from "../../services/DocumentApplicationService.js";
import type { ILogger } from '../../../ports/output/ILogger.js';
import type { DownloadDocumentRequest, DownloadDocumentResponse } from "../../../shared/dto/document/index.js";
import { ApplicationError } from "../../../shared/errors/ApplicationError.js";

@injectable()
export class DownloadDocumentUseCase {
  constructor(
    @inject("DocumentApplicationService") private documentApplicationService: DocumentApplicationService,
    @inject("ILogger") private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'DownloadDocumentUseCase' });
  }

  async execute(request: DownloadDocumentRequest): Promise<Result<DownloadDocumentResponse, ApplicationError>> {
    this.logger.info('Downloading document', { documentId: request.documentId });

    try {
      // Delegate to DocumentApplicationService
      const downloadResult = await this.documentApplicationService.downloadDocument(
        request.documentId,
        request.userId
      );
      
      if (downloadResult.isErr()) {
        this.logger.warn('Document download failed', {
          documentId: request.documentId,
          error: downloadResult.unwrapErr().message
        });
        return downloadResult;
      }

      const { document } = downloadResult.unwrap();

      // 3. Return response DTO (file streaming will be handled by infrastructure layer)
      const response: DownloadDocumentResponse = {
        filePath: document.filePath,
        filename: document.name.value,
                  mimeType: document.mimeType.value,
          size: parseInt(document.size.bytes.toString()),
      };

      this.logger.info('Document downloaded successfully', { documentId: request.documentId });
      return Result.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId: request.documentId });
      return Result.Err(new ApplicationError(
        'DownloadDocumentUseCase.execute',
        error instanceof Error ? error.message : 'Failed to download document',
        { documentId: request.documentId }
      ));
    }
  }
}