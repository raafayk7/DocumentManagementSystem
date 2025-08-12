// src/infrastructure/http/route-handlers/documents.handlers.ts
import { IHttpRequest, IHttpResponse } from '../interfaces/IHttpServer.js';
import { zodValidate } from '../../../validation/technical/simple.validator.js';
import { container } from '../../di/container.js';
import { ILogger } from '../../../domain/interfaces/ILogger.js';
import { PaginationInputSchema } from '../../../common/dto/pagination.dto.js';
import { matchRes } from '@carbonteq/fp';

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

const logger = container.resolve<ILogger>('ILogger').child({ component: 'DocumentsHandlers' });

// GET /documents
export async function handleGetDocuments(req: IHttpRequest, res: IHttpResponse): Promise<void> {
  logger.info('GET /documents request received', { query: req.query });
  
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
    } = req.query as any;
    
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
        res.send(documentsResult);
      },
      Err: (error) => {
        logger.error('Document retrieval failed', { error: error.message });
        res.status(500).send({ error: error.message });
      }
    });
  } catch (err: any) {
    logger.error('Document retrieval failed', { error: err.message, statusCode: err.statusCode || 400 });
    res.status(err.statusCode || 400).send({ error: err.message });
  }
}

// GET /documents/:id
export async function handleGetDocumentById(req: IHttpRequest, res: IHttpResponse): Promise<void> {
  logger.info('GET /documents/:id request received', { params: req.params });
  
  try {
    const { id } = req.params as { id: string };
    const result = await getDocumentByIdUseCase.execute({ documentId: id });
    
    matchRes(result, {
      Ok: (docResult) => {
        logger.info('Document retrieved successfully', { statusCode: 200, documentId: id });
        res.send(docResult);
      },
      Err: (error) => {
        logger.error('Document retrieval failed', { error: error.message, documentId: id });
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).send({ error: error.message });
      }
    });
  } catch (err: any) {
    logger.error('Document retrieval failed', { error: err.message, statusCode: err.statusCode || 404, documentId: req.params.id });
    res.status(err.statusCode || 404).send({ error: err.message });
  }
}

// PATCH /documents/:id - Updated to use Use Cases
export async function handleUpdateDocument(req: IHttpRequest, res: IHttpResponse): Promise<void> {
  logger.info('PATCH /documents/:id request received', { params: req.params, body: req.body });
  
  try {
    const { id } = req.params as { id: string };
    const updateData = req.body as any;
    
    let result;
    
    // Apply updates in order of priority using Use Cases
    if (updateData.name !== undefined) {
      const nameResult = await updateDocumentNameUseCase.execute({ 
        documentId: id, 
        name: updateData.name,
        userId: req.user?.id // Extract from authenticated user
      });
      if (nameResult.isErr()) {
        return res.status(400).send({ error: nameResult.unwrapErr().message });
      }
      result = nameResult;
    }
    
    if (updateData.tags !== undefined) {
      const tagsResult = await replaceTagsInDocumentUseCase.execute({ 
        documentId: id, 
        tags: updateData.tags,
        userId: req.user?.id
      });
      if (tagsResult.isErr()) {
        return res.status(400).send({ error: tagsResult.unwrapErr().message });
      }
      result = tagsResult;
    }
    
    if (updateData.metadata !== undefined) {
      const metadataResult = await updateDocumentMetadataUseCase.execute({ 
        documentId: id, 
        metadata: updateData.metadata,
        userId: req.user?.id
      });
      if (metadataResult.isErr()) {
        return res.status(400).send({ error: metadataResult.unwrapErr().message });
      }
      result = metadataResult;
    }
    
    if (result) {
      matchRes(result, {
        Ok: (updated) => {
          logger.info('Document updated successfully', { statusCode: 200, documentId: id });
          res.send(updated);
        },
        Err: (error) => {
          logger.error('Document update failed', { error: error.message, documentId: id });
          res.status(400).send({ error: error.message });
        }
      });
    } else {
      res.status(400).send({ error: 'No valid update fields provided' });
    }
  } catch (err: any) {
    logger.error('Document update failed', { error: err.message, statusCode: err.statusCode || 400, documentId: req.params.id });
    res.status(err.statusCode || 400).send({ error: err.message });
  }
}

// DELETE /documents/:id
export async function handleDeleteDocument(req: IHttpRequest, res: IHttpResponse): Promise<void> {
  logger.info('DELETE /documents/:id request received', { params: req.params });
  
  try {
    const { id } = req.params as { id: string };
    const result = await deleteDocumentUseCase.execute({ 
      documentId: id,
      userId: req.user?.id
    });
    
    matchRes(result, {
      Ok: (deleteResult) => {
        logger.info('Document deleted successfully', { statusCode: 200, documentId: id });
        res.send(deleteResult);
      },
      Err: (error) => {
        logger.error('Document deletion failed', { error: error.message, documentId: id });
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).send({ error: error.message });
      }
    });
  } catch (err: any) {
    logger.error('Document deletion failed', { error: err.message, statusCode: err.statusCode || 404, documentId: req.params.id });
    res.status(err.statusCode || 404).send({ error: err.message });
  }
}

