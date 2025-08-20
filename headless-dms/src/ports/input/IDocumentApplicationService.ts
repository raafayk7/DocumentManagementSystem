import { Result } from '@carbonteq/fp';
import { Document } from '../../domain/entities/Document.js';
import { ApplicationError } from '../../shared/errors/ApplicationError.js';

export interface IDocumentApplicationService {
  /**
   * Create a new document with validation
   */
  createDocument(
    userId: string,
    name: string,
    filename: string,
    mimeType: string,
    size: string,
    tags?: string[],
    metadata?: Record<string, string>,
    
  ): Promise<Result<Document, ApplicationError>>;

  /**
   * Get document with access validation
   */
  getDocument(documentId: string, userId: string): Promise<Result<Document, ApplicationError>>;

  /**
   * Update document name
   */
  updateDocumentName(
    documentId: string,
    newName: string,
    userId: string
  ): Promise<Result<Document, ApplicationError>>;

  /**
   * Add tags to document
   */
  addTagsToDocument(
    documentId: string,
    tags: string[],
    userId: string
  ): Promise<Result<Document, ApplicationError>>;

  /**
   * Remove tags from document
   */
  removeTagsFromDocument(
    documentId: string,
    tags: string[],
    userId: string
  ): Promise<Result<Document, ApplicationError>>;

  /**
   * Update document metadata
   */
  updateDocumentMetadata(
    documentId: string,
    metadata: Record<string, string>,
    userId: string
  ): Promise<Result<Document, ApplicationError>>;

  /**
   * Delete document
   */
  deleteDocument(documentId: string, userId: string): Promise<Result<void, ApplicationError>>;

  /**
   * Get document by ID
   */
  getDocumentById(documentId: string): Promise<Result<Document, ApplicationError>>;

  /**
   * Get document by name
   */
  getDocumentByName(name: string): Promise<Result<Document, ApplicationError>>;

  /**
   * Get documents with filtering and pagination
   */
  getDocuments(
    page?: number,
    limit?: number,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
    filters?: {
      name?: string;
      mimeType?: string;
      tags?: string[];
      metadata?: Record<string, string>;
      from?: string;
      to?: string;
    }
  ): Promise<Result<Document[], ApplicationError>>;

  /**
   * Get documents by tags
   */
  getDocumentsByTags(tags: string[]): Promise<Result<Document[], ApplicationError>>;

  /**
   * Get documents by MIME type
   */
  getDocumentsByMimeType(mimeType: string): Promise<Result<Document[], ApplicationError>>;

  /**
   * Upload document with file
   */
  uploadDocument(
    file: Buffer,
    name: string,
    mimeType: string,
    userId: string,
    tags?: string[],
    metadata?: Record<string, string>
  ): Promise<Result<Document, ApplicationError>>;

  /**
   * Download document
   */
  downloadDocument(
    documentId: string,
    userId: string
  ): Promise<Result<{ document: Document; file: Buffer }, ApplicationError>>;

  /**
   * Download document by token
   */
  downloadDocumentByToken(token: string): Promise<Result<{ document: Document; file: Buffer }, ApplicationError>>;

  /**
   * Generate download link
   */
  generateDownloadLink(documentId: string, expiresInMinutes?: number): Promise<Result<string, ApplicationError>>;

  /**
   * Replace tags in document
   */
  replaceTagsInDocument(
    documentId: string,
    tags: string[],
    userId: string
  ): Promise<Result<Document, ApplicationError>>;
}
