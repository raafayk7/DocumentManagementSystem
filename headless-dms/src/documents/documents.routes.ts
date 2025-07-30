import { FastifyInstance } from 'fastify';
import { CreateDocumentSchema } from './dto/documents.dto';
import { zodValidate } from '../pipes/zod-validation.pipe';
import { UpdateDocumentSchema } from './dto/documents.dto';
import { authenticateJWT } from '../auth/authenticate';
import { requireRole } from '../auth/roleGuard';
import { DocumentService } from './documents.service';
import { container } from '../common/container';

// Get service instance from DI container
const documentService = container.resolve(DocumentService);

export default async function documentsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticateJWT);

  app.post('/', { preHandler: requireRole('admin') }, async (request, reply) => {
    try {
      const data = zodValidate(CreateDocumentSchema, request.body);
      const document = await documentService.createDocument(data);
      reply.code(201).send(document);
    } catch (err: any) {
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });

  // GET /documents
  app.get('/', async (request, reply) => {
    try {
      const { name, mimeType, from, to, tags, metadata, page, pageSize } = request.query as any;
      const result = await documentService.findAllDocuments({ name, mimeType, from, to, tags, metadata, page, pageSize });
      reply.send(result);
    } catch (err: any) {
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });

  // GET /documents/:id
  app.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const doc = await documentService.findOneDocument(id);
      reply.send(doc);
    } catch (err: any) {
      reply.code(err.statusCode || 404).send({ error: err.message });
    }
  });

  // PATCH /documents/:id
  app.patch('/:id', { preHandler: requireRole('admin') }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const updateDto = zodValidate(UpdateDocumentSchema, request.body);
      const updated = await documentService.updateDocument(id, updateDto);
      reply.send(updated);
    } catch (err: any) {
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });

  // DELETE /documents/:id
  app.delete('/:id', { preHandler: requireRole('admin') }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await documentService.removeDocument(id);
      reply.send(result);
    } catch (err: any) {
      reply.code(err.statusCode || 404).send({ error: err.message });
    }
  });

  // POST /documents/upload
  app.post('/upload', { preHandler: requireRole('admin') }, async (request, reply) => {
    try {
      const doc = await documentService.uploadDocument(request);
      reply.code(201).send(doc);
    } catch (err: any) {
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });

  // GET /documents/:id/download
  app.get('/:id/download', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await documentService.downloadDocument(id, reply);
    } catch (err: any) {
      reply.code(err.statusCode || 404).send({ error: err.message });
    }
  });

  // POST /documents/:id/generate-download-link
  app.post('/:id/generate-download-link', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const url = await documentService.generateDownloadLink(id);
      reply.send({ url });
    } catch (err: any) {
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });

  // GET /documents/download-link
  app.get('/download-link', async (request, reply) => {
    try {
      const { token } = request.query as { token: string };
      await documentService.downloadDocumentByToken(token, reply);
    } catch (err) {
      console.error('JWT verification error:', err);
      reply.code(403).send({ error: 'Invalid or expired download link' });
    }
  });
}