// POST /documents/upload
export async function handleUploadDocument(req: IHttpRequest, res: IHttpResponse): Promise<void> {
  logger.info('POST /documents/upload request received');
  
  try {
    // Extract file data from request
    const file = (req as any).file;
    const filename = file?.filename || 'unknown';
    const mimeType = file?.mimetype || 'application/octet-stream';
    const size = file?.size || 0;
    
    const result = await uploadDocumentUseCase.execute({ 
      name: filename,
      file: file?.buffer || Buffer.alloc(0),
      filename,
      mimeType,
      size,
      userId: req.user?.id
    });
    
    matchRes(result, {
      Ok: (docDto) => {
        logger.info('Document uploaded successfully', { statusCode: 201 });
        res.status(201).send(docDto);
      },
      Err: (error) => {
        logger.error('Document upload failed', { error: error.message });
        res.status(400).send({ error: error.message });
      }
    });
  } catch (err: any) {
    logger.error('Document upload failed', { error: err.message, statusCode: err.statusCode || 400 });
    res.status(err.statusCode || 400).send({ error: err.message });
  }
}

// GET /documents/:id/download-link
export async function handleGenerateDownloadLink(req: IHttpRequest, res: IHttpResponse): Promise<void> {
  logger.info('GET /documents/:id/download-link request received', { params: req.params });
  
  try {
    const { id } = req.params as { id: string };
    const result = await generateDownloadLinkUseCase.execute({ documentId: id, expiresInMinutes: 5 });
    
    matchRes(result, {
      Ok: (downloadResult) => {
        logger.info('Download link generated successfully', { statusCode: 200, documentId: id });
        res.send({ downloadUrl: downloadResult.downloadUrl });
      },
      Err: (error) => {
        logger.error('Download link generation failed', { error: error.message, documentId: id });
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).send({ error: error.message });
      }
    });
  } catch (err: any) {
    logger.error('Download link generation failed', { error: err.message, statusCode: err.statusCode || 404, documentId: req.params.id });
    res.status(err.statusCode || 404).send({ error: err.message });
  }
}

  // GET /documents/download?token=...
  export async function handleDownloadByToken(req: IHttpRequest, res: IHttpResponse): Promise<void> {
    logger.info('GET /documents/download request received', { query: req.query });
    
    try {
      const { token } = req.query as { token: string };
      if (!token) {
        return res.status(400).send({ error: 'Token is required' });
      }
      
      const result = await downloadDocumentByTokenUseCase.execute({ token });
      
      matchRes(result, {
        Ok: (downloadResult) => {
          logger.info('Document downloaded by token successfully', { statusCode: 200 });
          // Return document info - actual file download will be handled by infrastructure layer
          res.send(downloadResult);
        },
        Err: (error) => {
          logger.error('Token-based download failed', { error: error.message });
          res.status(400).send({ error: error.message });
        }
      });
    } catch (err: any) {
      logger.error('Token-based download failed', { error: err.message, statusCode: err.statusCode || 400 });
      res.status(err.statusCode || 400).send({ error: err.message });
    }
  }

  // ============================================================================
  // DEPRECATED METHODS - Kept for reference and completeness
  // ============================================================================

  // Note: This method has been deprecated; we will only use the upload method
  // POST /documents
  // export async function handleCreateDocument(req: IHttpRequest, res: IHttpResponse): Promise<void> {
  //   logger.info('POST /documents request received');
    
  //   try {
  //     const data = zodValidate(CreateDocumentSchema, req.body);
  //     const result = await documentService.createDocument(data);
      
  //     matchRes(result, {
  //       Ok: (document) => {
  //         logger.info('Document created successfully', { statusCode: 201 });
  //         res.status(201).send(document);
  //       },
  //       Err: (error) => {
  //         const docError = error as DocumentError;
  //         logger.error('Document creation failed', { error: docError.message, operation: docError.operation });
  //         res.status(400).send({ error: docError.message });
  //       }
  //     });
  //   } catch (err: any) {
  //     logger.error('Document creation failed', { error: err.message, statusCode: err.statusCode || 400 });
  //     res.status(err.statusCode || 400).send({ error: err.message });
  //   }
  // }

  // Note: This method has been deprecated; we will only use the download-link method
  // GET /documents/:id/download
  // export async function handleDownloadDocument(req: IHttpRequest, res: IHttpResponse): Promise<void> {
  //   logger.info('GET /documents/:id/download request received', { params: req.params });
    
  //   try {
  //     const { id } = req.params as { id: string };
  //     const result = await documentService.downloadDocument(id, res);
      
  //     matchRes(result, {
  //       Ok: () => {
  //         logger.info('Document downloaded successfully', { statusCode: 200, documentId: id });
  //         // Response is already sent by the service
  //       },
  //       Err: (error) => {
  //         logger.error('Document download failed', { error: error.message, operation: error.operation, documentId: id });
  //         const statusCode = error.operation.includes('downloadDocument') && error.message.includes('not found') ? 404 : 500;
  //         res.status(statusCode).send({ error: error.message });
  //       }
  //     });
  //   } catch (err: any) {
  //     logger.error('Document download failed', { error: err.message, statusCode: err.statusCode || 404, documentId: req.params.id });
  //     res.status(err.statusCode || 404).send({ error: err.message });
  //   }
  // } 