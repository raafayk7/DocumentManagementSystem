import { IDocumentRepository } from './repositories/documents.repository.interface.js';
import { CreateDocumentDto, UpdateDocumentDto, DocumentDto } from './dto/documents.dto.js';
import { FastifyRequest, FastifyReply } from 'fastify';
import { IFileService } from '../common/services/file.service.interface.js';
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import { injectable, inject } from 'tsyringe';
import { ILogger } from '../common/services/logger.service.interface.js';
import { PaginationInput, PaginationOutput } from '../common/dto/pagination.dto.js';
import { Result } from '@carbonteq/fp';
import { DocumentError } from '../common/errors/application.errors.js';
dotenv.config();

@injectable()
export class DocumentService {
  constructor(
    @inject('IDocumentRepository') private documentRepository: IDocumentRepository,
    @inject('IFileService') private fileService: IFileService,
    @inject('ILogger') private logger: ILogger
  ) {
    this.logger = this.logger.child({ service: 'DocumentService' });
  }

  async createDocument(data: CreateDocumentDto): Promise<Result<DocumentDto, DocumentError>> {
    this.logger.info('Creating document', { name: data.name, size: data.size });
    
    try {
      const document = await this.documentRepository.save(data);
      this.logger.info('Document created successfully', { documentId: document.id, name: document.name });
      return Result.Ok(document);
    } catch (error) {
      this.logger.logError(error as Error, { name: data.name });
      return Result.Err(new DocumentError(
        'DocumentService.createDocument',
        error instanceof Error ? error.message : 'Failed to create document',
        { name: data.name, size: data.size }
      ));
    }
  }

  async findAllDocuments(query?: {
    name?: string;
    mimeType?: string;
    from?: string;
    to?: string;
    tags?: string | string[];
    metadata?: Record<string, string>;
  }, pagination?: PaginationInput): Promise<Result<PaginationOutput<DocumentDto>, DocumentError>> {
    this.logger.debug('Finding documents', { query, pagination });
    
    try {
      const result = await this.documentRepository.find(query, pagination);
      this.logger.info('Documents found', { 
        count: result.data.length, 
        total: result.pagination.total,
        page: result.pagination.page,
        totalPages: result.pagination.totalPages
      });
      return Result.Ok(result);
    } catch (error) {
      this.logger.logError(error as Error, { query, pagination });
      return Result.Err(new DocumentError(
        'DocumentService.findAllDocuments',
        error instanceof Error ? error.message : 'Failed to find documents',
        { query, pagination }
      ));
    }
  }

  async findOneDocument(id: string): Promise<Result<DocumentDto, DocumentError>> {
    this.logger.debug('Finding document by ID', { documentId: id });
    
    try {
    const document = await this.documentRepository.findById(id);
    if (!document) {
        this.logger.warn('Document not found', { documentId: id });
        return Result.Err(new DocumentError(
          'DocumentService.findOneDocument',
          'Document not found',
          { documentId: id }
        ));
      }
      this.logger.debug('Document found', { documentId: id, name: document.name });
      return Result.Ok(document);
    } catch (error) {
      this.logger.logError(error as Error, { documentId: id });
      return Result.Err(new DocumentError(
        'DocumentService.findOneDocument',
        error instanceof Error ? error.message : 'Failed to find document',
        { documentId: id }
      ));
    }
  }

  async updateDocument(id: string, data: UpdateDocumentDto): Promise<Result<DocumentDto, DocumentError>> {
    this.logger.info('Updating document', { documentId: id, updates: data });
    
    try {
    const updated = await this.documentRepository.update(id, data);
    if (!updated) {
        this.logger.warn('Document not found for update', { documentId: id });
        return Result.Err(new DocumentError(
          'DocumentService.updateDocument',
          'Document not found',
          { documentId: id, updates: data }
        ));
      }
      this.logger.info('Document updated successfully', { documentId: id });
      return Result.Ok(updated);
    } catch (error) {
      this.logger.logError(error as Error, { documentId: id });
      return Result.Err(new DocumentError(
        'DocumentService.updateDocument',
        error instanceof Error ? error.message : 'Failed to update document',
        { documentId: id, updates: data }
      ));
    }
  }

  async removeDocument(id: string): Promise<Result<{ deleted: boolean }, DocumentError>> {
    this.logger.info('Removing document', { documentId: id });
    
    try {
    const result = await this.documentRepository.delete(id);
      if (!result) {
        this.logger.warn('Document not found for deletion', { documentId: id });
        return Result.Err(new DocumentError(
          'DocumentService.removeDocument',
          'Document not found',
          { documentId: id }
        ));
      }
      this.logger.info('Document removed successfully', { documentId: id });
      return Result.Ok({ deleted: true });
    } catch (error) {
      this.logger.logError(error as Error, { documentId: id });
      return Result.Err(new DocumentError(
        'DocumentService.removeDocument',
        error instanceof Error ? error.message : 'Failed to remove document',
        { documentId: id }
      ));
    }
  }

