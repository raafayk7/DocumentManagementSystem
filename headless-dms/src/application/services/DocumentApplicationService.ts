import { injectable, inject } from 'tsyringe';
import { Result } from '@carbonteq/fp';
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
import type { IDocumentRepository } from '../../documents/repositories/documents.repository.interface.js';
import type { IUserRepository } from '../../auth/repositories/user.repository.interface.js';
import type { IFileStorage } from '../../infrastructure/interfaces/IFileStorage.js';
import type { ILogger } from '../../infrastructure/interfaces/ILogger.js';
import { ApplicationError } from '../errors/ApplicationError.js';

@injectable()
export class DocumentApplicationService {
  constructor(
    @inject("IDocumentRepository") private documentRepository: IDocumentRepository,
    @inject("IUserRepository") private userRepository: IUserRepository,
    @inject("IFileStorage") private fileService: IFileStorage,
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
    name: string,
    filename: string,
    mimeType: string,
    size: string,
    tags: string[] = [],
    metadata: Record<string, string> = {},
    userId: string
  ): Promise<Result<Document, ApplicationError>> {
    this.logger.info('Creating new document', { name, filename, userId });
    
    try {
      // Get user for validation
      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.warn('User not found for document creation', { userId });
        return Result.Err(new ApplicationError(
          'DocumentApplicationService.userNotFound',
          'User not found',
          { userId }
        ));
      }

      // Validate user can create documents
      const canCreate = this.userDomainService.canUserPerformAction(user, 'create', 'document');
      if (!canCreate) {
        this.logger.warn('User cannot create documents', { userId });
        return Result.Err(new ApplicationError(
          'DocumentApplicationService.insufficientPermissions',
          'Insufficient permissions to create documents',
          { userId }
        ));
      }

      // Create document entity
      const documentResult = Document.create(name, filename, mimeType, size, tags, metadata);
      if (documentResult.isErr()) {
        this.logger.error('Failed to create document entity', { name, error: documentResult.unwrapErr() });
        return Result.Err(new ApplicationError(
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
        return Result.Err(new ApplicationError(
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
        name: savedDocument.name,
        userId 
      });
      return Result.Ok(savedDocument);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { name, userId });
      return Result.Err(new ApplicationError(
        'DocumentApplicationService.createDocument',
        error instanceof Error ? error.message : 'Failed to create document',
        { name, userId }
      ));
    }
  }

  /**
   * Get document with access validation
   */
  async getDocument(documentId: string, userId: string): Promise<Result<Document, ApplicationError>> {
    this.logger.info('Getting document', { documentId, userId });
    
    try {
      // Get user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.warn('User not found for document access', { userId });
        return Result.Err(new ApplicationError(
          'DocumentApplicationService.userNotFound',
          'User not found',
          { userId }
        ));
      }

      // Get document
      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        this.logger.warn('Document not found', { documentId });
        return Result.Err(new ApplicationError(
          'DocumentApplicationService.documentNotFound',
          'Document not found',
          { documentId }
        ));
      }

      // Validate access
      const accessValidation = this.documentDomainService.validateDocumentAccess(user, document);
      if (!accessValidation.canAccess) {
        this.logger.warn('Document access denied', { documentId, userId, reason: accessValidation.reason });
        return Result.Err(new ApplicationError(
          'DocumentApplicationService.accessDenied',
          'Access denied',
          { documentId, userId, reason: accessValidation.reason }
        ));
      }

      this.logger.info('Document retrieved successfully', { documentId, userId });
      return Result.Ok(document);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId, userId });
      return Result.Err(new ApplicationError(
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
  ): Promise<Result<Document, ApplicationError>> {
    this.logger.info('Updating document name', { documentId, newName, userId });
    
    try {
      // Get user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.warn('User not found for document update', { userId });
        return Result.Err(new ApplicationError(
          'DocumentApplicationService.userNotFound',
          'User not found',
          { userId }
        ));
      }

      // Get document
      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        this.logger.warn('Document not found for name update', { documentId });
        return Result.Err(new ApplicationError(
          'DocumentApplicationService.documentNotFound',
          'Document not found',
          { documentId }
        ));
      }

      // Validate access
      const accessValidation = this.documentDomainService.validateDocumentAccess(user, document);
      if (!accessValidation.permissions.canWrite) {
        this.logger.warn('Document write access denied', { documentId, userId });
        return Result.Err(new ApplicationError(
          'DocumentApplicationService.writeAccessDenied',
          'Write access denied',
          { documentId, userId }
        ));
      }

      // Update document name
      const updateResult = document.updateName(newName);
      if (updateResult.isErr()) {
        this.logger.error('Failed to update document name', { documentId, error: updateResult.unwrapErr() });
        return Result.Err(new ApplicationError(
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
        return Result.Err(new ApplicationError(
          'DocumentApplicationService.invalidNewName',
          'Invalid document name',
          { issues: nameValidation.issues }
        ));
      }

      // Save document
      const savedDocument = await this.documentRepository.save(updatedDocument);

      this.logger.info('Document name updated successfully', { documentId, newName, userId });
      return Result.Ok(savedDocument);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId, userId });
      return Result.Err(new ApplicationError(
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
  ): Promise<Result<Document, ApplicationError>> {
    this.logger.info('Adding tags to document', { documentId, tags, userId });
    
    try {
      // Get user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.warn('User not found for document tag update', { userId });
        return Result.Err(new ApplicationError(
          'DocumentApplicationService.userNotFound',
          'User not found',
          { userId }
        ));
      }

      // Get document
      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        this.logger.warn('Document not found for tag update', { documentId });
        return Result.Err(new ApplicationError(
          'DocumentApplicationService.documentNotFound',
          'Document not found',
          { documentId }
        ));
      }

      // Validate access
      const accessValidation = this.documentDomainService.validateDocumentAccess(user, document);
      if (!accessValidation.permissions.canWrite) {
        this.logger.warn('Document write access denied for tag update', { documentId, userId });
        return Result.Err(new ApplicationError(
          'DocumentApplicationService.writeAccessDenied',
          'Write access denied',
          { documentId, userId }
        ));
      }

      // Add tags
      const updateResult = document.addTags(tags);
      if (updateResult.isErr()) {
        this.logger.error('Failed to add tags to document', { documentId, error: updateResult.unwrapErr() });
        return Result.Err(new ApplicationError(
          'DocumentApplicationService.tagUpdateFailed',
          updateResult.unwrapErr(),
          { documentId, tags }
        ));
      }

      const updatedDocument = updateResult.unwrap();

      // Save document
      const savedDocument = await this.documentRepository.save(updatedDocument);

      this.logger.info('Tags added to document successfully', { documentId, tags, userId });
      return Result.Ok(savedDocument);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId, userId });
      return Result.Err(new ApplicationError(
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
  ): Promise<Result<Document, ApplicationError>> {
    this.logger.info('Removing tags from document', { documentId, tags, userId });
    
    try {
      // Get user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.warn('User not found for document tag removal', { userId });
        return Result.Err(new ApplicationError(
          'DocumentApplicationService.userNotFound',
          'User not found',
          { userId }
        ));
      }

      // Get document
      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        this.logger.warn('Document not found for tag removal', { documentId });
        return Result.Err(new ApplicationError(
          'DocumentApplicationService.documentNotFound',
          'Document not found',
          { documentId }
        ));
      }

      // Validate access
      const accessValidation = this.documentDomainService.validateDocumentAccess(user, document);
      if (!accessValidation.permissions.canWrite) {
        this.logger.warn('Document write access denied for tag removal', { documentId, userId });
        return Result.Err(new ApplicationError(
          'DocumentApplicationService.writeAccessDenied',
          'Write access denied',
          { documentId, userId }
        ));
      }

      // Remove tags
      const updateResult = document.removeTags(tags);
      if (updateResult.isErr()) {
        this.logger.error('Failed to remove tags from document', { documentId, error: updateResult.unwrapErr() });
        return Result.Err(new ApplicationError(
          'DocumentApplicationService.tagRemovalFailed',
          updateResult.unwrapErr(),
          { documentId, tags }
        ));
      }

      const updatedDocument = updateResult.unwrap();

      // Save document
      const savedDocument = await this.documentRepository.save(updatedDocument);

      this.logger.info('Tags removed from document successfully', { documentId, tags, userId });
      return Result.Ok(savedDocument);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId, userId });
      return Result.Err(new ApplicationError(
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
  ): Promise<Result<Document, ApplicationError>> {
    this.logger.info('Updating document metadata', { documentId, userId });
    
    try {
      // Get user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.warn('User not found for document metadata update', { userId });
        return Result.Err(new ApplicationError(
          'DocumentApplicationService.userNotFound',
          'User not found',
          { userId }
        ));
      }

      // Get document
      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        this.logger.warn('Document not found for metadata update', { documentId });
        return Result.Err(new ApplicationError(
          'DocumentApplicationService.documentNotFound',
          'Document not found',
          { documentId }
        ));
      }

      // Validate access
      const accessValidation = this.documentDomainService.validateDocumentAccess(user, document);
      if (!accessValidation.permissions.canWrite) {
        this.logger.warn('Document write access denied for metadata update', { documentId, userId });
        return Result.Err(new ApplicationError(
          'DocumentApplicationService.writeAccessDenied',
          'Write access denied',
          { documentId, userId }
        ));
      }

      // Update metadata
      const updateResult = document.updateMetadata(metadata);
      if (updateResult.isErr()) {
        this.logger.error('Failed to update document metadata', { documentId, error: updateResult.unwrapErr() });
        return Result.Err(new ApplicationError(
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
      const savedDocument = await this.documentRepository.save(updatedDocument);

      this.logger.info('Document metadata updated successfully', { documentId, userId });
      return Result.Ok(savedDocument);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId, userId });
      return Result.Err(new ApplicationError(
        'DocumentApplicationService.updateDocumentMetadata',
        error instanceof Error ? error.message : 'Failed to update document metadata',
        { documentId, userId }
      ));
    }
  }

  /**
   * Delete document with validation
   */
  async deleteDocument(documentId: string, userId: string): Promise<Result<void, ApplicationError>> {
    this.logger.info('Deleting document', { documentId, userId });
    
    try {
      // Get user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.warn('User not found for document deletion', { userId });
        return Result.Err(new ApplicationError(
          'DocumentApplicationService.userNotFound',
          'User not found',
          { userId }
        ));
      }

      // Get document
      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        this.logger.warn('Document not found for deletion', { documentId });
        return Result.Err(new ApplicationError(
          'DocumentApplicationService.documentNotFound',
          'Document not found',
          { documentId }
        ));
      }

      // Validate access
      const accessValidation = this.documentDomainService.validateDocumentAccess(user, document);
      if (!accessValidation.permissions.canDelete) {
        this.logger.warn('Document delete access denied', { documentId, userId });
        return Result.Err(new ApplicationError(
          'DocumentApplicationService.deleteAccessDenied',
          'Delete access denied',
          { documentId, userId }
        ));
      }

      // Check if file exists and delete it
      const fileExists = await this.fileService.fileExists(document.filePath);
      if (fileExists) {
        const deleteFileResult = await this.fileService.deleteFile(document.filePath);
        if (!deleteFileResult) {
          this.logger.warn('Failed to delete file', { documentId, filePath: document.filePath });
        }
      }

      // Delete document from repository
      await this.documentRepository.delete(documentId);

      this.logger.info('Document deleted successfully', { documentId, userId });
      return Result.Ok(undefined);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId, userId });
      return Result.Err(new ApplicationError(
        'DocumentApplicationService.deleteDocument',
        error instanceof Error ? error.message : 'Failed to delete document',
        { documentId, userId }
      ));
    }
  }

  /**
   * Get document importance score
   */
  async getDocumentImportanceScore(documentId: string): Promise<Result<DocumentImportanceScore, ApplicationError>> {
    this.logger.info('Getting document importance score', { documentId });
    
    try {
      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        this.logger.warn('Document not found for importance score', { documentId });
        return Result.Err(new ApplicationError(
          'DocumentApplicationService.documentNotFound',
          'Document not found',
          { documentId }
        ));
      }

      const importanceScore = this.documentDomainService.calculateDocumentImportance(document);
      
      this.logger.info('Document importance score calculated', { documentId, score: importanceScore.score });
      return Result.Ok(importanceScore);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId });
      return Result.Err(new ApplicationError(
        'DocumentApplicationService.getDocumentImportanceScore',
        error instanceof Error ? error.message : 'Failed to get document importance score',
        { documentId }
      ));
    }
  }

  /**
   * Get document retention policy
   */
  async getDocumentRetentionPolicy(documentId: string): Promise<Result<DocumentRetentionPolicy, ApplicationError>> {
    this.logger.info('Getting document retention policy', { documentId });
    
    try {
      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        this.logger.warn('Document not found for retention policy', { documentId });
        return Result.Err(new ApplicationError(
          'DocumentApplicationService.documentNotFound',
          'Document not found',
          { documentId }
        ));
      }

      const retentionPolicy = this.documentDomainService.calculateRetentionPolicy(document);
      
      this.logger.info('Document retention policy calculated', { 
        documentId, 
        shouldRetain: retentionPolicy.shouldRetain,
        retentionPeriod: retentionPolicy.retentionPeriod 
      });
      return Result.Ok(retentionPolicy);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { documentId });
      return Result.Err(new ApplicationError(
        'DocumentApplicationService.getDocumentRetentionPolicy',
        error instanceof Error ? error.message : 'Failed to get document retention policy',
        { documentId }
      ));
    }
  }
}
