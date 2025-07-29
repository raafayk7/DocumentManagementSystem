import { db } from '../db';
import { documents } from '../db/schema';
import { CreateDocumentDto, DocumentDto, DocumentSchema, DocumentsListSchema, UpdateDocumentSchema, UpdateDocumentDto } from './dto/documents.dto';
import { v4 as uuidv4 } from 'uuid';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { arrayOverlaps } from 'drizzle-orm'; // If using Drizzle's arrayOverlaps
import fs from 'fs';
import path from 'path';
import { FastifyReply, FastifyRequest } from 'fastify';
import { createReadStream } from 'fs';
import { join } from 'path';
import jwt from 'jsonwebtoken';

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

export async function uploadDocument(request:FastifyRequest) {
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

  // Save file info and metadata to DB
  const doc = await createDocument({
    name: fields.name,
    filePath: file.path,
    mimeType: fields.mimeType || file.mimetype,
    size: fields.size || file.size,
    tags, // always an array
    metadata: fields.metadata || {}
  });

  return doc;
}

export async function downloadDocument(reply:FastifyReply,id_or_token:string,isdownloadLink:boolean) {
  let doc_id: string;

  if (isdownloadLink) {
    const payload = jwt.verify(id_or_token, process.env.DOWNLOAD_JWT_SECRET!) as { documentId: string };
    doc_id = payload.documentId;
  } else {
    doc_id = id_or_token;
  }

  const doc = await findOneDocument(doc_id);
  const filePath = doc.filePath;
  const fileName = doc.name;

  // Set headers
  reply.header('Content-Type', doc.mimeType);
  reply.header('Content-Disposition', `attachment; filename="${fileName}"`);

  // Stream the file
  const stream = createReadStream(join(process.cwd(), filePath));
  return reply.send(stream);
}

export async function generateDownloadLink(id:string) {
  // Optionally check if document exists
  await findOneDocument(id);

  const token = jwt.sign(
    { documentId: id },
    process.env.DOWNLOAD_JWT_SECRET!,
    { expiresIn: '5m' }
  );
  //   const url = `/download-link/${encodeURIComponent(token)}`;
  const url = `/documents/download-link?token=${encodeURIComponent(token)}`;
  return url;
}