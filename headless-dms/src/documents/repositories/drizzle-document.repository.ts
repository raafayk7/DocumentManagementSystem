import { db } from '../../db/index.js';
import { documents } from '../../db/schema.js';
import { IDocumentRepository, DocumentFilterQuery } from './documents.repository.interface.js';
import { CreateDocumentDto, UpdateDocumentDto, DocumentDto, DocumentSchema, DocumentsListSchema } from '../dto/documents.dto.js';
import { v4 as uuidv4 } from 'uuid';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { arrayOverlaps } from 'drizzle-orm';
import fs from 'fs';
import { injectable } from 'tsyringe';
import { PaginationInput, PaginationOutput, calculatePaginationMetadata } from '../../common/dto/pagination.dto.js';
import { Document } from '../../domain/entities/Document.js';

@injectable()
export class DrizzleDocumentRepository implements IDocumentRepository {
  async save(data: CreateDocumentDto): Promise<Document> {
    const existing = await db.select().from(documents).where(eq(documents.name, data.name)).execute();
    if (existing.length > 0) {
      const err = new Error('Document already exists');
      (err as any).statusCode = 409;
      throw err;
    }
    const newDocuments = await db.insert(documents).values({
      id: uuidv4(),
      name: data.name,
      filePath: data.filePath,
      mimeType: data.mimeType,
      size: data.size,
      tags: data.tags ?? [],
      metadata: data.metadata ?? {},
    })
    .returning()
    .execute();
    if (newDocuments.length === 0) {
      throw new Error('Failed to create document');
    }
    const documentData = newDocuments[0];
    return Document.fromRepository({
      ...documentData,
      tags: documentData.tags as string[],
      metadata: documentData.metadata as Record<string, string>,
    });
  }

