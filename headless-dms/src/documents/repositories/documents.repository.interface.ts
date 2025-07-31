import { CreateDocumentDto, UpdateDocumentDto, DocumentDto } from '../dto/documents.dto';
import { PaginationInput, PaginationOutput } from '../../common/dto/pagination.dto';

export interface DocumentFilterQuery {
  name?: string;
  mimeType?: string;
  from?: string;
  to?: string;
  tags?: string | string[];
  metadata?: Record<string, string>;
}

export interface IDocumentRepository {
  save(data: CreateDocumentDto): Promise<DocumentDto>;
  find(query?: DocumentFilterQuery, pagination?: PaginationInput): Promise<PaginationOutput<DocumentDto>>;
  findOne(query: DocumentFilterQuery): Promise<DocumentDto | null>;
  findById(id: string): Promise<DocumentDto | null>;
  update(id: string, data: UpdateDocumentDto): Promise<DocumentDto | null>;
  delete(id: string): Promise<boolean>;
  exists(query: DocumentFilterQuery): Promise<boolean>;
  count(query?: DocumentFilterQuery): Promise<number>;
} 