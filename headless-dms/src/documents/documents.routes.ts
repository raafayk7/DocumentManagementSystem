import { FastifyInstance } from 'fastify';
import { CreateDocumentSchema } from './dto/documents.dto';
import { zodValidate } from '../pipes/zod-validation.pipe';
import { createDocument } from './documents.service';
import { findAllDocuments, findOneDocument } from './documents.service';
import { UpdateDocumentSchema } from './dto/documents.dto';
import { updateDocument, removeDocument } from './documents.service';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export default async function documentsRoutes(app: FastifyInstance) {
  app.post('/documents', async (request, reply) => {
    try {
      const data = zodValidate(CreateDocumentSchema, request.body);
      // TODO: Add authentication/authorization if needed
      const document = await createDocument(data);
      reply.code(201).send(document);
    } catch (err: any) {
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });

  

  // GET /documents
  app.get('/documents', async (request, reply) => {
    try {
      const { name, mimeType, from, to, tags, metadata } = request.query as any;
      const docs = await findAllDocuments({ name, mimeType, from, to, tags, metadata });
      reply.send(docs);
    } catch (err: any) {
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });

  // GET /documents/:id
  app.get('/documents/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const doc = await findOneDocument(id);
      reply.send(doc);
    } catch (err: any) {
      reply.code(err.statusCode || 404).send({ error: err.message });
    }
  });

  // PATCH /documents/:id
  app.patch('/documents/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const updateDto = zodValidate(UpdateDocumentSchema, request.body);
      const updated = await updateDocument(id, updateDto);
      reply.send(updated);
    } catch (err: any) {
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });

  // DELETE /documents/:id
  app.delete('/documents/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await removeDocument(id);
      reply.send(result);
    } catch (err: any) {
      reply.code(err.statusCode || 404).send({ error: err.message });
    }
  });


  app.post('/documents/upload', async (request, reply) => {
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

    reply.code(201).send(doc);
  });

  
}
