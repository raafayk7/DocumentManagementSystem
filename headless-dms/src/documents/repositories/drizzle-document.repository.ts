import { db } from '../../db';
import { documents } from '../../db/schema';
import { IDocumentRepository } from './documents.repository.interface';
import { CreateDocumentDto, UpdateDocumentDto, DocumentDto, DocumentSchema, DocumentsListSchema } from '../dto/documents.dto';
import { v4 as uuidv4 } from 'uuid';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { arrayOverlaps } from 'drizzle-orm';
import fs from 'fs';

export class DrizzleDocumentRepository implements IDocumentRepository {
  async create(data: CreateDocumentDto): Promise<DocumentDto> {
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
    
    return DocumentSchema.parse(newDocuments[0]);
  }

  async findAll(query?: {
    name?: string;
    mimeType?: string;
    from?: string;
    to?: string;
    tags?: string | string[];
    metadata?: Record<string, string>;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: DocumentDto[]; total: number }> {
    const conditions: any[] = [];

    if (query?.name) {
      conditions.push(eq(documents.name, query.name));
    }
    if (query?.mimeType) {
      conditions.push(eq(documents.mimeType, query.mimeType));
    }
    if (query?.from) {
      conditions.push(gte(documents.createdAt, new Date(query.from)));
    }
    if (query?.to) {
      conditions.push(lte(documents.updatedAt, new Date(query.to)));
    }
    if (query?.tags) {
      const tagsArray = Array.isArray(query.tags)
        ? query.tags
        : typeof query.tags === 'string'
          ? query.tags.split(',').map(tag => tag.trim())
          : [];
      if (tagsArray.length > 0) {
        conditions.push(arrayOverlaps(documents.tags, tagsArray));
      }
    }
    if (query?.metadata) {
      let metadataObj = query.metadata;
      if (typeof metadataObj === 'string') {
        try {
          metadataObj = JSON.parse(metadataObj);
        } catch {
          metadataObj = {};
        }
      }
      if (metadataObj && Object.keys(metadataObj).length > 0) {
        conditions.push(
          sql`${documents.metadata} @> ${JSON.stringify(metadataObj)}::jsonb`
        );
      }
    }

    // Get total count
    const countQuery = db.select({ count: sql<number>`count(*)` }).from(documents);
    const totalResult = conditions.length
      ? await countQuery.where(and(...conditions)).execute()
      : await countQuery.execute();
    const total = totalResult[0]?.count || 0;

    // Get paginated results
    const dbQuery = db.select().from(documents);
    const baseQuery = conditions.length
      ? dbQuery.where(and(...conditions))
      : dbQuery;

    // Add pagination
    if (query?.page && query?.pageSize) {
      const offset = (query.page - 1) * query.pageSize;
      const allDocuments = await baseQuery.limit(query.pageSize).offset(offset).execute();
      const items = DocumentsListSchema.parse(allDocuments);
      return { items, total };
    }

    const allDocuments = await baseQuery.execute();
    const items = DocumentsListSchema.parse(allDocuments);

    return { items, total };
  }

  async findById(id: string): Promise<DocumentDto | null> {
    const result = await db.select().from(documents).where(eq(documents.id, id)).execute();
    if (!result || result.length === 0) {
      return null;
    }
    return DocumentSchema.parse(result[0]);
  }

  async update(id: string, data: UpdateDocumentDto): Promise<DocumentDto | null> {
    // Check if document exists
    const existing = await db.select().from(documents).where(eq(documents.id, id)).execute();
    if (!existing || existing.length === 0) {
      return null;
    }

    // Prepare update data
    const updateData = { ...data, updatedAt: new Date() };
    Object.keys(updateData).forEach(
      (key) => (updateData as any)[key] === undefined && delete (updateData as any)[key]
    );

    const updated = await db.update(documents)
      .set(updateData)
      .where(eq(documents.id, id))
      .returning()
      .execute();

    if (!updated || updated.length === 0) {
      return null;
    }
    return DocumentSchema.parse(updated[0]);
  }

  async delete(id: string): Promise<{ deleted: boolean }> {
    // Check if document exists
    const existing = await db.select().from(documents).where(eq(documents.id, id)).execute();
    if (!existing || existing.length === 0) {
      return { deleted: false };
    }

    // Get the file path before deleting from DB
    const filePath = existing[0].filePath;

    // Perform delete in DB
    const deleted = await db.delete(documents)
      .where(eq(documents.id, id))
      .execute();

    if (deleted.rowCount && deleted.rowCount > 0) {
      // Try to delete the file from disk
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          // Optionally log error, but don't block DB delete
          console.error(`Failed to delete file at ${filePath}:`, e);
        }
      }
      return { deleted: true };
    } else {
      return { deleted: false };
    }
  }
} 