import { db } from '../db';
import { documents } from '../db/schema';
import { CreateDocumentDto, DocumentDto, DocumentSchema, DocumentsListSchema, UpdateDocumentSchema, UpdateDocumentDto } from './dto/documents.dto';
import { v4 as uuidv4 } from 'uuid';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { arrayOverlaps } from 'drizzle-orm'; // If using Drizzle's arrayOverlaps
import fs from 'fs';
import path from 'path';

export async function createDocument(createDocumentDto: CreateDocumentDto): Promise<DocumentDto> {
  const newDocuments = await db.insert(documents).values({
    id: uuidv4(),
    name: createDocumentDto.name,
    filePath: createDocumentDto.filePath,
    mimeType: createDocumentDto.mimeType,
    size: createDocumentDto.size,
    tags: createDocumentDto.tags ?? [],
    metadata: createDocumentDto.metadata ?? {},
  })
  .returning()
  .execute();

  if (newDocuments.length === 0) {
    throw new Error('Failed to create document');
  }
  // Validate the output against our Zod schema before returning
  return DocumentSchema.parse(newDocuments[0]);
}

// Find all documents with optional filters
export async function findAllDocuments(query?: {
  name?: string,
  mimeType?: string,
  from?: string,
  to?: string,
  tags?: string | string[],
  metadata?: Record<string, string>
}) {
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

  const dbQuery = db.select().from(documents);

  const allDocuments = conditions.length
    ? await dbQuery.where(and(...conditions)).execute()
    : await dbQuery.execute();

  return DocumentsListSchema.parse(allDocuments);
}

// Find one document by ID
export async function findOneDocument(id: string) {
  const result = await db.select().from(documents).where(eq(documents.id, id)).execute();
  if (!result || result.length === 0) {
    const err = new Error(`Document with id ${id} not found`);
    (err as any).statusCode = 404;
    throw err;
  }
  return DocumentSchema.parse(result[0]);
}

// Update a document by ID
export async function updateDocument(id: string, updateDto: UpdateDocumentDto) {
  // Validate input (double safety)
  const validatedUpdate = UpdateDocumentSchema.parse(updateDto);

  // Check if document exists
  const existing = await db.select().from(documents).where(eq(documents.id, id)).execute();
  if (!existing || existing.length === 0) {
    const err = new Error(`Document with id ${id} not found`);
    (err as any).statusCode = 404;
    throw err;
  }

  // Prepare update data
  const updateData = { ...validatedUpdate, updatedAt: new Date() };
  Object.keys(updateData).forEach(
    (key) => (updateData as any)[key] === undefined && delete (updateData as any)[key]
  );

  const updated = await db.update(documents)
    .set(updateData)
    .where(eq(documents.id, id))
    .returning()
    .execute();

  if (!updated || updated.length === 0) {
    const err = new Error(`Document with id ${id} not found after update`);
    (err as any).statusCode = 404;
    throw err;
  }
  return DocumentSchema.parse(updated[0]);
}

// Delete a document by ID
export async function removeDocument(id: string) {
  // Check if document exists
  const existing = await db.select().from(documents).where(eq(documents.id, id)).execute();
  if (!existing || existing.length === 0) {
    const err = new Error(`Document with id ${id} not found`);
    (err as any).statusCode = 404;
    throw err;
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
    const err = new Error(`Document with id ${id} not found after delete`);
    (err as any).statusCode = 404;
    throw err;
  }
}
