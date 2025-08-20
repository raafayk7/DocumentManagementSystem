import { injectable, inject } from 'tsyringe';
import { AppResult } from '@carbonteq/hexapp';
import { Document } from '../../domain/entities/Document.js';
import { User } from '../../domain/entities/User.js';
import { 
  DocumentDomainService, 
  DocumentImportanceScore, 
  DocumentAccessValidation, 
  DocumentMetadataValidation,
  DocumentRetentionPolicy
} from '../../domain/services/DocumentDomainService.js';
import { 
  UserDomainService, 
  UserPermission 
} from '../../domain/services/UserDomainService.js';
import type { IDocumentRepository } from '../../ports/output/IDocumentRepository.js';
import type { IUserRepository } from '../../ports/output/IUserRepository.js';
import type { IFileService } from '../../ports/output/IFileService.js';
import type { ILogger } from '../../ports/output/ILogger.js';
import { ApplicationError } from '../../shared/errors/ApplicationError.js';
import type { IDocumentApplicationService } from '../../ports/input/IDocumentApplicationService.js';
import jwt from 'jsonwebtoken';

@injectable()
export class DocumentApplicationService implements IDocumentApplicationService {
  constructor(
    @inject("IDocumentRepository") private documentRepository: IDocumentRepository,
    @inject("IUserRepository") private userRepository: IUserRepository,
    @inject("IFileService") private fileService: IFileService,
    @inject("DocumentDomainService") private documentDomainService: DocumentDomainService,
    @inject("UserDomainService") private userDomainService: UserDomainService,
    @inject("ILogger") private logger: ILogger,
  ) {
    this.logger = this.logger.child({ service: 'DocumentApplicationService' });
  }

