import { FastifyInstance } from 'fastify';
import { zodValidate } from '../../../validation/technical/simple.validator.js';
import { authenticateJWT, requireRole } from '../middleware/index.js';
import { container } from '../../di/container.js';
import { ILogger } from '../../../infrastructure/interfaces/ILogger.js';
import { PaginationInputSchema } from '../../../common/dto/pagination.dto.js';
import { matchRes, Result } from '@carbonteq/fp';

// Import Use Cases
import { GetDocumentsUseCase, GetDocumentByIdUseCase, UpdateDocumentNameUseCase, UpdateDocumentMetadataUseCase, DeleteDocumentUseCase, UploadDocumentUseCase, GenerateDownloadLinkUseCase, DownloadDocumentByTokenUseCase, ReplaceTagsInDocumentUseCase } from '../../../application/use-cases/document/index.js';

// Get Use Case instances from DI container
const getDocumentsUseCase = container.resolve(GetDocumentsUseCase);
const getDocumentByIdUseCase = container.resolve(GetDocumentByIdUseCase);
const updateDocumentNameUseCase = container.resolve(UpdateDocumentNameUseCase);
const updateDocumentMetadataUseCase = container.resolve(UpdateDocumentMetadataUseCase);
const deleteDocumentUseCase = container.resolve(DeleteDocumentUseCase);
const uploadDocumentUseCase = container.resolve(UploadDocumentUseCase);
const generateDownloadLinkUseCase = container.resolve(GenerateDownloadLinkUseCase);
const downloadDocumentByTokenUseCase = container.resolve(DownloadDocumentByTokenUseCase);
const replaceTagsInDocumentUseCase = container.resolve(ReplaceTagsInDocumentUseCase);


const logger = container.resolve<ILogger>('ILogger').child({ component: 'DocumentsRoutes' });

