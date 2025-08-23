import { injectable, inject } from 'tsyringe';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { UploadDocumentRequest, UploadDocumentResponse } from '../../../shared/dto/document/index.js';
import type { IDocumentApplicationService } from '../../../ports/input/IDocumentApplicationService.js';
import type { IFileService } from '../../../ports/output/IFileService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';

@injectable()
export class UploadDocumentUseCase {
  constructor(
    @inject('IDocumentApplicationService') private documentApplicationService: IDocumentApplicationService,
    @inject('IFileService') private fileService: IFileService,
    @inject('ILogger') private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'UploadDocumentUseCase' });
  }

  async execute(request: UploadDocumentRequest): Promise<AppResult<UploadDocumentResponse>> {
    this.logger.info('Executing upload document use case', { 
      name: request.name, 
      filename: request.filename,
      mimeType: request.mimeType,
      size: request.size,
      userId: request.userId 
    });

    try {
      // 1. First save the file to disk
      const fileSaveResult = await this.fileService.saveFile(
        request.file, 
        request.filename, 
        request.mimeType
      );
      
      if (fileSaveResult.isErr()) {
        const error = fileSaveResult.unwrapErr();
        this.logger.error('File save failed', { 
          filename: request.filename, 
          error: error.message || error.toString() 
        });
        return AppResult.Err(error);
      }
      
      const fileInfo = fileSaveResult.unwrap();
      this.logger.info('File saved successfully', { 
        filename: request.filename, 
        savedPath: fileInfo.path,
        fileSize: fileInfo.size 
      });

      // 2. Then create the document record with the actual file path
      const documentResult = await this.documentApplicationService.createDocument(
        request.userId,
        request.name,
        fileInfo.path, // Use the actual saved file path
        request.mimeType,
        request.size.toString(),
        request.tags,
        request.metadata
      );
      
      if (documentResult.isErr()) {
        const error = documentResult.unwrapErr();
        this.logger.warn('Document creation failed', { 
          name: request.name, 
          filePath: fileInfo.path,
          userId: request.userId 
        });
        // Preserve the original error message instead of wrapping it
        return AppResult.Err(error);
      }

      const document = documentResult.unwrap();
      const response: UploadDocumentResponse = {
        success: true,
        message: 'Document uploaded successfully',
        document: {
          id: document.id,
          name: document.name.value,
          filePath: document.filePath, // filePath is a string, not a value object
          mimeType: document.mimeType.value,
          size: document.size.bytes,
          tags: document.tags,
          metadata: document.metadata,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt
        }
      };

      this.logger.info('Document uploaded successfully', { 
        name: request.name, 
        userId: request.userId,
        documentId: document.id,
        filePath: fileInfo.path
      });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { 
        name: request.name, 
        filename: request.filename,
        userId: request.userId 
      });
      // Preserve the original error message instead of wrapping it
      return AppResult.Err(error instanceof Error ? error : new Error('Unknown error'));
    }
  }
}
