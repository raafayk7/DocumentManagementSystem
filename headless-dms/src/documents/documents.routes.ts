import { FastifyInstance } from 'fastify';
import { CreateDocumentSchema } from './dto/documents.dto';
import { zodValidate } from '../pipes/zod-validation.pipe';
import { createDocument } from './documents.service';
import { findAllDocuments, findOneDocument } from './documents.service';
import { UpdateDocumentSchema } from './dto/documents.dto';
import { updateDocument, removeDocument } from './documents.service';
import { authenticateJWT } from '../auth/authenticate';

export default async function documentsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticateJWT);

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
}
