import { AppResult } from '@carbonteq/hexapp';
import { Document } from '../../domain/entities/Document.js';
import { ApplicationError } from '../../shared/errors/ApplicationError.js';

export interface IDocumentApplicationService {
  /**
   * Create a new document with validation
   */
  createDocument(
    name: string,
    filename: string,
    mimeType: string,
    size: string,
    userId: string,
    tags?: string[],
    metadata?: Record<string, string>
  ): Promise<AppResult<Document>>;

  /**
   * Get document with access validation
   */
  getDocument(documentId: string, userId: string): Promise<AppResult<Document>>;

  /**
   * Update document name
   */
  updateDocumentName(
    documentId: string,
    newName: string,
    userId: string
  ): Promise<AppResult<Document>>;

  /**
   * Add tags to document
   */
  addTagsToDocument(
    documentId: string,
    tags: string[],
    userId: string
  ): Promise<AppResult<Document>>;

  /**
   * Remove tags from document
   */
  removeTagsFromDocument(
    documentId: string,
    tags: string[],
    userId: string
  ): Promise<AppResult<Document>>;

  /**
   * Update document metadata
   */
  updateDocumentMetadata(
    documentId: string,
    metadata: Record<string, string>,
    userId: string
  ): Promise<AppResult<Document>>;

  /**
   * Delete document
   */
  deleteDocument(documentId: string, userId: string): Promise<AppResult<void>>;

  /**
   * Get document by ID
   */
  getDocumentById(documentId: string): Promise<AppResult<Document>>;

  /**
   * Get document by name
   */
  getDocumentByName(name: string): Promise<AppResult<Document>>;

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
  ): Promise<AppResult<Document[]>>;

  /**
   * Get documents by tags
   */
  getDocumentsByTags(tags: string[]): Promise<AppResult<Document[]>>;

  /**
   * Get documents by MIME type
   */
  getDocumentsByMimeType(mimeType: string): Promise<AppResult<Document[]>>;

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
  ): Promise<AppResult<Document>>;

  /**
   * Download document
   */
  downloadDocument(
    documentId: string,
    userId: string
  ): Promise<AppResult<{ document: Document; file: Buffer }>>;

  /**
   * Download document by token
   */
  downloadDocumentByToken(token: string): Promise<AppResult<{ document: Document; file: Buffer }>>;

  /**
   * Generate download link
   */
  generateDownloadLink(documentId: string, expiresInMinutes?: number): Promise<AppResult<string>>;

  /**
   * Replace tags in document
   */
  replaceTagsInDocument(
    documentId: string,
    tags: string[],
    userId: string
  ): Promise<AppResult<Document>>;
}
