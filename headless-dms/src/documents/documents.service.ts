import { IDocumentRepository } from './repositories/documents.repository.interface';
import { CreateDocumentDto, UpdateDocumentDto, DocumentDto } from './dto/documents.dto';
import { FastifyRequest, FastifyReply } from 'fastify';
import { createReadStream } from 'fs';
import { join } from 'path';
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
dotenv.config();

export class DocumentService {
  constructor(private documentRepository: IDocumentRepository) {}

  async createDocument(data: CreateDocumentDto): Promise<DocumentDto> {
    return this.documentRepository.create(data);
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
    return this.documentRepository.findAll(query);
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
    if (!result.deleted) {
      const err = new Error(`Document with id ${id} not found`);
      (err as any).statusCode = 404;
      throw err;
    }
    return result;
  }

  async uploadDocument(request: FastifyRequest): Promise<DocumentDto> {
    const parts = request.parts();
    // Prepare to collect fields and file
    let file: any = null;
    const fields: any = {};

    for await (const part of parts) {
      if (part.type === 'file') {
        // Handle file
        const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(part.filename)}`;
        const uploadPath = path.join('uploads', uniqueName);
        await fs.promises.mkdir('uploads', { recursive: true });
        const writeStream = fs.createWriteStream(uploadPath);
        await part.file.pipe(writeStream);
        file = {
          path: uploadPath,
          filename: part.filename,
          mimetype: part.mimetype,
          size: 0, // We'll get the size after writing
        };
        await new Promise<void>((resolve) => writeStream.on('finish', resolve));
        file.size = fs.statSync(uploadPath).size.toString();
      } else {
        // Handle fields (all are strings)
        fields[part.fieldname] = part.value;
      }
    }

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

    // Save file info and metadata to DB using repository
    const doc = await this.documentRepository.create({
      name: fields.name,
      filePath: file.path,
      mimeType: fields.mimeType || file.mimetype,
      size: fields.size || file.size,
      tags, // always an array
      metadata: fields.metadata || {}
    });

    return doc;
  }

  async downloadDocument(id: string, reply: FastifyReply): Promise<void> {
    const doc = await this.findOneDocument(id);
    const filePath = doc.filePath;
    const fileName = doc.name;

    // Set headers
    reply.header('Content-Type', doc.mimeType);
    reply.header('Content-Disposition', `attachment; filename="${fileName}"`);

    // Stream the file
    const stream = createReadStream(join(process.cwd(), filePath));
    return reply.send(stream);
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