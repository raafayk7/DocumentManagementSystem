import { IDocumentRepository } from './repositories/documents.repository.interface';
import { CreateDocumentDto, UpdateDocumentDto, DocumentDto } from './dto/documents.dto';
import { FastifyRequest, FastifyReply } from 'fastify';
import { IFileService } from '../common/services/file.service.interface';
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import { injectable, inject } from 'tsyringe';
import { ILogger } from '../common/services/logger.service.interface';
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

  async createDocument(data: CreateDocumentDto): Promise<DocumentDto> {
    this.logger.info('Creating document', { name: data.name, size: data.size });
    
    try {
      const document = await this.documentRepository.save(data);
      this.logger.info('Document created successfully', { documentId: document.id, name: document.name });
      return document;
    } catch (error) {
      this.logger.logError(error as Error, { name: data.name });
      throw error;
    }
  }

  async findAllDocuments(query?: {
    name?: string;
    mimeType?: string;
    from?: string;
    to?: string;
    tags?: string | string[];
    metadata?: Record<string, string>;
    page?: number;
    pageSize?: number;
  }) {
    this.logger.debug('Finding documents', { query });
    
    try {
      const documents = await this.documentRepository.find(query);
      this.logger.info('Documents found', { count: documents.length });
      return documents;
    } catch (error) {
      this.logger.logError(error as Error, { query });
      throw error;
    }
  }

  async findOneDocument(id: string): Promise<DocumentDto> {
    this.logger.debug('Finding document by ID', { documentId: id });
    
    try {
      const document = await this.documentRepository.findById(id);
      if (!document) {
        this.logger.warn('Document not found', { documentId: id });
        const err = new Error(`Document with id ${id} not found`);
        (err as any).statusCode = 404;
        throw err;
      }
      this.logger.debug('Document found', { documentId: id, name: document.name });
      return document;
    } catch (error) {
      this.logger.logError(error as Error, { documentId: id });
      throw error;
    }
  }

  async updateDocument(id: string, data: UpdateDocumentDto): Promise<DocumentDto> {
    this.logger.info('Updating document', { documentId: id, updates: data });
    
    try {
      const updated = await this.documentRepository.update(id, data);
      if (!updated) {
        this.logger.warn('Document not found for update', { documentId: id });
        const err = new Error(`Document with id ${id} not found`);
        (err as any).statusCode = 404;
        throw err;
      }
      this.logger.info('Document updated successfully', { documentId: id });
      return updated;
    } catch (error) {
      this.logger.logError(error as Error, { documentId: id });
      throw error;
    }
  }

  async removeDocument(id: string): Promise<{ deleted: boolean }> {
    this.logger.info('Removing document', { documentId: id });
    
    try {
      const result = await this.documentRepository.delete(id);
      if (!result) {
        this.logger.warn('Document not found for deletion', { documentId: id });
        const err = new Error(`Document with id ${id} not found`);
        (err as any).statusCode = 404;
        throw err;
      }
      this.logger.info('Document removed successfully', { documentId: id });
      return { deleted: true };
    } catch (error) {
      this.logger.logError(error as Error, { documentId: id });
      throw error;
    }
  }

  async uploadDocument(request: FastifyRequest): Promise<DocumentDto> {
    this.logger.info('Document upload started');
    
    try {
      // Use file service to handle file upload and get form fields
      const fileInfo = await this.fileService.saveFile(request);
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

      this.logger.info('Document upload completed successfully', { 
        documentId: doc.id, 
        name: doc.name,
        size: doc.size 
      });

      return doc;
    } catch (error) {
      this.logger.logError(error as Error, { 
        fileName: (request as any).filename 
      });
      throw error;
    }
  }

  async downloadDocument(id: string, reply: FastifyReply): Promise<void> {
    this.logger.info('Document download started', { documentId: id });
    
    try {
      const doc = await this.findOneDocument(id);
      await this.fileService.streamFile(doc.filePath, reply);
      this.logger.info('Document download completed', { documentId: id });
    } catch (error) {
      this.logger.logError(error as Error, { documentId: id });
      throw error;
    }
  }

  async generateDownloadLink(id: string): Promise<string> {
    this.logger.info('Generating download link', { documentId: id });
    
    try {
      // Check if document exists
      await this.findOneDocument(id);

      const token = jwt.sign(
        { documentId: id },
        process.env.DOWNLOAD_JWT_SECRET!,
        { expiresIn: '5m' }
      );
      
      const url = `/documents/download-link?token=${encodeURIComponent(token)}`;
      this.logger.info('Download link generated', { documentId: id, expiresIn: '5m' });
      return url;
    } catch (error) {
      this.logger.logError(error as Error, { documentId: id });
      throw error;
    }
  }

  async downloadDocumentByToken(token: string, reply: FastifyReply): Promise<void> {
    this.logger.info('Download by token started');
    
    try {
      const payload = jwt.verify(token, process.env.DOWNLOAD_JWT_SECRET!) as { documentId: string };
      this.logger.debug('Token verified', { documentId: payload.documentId });
      await this.downloadDocument(payload.documentId, reply);
    } catch (error) {
      this.logger.logError(error as Error, { token: token.substring(0, 10) + '...' });
      throw error;
    }
  }
} 