  /**
   * Create a new document with validation
   */
  async createDocument(
    userId: string,
    name: string,
    filename: string,
    mimeType: string,
    size: string,
    tags: string[] = [],
    metadata: Record<string, string> = {}
  ): Promise<AppResult<Document>> {
    this.logger.info('Creating new document', { name, filename, userId });
    
    try {
      // Get user for validation
      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.warn('User not found for document creation', { userId });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.userNotFound',
          'User not found',
          { userId }
        ));
      }

      // Validate user can create documents
      const canCreate = this.userDomainService.canUserPerformAction(user, 'create', 'document');
      if (!canCreate) {
        this.logger.warn('User cannot create documents', { userId });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.insufficientPermissions',
          'Insufficient permissions to create documents',
          { userId }
        ));
      }

      // Create document entity
      const documentResult = Document.create(name, filename, mimeType, size, tags, metadata);
      if (documentResult.isErr()) {
        this.logger.error('Failed to create document entity', { name, error: documentResult.unwrapErr() });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.entityCreation',
          documentResult.unwrapErr(),
          { name }
        ));
      }

      const document = documentResult.unwrap();

      // Validate document name
      const nameValidation = this.documentDomainService.validateDocumentName(document);
      if (!nameValidation.isValid) {
        this.logger.warn('Invalid document name', { name, issues: nameValidation.issues });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.invalidDocumentName',
          'Invalid document name',
          { issues: nameValidation.issues }
        ));
      }

      // Validate document metadata
      const metadataValidation = this.documentDomainService.validateDocumentMetadata(document);
      if (!metadataValidation.isValid) {
        this.logger.warn('Document metadata validation issues', { 
          name, 
          issues: metadataValidation.issues 
        });
      }

      // Save document
      const savedDocument = await this.documentRepository.saveWithNameCheck(document);

      this.logger.info('Document created successfully', { 
        documentId: savedDocument.id, 
        name: savedDocument.name.value,
        userId 
      });
      return AppResult.Ok(savedDocument);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { name, userId });
      return AppResult.Err(new ApplicationError(
        'DocumentApplicationService.createDocument',
        error instanceof Error ? error.message : 'Failed to create document',
        { name, userId }
      ));
    }
  }

  /**
   * Get document with access validation
   */
  async getDocument(documentId: string, userId: string): Promise<AppResult<Document>> {
    this.logger.info('Getting document', { documentId, userId });
    
    try {
      // Get user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.warn('User not found for document access', { userId });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.userNotFound',
          'User not found',
          { userId }
        ));
      }

      // Get document
      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        this.logger.warn('Document not found', { documentId });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.documentNotFound',
          'Document not found',
          { documentId }
        ));
      }

      // Validate access
      const accessValidation = this.documentDomainService.validateDocumentAccess(user, document);
      if (!accessValidation.canAccess) {
        this.logger.warn('Document access denied', { documentId, userId, reason: accessValidation.reason });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.accessDenied',
          'Access denied',
          { documentId, userId, reason: accessValidation.reason }
        ));
      }

      this.logger.info('Document retrieved successfully', { documentId, userId });
      return AppResult.Ok(document);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId, userId });
      return AppResult.Err(new ApplicationError(
        'DocumentApplicationService.getDocument',
        error instanceof Error ? error.message : 'Failed to get document',
        { documentId, userId }
      ));
    }
  }

  /**
   * Update document name with validation
   */
  async updateDocumentName(
    documentId: string, 
    newName: string, 
    userId: string
  ): Promise<AppResult<Document>> {
    this.logger.info('Updating document name', { documentId, newName, userId });
    
    try {
      // Get user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.warn('User not found for document update', { userId });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.userNotFound',
          'User not found',
          { userId }
        ));
      }

      // Get document
      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        this.logger.warn('Document not found for name update', { documentId });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.documentNotFound',
          'Document not found',
          { documentId }
        ));
      }

      // Validate access
      const accessValidation = this.documentDomainService.validateDocumentAccess(user, document);
      if (!accessValidation.permissions.canWrite) {
        this.logger.warn('Document write access denied', { documentId, userId });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.writeAccessDenied',
          'Write access denied',
          { documentId, userId }
        ));
      }

      // Update document name
      const updateResult = document.updateName(newName);
      if (updateResult.isErr()) {
        this.logger.error('Failed to update document name', { documentId, error: updateResult.unwrapErr() });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.nameUpdateFailed',
          updateResult.unwrapErr(),
          { documentId, newName }
        ));
      }

      const updatedDocument = updateResult.unwrap();

      // Validate new name
      const nameValidation = this.documentDomainService.validateDocumentName(updatedDocument);
      if (!nameValidation.isValid) {
        this.logger.warn('Invalid new document name', { documentId, issues: nameValidation.issues });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.invalidNewName',
          'Invalid document name',
          { issues: nameValidation.issues }
        ));
      }

      // Save document
      const savedDocument = await this.documentRepository.update(updatedDocument);

      this.logger.info('Document name updated successfully', { documentId, newName, userId });
      return AppResult.Ok(savedDocument);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId, userId });
      return AppResult.Err(new ApplicationError(
        'DocumentApplicationService.updateDocumentName',
        error instanceof Error ? error.message : 'Failed to update document name',
        { documentId, userId }
      ));
    }
  }

  /**
   * Add tags to document
   */
  async addTagsToDocument(
    documentId: string, 
    tags: string[], 
    userId: string
  ): Promise<AppResult<Document>> {
    this.logger.info('Adding tags to document', { documentId, tags, userId });
    
    try {
      // Get user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.warn('User not found for document tag update', { userId });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.userNotFound',
          'User not found',
          { userId }
        ));
      }

      // Get document
      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        this.logger.warn('Document not found for tag update', { documentId });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.documentNotFound',
          'Document not found',
          { documentId }
        ));
      }

      // Validate access
      const accessValidation = this.documentDomainService.validateDocumentAccess(user, document);
      if (!accessValidation.permissions.canWrite) {
        this.logger.warn('Document write access denied for tag update', { documentId, userId });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.writeAccessDenied',
          'Write access denied',
          { documentId, userId }
        ));
      }

      // Add tags
      const updateResult = document.addTags(tags);
      if (updateResult.isErr()) {
        this.logger.error('Failed to add tags to document', { documentId, error: updateResult.unwrapErr() });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.tagUpdateFailed',
          updateResult.unwrapErr(),
          { documentId, tags }
        ));
      }

      const updatedDocument = updateResult.unwrap();

      // Save document
      const savedDocument = await this.documentRepository.update(updatedDocument);

      this.logger.info('Tags added to document successfully', { documentId, tags, userId });
      return AppResult.Ok(savedDocument);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId, userId });
      return AppResult.Err(new ApplicationError(
        'DocumentApplicationService.addTagsToDocument',
        error instanceof Error ? error.message : 'Failed to add tags to document',
        { documentId, userId }
      ));
    }
  }

  /**
   * Remove tags from document
   */
  async removeTagsFromDocument(
    documentId: string, 
    tags: string[], 
    userId: string
  ): Promise<AppResult<Document>> {
    this.logger.info('Removing tags from document', { documentId, tags, userId });
    
    try {
      // Get user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.warn('User not found for document tag removal', { userId });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.userNotFound',
          'User not found',
          { userId }
        ));
      }

      // Get document
      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        this.logger.warn('Document not found for tag removal', { documentId });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.documentNotFound',
          'Document not found',
          { documentId }
        ));
      }

      // Validate access
      const accessValidation = this.documentDomainService.validateDocumentAccess(user, document);
      if (!accessValidation.permissions.canWrite) {
        this.logger.warn('Document write access denied for tag removal', { documentId, userId });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.writeAccessDenied',
          'Write access denied',
          { documentId, userId }
        ));
      }

      // Remove tags
      const updateResult = document.removeTags(tags);
      if (updateResult.isErr()) {
        this.logger.error('Failed to remove tags from document', { documentId, error: updateResult.unwrapErr() });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.tagRemovalFailed',
          updateResult.unwrapErr(),
          { documentId, tags }
        ));
      }

      const updatedDocument = updateResult.unwrap();

      // Save document
      const savedDocument = await this.documentRepository.update(updatedDocument);

      this.logger.info('Tags removed from document successfully', { documentId, tags, userId });
      return AppResult.Ok(savedDocument);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId, userId });
      return AppResult.Err(new ApplicationError(
        'DocumentApplicationService.removeTagsFromDocument',
        error instanceof Error ? error.message : 'Failed to remove tags from document',
        { documentId, userId }
      ));
    }
  }

  /**
   * Update document metadata
   */
  async updateDocumentMetadata(
    documentId: string, 
    metadata: Record<string, string>, 
    userId: string
  ): Promise<AppResult<Document>> {
    this.logger.info('Updating document metadata', { documentId, userId });
    
    try {
      // Get user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.warn('User not found for document metadata update', { userId });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.userNotFound',
          'User not found',
          { userId }
        ));
      }

      // Get document
      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        this.logger.warn('Document not found for metadata update', { documentId });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.documentNotFound',
          'Document not found',
          { documentId }
        ));
      }

      // Validate access
      const accessValidation = this.documentDomainService.validateDocumentAccess(user, document);
      if (!accessValidation.permissions.canWrite) {
        this.logger.warn('Document write access denied for metadata update', { documentId, userId });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.writeAccessDenied',
          'Write access denied',
          { documentId, userId }
        ));
      }

      // Update metadata
      const updateResult = document.updateMetadata(metadata);
      if (updateResult.isErr()) {
        this.logger.error('Failed to update document metadata', { documentId, error: updateResult.unwrapErr() });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.metadataUpdateFailed',
          updateResult.unwrapErr(),
          { documentId }
        ));
      }

      const updatedDocument = updateResult.unwrap();

      // Validate metadata
      const metadataValidation = this.documentDomainService.validateDocumentMetadata(updatedDocument);
      if (!metadataValidation.isValid) {
        this.logger.warn('Document metadata validation issues', { 
          documentId, 
          issues: metadataValidation.issues 
        });
      }

      // Save document
      const savedDocument = await this.documentRepository.update(updatedDocument);

      this.logger.info('Document metadata updated successfully', { documentId, userId });
      return AppResult.Ok(savedDocument);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId, userId });
      return AppResult.Err(new ApplicationError(
        'DocumentApplicationService.updateDocumentMetadata',
        error instanceof Error ? error.message : 'Failed to update document metadata',
        { documentId, userId }
      ));
    }
  }

  /**
   * Delete document with validation
   */
  async deleteDocument(documentId: string, userId: string): Promise<AppResult<void>> {
    this.logger.info('Deleting document', { documentId, userId });
    
    try {
      // Get user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.warn('User not found for document deletion', { userId });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.userNotFound',
          'User not found',
          { userId }
        ));
      }

      // Get document
      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        this.logger.warn('Document not found for deletion', { documentId });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.documentNotFound',
          'Document not found',
          { documentId }
        ));
      }

      // Validate access
      const accessValidation = this.documentDomainService.validateDocumentAccess(user, document);
      if (!accessValidation.permissions.canDelete) {
        this.logger.warn('Document delete access denied', { documentId, userId });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.deleteAccessDenied',
          'Delete access denied',
          { documentId, userId }
        ));
      }

      // Check if file exists and delete it
      const fileExistsResult = await this.fileService.fileExists(document.filePath);
      if (fileExistsResult.isOk() && fileExistsResult.unwrap()) {
        const deleteFileResult = await this.fileService.deleteFile(document.filePath);
        if (deleteFileResult.isErr()) {
          this.logger.error('Error deleting file', { 
            documentId, 
            filePath: document.filePath,
            error: deleteFileResult.unwrapErr().message 
          });
        }
      } else if (fileExistsResult.isErr()) {
        this.logger.error('Error checking file existence', { 
          documentId, 
          filePath: document.filePath,
          error: fileExistsResult.unwrapErr().message 
        });
      }

      // Delete document from repository
      await this.documentRepository.delete(documentId);

      this.logger.info('Document deleted successfully', { documentId, userId });
      return AppResult.Ok(undefined);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId, userId });
      return AppResult.Err(new ApplicationError(
        'DocumentApplicationService.deleteDocument',
        error instanceof Error ? error.message : 'Failed to delete document',
        { documentId, userId }
      ));
    }
  }

  /**
   * Get document by ID
   */
  async getDocumentById(documentId: string): Promise<AppResult<Document>> {
    this.logger.info('Getting document by ID', { documentId });
    
    try {
      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        this.logger.warn('Document not found', { documentId });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.documentNotFound',
          'Document not found',
          { documentId }
        ));
      }

      this.logger.info('Document retrieved successfully', { documentId });
      return AppResult.Ok(document);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId });
      return AppResult.Err(new ApplicationError(
        'DocumentApplicationService.getDocumentById',
        error instanceof Error ? error.message : 'Failed to get document',
        { documentId }
      ));
    }
  }

  /**
   * Get document by name
   */
  async getDocumentByName(name: string): Promise<AppResult<Document>> {
    this.logger.info('Getting document by name', { name });
    
    try {
      const document = await this.documentRepository.findByName(name);
      if (!document) {
        this.logger.warn('Document not found', { name });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.documentNotFound',
          'Document not found',
          { name }
        ));
      }

      this.logger.info('Document retrieved successfully', { name });
      return AppResult.Ok(document);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { name });
      return AppResult.Err(new ApplicationError(
        'DocumentApplicationService.getDocumentByName',
        error instanceof Error ? error.message : 'Failed to get document',
        { name }
      ));
    }
  }

  /**
   * Get all documents
   */
  async getDocuments(
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
    filters?: {
      name?: string;
      mimeType?: string;
      tags?: string[];
      metadata?: Record<string, string>;
      fromDate?: string;
      toDate?: string;
    }
  ): Promise<AppResult<Document[]>> {
    this.logger.info('Getting documents with filters', { 
      page, 
      limit, 
      sortBy, 
      sortOrder, 
      filters 
    });
    
    try {
      // Build query parameters for repository
      const queryParams: any = {
        page,
        limit,
        sortBy,
        sortOrder
      };

      // Apply filters if provided
      if (filters) {
        if (filters.name) {
          queryParams.name = filters.name;
        }
        if (filters.mimeType) {
          queryParams.mimeType = filters.mimeType;
        }
        if (filters.tags && filters.tags.length > 0) {
          queryParams.tags = filters.tags;
        }
        if (filters.metadata && Object.keys(filters.metadata).length > 0) {
          queryParams.metadata = filters.metadata;
        }
        if (filters.fromDate) {
          queryParams.fromDate = new Date(filters.fromDate);
        }
        if (filters.toDate) {
          queryParams.toDate = new Date(filters.toDate);
        }
      }

      // Use repository's find method with enhanced query parameters
      const documents = await this.documentRepository.find(queryParams);
      
      this.logger.info('Documents retrieved successfully', { 
        count: documents.data.length, 
        page, 
        limit,
        filtersApplied: Object.keys(filters || {}).length
      });
      return AppResult.Ok(documents.data);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { page, limit, filters });
      return AppResult.Err(new ApplicationError(
        'DocumentApplicationService.getDocuments',
        error instanceof Error ? error.message : 'Failed to get documents',
        { page, limit, filters }
      ));
    }
  }

  /**
   * Get documents by tags
   */
  async getDocumentsByTags(tags: string[]): Promise<AppResult<Document[]>> {
    this.logger.info('Getting documents by tags', { tags });
    
    try {
      const documents = await this.documentRepository.findByTags(tags);
      
              this.logger.info('Documents retrieved successfully', { tags, count: documents.length });
        return AppResult.Ok(documents);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { tags });
      return AppResult.Err(new ApplicationError(
        'DocumentApplicationService.getDocumentsByTags',
        error instanceof Error ? error.message : 'Failed to get documents by tags',
        { tags }
      ));
    }
  }

  /**
   * Get documents by MIME type
   */
  async getDocumentsByMimeType(mimeType: string): Promise<AppResult<Document[]>> {
    this.logger.info('Getting documents by MIME type', { mimeType });
    
    try {
      const documents = await this.documentRepository.findByMimeType(mimeType);
      
              this.logger.info('Documents retrieved successfully', { mimeType, count: documents.length });
        return AppResult.Ok(documents);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { mimeType });
      return AppResult.Err(new ApplicationError(
        'DocumentApplicationService.getDocumentsByMimeType',
        error instanceof Error ? error.message : 'Failed to get documents by MIME type',
        { mimeType }
      ));
    }
  }

  /**
   * Upload document
   */
  async uploadDocument(file: Buffer, name: string, mimeType: string, userId: string, tags: string[] = [], metadata: Record<string, string> = {}): Promise<AppResult<Document>> {
    this.logger.info('Uploading document', { name, mimeType, userId, tags, metadata });
    
    try {
      // Save file using file service
      const fileInfoResult = await this.fileService.saveFile(file, name, mimeType);
      if (fileInfoResult.isErr()) {
        this.logger.error('Failed to save file via file service', { name, error: fileInfoResult.unwrapErr().message });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.fileSave',
          'Failed to save file',
          { name }
        ));
      }

      const fileInfo = fileInfoResult.unwrap();

      // Create document entity
      const documentResult = Document.create(name, fileInfo.path, mimeType, fileInfo.size, tags, metadata);
      if (documentResult.isErr()) {
        this.logger.error('Failed to create document entity', { name, error: documentResult.unwrapErr() });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.entityCreation',
          documentResult.unwrapErr(),
          { name }
        ));
      }

      const document = documentResult.unwrap();
      
      // Save document to repository
      const savedDocument = await this.documentRepository.save(document);

      this.logger.info('Document uploaded successfully', { documentId: savedDocument.id, name: savedDocument.name.value });
      return AppResult.Ok(savedDocument);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { name });
      return AppResult.Err(new ApplicationError(
        'DocumentApplicationService.uploadDocument',
        error instanceof Error ? error.message : 'Failed to upload document',
        { name }
      ));
    }
  }

  /**
   * Download document
   */
  async downloadDocument(documentId: string, userId: string): Promise<AppResult<{ document: Document; file: Buffer }>> {
    this.logger.info('Downloading document', { documentId, userId });
    
    try {
      // Get document
      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        this.logger.warn('Document not found for download', { documentId });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.documentNotFound',
          'Document not found',
          { documentId }
        ));
      }

      // Get user for access validation
      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.warn('User not found for document download', { userId });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.userNotFound',
          'User not found',
          { userId }
        ));
      }

      // Validate access
      const accessValidation = this.documentDomainService.validateDocumentAccess(user, document);
      if (!accessValidation.canAccess) {
        this.logger.warn('Document access denied for download', { documentId, userId, reason: accessValidation.reason });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.accessDenied',
          'Access denied',
          { documentId, userId, reason: accessValidation.reason }
        ));
      }

      // Get file from storage
      const fileResult = await this.fileService.getFile(document.filePath);
      if (fileResult.isErr()) {
        this.logger.error('Failed to get file from storage', { documentId, error: fileResult.unwrapErr().message });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.fileReadFailed',
          'Failed to read file from storage',
          { documentId, error: fileResult.unwrapErr().message }
        ));
      }

      const file = fileResult.unwrap();
      this.logger.info('Document downloaded successfully', { documentId, userId });
      return AppResult.Ok({ document, file });
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId, userId });
      return AppResult.Err(new ApplicationError(
        'DocumentApplicationService.downloadDocument',
        error instanceof Error ? error.message : 'Failed to download document',
        { documentId, userId }
      ));
    }
  }

  /**
   * Download document by token
   */
  async downloadDocumentByToken(token: string): Promise<AppResult<{ document: Document; file: Buffer }>> {
    this.logger.info('Downloading document by token', { token });
    
    try {
      // Decode token to get document ID
      // This would typically use a JWT service or similar
      const documentId = this.decodeToken(token);
      
      // Get document
      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        this.logger.warn('Document not found for token download', { documentId });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.documentNotFound',
          'Document not found',
          { documentId }
        ));
      }

      // Get file from storage
      const fileResult = await this.fileService.getFile(document.filePath);
      if (fileResult.isErr()) {
        this.logger.error('Failed to get file from storage', { documentId, error: fileResult.unwrapErr().message });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.fileReadFailed',
          'Failed to read file from storage',
          { documentId, error: fileResult.unwrapErr().message }
        ));
      }

      const file = fileResult.unwrap();
      this.logger.info('Document downloaded by token successfully', { documentId });
      return AppResult.Ok({ document, file });
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { token });
      return AppResult.Err(new ApplicationError(
        'DocumentApplicationService.downloadDocumentByToken',
        error instanceof Error ? error.message : 'Failed to download document by token',
        { token }
      ));
    }
  }

  /**
   * Generate download link
   */
  async generateDownloadLink(documentId: string, expiresInMinutes: number = 60): Promise<AppResult<string>> {
    this.logger.info('Generating download link', { documentId, expiresInMinutes });
    
    try {
      // Get document
      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        this.logger.warn('Document not found for link generation', { documentId });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.documentNotFound',
          'Document not found',
          { documentId }
        ));
      }

      // Generate token (this would typically use a JWT service)
      const token = this.generateToken(documentId, expiresInMinutes);

      this.logger.info('Download link generated successfully', { documentId });
      return AppResult.Ok(token);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId });
      return AppResult.Err(new ApplicationError(
        'DocumentApplicationService.generateDownloadLink',
        error instanceof Error ? error.message : 'Failed to generate download link',
        { documentId }
      ));
    }
  }

  /**
   * Replace tags in document
   */
  async replaceTagsInDocument(documentId: string, tags: string[], userId: string): Promise<AppResult<Document>> {
    this.logger.info('Replacing tags in document', { documentId, tags, userId });
    
    try {
      // Get user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.warn('User not found for document tag replacement', { userId });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.userNotFound',
          'User not found',
          { userId }
        ));
      }

      // Get document
      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        this.logger.warn('Document not found for tag replacement', { documentId });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.documentNotFound',
          'Document not found',
          { documentId }
        ));
      }

      // Validate access
      const accessValidation = this.documentDomainService.validateDocumentAccess(user, document);
      if (!accessValidation.permissions.canWrite) {
        this.logger.warn('Document write access denied for tag replacement', { documentId, userId });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.writeAccessDenied',
          'Write access denied',
          { documentId, userId }
        ));
      }

      // Replace tags
      const updateResult = document.replaceTags(tags);
      if (updateResult.isErr()) {
        this.logger.error('Failed to replace tags in document', { documentId, error: updateResult.unwrapErr() });
        return AppResult.Err(new ApplicationError(
          'DocumentApplicationService.tagReplacementFailed',
          updateResult.unwrapErr(),
          { documentId, tags }
        ));
      }

      const updatedDocument = updateResult.unwrap();

      // Save document
      const savedDocument = await this.documentRepository.update(updatedDocument);

      this.logger.info('Tags replaced in document successfully', { documentId, tags, userId });
      return AppResult.Ok(savedDocument);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId, userId });
      return AppResult.Err(new ApplicationError(
        'DocumentApplicationService.replaceTagsInDocument',
        error instanceof Error ? error.message : 'Failed to replace tags in document',
        { documentId, userId }
      ));
    }
  }

  // Helper methods for token handling (these would typically be in a separate service)
  private decodeToken(token: string): string {
    try {
      // Decode JWT token to get document ID
      const payload = jwt.verify(token, process.env.DOWNLOAD_JWT_SECRET!) as any;
      return payload.documentId;
    } catch (error) {
      throw new Error('Invalid or expired download token');
    }
  }

  private generateToken(documentId: string, expiresInMinutes: number): string {
    try {
      const payload = {
        documentId,
        exp: Math.floor(Date.now() / 1000) + (expiresInMinutes * 60) // Convert minutes to seconds
      };
      
      const secret = process.env.DOWNLOAD_JWT_SECRET;
      if (!secret) {
        throw new Error('Download JWT secret not configured');
      }
      
      return jwt.sign(payload, secret);
    } catch (error) {
      throw new Error('Failed to generate download token');
    }
  }
}