  async find(query?: DocumentFilterQuery, pagination?: PaginationInput): Promise<PaginationOutput<Document>> {
    const conditions = [];
    
    if (query?.name) {
      conditions.push(sql`${documents.name} ILIKE ${`%${query.name}%`}`);
    }
    if (query?.mimeType) {
      conditions.push(eq(documents.mimeType, query.mimeType));
    }
    if (query?.from) {
      conditions.push(gte(documents.createdAt, new Date(query.from)));
    }
    if (query?.to) {
      conditions.push(lte(documents.createdAt, new Date(query.to)));
    }
    if (query?.tags && query.tags.length > 0) {
      const tagsArray = Array.isArray(query.tags) ? query.tags : [query.tags];
      conditions.push(arrayOverlaps(documents.tags, tagsArray));
    }
    if (query?.metadata && Object.keys(query.metadata).length > 0) {
      // For metadata, we'll do a simple contains check
      for (const [key, value] of Object.entries(query.metadata)) {
        conditions.push(sql`${documents.metadata}->>${key} = ${value}`);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(whereClause)
      .execute();
    const total = countResult[0]?.count || 0;

    // Apply pagination
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const offset = (page - 1) * limit;

    // Get paginated results
    const results = await db.select({
      id: documents.id,
      name: documents.name,
      filePath: documents.filePath,
      mimeType: documents.mimeType,
      size: documents.size,
      tags: documents.tags,
      metadata: documents.metadata,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
      .from(documents)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(documents.createdAt)
      .execute();

    const documentsList = DocumentsListSchema.parse(results);
    const paginationMetadata = calculatePaginationMetadata(page, limit, total);

    return {
      data: results.map(document => Document.fromRepository({
        ...document,
        tags: document.tags as string[],
        metadata: document.metadata as Record<string, string>,
      })),
      pagination: paginationMetadata
    };
  }

  async findOne(query: DocumentFilterQuery): Promise<Document | null> {
    const conditions = [];
    
    if (query?.name) {
      conditions.push(sql`${documents.name} ILIKE ${`%${query.name}%`}`);
    }
    if (query?.mimeType) {
      conditions.push(eq(documents.mimeType, query.mimeType));
    }
    if (query?.from) {
      conditions.push(gte(documents.createdAt, new Date(query.from)));
    }
    if (query?.to) {
      conditions.push(lte(documents.createdAt, new Date(query.to)));
    }
    if (query?.tags && query.tags.length > 0) {
      const tagsArray = Array.isArray(query.tags) ? query.tags : [query.tags];
      conditions.push(arrayOverlaps(documents.tags, tagsArray));
    }
    if (query?.metadata && Object.keys(query.metadata).length > 0) {
      for (const [key, value] of Object.entries(query.metadata)) {
        conditions.push(sql`${documents.metadata}->>${key} = ${value}`);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const results = await db.select()
      .from(documents)
      .where(whereClause)
      .limit(1)
      .execute();

    if (results.length === 0) {
      return null;
    }

    return Document.fromRepository({
      ...results[0],
      tags: results[0].tags as string[],
      metadata: results[0].metadata as Record<string, string>,
    });
  }

  async findById(id: string): Promise<Document | null> {
    const results = await db.select()
      .from(documents)
      .where(eq(documents.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    return Document.fromRepository({
      ...results[0],
      tags: results[0].tags as string[],
      metadata: results[0].metadata as Record<string, string>,
    });
  }

  async update(id: string, data: UpdateDocumentDto): Promise<Document | null> {
    const updateData: any = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;
    updateData.updatedAt = new Date();

    const results = await db.update(documents)
      .set(updateData)
      .where(eq(documents.id, id))
      .returning()
      .execute();

    if (results.length === 0) {
      return null;
    }

    return Document.fromRepository({
      ...results[0],
      tags: results[0].tags as string[],
      metadata: results[0].metadata as Record<string, string>,
    });
  }

  async delete(id: string): Promise<boolean> {
    const results = await db.delete(documents)
      .where(eq(documents.id, id))
      .returning()
      .execute();

    return results.length > 0;
  }

  async exists(query: DocumentFilterQuery): Promise<boolean> {
    const conditions = [];
    
    if (query?.name) {
      conditions.push(sql`${documents.name} ILIKE ${`%${query.name}%`}`);
    }
    if (query?.mimeType) {
      conditions.push(eq(documents.mimeType, query.mimeType));
    }
    if (query?.from) {
      conditions.push(gte(documents.createdAt, new Date(query.from)));
    }
    if (query?.to) {
      conditions.push(lte(documents.createdAt, new Date(query.to)));
    }
    if (query?.tags && query.tags.length > 0) {
      const tagsArray = Array.isArray(query.tags) ? query.tags : [query.tags];
      conditions.push(arrayOverlaps(documents.tags, tagsArray));
    }
    if (query?.metadata && Object.keys(query.metadata).length > 0) {
      for (const [key, value] of Object.entries(query.metadata)) {
        conditions.push(sql`${documents.metadata}->>${key} = ${value}`);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const results = await db.select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(whereClause)
      .execute();

    return (results[0]?.count || 0) > 0;
  }

  async count(query?: DocumentFilterQuery): Promise<number> {
    const conditions = [];
    
    if (query?.name) {
      conditions.push(sql`${documents.name} ILIKE ${`%${query.name}%`}`);
    }
    if (query?.mimeType) {
      conditions.push(eq(documents.mimeType, query.mimeType));
    }
    if (query?.from) {
      conditions.push(gte(documents.createdAt, new Date(query.from)));
    }
    if (query?.to) {
      conditions.push(lte(documents.createdAt, new Date(query.to)));
    }
    if (query?.tags && query.tags.length > 0) {
      const tagsArray = Array.isArray(query.tags) ? query.tags : [query.tags];
      conditions.push(arrayOverlaps(documents.tags, tagsArray));
    }
    if (query?.metadata && Object.keys(query.metadata).length > 0) {
      for (const [key, value] of Object.entries(query.metadata)) {
        conditions.push(sql`${documents.metadata}->>${key} = ${value}`);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const results = await db.select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(whereClause)
      .execute();

    return results[0]?.count || 0;
  }
} 