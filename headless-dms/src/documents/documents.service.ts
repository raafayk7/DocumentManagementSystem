import { IDocumentRepository } from './repositories/documents.repository.interface';
import { CreateDocumentDto, UpdateDocumentDto, DocumentDto } from './dto/documents.dto';
import { FastifyRequest, FastifyReply } from 'fastify';
import { IFileService } from '../common/services/file.service.interface';
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
dotenv.config();

export class DocumentService {
  constructor(
    private documentRepository: IDocumentRepository,
    private fileService: IFileService
  ) {}

  async createDocument(data: CreateDocumentDto): Promise<DocumentDto> {
    return this.documentRepository.save(data);
  }

  async findAllDocuments(query?: {
    name?: string;
    mimeType?: string;
    from?: string;
    to?: string;
    tags?: string | string[];
    metadata?: Record<string, string>;
    page?: number;
    pageSize?: number;
  }) {
    return this.documentRepository.find(query);
  }

  async findOneDocument(id: string): Promise<DocumentDto> {
    const document = await this.documentRepository.findById(id);
    if (!document) {
      const err = new Error(`Document with id ${id} not found`);
      (err as any).statusCode = 404;
      throw err;
    }
    return document;
  }

  async updateDocument(id: string, data: UpdateDocumentDto): Promise<DocumentDto> {
    const updated = await this.documentRepository.update(id, data);
    if (!updated) {
      const err = new Error(`Document with id ${id} not found`);
      (err as any).statusCode = 404;
      throw err;
    }
    return updated;
  }

  async removeDocument(id: string): Promise<{ deleted: boolean }> {
    const result = await this.documentRepository.delete(id);
    if (!result) {
      const err = new Error(`Document with id ${id} not found`);
      (err as any).statusCode = 404;
      throw err;
    }
    return { deleted: true };
  }

  async uploadDocument(request: FastifyRequest): Promise<DocumentDto> {
    // Use file service to handle file upload and get form fields
    const fileInfo = await this.fileService.saveFile(request);
    const fields = fileInfo.fields;

    // Parse tags and metadata if present
    let tags: string[] = [];
    if (fields.tags) {
      try {
        const parsed = JSON.parse(fields.tags);
        if (Array.isArray(parsed)) {
          tags = parsed.map(String);
        } else if (typeof parsed === 'string') {
          tags = [parsed];
        } else {
          tags = [];
        }
      } catch {
        // fallback: comma-separated string
        tags = fields.tags.split(',').map((t: string) => t.trim());
      }
    }
    
    let metadata: Record<string, string> = {};
    if (fields.metadata) {
      try {
        metadata = JSON.parse(fields.metadata);
      } catch {
        metadata = {};
      }
    }

    // Save file info and metadata to DB
    const doc = await this.createDocument({
      name: fields.name || fileInfo.name,
      filePath: fileInfo.path,
      mimeType: fields.mimeType || fileInfo.mimeType,
      size: fields.size || fileInfo.size,
      tags, // always an array
      metadata: metadata
    });

    return doc;
  }

  async downloadDocument(id: string, reply: FastifyReply): Promise<void> {
    const doc = await this.findOneDocument(id);
    await this.fileService.streamFile(doc.filePath, reply);
  }

  async generateDownloadLink(id: string): Promise<string> {
    // Check if document exists
    await this.findOneDocument(id);

    const token = jwt.sign(
      { documentId: id },
      process.env.DOWNLOAD_JWT_SECRET!,
      { expiresIn: '5m' }
    );
    
    const url = `/documents/download-link?token=${encodeURIComponent(token)}`;
    return url;
  }

  async downloadDocumentByToken(token: string, reply: FastifyReply): Promise<void> {
    const payload = jwt.verify(token, process.env.DOWNLOAD_JWT_SECRET!) as { documentId: string };
    await this.downloadDocument(payload.documentId, reply);
  }
} 