import { CreateDocumentDto, UpdateDocumentDto, DocumentDto } from '../dto/documents.dto';

export interface IDocumentRepository {
  create(data: CreateDocumentDto): Promise<DocumentDto>;
  findAll(query?: {
    name?: string;
    mimeType?: string;
    from?: string;
    to?: string;
    tags?: string | string[];
    metadata?: Record<string, string>;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: DocumentDto[]; total: number }>;
  findById(id: string): Promise<DocumentDto | null>;
  update(id: string, data: UpdateDocumentDto): Promise<DocumentDto | null>;
  delete(id: string): Promise<{ deleted: boolean }>;
} 