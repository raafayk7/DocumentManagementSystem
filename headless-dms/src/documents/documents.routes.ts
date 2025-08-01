import { FastifyInstance } from 'fastify';
import { CreateDocumentSchema } from './dto/documents.dto.js';
import { zodValidate } from '../pipes/zod-validation.pipe.js';
import { UpdateDocumentSchema } from './dto/documents.dto.js';
import { authenticateJWT } from '../auth/authenticate.js';
import { requireRole } from '../auth/roleGuard.js';
import { DocumentService } from './documents.service.js';
import { container } from '../common/container.js';
import { ILogger } from '../common/services/logger.service.interface.js';
import { PaginationInputSchema } from '../common/dto/pagination.dto.js';
import { matchRes } from '@carbonteq/fp';
import { Document } from '../domain/entities/Document.js';

// Get service instances from DI container
const documentService = container.resolve(DocumentService);
const logger = container.resolve<ILogger>('ILogger').child({ component: 'DocumentsRoutes' });

export default async function documentsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticateJWT);

  app.post('/', { preHandler: requireRole('admin') }, async (request, reply) => {
    logger.logRequest(request);
    
    try {
      const data = zodValidate(CreateDocumentSchema, request.body);
      const result = await documentService.createDocument(data);
      
      matchRes(result, {
        Ok: (document) => {
          logger.logResponse(reply, { statusCode: 201 });
          reply.code(201).send(document);
        },
        Err: (error) => {
          logger.error('Document creation failed', { error: error.message, operation: error.operation });
          reply.code(400).send({ error: error.message });
        }
      });
    } catch (err: any) {
      logger.error('Document creation failed', { error: err.message, statusCode: err.statusCode || 400 });
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });

  // GET /documents
  app.get('/', async (request, reply) => {
    logger.logRequest(request);
    
    try {
      const { name, mimeType, from, to, tags, metadata, page, limit, sort, order } = request.query as any;
      
      // Parse pagination parameters
      const pagination = zodValidate(PaginationInputSchema, { page, limit, sort, order });
      
      // Parse filter parameters using entity's parsing logic
      let parsedMetadata: Record<string, string> | undefined;
      if (metadata) {
        const metadataResult = Document.parseMetadata(metadata);
        if (metadataResult.isErr()) {
          logger.warn('Invalid metadata format', { metadata, error: metadataResult.unwrapErr() });
          parsedMetadata = undefined;
        } else {
          parsedMetadata = metadataResult.unwrap();
        }
      }
      
      const query = { name, mimeType, from, to, tags, metadata: parsedMetadata };
      
      const result = await documentService.findAllDocuments(query, pagination);
      
      matchRes(result, {
        Ok: (documentsResult) => {
          logger.logResponse(reply, { 
            statusCode: 200, 
            resultCount: documentsResult.data.length,
            total: documentsResult.pagination.total,
            page: documentsResult.pagination.page
          });
          reply.send(documentsResult);
        },
        Err: (error) => {
          logger.error('Document retrieval failed', { error: error.message, operation: error.operation });
          reply.code(500).send({ error: error.message });
        }
      });
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
      const result = await documentService.findOneDocument(id);
      
      matchRes(result, {
        Ok: (doc) => {
          logger.logResponse(reply, { statusCode: 200, documentId: id });
          reply.send(doc);
        },
        Err: (error) => {
          logger.error('Document retrieval failed', { error: error.message, operation: error.operation, documentId: id });
          const statusCode = error.operation.includes('findOneDocument') && error.message.includes('not found') ? 404 : 500;
          reply.code(statusCode).send({ error: error.message });
        }
      });
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
      const result = await documentService.updateDocument(id, updateDto);
      
      matchRes(result, {
        Ok: (updated) => {
          logger.logResponse(reply, { statusCode: 200, documentId: id });
          reply.send(updated);
        },
        Err: (error) => {
          logger.error('Document update failed', { error: error.message, operation: error.operation, documentId: id });
          const statusCode = error.operation.includes('updateDocument') && error.message.includes('not found') ? 404 : 400;
          reply.code(statusCode).send({ error: error.message });
        }
      });
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
      
      matchRes(result, {
        Ok: (deleteResult) => {
          logger.logResponse(reply, { statusCode: 200, documentId: id });
          reply.send(deleteResult);
        },
        Err: (error) => {
          logger.error('Document deletion failed', { error: error.message, operation: error.operation, documentId: id });
          const statusCode = error.operation.includes('removeDocument') && error.message.includes('not found') ? 404 : 500;
          reply.code(statusCode).send({ error: error.message });
        }
      });
    } catch (err: any) {
      logger.error('Document deletion failed', { error: err.message, statusCode: err.statusCode || 404, documentId: (request.params as any).id });
      reply.code(err.statusCode || 404).send({ error: err.message });
    }
  });

  // POST /documents/upload
  app.post('/upload', { preHandler: requireRole('admin') }, async (request, reply) => {
    logger.logRequest(request);
    
    try {
      const result = await documentService.uploadDocument(request);
      
      matchRes(result, {
        Ok: (doc) => {
          logger.logResponse(reply, { statusCode: 201, documentId: doc.id });
          reply.code(201).send(doc);
        },
        Err: (error) => {
          logger.error('Document upload failed', { error: error.message, operation: error.operation });
          reply.code(400).send({ error: error.message });
        }
      });
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
      const result = await documentService.downloadDocument(id, reply);
      
      matchRes(result, {
        Ok: () => {
          logger.logResponse(reply, { statusCode: 200, documentId: id });
          // Response is already sent by streamFile
        },
        Err: (error) => {
          logger.error('Document download failed', { error: error.message, operation: error.operation, documentId: id });
          const statusCode = error.operation.includes('findOneDocument') && error.message.includes('not found') ? 404 : 500;
          reply.code(statusCode).send({ error: error.message });
        }
      });
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
      const result = await documentService.generateDownloadLink(id);
      
      matchRes(result, {
        Ok: (url) => {
          logger.logResponse(reply, { statusCode: 200, documentId: id });
          reply.send({ url });
        },
        Err: (error) => {
          logger.error('Download link generation failed', { error: error.message, operation: error.operation, documentId: id });
          const statusCode = error.operation.includes('findOneDocument') && error.message.includes('not found') ? 404 : 400;
          reply.code(statusCode).send({ error: error.message });
        }
      });
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
      const result = await documentService.downloadDocumentByToken(token, reply);
      
      matchRes(result, {
        Ok: () => {
          logger.logResponse(reply, { statusCode: 200 });
          // Response is already sent by streamFile
        },
        Err: (error) => {
          logger.error('Token-based download failed', { error: error.message, operation: error.operation });
          const statusCode = error.operation.includes('downloadDocumentByToken') && error.message.includes('verification') ? 403 : 500;
          reply.code(statusCode).send({ error: error.message });
        }
      });
    } catch (err: any) {
      logger.error('Token-based download failed', { error: err.message, statusCode: 403 });
      console.error('JWT verification error:', err);
      reply.code(403).send({ error: 'Invalid or expired download link' });
    }
  });
}
