import { FastifyInstance } from 'fastify';
import { CreateDocumentSchema } from './dto/documents.dto';
import { zodValidate } from '../pipes/zod-validation.pipe';
import { UpdateDocumentSchema } from './dto/documents.dto';
import { authenticateJWT } from '../auth/authenticate';
import { requireRole } from '../auth/roleGuard';
import { DocumentService } from './documents.service';
import { container } from '../common/container';
import { ILogger } from '../common/services/logger.service.interface';

// Get service instances from DI container
const documentService = container.resolve(DocumentService);
const logger = container.resolve<ILogger>('ILogger').child({ component: 'DocumentsRoutes' });

export default async function documentsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticateJWT);

  app.post('/', { preHandler: requireRole('admin') }, async (request, reply) => {
    logger.logRequest(request);
    
    try {
      const data = zodValidate(CreateDocumentSchema, request.body);
      const document = await documentService.createDocument(data);
      logger.logResponse(reply, { statusCode: 201 });
      reply.code(201).send(document);
    } catch (err: any) {
      logger.error('Document creation failed', { error: err.message, statusCode: err.statusCode || 400 });
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });

  // GET /documents
  app.get('/', async (request, reply) => {
    logger.logRequest(request);
    
    try {
      const { name, mimeType, from, to, tags, metadata, page, pageSize } = request.query as any;
      const result = await documentService.findAllDocuments({ name, mimeType, from, to, tags, metadata, page, pageSize });
      logger.logResponse(reply, { statusCode: 200, resultCount: result.length });
      reply.send(result);
    } catch (err: any) {
      logger.error('Document retrieval failed', { error: err.message, statusCode: err.statusCode || 400 });
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });

  // GET /documents/:id
  app.get('/:id', async (request, reply) => {
    logger.logRequest(request);
    
    try {
      const { id } = request.params as { id: string };
      const doc = await documentService.findOneDocument(id);
      logger.logResponse(reply, { statusCode: 200, documentId: id });
      reply.send(doc);
    } catch (err: any) {
      logger.error('Document retrieval failed', { error: err.message, statusCode: err.statusCode || 404, documentId: (request.params as any).id });
      reply.code(err.statusCode || 404).send({ error: err.message });
    }
  });

  // PATCH /documents/:id
  app.patch('/:id', { preHandler: requireRole('admin') }, async (request, reply) => {
    logger.logRequest(request);
    
    try {
      const { id } = request.params as { id: string };
      const updateDto = zodValidate(UpdateDocumentSchema, request.body);
      const updated = await documentService.updateDocument(id, updateDto);
      logger.logResponse(reply, { statusCode: 200, documentId: id });
      reply.send(updated);
    } catch (err: any) {
      logger.error('Document update failed', { error: err.message, statusCode: err.statusCode || 400, documentId: (request.params as any).id });
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });

  // DELETE /documents/:id
  app.delete('/:id', { preHandler: requireRole('admin') }, async (request, reply) => {
    logger.logRequest(request);
    
    try {
      const { id } = request.params as { id: string };
      const result = await documentService.removeDocument(id);
      logger.logResponse(reply, { statusCode: 200, documentId: id });
      reply.send(result);
    } catch (err: any) {
      logger.error('Document deletion failed', { error: err.message, statusCode: err.statusCode || 404, documentId: (request.params as any).id });
      reply.code(err.statusCode || 404).send({ error: err.message });
    }
  });

  // POST /documents/upload
  app.post('/upload', { preHandler: requireRole('admin') }, async (request, reply) => {
    logger.logRequest(request);
    
    try {
      const doc = await documentService.uploadDocument(request);
      logger.logResponse(reply, { statusCode: 201, documentId: doc.id });
      reply.code(201).send(doc);
    } catch (err: any) {
      logger.error('Document upload failed', { error: err.message, statusCode: err.statusCode || 400 });
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });

  // GET /documents/:id/download
  app.get('/:id/download', async (request, reply) => {
    logger.logRequest(request);
    
    try {
      const { id } = request.params as { id: string };
      await documentService.downloadDocument(id, reply);
      logger.logResponse(reply, { statusCode: 200, documentId: id });
    } catch (err: any) {
      logger.error('Document download failed', { error: err.message, statusCode: err.statusCode || 404, documentId: (request.params as any).id });
      reply.code(err.statusCode || 404).send({ error: err.message });
    }
  });

  // POST /documents/:id/generate-download-link
  app.post('/:id/generate-download-link', async (request, reply) => {
    logger.logRequest(request);
    
    try {
      const { id } = request.params as { id: string };
      const url = await documentService.generateDownloadLink(id);
      logger.logResponse(reply, { statusCode: 200, documentId: id });
      reply.send({ url });
    } catch (err: any) {
      logger.error('Download link generation failed', { error: err.message, statusCode: err.statusCode || 400, documentId: (request.params as any).id });
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });

  // GET /documents/download-link
  app.get('/download-link', async (request, reply) => {
    logger.logRequest(request);
    
    try {
      const { token } = request.query as { token: string };
      await documentService.downloadDocumentByToken(token, reply);
      logger.logResponse(reply, { statusCode: 200 });
    } catch (err: any) {
      logger.error('Token-based download failed', { error: err.message, statusCode: 403 });
      console.error('JWT verification error:', err);
      reply.code(403).send({ error: 'Invalid or expired download link' });
    }
  });
}
