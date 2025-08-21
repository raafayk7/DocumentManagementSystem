import { injectable } from 'tsyringe';
import { IDocumentRepository } from '../../../ports/output/IDocumentRepository.js';
import { Document } from '../../../domain/entities/Document.js';
import { PaginationInput, PaginationOutput } from '../../../shared/dto/common/pagination.dto.js';
import { DocumentFilterQuery } from '../../../ports/output/IDocumentRepository.js';

@injectable()
export class MockDocumentRepository implements IDocumentRepository {
  private documents: Map<string, Document> = new Map();
  private nextId = 1;

  constructor() {
    // Initialize with some test data
    this.seedMockData();
  }

  async findById(id: string): Promise<Document | null> {
    return this.documents.get(id) || null;
  }

  async findByUserId(userId: string): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(doc => doc.id === userId);
  }

  async find(query: DocumentFilterQuery, pagination: PaginationInput): Promise<PaginationOutput<Document>> {
    let filteredDocuments = Array.from(this.documents.values());

    // Apply filters
    if (query.name) {
      filteredDocuments = filteredDocuments.filter(doc => 
        doc.name.value.toLowerCase().includes(query.name!.toLowerCase())
      );
    }

    if (query.mimeType) {
      filteredDocuments = filteredDocuments.filter(doc => 
        doc.mimeType.value === query.mimeType
      );
    }

    if (query.tags && query.tags.length > 0) {
      filteredDocuments = filteredDocuments.filter(doc => 
        Array.isArray(query.tags) ? query.tags.some(tag => doc.tags.includes(tag)) : doc.tags.includes(query.tags as string)
      );
    }

    // Apply sorting
    if (pagination.sort) {
      filteredDocuments.sort((a, b) => {
        const aValue = this.getSortValue(a, pagination.sort!);
        const bValue = this.getSortValue(b, pagination.sort!);
        
        if (pagination.order === 'desc') {
          return bValue > aValue ? 1 : -1;
        }
        return aValue > bValue ? 1 : -1;
      });
    }

    // Apply pagination
    const total = filteredDocuments.length;
    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit;
    const data = filteredDocuments.slice(start, end);

    return {
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
        hasNext: end < total,
        hasPrev: pagination.page > 1
      }
    };
  }

  async findOne(query: DocumentFilterQuery): Promise<Document | null> {
    const result = await this.find(query, { page: 1, limit: 1, order: 'asc', sort: 'createdAt' });
    return result.data[0] || null;
  }

  async exists(query: DocumentFilterQuery): Promise<boolean> {
    const result = await this.find(query, { page: 1, limit: 1, order: 'asc', sort: 'createdAt' });
    return result.data.length > 0;
  }

  async count(query: DocumentFilterQuery): Promise<number> {
    const result = await this.find(query, { page: 1, limit: Number.MAX_SAFE_INTEGER, order: 'asc', sort: 'createdAt' });
    return result.data.length;
  }

  async save(document: Document): Promise<Document> {
    // if (!document.id) {
    //   document.id = `mock-doc-${this.nextId++}`;
    // }
    this.documents.set(document.id, document);
    return document;
  }

  async update(document: Document): Promise<Document> {
    if (!document.id || !this.documents.has(document.id)) {
      throw new Error('Document not found for update');
    }
    this.documents.set(document.id, document);
    return document;
  }

  async delete(id: string): Promise<boolean> {
    if (!this.documents.has(id)) {
      console.error('Document not found for deletion', id);
      return false;
    }
    this.documents.delete(id);
    return true;
  }

  // Mock-specific methods for testing
  clear(): void {
    this.documents.clear();
    this.nextId = 1;
  }

  getAllDocuments(): Document[] {
    return Array.from(this.documents.values());
  }

  setDocuments(documents: Document[]): void {
    this.clear();
    documents.forEach(doc => this.documents.set(doc.id, doc));
  }

  // Helper method for sorting
  private getSortValue(document: Document, sortField: string): any {
    switch (sortField) {
      case 'name':
        return document.name.value;
      case 'mimeType':
        return document.mimeType.value;
      case 'size':
        return document.size.bytes;
      case 'createdAt':
        return document.createdAt;
      case 'updatedAt':
        return document.updatedAt;
      default:
        return document.id;
    }
  }

  // Seed with some initial test data
  private seedMockData(): void {
    // This will be populated by tests as needed
  }

  async findByTags(tags: string[]): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(doc => doc.tags.some(tag => tags.includes(tag)));
  }

  async findByMimeType(mimeType: string): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(doc => doc.mimeType.value === mimeType);
  }

  async findByName(name: string): Promise<Document | null> {
    return Array.from(this.documents.values()).find(doc => doc.name.value === name) || null;
  }

  async saveWithNameCheck(document: Document): Promise<Document> {
    if (await this.findByName(document.name.value)) {
      throw new Error('Document with this name already exists');
    }
    return this.save(document);
  }

}
