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
import { Document } from '../domain/entities/Document.js';
import { DocumentValidator} from '../domain/validators/index.js';
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

  async createDocument(data: CreateDocumentDto): Promise<Result<Document, DocumentError>> {
    this.logger.info('Creating document', { name: data.name, size: data.size });
    
    try {
      // Validate with DocumentValidator
      const nameValidation = DocumentValidator.validateName(data.name);
      if (nameValidation.isErr()) {
        this.logger.warn('Document creation failed - name validation error', { 
          name: data.name, 
          error: nameValidation.unwrapErr() 
        });
        return Result.Err(new DocumentError(
          'DocumentService.createDocument.nameValidation',
          nameValidation.unwrapErr(),
          { name: data.name }
        ));
      }

      const fileSizeValidation = DocumentValidator.validateFileSize(data.size);
      if (fileSizeValidation.isErr()) {
        this.logger.warn('Document creation failed - file size validation error', { 
          name: data.name, 
          error: fileSizeValidation.unwrapErr() 
        });
        return Result.Err(new DocumentError(
          'DocumentService.createDocument.fileSizeValidation',
          fileSizeValidation.unwrapErr(),
          { name: data.name, size: data.size }
        ));
      }

      const fileTypeValidation = DocumentValidator.validateFileType(data.mimeType);
      if (fileTypeValidation.isErr()) {
        this.logger.warn('Document creation failed - file type validation error', { 
          name: data.name, 
          error: fileTypeValidation.unwrapErr() 
        });
        return Result.Err(new DocumentError(
          'DocumentService.createDocument.fileTypeValidation',
          fileTypeValidation.unwrapErr(),
          { name: data.name, mimeType: data.mimeType }
        ));
      }

      // Atomic operation: Check name uniqueness and create document in transaction
      const documentResult = Document.create(data.name, data.filePath, data.mimeType, data.size, data.tags, data.metadata);
      if (documentResult.isErr()) {
        this.logger.warn('Document creation failed - validation error', { 
          name: data.name, 
          error: documentResult.unwrapErr() 
        });
        return Result.Err(new DocumentError(
          'DocumentService.createDocument.validation',
          documentResult.unwrapErr(),
          { name: data.name, size: data.size }
        ));
      }

      const document = documentResult.unwrap();
      
      // Atomic save with name uniqueness check (thread-safe)
      const savedDocument = await this.documentRepository.saveWithNameCheck(document);
      this.logger.info('Document created successfully', { documentId: savedDocument.id, name: savedDocument.name });
      return Result.Ok(savedDocument);
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
  }, pagination?: PaginationInput): Promise<Result<PaginationOutput<Document>, DocumentError>> {
    this.logger.info('Finding all documents', { query, pagination });
    
    try {
      const result = await this.documentRepository.find(query, pagination);
      this.logger.info('Documents found', { count: result.data.length, total: result.pagination.total });
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

  async findOneDocument(id: string): Promise<Result<Document, DocumentError>> {
    this.logger.info('Finding document by ID', { documentId: id });
    
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
      this.logger.info('Document found', { documentId: id, name: document.name });
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

  // New entity-focused methods
  async findDocumentByName(name: string): Promise<Result<Document, DocumentError>> {
    this.logger.info('Finding document by name', { name });
    
    try {
      const document = await this.documentRepository.findByName(name);
      if (!document) {
        this.logger.warn('Document not found by name', { name });
        return Result.Err(new DocumentError(
          'DocumentService.findDocumentByName',
          'Document not found',
          { name }
        ));
      }
      this.logger.info('Document found by name', { name, documentId: document.id });
      return Result.Ok(document);
    } catch (error) {
      this.logger.logError(error as Error, { name });
      return Result.Err(new DocumentError(
        'DocumentService.findDocumentByName',
        error instanceof Error ? error.message : 'Failed to find document by name',
        { name }
      ));
    }
  }

  async findDocumentsByTags(tags: string[]): Promise<Result<Document[], DocumentError>> {
    this.logger.info('Finding documents by tags', { tags });
    
    try {
      const documents = await this.documentRepository.findByTags(tags);
      this.logger.info('Documents found by tags', { tags, count: documents.length });
      return Result.Ok(documents);
    } catch (error) {
      this.logger.logError(error as Error, { tags });
      return Result.Err(new DocumentError(
        'DocumentService.findDocumentsByTags',
        error instanceof Error ? error.message : 'Failed to find documents by tags',
        { tags }
      ));
    }
  }

  async findDocumentsByMimeType(mimeType: string): Promise<Result<Document[], DocumentError>> {
    this.logger.info('Finding documents by MIME type', { mimeType });
    
    try {
      const documents = await this.documentRepository.findByMimeType(mimeType);
      this.logger.info('Documents found by MIME type', { mimeType, count: documents.length });
      return Result.Ok(documents);
    } catch (error) {
      this.logger.logError(error as Error, { mimeType });
      return Result.Err(new DocumentError(
        'DocumentService.findDocumentsByMimeType',
        error instanceof Error ? error.message : 'Failed to find documents by MIME type',
        { mimeType }
      ));
    }
  }

  // Entity state-changing methods
  async updateDocumentName(id: string, newName: string): Promise<Result<Document, DocumentError>> {
    this.logger.info('Updating document name', { documentId: id, newName });
    
    try {
      // Get current document
      const document = await this.documentRepository.findById(id);
      if (!document) {
        this.logger.warn('Document not found for name update', { documentId: id });
        return Result.Err(new DocumentError(
          'DocumentService.updateDocumentName',
          'Document not found',
          { documentId: id }
        ));
      }

      // Validate new name
      const nameValidation = DocumentValidator.validateName(newName);
      if (nameValidation.isErr()) {
        this.logger.warn('Document name update failed - validation error', { 
          documentId: id, 
          newName, 
          error: nameValidation.unwrapErr() 
        });
        return Result.Err(new DocumentError(
          'DocumentService.updateDocumentName.nameValidation',
          nameValidation.unwrapErr(),
          { documentId: id, newName }
        ));
      }

      // Check name uniqueness
      const existingDoc = await this.documentRepository.findByName(newName);
      if (existingDoc && existingDoc.id !== id) {
        this.logger.warn('Document name update failed - name already exists', { documentId: id, newName });
        return Result.Err(new DocumentError(
          'DocumentService.updateDocumentName.nameExists',
          'Document name already exists',
          { documentId: id, newName }
        ));
      }

      // Use entity method to update name
      const updatedDocument = document.updateName(newName);
      if (updatedDocument.isErr()) {
        this.logger.warn('Document name update failed - entity validation error', { 
          documentId: id, 
          newName, 
          error: updatedDocument.unwrapErr() 
        });
        return Result.Err(new DocumentError(
          'DocumentService.updateDocumentName.entityValidation',
          updatedDocument.unwrapErr(),
          { documentId: id, newName }
        ));
      }

      // Save updated entity
      const savedDocument = await this.documentRepository.update(updatedDocument.unwrap());
      this.logger.info('Document name updated successfully', { documentId: id, newName });
      return Result.Ok(savedDocument);
    } catch (error) {
      this.logger.logError(error as Error, { documentId: id, newName });
      return Result.Err(new DocumentError(
        'DocumentService.updateDocumentName',
        error instanceof Error ? error.message : 'Failed to update document name',
        { documentId: id, newName }
      ));
    }
  }

  async addTagsToDocument(id: string, newTags: string[]): Promise<Result<Document, DocumentError>> {
    this.logger.info('Adding tags to document', { documentId: id, newTags });
    
    try {
      // Get current document
      const document = await this.documentRepository.findById(id);
      if (!document) {
        this.logger.warn('Document not found for tag addition', { documentId: id });
        return Result.Err(new DocumentError(
          'DocumentService.addTagsToDocument',
          'Document not found',
          { documentId: id }
        ));
      }

      // Use entity method to add tags
      const updatedDocument = document.addTags(newTags);
      if (updatedDocument.isErr()) {
        this.logger.warn('Document tag addition failed - entity validation error', { 
          documentId: id, 
          newTags, 
          error: updatedDocument.unwrapErr() 
        });
        return Result.Err(new DocumentError(
          'DocumentService.addTagsToDocument.entityValidation',
          updatedDocument.unwrapErr(),
          { documentId: id, newTags }
        ));
      }

      // Save updated entity
      const savedDocument = await this.documentRepository.update(updatedDocument.unwrap());
      this.logger.info('Tags added to document successfully', { documentId: id, newTags });
      return Result.Ok(savedDocument);
    } catch (error) {
      this.logger.logError(error as Error, { documentId: id, newTags });
      return Result.Err(new DocumentError(
        'DocumentService.addTagsToDocument',
        error instanceof Error ? error.message : 'Failed to add tags to document',
        { documentId: id, newTags }
      ));
    }
  }

  async removeTagsFromDocument(id: string, tagsToRemove: string[]): Promise<Result<Document, DocumentError>> {
    this.logger.info('Removing tags from document', { documentId: id, tagsToRemove });
    
    try {
      // Get current document
      const document = await this.documentRepository.findById(id);
      if (!document) {
        this.logger.warn('Document not found for tag removal', { documentId: id });
        return Result.Err(new DocumentError(
          'DocumentService.removeTagsFromDocument',
          'Document not found',
          { documentId: id }
        ));
      }

      // Use entity method to remove tags
      const updatedDocument = document.removeTags(tagsToRemove);
      if (updatedDocument.isErr()) {
        this.logger.warn('Document tag removal failed - entity validation error', { 
          documentId: id, 
          tagsToRemove, 
          error: updatedDocument.unwrapErr() 
        });
        return Result.Err(new DocumentError(
          'DocumentService.removeTagsFromDocument.entityValidation',
          updatedDocument.unwrapErr(),
          { documentId: id, tagsToRemove }
        ));
      }

      // Save updated entity
      const savedDocument = await this.documentRepository.update(updatedDocument.unwrap());
      this.logger.info('Tags removed from document successfully', { documentId: id, tagsToRemove });
      return Result.Ok(savedDocument);
    } catch (error) {
      this.logger.logError(error as Error, { documentId: id, tagsToRemove });
      return Result.Err(new DocumentError(
        'DocumentService.removeTagsFromDocument',
        error instanceof Error ? error.message : 'Failed to remove tags from document',
        { documentId: id, tagsToRemove }
      ));
    }
  }

  async replaceTagsInDocument(id: string, newTags: string[]): Promise<Result<Document, DocumentError>> {
    this.logger.info('Replacing tags in document', { documentId: id, newTags });
    
    try {
      // Get current document
    const document = await this.documentRepository.findById(id);
    if (!document) {
        this.logger.warn('Document not found for tag replacement', { documentId: id });
        return Result.Err(new DocumentError(
          'DocumentService.replaceTagsInDocument',
          'Document not found',
          { documentId: id }
        ));
      }

      // Use entity method to replace tags
      const updatedDocument = document.replaceTags(newTags);
      if (updatedDocument.isErr()) {
        this.logger.warn('Document tag replacement failed - entity validation error', { 
          documentId: id, 
          newTags, 
          error: updatedDocument.unwrapErr() 
        });
        return Result.Err(new DocumentError(
          'DocumentService.replaceTagsInDocument.entityValidation',
          updatedDocument.unwrapErr(),
          { documentId: id, newTags }
        ));
      }

      // Save updated entity
      const savedDocument = await this.documentRepository.update(updatedDocument.unwrap());
      this.logger.info('Tags replaced in document successfully', { documentId: id, newTags });
      return Result.Ok(savedDocument);
    } catch (error) {
      this.logger.logError(error as Error, { documentId: id, newTags });
      return Result.Err(new DocumentError(
        'DocumentService.replaceTagsInDocument',
        error instanceof Error ? error.message : 'Failed to replace tags in document',
        { documentId: id, newTags }
      ));
    }
  }

  async updateDocumentMetadata(id: string, newMetadata: Record<string, string>): Promise<Result<Document, DocumentError>> {
    this.logger.info('Updating document metadata', { documentId: id, newMetadata });
    
    try {
      // Get current document
      const document = await this.documentRepository.findById(id);
      if (!document) {
        this.logger.warn('Document not found for metadata update', { documentId: id });
        return Result.Err(new DocumentError(
          'DocumentService.updateDocumentMetadata',
          'Document not found',
          { documentId: id }
        ));
      }

      // Use entity method to update metadata
      const updatedDocument = document.updateMetadata(newMetadata);
      if (updatedDocument.isErr()) {
        this.logger.warn('Document metadata update failed - entity validation error', { 
          documentId: id, 
          newMetadata, 
          error: updatedDocument.unwrapErr() 
        });
        return Result.Err(new DocumentError(
          'DocumentService.updateDocumentMetadata.entityValidation',
          updatedDocument.unwrapErr(),
          { documentId: id, newMetadata }
        ));
      }

      // Save updated entity
      const savedDocument = await this.documentRepository.update(updatedDocument.unwrap());
      this.logger.info('Document metadata updated successfully', { documentId: id });
      return Result.Ok(savedDocument);
    } catch (error) {
      this.logger.logError(error as Error, { documentId: id, newMetadata });
      return Result.Err(new DocumentError(
        'DocumentService.updateDocumentMetadata',
        error instanceof Error ? error.message : 'Failed to update document metadata',
        { documentId: id, newMetadata }
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

      // Parse tags and metadata using entity methods
      const tagsResult = Document.parseTags(fields.tags);
      if (tagsResult.isErr()) {
        this.logger.warn('Document upload failed - tags parsing error', { 
          error: tagsResult.unwrapErr() 
        });
        return Result.Err(new DocumentError(
          'DocumentService.uploadDocument.tagsParsing',
          tagsResult.unwrapErr(),
          { fileName: fileInfo.name }
        ));
      }

      const metadataResult = Document.parseMetadata(fields.metadata);
      if (metadataResult.isErr()) {
        this.logger.warn('Document upload failed - metadata parsing error', { 
          error: metadataResult.unwrapErr() 
        });
        return Result.Err(new DocumentError(
          'DocumentService.uploadDocument.metadataParsing',
          metadataResult.unwrapErr(),
          { fileName: fileInfo.name }
        ));
      }

      // Create document using entity factory
      const documentResult = Document.fromUpload(
        fields.name || fileInfo.name, // Use file name as fallback
        fileInfo.path,
        fileInfo.mimeType,
        fileInfo.size.toString(),
        tagsResult.unwrap(),
        metadataResult.unwrap()
      );

      if (documentResult.isErr()) {
        this.logger.warn('Document upload failed - entity creation error', { 
          fileName: fileInfo.name, 
          error: documentResult.unwrapErr() 
        });
        return Result.Err(new DocumentError(
          'DocumentService.uploadDocument.entityCreation',
          documentResult.unwrapErr(),
          { fileName: fileInfo.name }
        ));
      }

      const document = documentResult.unwrap();

      // Atomic save with name uniqueness check (thread-safe)
      const savedDocument = await this.documentRepository.saveWithNameCheck(document);
      
      // Convert to DTO for response
      const documentDto: DocumentDto = {
        id: savedDocument.id,
        name: savedDocument.name,
        filePath: savedDocument.filePath,
        mimeType: savedDocument.mimeType,
        size: savedDocument.size,
        tags: savedDocument.tags,
        metadata: savedDocument.metadata,
        createdAt: savedDocument.createdAt,
        updatedAt: savedDocument.updatedAt
      };

      this.logger.info('Document uploaded successfully', { 
        documentId: savedDocument.id, 
        name: savedDocument.name 
      });
      return Result.Ok(documentDto);
    } catch (error) {
      this.logger.logError(error as Error, { operation: 'upload' });
      return Result.Err(new DocumentError(
        'DocumentService.uploadDocument',
        error instanceof Error ? error.message : 'Failed to upload document',
        { operation: 'upload' }
      ));
    }
  }

  async downloadDocument(id: string, reply: FastifyReply): Promise<Result<void, DocumentError>> {
    this.logger.info('Downloading document', { documentId: id });
    
    try {
      const document = await this.documentRepository.findById(id);
      if (!document) {
        this.logger.warn('Document not found for download', { documentId: id });
        return Result.Err(new DocumentError(
          'DocumentService.downloadDocument',
          'Document not found',
          { documentId: id }
        ));
      }

      const downloadResult = await this.fileService.streamFile(document.filePath, reply);
      if (downloadResult.isErr()) {
        return Result.Err(new DocumentError(
          'DocumentService.downloadDocument.streamFile',
          downloadResult.unwrapErr().message,
          { documentId: id }
        ));
      }

      this.logger.info('Document downloaded successfully', { documentId: id });
      return Result.Ok(undefined);
    } catch (error) {
      this.logger.logError(error as Error, { documentId: id });
      return Result.Err(new DocumentError(
        'DocumentService.downloadDocument',
        error instanceof Error ? error.message : 'Failed to download document',
        { documentId: id }
      ));
    }
  }

  async generateDownloadLink(id: string): Promise<Result<string, DocumentError>> {
    this.logger.info('Generating download link', { documentId: id });
    
    try {
      const document = await this.documentRepository.findById(id);
      if (!document) {
        this.logger.warn('Document not found for download link generation', { documentId: id });
        return Result.Err(new DocumentError(
          'DocumentService.generateDownloadLink',
          'Document not found',
          { documentId: id }
        ));
      }

      const payload = {
        documentId: document.id,
        exp: Math.floor(Date.now() / 1000) + (5 * 60) // 5 minutes
      };

      const token = jwt.sign(payload, process.env.DOWNLOAD_JWT_SECRET!);
      const downloadUrl = `/documents/download?token=${token}`;

      this.logger.info('Download link generated successfully', { documentId: id });
      return Result.Ok(downloadUrl);
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
    this.logger.info('Downloading document by token');
    
    try {
      const payload = jwt.verify(token, process.env.DOWNLOAD_JWT_SECRET!) as any;
      const documentId = payload.documentId;

      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        this.logger.warn('Document not found for token download', { documentId });
        return Result.Err(new DocumentError(
          'DocumentService.downloadDocumentByToken',
          'Document not found',
          { documentId }
        ));
      }

      const downloadResult = await this.fileService.streamFile(document.filePath, reply);
      if (downloadResult.isErr()) {
        return Result.Err(new DocumentError(
          'DocumentService.downloadDocumentByToken.streamFile',
          downloadResult.unwrapErr().message,
          { documentId }
        ));
      }

      this.logger.info('Document downloaded by token successfully', { documentId });
      return Result.Ok(undefined);
    } catch (error) {
      this.logger.logError(error as Error, { token });
      return Result.Err(new DocumentError(
        'DocumentService.downloadDocumentByToken',
        error instanceof Error ? error.message : 'Failed to download document by token',
        { token }
      ));
    }
  }
} 