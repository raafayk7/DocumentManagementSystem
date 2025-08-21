import { Document } from '../../domain/entities/Document.js';
import { PaginationOutput, PaginationInput } from '../../shared/dto/common/pagination.dto.js';
import { BaseRepository, RepositoryResult, Paginated, PaginationOptions } from '@carbonteq/hexapp';

export interface DocumentFilterQuery {
  name?: string;
  mimeType?: string;
  from?: string;
  to?: string;
  tags?: string | string[];
  metadata?: Record<string, string>;
}

export interface IDocumentRepository extends BaseRepository<Document> {
  // Required abstract methods from BaseRepository (implemented by concrete classes)
  insert(document: Document): Promise<RepositoryResult<Document, any>>;
  update(document: Document): Promise<RepositoryResult<Document, any>>;

  // Existing custom methods (preserved for backward compatibility)
  findById(id: string): Promise<Document | null>;
  save(document: Document): Promise<Document>;
  saveWithNameCheck(document: Document): Promise<Document>;
  delete(id: string): Promise<boolean>;
  find(query?: DocumentFilterQuery, pagination?: PaginationInput): Promise<PaginationOutput<Document>>;
  findOne(query: DocumentFilterQuery): Promise<Document | null>;
  findByName(name: string): Promise<Document | null>;
  findByTags(tags: string[]): Promise<Document[]>;
  findByMimeType(mimeType: string): Promise<Document[]>;
  exists(query: DocumentFilterQuery): Promise<boolean>;
  count(query?: DocumentFilterQuery): Promise<number>;

  // New hexapp standardized methods (optional implementations)
  fetchAll?(): Promise<RepositoryResult<Document[]>>;
  fetchPaginated?(options: PaginationOptions): Promise<RepositoryResult<Paginated<Document>>>;
  fetchById?(id: string): Promise<RepositoryResult<Document, any>>;
  deleteById?(id: string): Promise<RepositoryResult<Document, any>>;
  fetchBy?<U extends keyof Document>(prop: U, val: Document[U]): Promise<RepositoryResult<Document, any>>;
  existsBy?<U extends keyof Document>(prop: U, val: Document[U]): Promise<RepositoryResult<boolean>>;
  deleteBy?<U extends keyof Document>(prop: U, val: Document[U]): Promise<RepositoryResult<Document, any>>;
} 