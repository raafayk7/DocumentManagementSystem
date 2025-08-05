import { PaginationInput, PaginationOutput } from '../../common/dto/pagination.dto.js';
import { Document } from '../../domain/entities/Document.js';

export interface DocumentFilterQuery {
  name?: string;
  mimeType?: string;
  from?: string;
  to?: string;
  tags?: string | string[];
  metadata?: Record<string, string>;
}

export interface IDocumentRepository {
  // Save a document entity
  save(document: Document): Promise<Document>;
  
  // Atomic save with name uniqueness check (thread-safe)
  saveWithNameCheck(document: Document): Promise<Document>;
  
  // Find documents with pagination
  find(query?: DocumentFilterQuery, pagination?: PaginationInput): Promise<PaginationOutput<Document>>;
  
  // Find one document
  findOne(query: DocumentFilterQuery): Promise<Document | null>;
  
  // Find document by ID
  findById(id: string): Promise<Document | null>;
  
  // Find document by name
  findByName(name: string): Promise<Document | null>;
  
  // Find documents by tags
  findByTags(tags: string[]): Promise<Document[]>;
  
  // Find documents by MIME type
  findByMimeType(mimeType: string): Promise<Document[]>;
  
  // Update document entity
  update(document: Document): Promise<Document>;
  
  // Delete document
  delete(id: string): Promise<boolean>;
  
  // Check if document exists
  exists(query: DocumentFilterQuery): Promise<boolean>;
  
  // Count documents
  count(query?: DocumentFilterQuery): Promise<number>;
} 