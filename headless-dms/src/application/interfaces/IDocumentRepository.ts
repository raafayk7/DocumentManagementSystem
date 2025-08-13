import { Document } from '../../domain/entities/Document.js';
import { PaginationOutput, PaginationInput } from '../dto/common/pagination.dto.js';

export interface DocumentFilterQuery {
  name?: string;
  mimeType?: string;
  from?: string;
  to?: string;
  tags?: string | string[];
  metadata?: Record<string, string>;
}

export interface IDocumentRepository {
  findById(id: string): Promise<Document | null>;
  save(document: Document): Promise<Document>;
  saveWithNameCheck(document: Document): Promise<Document>;
  delete(id: string): Promise<boolean>;
  find(query?: DocumentFilterQuery, pagination?: PaginationInput): Promise<PaginationOutput<Document>>;
  findOne(query: DocumentFilterQuery): Promise<Document | null>;
  findByName(name: string): Promise<Document | null>;
  findByTags(tags: string[]): Promise<Document[]>;
  findByMimeType(mimeType: string): Promise<Document[]>;
  update(document: Document): Promise<Document>;
  exists(query: DocumentFilterQuery): Promise<boolean>;
  count(query?: DocumentFilterQuery): Promise<number>;
} 