export default async function documentsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticateJWT);

  // GET /documents
  app.get('/', async (request, reply) => {
    logger.info('GET /documents request received', { query: request.query });
    
    try {
      const { 
        page, 
        limit, 
        sort, 
        order, 
        name, 
        mimeType, 
        tags, 
        metadata, 
        fromDate, 
        toDate 
      } = request.query as any;
      
      // Parse pagination parameters
      const pagination = zodValidate(PaginationInputSchema, { page, limit, sort, order });
      
      // Parse tags if provided (comma-separated string to array)
      const parsedTags = tags ? tags.split(',').map((tag: string) => tag.trim()) : undefined;
      
      // Parse metadata if provided (JSON string to object)
      let parsedMetadata: Record<string, string> | undefined;
      if (metadata) {
        try {
          parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
        } catch (error) {
          logger.warn('Invalid metadata format', { metadata, error: (error as Error).message });
          parsedMetadata = undefined;
        }
      }
      
      // Use the enhanced GetDocumentsUseCase with all filters
      const result = await getDocumentsUseCase.execute({ 
        page: parseInt(page) || 1, 
        limit: parseInt(limit) || 10, 
        sortBy: sort || 'createdAt', 
        sortOrder: order || 'desc',
        name,
        mimeType,
        tags: parsedTags,
        metadata: parsedMetadata,
        fromDate,
        toDate
      });
      
      matchRes(result, {
        Ok: (documentsResult) => {
          logger.info('Documents retrieved successfully', { 
            statusCode: 200, 
            resultCount: documentsResult.document.length,
            total: documentsResult.pagination.total,
            page: documentsResult.pagination.page,
            filtersApplied: { name, mimeType, tags: parsedTags, metadata: parsedMetadata, fromDate, toDate }
          });
          reply.send(documentsResult);
        },
        Err: (error) => {
          logger.error('Document retrieval failed', { error: error.message });
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
    logger.info('GET /documents/:id request received', { params: request.params });
    
    try {
      const { id } = request.params as { id: string };
      const result = await getDocumentByIdUseCase.execute({ documentId: id });
      
      matchRes(result, {
        Ok: (docResult) => {
          logger.info('Document retrieved successfully', { statusCode: 200, documentId: id });
          reply.send(docResult);
        },
        Err: (error) => {
          logger.error('Document retrieval failed', { error: error.message, documentId: id });
          const statusCode = error.message.includes('not found') ? 404 : 500;
          reply.code(statusCode).send({ error: error.message });
        }
      });
    } catch (err: any) {
      logger.error('Document retrieval failed', { error: err.message, statusCode: err.statusCode || 404, documentId: (request.params as any).id });
      reply.code(err.statusCode || 404).send({ error: err.message });
    }
  });

  // PATCH /documents/:id - Updated to use Use Cases
  app.patch('/:id', { preHandler: requireRole('admin') }, async (request, reply) => {
    logger.info('PATCH /documents/:id request received', { params: request.params, body: request.body });
    
    try {
      const { id } = request.params as { id: string };
      const updateData = request.body as any;
      
      let result;
      
      // Apply updates in order of priority using Use Cases
      if (updateData.name !== undefined) {
        const nameResult = await updateDocumentNameUseCase.execute({ 
          documentId: id, 
          name: updateData.name,
          userId: (request.user as any).id // Extract from authenticated user
        });
        if (nameResult.isErr()) {
          return reply.code(400).send({ error: nameResult.unwrapErr().message });
        }
        result = nameResult;
      }
      
      if (updateData.tags !== undefined) {
        const tagsResult = await replaceTagsInDocumentUseCase.execute({ 
          documentId: id, 
          tags: updateData.tags,
          userId: (request.user as any).id
        });
        if (tagsResult.isErr()) {
          return reply.code(400).send({ error: tagsResult.unwrapErr().message });
        }
        result = tagsResult;
      }
      
      if (updateData.metadata !== undefined) {
        const metadataResult = await updateDocumentMetadataUseCase.execute({ 
          documentId: id, 
          metadata: updateData.metadata,
          userId: (request.user as any).id
        });
        if (metadataResult.isErr()) {
          return reply.code(400).send({ error: metadataResult.unwrapErr().message });
        }
        result = metadataResult;
      }
      
      if (result) {
        matchRes(result, {
          Ok: (updated) => {
            logger.info('Document updated successfully', { statusCode: 200, documentId: id });
            reply.send(updated);
          },
          Err: (error) => {
            logger.error('Document update failed', { error: error.message, documentId: id });
            reply.code(400).send({ error: error.message });
          }
        });
      } else {
        reply.code(400).send({ error: 'No valid update fields provided' });
      }
    } catch (err: any) {
      logger.error('Document update failed', { error: err.message, statusCode: err.statusCode || 400, documentId: (request.params as any).id });
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });

  // DELETE /documents/:id
  app.delete('/:id', { preHandler: requireRole('admin') }, async (request, reply) => {
    logger.info('DELETE /documents/:id request received', { params: request.params });
    
    try {
      const { id } = request.params as { id: string };
      const result = await deleteDocumentUseCase.execute({ 
        documentId: id,
        userId: (request.user as any).id
      });
      
      matchRes(result, {
        Ok: (deleteResult) => {
          logger.info('Document deleted successfully', { statusCode: 200, documentId: id });
          reply.send(deleteResult);
        },
        Err: (error) => {
          logger.error('Document deletion failed', { error: error.message, documentId: id });
          const statusCode = error.message.includes('not found') ? 404 : 500;
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
    logger.info('POST /documents/upload request received');
    
    try {
      // Extract file data from request
      const file = (request as any).file;
      const filename = file?.filename || 'unknown';
      const mimeType = file?.mimetype || 'application/octet-stream';
      const size = file?.size || 0;
      
      const result = await uploadDocumentUseCase.execute({ 
        name: filename,
        file: file?.buffer || Buffer.alloc(0),
        filename,
        mimeType,
        size,
        userId: (request.user as any).id
      });
      
      matchRes(result, {
        Ok: (docDto) => {
          logger.info('Document uploaded successfully', { statusCode: 201 });
          reply.code(201).send(docDto);
        },
        Err: (error) => {
          logger.error('Document upload failed', { error: error.message });
          reply.code(400).send({ error: error.message });
        }
      });
    } catch (err: any) {
      logger.error('Document upload failed', { error: err.message, statusCode: err.statusCode || 400 });
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });

  // GET /documents/:id/download-link
  app.get('/:id/download-link', async (request, reply) => {
    logger.info('GET /documents/:id/download-link request received', { params: request.params });
    
    try {
      const { id } = request.params as { id: string };
      const result = await generateDownloadLinkUseCase.execute({ documentId: id, expiresInMinutes: 5 });
      
      matchRes(result, {
        Ok: (downloadResult) => {
          logger.info('Download link generated successfully', { statusCode: 200, documentId: id });
          reply.send({ downloadUrl: downloadResult.downloadUrl });
        },
        Err: (error) => {
          logger.error('Download link generation failed', { error: error.message, documentId: id });
          const statusCode = error.message.includes('not found') ? 404 : 500;
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
    logger.info('GET /documents/download request received', { query: request.query });
    
    try {
      const { token } = request.query as { token: string };
      if (!token) {
        return reply.code(400).send({ error: 'Token is required' });
      }
      
      const result = await downloadDocumentByTokenUseCase.execute({ token });
      
      matchRes(result, {
        Ok: (downloadResult) => {
          logger.info('Document downloaded by token successfully', { statusCode: 200 });
          // Return document info - actual file download will be handled by infrastructure layer
          reply.send(downloadResult);
        },
        Err: (error) => {
          logger.error('Token-based download failed', { error: error.message });
          reply.code(400).send({ error: error.message });
        }
      });
    } catch (err: any) {
      logger.error('Token-based download failed', { error: err.message, statusCode: err.statusCode || 400 });
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });

  // Note: This method has been deprected; we will only use the upload method
  // POST /documents
  // app.post('/', { preHandler: requireRole('admin') }, async (request, reply) => {
  //   logger.logRequest(request);
    
  //   try {
  //     const data = zodValidate(CreateDocumentSchema, request.body);
  //     const result = await documentService.createDocument(data);
      
  //     matchRes(result, {
  //       Ok: (document) => {
  //         logger.logResponse(reply, { statusCode: 201 });
  //         reply.code(201).send(document);
  //       },
  //       Err: (error) => {
  //         const docError = error as DocumentError;
  //         logger.error('Document creation failed', { error: docError.message, operation: docError.operation });
  //         reply.code(400).send({ error: docError.message });
  //       }
  //     });
  //   } catch (err: any) {
  //     logger.error('Document creation failed', { error: err.message, statusCode: err.statusCode || 400 });
  //     reply.code(err.statusCode || 400).send({ error: err.message });
  //   }
  // });

  // Note: This method has been deprected; we will only use the download-link method
  // GET /documents/:id/download
  // app.get('/:id/download', async (request, reply) => {
  //   logger.logRequest(request);
    
  //   try {
  //     const { id } = request.params as { id: string };
  //     const result = await documentService.downloadDocument(id, reply);
      
  //     matchRes(result, {
  //       Ok: () => {
  //         logger.logResponse(reply, { statusCode: 200, documentId: id });
  //         // Response is already sent by the service
  //       },
  //       Err: (error) => {
  //         logger.error('Document download failed', { error: error.message, operation: error.operation, documentId: id });
  //         const statusCode = error.operation.includes('downloadDocument') && error.message.includes('not found') ? 404 : 500;
  //         reply.code(statusCode).send({ error: error.message });
  //       }
  //     });
  //   } catch (err: any) {
  //     logger.error('Document download failed', { error: err.message, statusCode: err.statusCode || 404, documentId: (request.params as any).id });
  //     reply.code(err.statusCode || 404).send({ error: err.message });
  //   }
  // });

  
}