  async uploadDocument(request: FastifyRequest): Promise<Result<DocumentDto, DocumentError>> {
    this.logger.info('Document upload started');
    
    try {
      // Use file service to handle file upload and get form fields
      const fileResult = await this.fileService.saveFile(request);
      if (fileResult.isErr()) {
        return Result.Err(new DocumentError(
          'DocumentService.uploadDocument.saveFile',
          fileResult.unwrapErr().message,
          { operation: 'file_upload' }
        ));
      }

      const fileInfo = fileResult.unwrap();
      const fields = fileInfo.fields;

      this.logger.debug('File uploaded', { 
        fileName: fileInfo.name, 
        fileSize: fileInfo.size,
        mimeType: fileInfo.mimeType 
      });

      // Parse tags and metadata if present
      let tags: string[] = [];
      if (fields.tags) {
        try {
          const parsed = JSON.parse(fields.tags);
          if (Array.isArray(parsed)) {
            tags = parsed.map(String);
          } else if (typeof parsed === 'string') {
            tags = [parsed];
          } else {
            tags = [];
          }
        } catch {
          // fallback: comma-separated string
          tags = fields.tags.split(',').map((t: string) => t.trim());
        }
      }
      
      let metadata: Record<string, string> = {};
      if (fields.metadata) {
        try {
          metadata = JSON.parse(fields.metadata);
        } catch {
          metadata = {};
        }
      }

      this.logger.debug('Parsed upload data', { tags, metadata });

      // Save file info and metadata to DB
      const doc = await this.createDocument({
        name: fields.name || fileInfo.name,
        filePath: fileInfo.path,
        mimeType: fields.mimeType || fileInfo.mimeType,
        size: fields.size || fileInfo.size,
        tags, // always an array
        metadata: metadata
      });

      if (doc.isErr()) {
        return Result.Err(new DocumentError(
          'DocumentService.uploadDocument.createDocument',
          doc.unwrapErr().message,
          { fileName: fileInfo.name, fileSize: fileInfo.size }
        ));
      }

      this.logger.info('Document upload completed successfully', { 
        documentId: doc.unwrap().id, 
        name: doc.unwrap().name,
        size: doc.unwrap().size 
      });

      return doc;
    } catch (error) {
      this.logger.logError(error as Error, { 
        fileName: (request as any).filename 
      });
      return Result.Err(new DocumentError(
        'DocumentService.uploadDocument',
        error instanceof Error ? error.message : 'Upload failed',
        { fileName: (request as any).filename }
      ));
    }
  }

  async downloadDocument(id: string, reply: FastifyReply): Promise<Result<void, DocumentError>> {
    this.logger.info('Document download started', { documentId: id });
    
    try {
      const docResult = await this.findOneDocument(id);
      if (docResult.isErr()) {
        return Result.Err(docResult.unwrapErr());
      }

      const doc = docResult.unwrap();
      const streamResult = await this.fileService.streamFile(doc.filePath, reply);
      if (streamResult.isErr()) {
        return Result.Err(new DocumentError(
          'DocumentService.downloadDocument.streamFile',
          streamResult.unwrapErr().message,
          { documentId: id, filePath: doc.filePath }
        ));
      }

      this.logger.info('Document download completed', { documentId: id });
      return Result.Ok(undefined);
    } catch (error) {
      this.logger.logError(error as Error, { documentId: id });
      return Result.Err(new DocumentError(
        'DocumentService.downloadDocument',
        error instanceof Error ? error.message : 'Download failed',
        { documentId: id }
      ));
    }
  }

  async generateDownloadLink(id: string): Promise<Result<string, DocumentError>> {
    this.logger.info('Generating download link', { documentId: id });
    
    try {
    // Check if document exists
      const docResult = await this.findOneDocument(id);
      if (docResult.isErr()) {
        return Result.Err(docResult.unwrapErr());
      }

    const token = jwt.sign(
      { documentId: id },
      process.env.DOWNLOAD_JWT_SECRET!,
      { expiresIn: '5m' }
    );
    
    const url = `/documents/download-link?token=${encodeURIComponent(token)}`;
      this.logger.info('Download link generated', { documentId: id, expiresIn: '5m' });
      return Result.Ok(url);
    } catch (error) {
      this.logger.logError(error as Error, { documentId: id });
      return Result.Err(new DocumentError(
        'DocumentService.generateDownloadLink',
        error instanceof Error ? error.message : 'Failed to generate download link',
        { documentId: id }
      ));
    }
  }

  async downloadDocumentByToken(token: string, reply: FastifyReply): Promise<Result<void, DocumentError>> {
    this.logger.info('Download by token started');
    
    try {
    const payload = jwt.verify(token, process.env.DOWNLOAD_JWT_SECRET!) as { documentId: string };
      this.logger.debug('Token verified', { documentId: payload.documentId });
      
      const downloadResult = await this.downloadDocument(payload.documentId, reply);
      if (downloadResult.isErr()) {
        return Result.Err(downloadResult.unwrapErr());
      }
      
      return Result.Ok(undefined);
    } catch (error) {
      this.logger.logError(error as Error, { token: token.substring(0, 10) + '...' });
      return Result.Err(new DocumentError(
        'DocumentService.downloadDocumentByToken',
        error instanceof Error ? error.message : 'Token verification failed',
        { token: token.substring(0, 10) + '...' }
      ));
    }
  }
} 