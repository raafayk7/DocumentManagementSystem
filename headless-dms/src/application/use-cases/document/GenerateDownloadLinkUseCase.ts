import { inject, injectable } from "tsyringe";
import { Result } from "@carbonteq/fp";
import { DocumentApplicationService } from "../../services/DocumentApplicationService.js";
import type { ILogger } from "../../../infrastructure/interfaces/ILogger.js";
import type { GenerateDownloadLinkRequest, GenerateDownloadLinkResponse } from "../../dto/document/index.js";
import { ApplicationError } from "../../errors/ApplicationError.js";

@injectable()
export class GenerateDownloadLinkUseCase {
  constructor(
    @inject("DocumentApplicationService") private documentApplicationService: DocumentApplicationService,
    @inject("ILogger") private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'GenerateDownloadLinkUseCase' });
  }

  async execute(request: GenerateDownloadLinkRequest): Promise<Result<GenerateDownloadLinkResponse, ApplicationError>> {
    this.logger.info('Generating download link', { documentId: request.documentId });

    try {
      // Delegate to DocumentApplicationService
      const downloadLinkResult = await this.documentApplicationService.generateDownloadLink(
        request.documentId,
        request.expiresInMinutes
      );
      
      if (downloadLinkResult.isErr()) {
        this.logger.warn('Failed to generate download link', {
          documentId: request.documentId,
          error: downloadLinkResult.unwrapErr().message
        });
        return downloadLinkResult;
      }

      const downloadUrl = downloadLinkResult.unwrap();

      // 3. Return response DTO
      const response: GenerateDownloadLinkResponse = {
        downloadUrl,
        expiresAt: new Date(Date.now() + request.expiresInMinutes * 60 * 1000),
        token: downloadUrl.split('token=')[1] || '', // Extract token from URL
      };

      this.logger.info('Download link generated successfully', { documentId: request.documentId });
      return Result.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId: request.documentId });
      return Result.Err(new ApplicationError(
        'GenerateDownloadLinkUseCase.execute',
        error instanceof Error ? error.message : 'Failed to generate download link',
        { documentId: request.documentId }
      ));
    }
  }
}