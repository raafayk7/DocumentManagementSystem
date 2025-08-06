import { FastifyInstance } from 'fastify';
import { CreateDocumentSchema } from './dto/documents.dto.js';
import { zodValidate } from '../validation/technical/simple.validator.js';
import { UpdateDocumentSchema } from './dto/documents.dto.js';
import { authenticateJWT, requireRole } from '../auth/middleware/index.js';
import { DocumentService } from './documents.service.js';
import { container } from '../di/container.js';
import { ILogger } from '../common/services/logger.service.interface.js';
import { PaginationInputSchema } from '../common/dto/pagination.dto.js';
import { matchRes, Result } from '@carbonteq/fp';
import { Document } from '../domain/entities/Document.js';
import { DocumentError } from '../common/errors/application.errors.js';

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
          const docError = error as DocumentError;
          logger.error('Document creation failed', { error: docError.message, operation: docError.operation });
          reply.code(400).send({ error: docError.message });
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

  // PATCH /documents/:id - Updated to use entity-specific methods
  app.patch('/:id', { preHandler: requireRole('admin') }, async (request, reply) => {
    logger.logRequest(request);
    
    try {
      const { id } = request.params as { id: string };
      const updateDto = zodValidate(UpdateDocumentSchema, request.body);
      
      let result;
      
      // Handle multiple field updates
      let currentDocument = await documentService.findOneDocument(id);
      if (currentDocument.isErr()) {
        return reply.code(404).send({ error: 'Document not found' });
      }
      
      let document = currentDocument.unwrap();
      
      // Apply updates in order of priority
      if (updateDto.name !== undefined) {
        const nameResult = await documentService.updateDocumentName(id, updateDto.name);
        if (nameResult.isErr()) {
          return reply.code(400).send({ error: nameResult.unwrapErr().message });
        }
        document = nameResult.unwrap();
      }
      
      if (updateDto.tags !== undefined) {
        const tagsResult = await documentService.replaceTagsInDocument(id, updateDto.tags);
        if (tagsResult.isErr()) {
          return reply.code(400).send({ error: tagsResult.unwrapErr().message });
        }
        document = tagsResult.unwrap();
      }
      
      if (updateDto.metadata !== undefined) {
        const metadataResult = await documentService.updateDocumentMetadata(id, updateDto.metadata);
        if (metadataResult.isErr()) {
          return reply.code(400).send({ error: metadataResult.unwrapErr().message });
        }
        document = metadataResult.unwrap();
      }
      
      result = Result.Ok(document);
      
      matchRes(result, {
        Ok: (updated) => {
          logger.logResponse(reply, { statusCode: 200, documentId: id });
          reply.send(updated);
        },
        Err: (error) => {
          logger.error('Document update failed', { error: error.message, operation: error.operation, documentId: id });
          const statusCode = error.operation.includes('updateDocumentName') && error.message.includes('not found') ? 404 : 400;
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
        Ok: (docDto) => {
          logger.logResponse(reply, { statusCode: 201, documentId: docDto.id });
          reply.code(201).send(docDto);
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
          // Response is already sent by the service
        },
        Err: (error) => {
          logger.error('Document download failed', { error: error.message, operation: error.operation, documentId: id });
          const statusCode = error.operation.includes('downloadDocument') && error.message.includes('not found') ? 404 : 500;
          reply.code(statusCode).send({ error: error.message });
        }
      });
    } catch (err: any) {
      logger.error('Document download failed', { error: err.message, statusCode: err.statusCode || 404, documentId: (request.params as any).id });
      reply.code(err.statusCode || 404).send({ error: err.message });
    }
  });

  // GET /documents/:id/download-link
  app.get('/:id/download-link', async (request, reply) => {
    logger.logRequest(request);
    
    try {
      const { id } = request.params as { id: string };
      const result = await documentService.generateDownloadLink(id);
      
      matchRes(result, {
        Ok: (downloadUrl) => {
          logger.logResponse(reply, { statusCode: 200, documentId: id });
          reply.send({ downloadUrl });
        },
        Err: (error) => {
          logger.error('Download link generation failed', { error: error.message, operation: error.operation, documentId: id });
          const statusCode = error.operation.includes('generateDownloadLink') && error.message.includes('not found') ? 404 : 500;
          reply.code(statusCode).send({ error: error.message });
        }
      });
    } catch (err: any) {
      logger.error('Download link generation failed', { error: err.message, statusCode: err.statusCode || 404, documentId: (request.params as any).id });
      reply.code(err.statusCode || 404).send({ error: err.message });
    }
  });

  // GET /documents/download?token=...
  app.get('/download', async (request, reply) => {
    logger.logRequest(request);
    
    try {
      const { token } = request.query as { token: string };
      if (!token) {
        return reply.code(400).send({ error: 'Token is required' });
      }
      
      const result = await documentService.downloadDocumentByToken(token, reply);
      
      matchRes(result, {
        Ok: () => {
          logger.logResponse(reply, { statusCode: 200 });
          // Response is already sent by the service
        },
        Err: (error) => {
          logger.error('Token-based download failed', { error: error.message, operation: error.operation });
          reply.code(400).send({ error: error.message });
        }
      });
    } catch (err: any) {
      logger.error('Token-based download failed', { error: err.message, statusCode: err.statusCode || 400 });
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });
}
