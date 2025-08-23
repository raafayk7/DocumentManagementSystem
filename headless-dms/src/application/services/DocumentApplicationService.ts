import { injectable, inject } from 'tsyringe';
import { AppError, AppResult } from '@carbonteq/hexapp';
import { matchRes } from '@carbonteq/fp';
import { extractProp, extractProps, extractId, toSerialized } from '@carbonteq/hexapp';
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
// import { ApplicationError } from '../../shared/errors/ApplicationError.js';
import type { IDocumentApplicationService } from '../../ports/input/IDocumentApplicationService.js';
import jwt from 'jsonwebtoken';

@injectable()
export class DocumentApplicationService implements IDocumentApplicationService {
  // Hexapp composition utilities
  private readonly extractDocumentInfo = (document: Document) => ({
    id: extractId(document),
    name: document.name.value,
    mimeType: document.mimeType.value,
    size: document.size.bytes
  });
  
  // Helper functions for common operations
  private readonly findDocumentById = async (documentId: string) => {
    const document = await this.documentRepository.findById(documentId);
    if (!document) {
      return AppResult.Err(AppError.NotFound(`Document not found with id: ${documentId}`));
    }
    return AppResult.Ok(document);
  };

  private readonly findUserById = async (userId: string) => {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return AppResult.Err(AppError.NotFound(`User not found with id: ${userId}`));
    }
    return AppResult.Ok(user);
  };

  private readonly validateDocumentAccess = (user: User, document: Document, accessType: 'read' | 'write' | 'delete' = 'read') => {
    const accessValidation = this.documentDomainService.validateDocumentAccess(user, document);
    const hasAccess = accessType === 'read' ? accessValidation.canAccess :
                     accessType === 'write' ? accessValidation.permissions.canWrite :
                     accessValidation.permissions.canDelete;
    
    if (!hasAccess) {
      const reason = accessType === 'read' ? accessValidation.reason : `Insufficient ${accessType} permissions`;
      return AppResult.Err(AppError.Unauthorized(
        `${accessType.charAt(0).toUpperCase() + accessType.slice(1)} access denied for document with id: ${extractId(document)} - ${reason}`
      ));
    }
    return AppResult.Ok(undefined);
  };

  private readonly logDocumentAction = (action: string, documentId: string, userId?: string, additional?: any) => {
    this.logger.info(`Document ${action}`, { documentId, userId, ...additional });
  };

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
    this.logDocumentAction('creation attempt', 'new', userId, { name, filename });
    
    try {
      // Get user for validation using composition helper
      const userResult = await this.findUserById(userId);
      if (userResult.isErr()) {
        return userResult as AppResult<Document>;
      }
      const user = userResult.unwrap();

      // Validate user can create documents
      const canCreate = this.userDomainService.canUserPerformAction(user, 'create', 'document');
      if (!canCreate) {
        this.logger.warn('User cannot create documents', { userId });
        return AppResult.Err(AppError.Unauthorized(
          `User with id: ${userId} does not have sufficient permissions to create documents`
        ));
      }

      // Create document entity
      const documentResult = Document.create(name, filename, mimeType, size, tags, metadata);
      if (documentResult.isErr()) {
        const error = documentResult.unwrapErr();
        this.logger.error('Failed to create document entity', { 
          name, 
          error: error.message || error.toString(),
          errorDetails: error
        });
        // Preserve the original error message instead of wrapping it
        return AppResult.Err(error);
      }

      const document = documentResult.unwrap();

      // Validate document name
      const nameValidation = this.documentDomainService.validateDocumentName(document);
      if (!nameValidation.isValid) {
        this.logger.warn('Invalid document name', { name, issues: nameValidation.issues });
        return AppResult.Err(AppError.Generic(
          `Invalid document name: ${name}`
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

      this.logDocumentAction('created successfully', extractId(savedDocument), userId, 
        this.extractDocumentInfo(savedDocument)
      );
      return AppResult.Ok(savedDocument);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { name, userId });
      return AppResult.Err(AppError.Generic(
        `Failed to create document with name: ${name}`
      ));
    }
  }

  /**
   * Get document with access validation
   */
  async getDocument(documentId: string, userId: string): Promise<AppResult<Document>> {
    this.logDocumentAction('access attempt', documentId, userId);
    
    try {
      // Get user using composition helper
      const userResult = await this.findUserById(userId);
      if (userResult.isErr()) {
        return userResult as AppResult<Document>;
      }
      const user = userResult.unwrap();

      // Get document using composition helper
      const documentResult = await this.findDocumentById(documentId);
      if (documentResult.isErr()) {
        return documentResult;
      }
      const document = documentResult.unwrap();

      // Validate access using composition helper
      const accessResult = this.validateDocumentAccess(user, document, 'read');
      if (accessResult.isErr()) {
        return accessResult as AppResult<Document>;
      }

      this.logDocumentAction('retrieved successfully', documentId, userId);
      return AppResult.Ok(document);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId, userId });
      return AppResult.Err(AppError.Generic(
        `Failed to get document with id: ${documentId}`
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
        return AppResult.Err(AppError.NotFound(
          `User not found with id: ${userId}`
        ));
      }

      // Get document
      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        this.logger.warn('Document not found for name update', { documentId });
        return AppResult.Err(AppError.NotFound(
          `Document not found with id: ${documentId}`
        ));
      }

      // Validate access
      const accessValidation = this.documentDomainService.validateDocumentAccess(user, document);
      if (!accessValidation.permissions.canWrite) {
        this.logger.warn('Document write access denied', { documentId, userId });
        return AppResult.Err(AppError.Unauthorized(
          `Write access denied for document with id: ${documentId}`
        ));
      }

      // Update document name
      const domainUpdateResult = document.updateName(newName);
      if (domainUpdateResult.isErr()) {
        this.logger.error('Failed to update document name', { documentId, error: domainUpdateResult.unwrapErr() });
        return AppResult.Err(AppError.Generic(
          `Failed to update document name with id: ${documentId}`
        ));
      }

      const updatedDocument = domainUpdateResult.unwrap();

      // Validate new name
      const nameValidation = this.documentDomainService.validateDocumentName(updatedDocument);
      if (!nameValidation.isValid) {
        this.logger.warn('Invalid new document name', { documentId, issues: nameValidation.issues });
        return AppResult.Err(AppError.Generic(
          `Invalid new document name: ${newName}`
        ));
      }

      // Save document
      const saveResult = await this.documentRepository.update(updatedDocument);
      
      return matchRes(saveResult, {
        Ok: (savedDocument) => {
          this.logger.info('Document name updated successfully', { documentId, newName, userId });
          return AppResult.Ok(savedDocument);
        },
        Err: (error) => {
          this.logger.error('Failed to save updated document', { documentId, error: error.message });
          return AppResult.Err(AppError.Generic(
            `Failed to save updated document with id: ${documentId}`
          ));
        }
      });
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId, userId });
      return AppResult.Err(AppError.Generic(
        `Failed to update document name with id: ${documentId}`
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
        return AppResult.Err(AppError.NotFound(
          `User not found with id: ${userId}`
        ));
      }

      // Get document
      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        this.logger.warn('Document not found for tag update', { documentId });
        return AppResult.Err(AppError.NotFound(
          `Document not found with id: ${documentId}`
        ));
      }

      // Validate access
      const accessValidation = this.documentDomainService.validateDocumentAccess(user, document);
      if (!accessValidation.permissions.canWrite) {
        this.logger.warn('Document write access denied for tag update', { documentId, userId });
        return AppResult.Err(AppError.Unauthorized(
          `Write access denied for document with id: ${documentId}`
        ));
      }

      // Add tags
      const domainUpdateResult = document.addTags(tags);
      if (domainUpdateResult.isErr()) {
        this.logger.error('Failed to add tags to document', { documentId, error: domainUpdateResult.unwrapErr() });
        return AppResult.Err(AppError.Generic(
          `Failed to add tags to document with id: ${documentId}`
        ));
      }

      const updatedDocument = domainUpdateResult.unwrap();

      // Save document
      const saveResult = await this.documentRepository.update(updatedDocument);
      
      return matchRes(saveResult, {
        Ok: (savedDocument) => {
          this.logger.info('Tags added to document successfully', { documentId, tags, userId });
          return AppResult.Ok(savedDocument);
        },
        Err: (error) => {
          this.logger.error('Failed to save document after adding tags', { documentId, error: error.message });
          return AppResult.Err(AppError.Generic(
            `Failed to save document after adding tags with id: ${documentId}`
          ));
        }
      });
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId, userId });
      return AppResult.Err(AppError.Generic(
        `Failed to add tags to document with id: ${documentId}`
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
        return AppResult.Err(AppError.NotFound(
          `User not found with id: ${userId}`
        ));
      }

      // Get document
      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        this.logger.warn('Document not found for tag removal', { documentId });
        return AppResult.Err(AppError.NotFound(
          `Document not found with id: ${documentId}`
        ));
      }

      // Validate access
      const accessValidation = this.documentDomainService.validateDocumentAccess(user, document);
      if (!accessValidation.permissions.canWrite) {
        this.logger.warn('Document write access denied for tag removal', { documentId, userId });
        return AppResult.Err(AppError.Unauthorized(
          `Write access denied for document with id: ${documentId}`
        ));
      }

      // Remove tags
      const domainUpdateResult = document.removeTags(tags);
      if (domainUpdateResult.isErr()) {
        this.logger.error('Failed to remove tags from document', { documentId, error: domainUpdateResult.unwrapErr() });
        return AppResult.Err(AppError.Generic(
          `Failed to remove tags from document with id: ${documentId}`
        ));
      }

      const updatedDocument = domainUpdateResult.unwrap();

      // Save document
      const saveResult = await this.documentRepository.update(updatedDocument);
      
      return matchRes(saveResult, {
        Ok: (savedDocument) => {
          this.logger.info('Tags removed from document successfully', { documentId, tags, userId });
          return AppResult.Ok(savedDocument);
        },
        Err: (error) => {
          this.logger.error('Failed to save document after removing tags', { documentId, error: error.message });
          return AppResult.Err(AppError.Generic(
            `Failed to save document after removing tags with id: ${documentId}`
          ));
        }
      });
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId, userId });
      return AppResult.Err(AppError.Generic(
        `Failed to remove tags from document with id: ${documentId}`
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
        return AppResult.Err(AppError.NotFound(
          `User not found with id: ${userId}`
        ));
      }

      // Get document
      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        this.logger.warn('Document not found for metadata update', { documentId });
        return AppResult.Err(AppError.NotFound(
          `Document not found with id: ${documentId}`
        ));
      }

      // Validate access
      const accessValidation = this.documentDomainService.validateDocumentAccess(user, document);
      if (!accessValidation.permissions.canWrite) {
        this.logger.warn('Document write access denied for metadata update', { documentId, userId });
        return AppResult.Err(AppError.Unauthorized(
          `Write access denied for document with id: ${documentId}`
        ));
      }

      // Update metadata
      const domainUpdateResult = document.updateMetadata(metadata);
      if (domainUpdateResult.isErr()) {
        this.logger.error('Failed to update document metadata', { documentId, error: domainUpdateResult.unwrapErr() });
        return AppResult.Err(AppError.Generic(
          `Failed to update document metadata with id: ${documentId}`
        ));
      }

      const updatedDocument = domainUpdateResult.unwrap();

      // Validate metadata
      const metadataValidation = this.documentDomainService.validateDocumentMetadata(updatedDocument);
      if (!metadataValidation.isValid) {
        this.logger.warn('Document metadata validation issues', { 
          documentId, 
          issues: metadataValidation.issues 
        });
      }

      // Save document
      const saveResult = await this.documentRepository.update(updatedDocument);
      
      return matchRes(saveResult, {
        Ok: (savedDocument) => {
          this.logger.info('Document metadata updated successfully', { documentId, userId });
          return AppResult.Ok(savedDocument);
        },
        Err: (error) => {
          this.logger.error('Failed to save document after metadata update', { documentId, error: error.message });
          return AppResult.Err(AppError.Generic(
            `Failed to save document after metadata update with id: ${documentId}`
          ));
        }
      });
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId, userId });
      return AppResult.Err(AppError.Generic(
        `Failed to update document metadata with id: ${documentId}`
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
        return AppResult.Err(AppError.NotFound(
          `User not found with id: ${userId}`
        ));
      }

      // Get document
      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        this.logger.warn('Document not found for deletion', { documentId });
        return AppResult.Err(AppError.NotFound(
          `Document not found with id: ${documentId}`
        ));
      }

      // Validate access
      const accessValidation = this.documentDomainService.validateDocumentAccess(user, document);
      if (!accessValidation.permissions.canDelete) {
        this.logger.warn('Document delete access denied', { documentId, userId });
        return AppResult.Err(AppError.Unauthorized(
          `Delete access denied for document with id: ${documentId}`
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
      return AppResult.Err(AppError.Generic(
        `Failed to delete document with id: ${documentId}`
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
        return AppResult.Err(AppError.NotFound(
          `Document not found with id: ${documentId}`
        ));
      }

      this.logger.info('Document retrieved successfully', { documentId });
      return AppResult.Ok(document);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId });
      return AppResult.Err(AppError.Generic(
        `Failed to get document with id: ${documentId}`
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
        return AppResult.Err(AppError.NotFound(
          `Document not found with name: ${name}`
        ));
      }

      this.logger.info('Document retrieved successfully', { name });
      return AppResult.Ok(document);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { name });
      return AppResult.Err(AppError.Generic(
        `Failed to get document with name: ${name}`
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
      return AppResult.Err(AppError.Generic(
        `Failed to get documents with page: ${page}, limit: ${limit}, filters: ${JSON.stringify(filters)}`
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
      return AppResult.Err(AppError.Generic(
        `Failed to get documents by tags: ${tags}`
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
      return AppResult.Err(AppError.Generic(
        `Failed to get documents by MIME type: ${mimeType}`
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
        return AppResult.Err(AppError.Generic(
          `Failed to save file: ${name}`
        ));
      }

      const fileInfo = fileInfoResult.unwrap();

      // Create document entity
      const documentResult = Document.create(name, fileInfo.path, mimeType, fileInfo.size, tags, metadata);
      if (documentResult.isErr()) {
        const error = documentResult.unwrapErr();
        this.logger.error('Failed to create document entity', { 
          name, 
          error: error.message || error.toString(),
          errorDetails: error
        });
        // Preserve the original error message instead of wrapping it
        return AppResult.Err(error);
      }

      const document = documentResult.unwrap();
      
      // Save document to repository
      const savedDocument = await this.documentRepository.save(document);

      this.logger.info('Document uploaded successfully', { documentId: savedDocument.id, name: savedDocument.name.value });
      return AppResult.Ok(savedDocument);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { name });
      return AppResult.Err(AppError.Generic(
        `Failed to upload document: ${name}`
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
        return AppResult.Err(AppError.NotFound(
          `Document not found with id: ${documentId}`
        ));
      }

      // Get user for access validation
      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.warn('User not found for document download', { userId });
        return AppResult.Err(AppError.NotFound(
          `User not found with id: ${userId}`
        ));
      }

      // Validate access
      const accessValidation = this.documentDomainService.validateDocumentAccess(user, document);
      if (!accessValidation.canAccess) {
        this.logger.warn('Document access denied for download', { documentId, userId, reason: accessValidation.reason });
        return AppResult.Err(AppError.Unauthorized(
          `Access denied for document with id: ${documentId} and user with id: ${userId}`
        ));
      }

      // Get file from storage
      const fileResult = await this.fileService.getFile(document.filePath);
      if (fileResult.isErr()) {
        this.logger.error('Failed to get file from storage', { documentId, error: fileResult.unwrapErr().message });
        return AppResult.Err(AppError.Generic(
          `Failed to read file from storage: ${documentId}`
        ));
      }

      const file = fileResult.unwrap();
      this.logger.info('Document downloaded successfully', { documentId, userId });
      return AppResult.Ok({ document, file });
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId, userId });
      return AppResult.Err(AppError.Generic(
        `Failed to download document: ${documentId}`
      ));
    }
  }

  /**
   * Download document by token
   */
  async downloadDocumentByToken(token: string): Promise<AppResult<{ document: Document; file: Buffer }>> {
    this.logger.info('Downloading document by token', { token: token.substring(0, 20) + '...' });
    
    try {
      // Decode token to get document ID
      const documentId = this.decodeToken(token);
      
      // Get document
      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        this.logger.warn('Document not found for token download', { documentId });
        return AppResult.Err(AppError.NotFound(
          `Document not found with id: ${documentId}`
        ));
      }

      // Get file from storage
      const fileResult = await this.fileService.getFile(document.filePath);
      if (fileResult.isErr()) {
        const error = fileResult.unwrapErr();
        this.logger.error('Failed to get file from storage', { documentId, error: error.message || error.toString() });
        // Preserve the original error message instead of wrapping it
        return AppResult.Err(error);
      }

      const file = fileResult.unwrap();
      this.logger.info('Document downloaded by token successfully', { documentId, fileSize: file.length });
      return AppResult.Ok({ document, file });
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { token: token.substring(0, 20) + '...' });
      // Preserve the original error message instead of wrapping it
      return AppResult.Err(error instanceof Error ? error : new Error('Unknown error'));
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
        return AppResult.Err(AppError.NotFound(
          `Document not found with id: ${documentId}`
        ));
      }

      // Generate token (this would typically use a JWT service)
      const token = this.generateToken(documentId, expiresInMinutes);

      this.logger.info('Download link generated successfully', { documentId, expiresInMinutes });
      return AppResult.Ok(token);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId, expiresInMinutes });
      // Preserve the original error message instead of wrapping it
      return AppResult.Err(error instanceof Error ? error : new Error('Unknown error'));
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
        return AppResult.Err(AppError.NotFound(
          `User not found with id: ${userId}`
        ));
      }

      // Get document
      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        this.logger.warn('Document not found for tag replacement', { documentId });
        return AppResult.Err(AppError.NotFound(
          `Document not found with id: ${documentId}`
        ));
      }

      // Validate access
      const accessValidation = this.documentDomainService.validateDocumentAccess(user, document);
      if (!accessValidation.permissions.canWrite) {
        this.logger.warn('Document write access denied for tag replacement', { documentId, userId });
        return AppResult.Err(AppError.Unauthorized(
          `Write access denied for document with id: ${documentId}`
        ));
      }

      // Replace tags
      const domainUpdateResult = document.replaceTags(tags);
      if (domainUpdateResult.isErr()) {
        this.logger.error('Failed to replace tags in document', { documentId, error: domainUpdateResult.unwrapErr() });
        return AppResult.Err(AppError.Generic(
          `Failed to replace tags in document with id: ${documentId}`
        ));
      }

      const updatedDocument = domainUpdateResult.unwrap();

      // Save document
      const saveResult = await this.documentRepository.update(updatedDocument);
      
      return matchRes(saveResult, {
        Ok: (savedDocument) => {
          this.logger.info('Tags replaced in document successfully', { documentId, tags, userId });
          return AppResult.Ok(savedDocument);
        },
        Err: (error) => {
          this.logger.error('Failed to save document after replacing tags', { documentId, error: error.message });
          return AppResult.Err(AppError.Generic(
            `Failed to save document after replacing tags with id: ${documentId}`
          ));
        }
      });
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId, userId });
      return AppResult.Err(AppError.Generic(
        `Failed to replace tags in document with id: ${documentId}`
      ));
    }
  }

  // Helper methods for token handling (these would typically be in a separate service)
  private decodeToken(token: string): string {
    try {
      const secret = process.env.DOWNLOAD_JWT_SECRET;
      if (!secret) {
        throw new Error('Download JWT secret not configured');
      }
      
      // Decode JWT token to get document ID
      const payload = jwt.verify(token, secret) as any;
      
      if (!payload.documentId) {
        throw new Error('Invalid token payload - missing document ID');
      }
      
      return payload.documentId;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid download token');
      } else if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Download token has expired');
      } else if (error instanceof jwt.NotBeforeError) {
        throw new Error('Download token not yet valid');
      } else {
        throw new Error('Invalid or expired download token');
      }
    }
  }

  private generateToken(documentId: string, expiresInMinutes: number): string {
    try {
      const secret = process.env.DOWNLOAD_JWT_SECRET;
      if (!secret) {
        throw new Error('Download JWT secret not configured');
      }
      
      const payload = {
        documentId,
        exp: Math.floor(Date.now() / 1000) + (expiresInMinutes * 60) // Convert minutes to seconds
      };
      
      return jwt.sign(payload, secret);
    } catch (error) {
      if (error instanceof Error) {
        throw error; // Re-throw the error with its original message
      } else {
        throw new Error('Failed to generate download token');
      }
    }
  }
}
