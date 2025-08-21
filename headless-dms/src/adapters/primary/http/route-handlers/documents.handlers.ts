// src/infrastructure/http/route-handlers/documents.handlers.ts
import { IHttpRequest, IHttpResponse } from '../../../../ports/input/IHttpServer.js';
import { zodValidate } from '../../../../shared/dto/validation/technical/simple.validator.js';
import { container } from '../../../../shared/di/container.js';
import { ILogger } from '../../../../ports/output/ILogger.js';
import { PaginationInputSchema } from '../../../../shared/dto/common/pagination.dto.js';
import { AppResult } from '@carbonteq/hexapp';

// Import Use Cases
import { GetDocumentsUseCase, GetDocumentByIdUseCase, UpdateDocumentNameUseCase, UpdateDocumentMetadataUseCase, DeleteDocumentUseCase, UploadDocumentUseCase, GenerateDownloadLinkUseCase, DownloadDocumentByTokenUseCase, ReplaceTagsInDocumentUseCase } from '../../../../application/use-cases/document/index.js';

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
    
    if (result.isErr()) {
      const error = result.unwrapErr();
      logger.error('Document retrieval failed', { error: error.message });
      res.status(500).send({ error: error.message });
      return;
    }

    const documentsResult = result.unwrap();
    logger.info('Documents retrieved successfully', { 
      statusCode: 200, 
      resultCount: documentsResult.document.length,
      total: documentsResult.pagination.total,
      page: documentsResult.pagination.page,
      filtersApplied: { name, mimeType, tags: parsedTags, metadata: parsedMetadata, fromDate, toDate }
    });
    res.send(documentsResult);
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
    
    if (result.isErr()) {
      const error = result.unwrapErr();
      logger.error('Document retrieval failed', { error: error.message, documentId: id });
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).send({ error: error.message });
      return;
    }

    const docResult = result.unwrap();
    logger.info('Document retrieved successfully', { statusCode: 200, documentId: id });
    res.send(docResult);
  } catch (err: any) {
    logger.error('Document retrieval failed', { error: err.message, statusCode: err.statusCode || 404, documentId: req.params.id });
    res.status(err.statusCode || 404).send({ error: err.message });
  }
}

// PATCH /documents/:id - Updated to use Use Cases
export async function handleUpdateDocument(req: IHttpRequest, res: IHttpResponse): Promise<void> {
  logger.info('PATCH /documents/:id request received', { 
    params: req.params, 
    body: req.body,
    user: req.user,
    userId: req.user?.sub,
    hasUser: !!req.user,
    userKeys: req.user ? Object.keys(req.user) : []
  });
  
  try {
    const { id } = req.params as { id: string };
    const updateData = req.body as any;
    
    // Validate user authentication
    if (!req.user?.sub) {
      logger.error('No user ID found in request', { 
        user: req.user, 
        headers: req.headers,
        hasUser: !!req.user 
      });
      return res.status(401).send({ error: 'User not authenticated' });
    }
    
    logger.info('User authentication validated', { 
      userId: req.user.sub,
      userEmail: req.user.email,
      userRole: req.user.role
    });
    
    let result;
    
    // Apply updates in order of priority using Use Cases
    if (updateData.name !== undefined) {
      logger.info('Updating document name', { 
        documentId: id, 
        newName: updateData.name,
        userId: req.user.sub 
      });
      
      const nameResult = await updateDocumentNameUseCase.execute({ 
        documentId: id, 
        name: updateData.name,
        userId: req.user.sub // Extract from authenticated user
      });
      if (nameResult.isErr()) {
        logger.error('Document name update failed', { 
          error: nameResult.unwrapErr().message,
          documentId: id,
          userId: req.user.sub
        });
        return res.status(400).send({ error: nameResult.unwrapErr().message });
      }
      result = nameResult;
    }
    
    if (updateData.tags !== undefined) {
      logger.info('Updating document tags', { 
        documentId: id, 
        newTags: updateData.tags,
        userId: req.user.sub 
      });
      
      const tagsResult = await replaceTagsInDocumentUseCase.execute({ 
        documentId: id, 
        tags: updateData.tags,
        userId: req.user.sub
      });
      if (tagsResult.isErr()) {
        logger.error('Document tags update failed', { 
          error: tagsResult.unwrapErr().message,
          documentId: id,
          userId: req.user.sub
        });
        return res.status(400).send({ error: tagsResult.unwrapErr().message });
      }
      result = tagsResult;
    }
    
    if (updateData.metadata !== undefined) {
      logger.info('Updating document metadata', { 
        documentId: id, 
        newMetadata: updateData.metadata,
        userId: req.user.sub 
      });
      
      const metadataResult = await updateDocumentMetadataUseCase.execute({ 
        documentId: id, 
        metadata: updateData.metadata,
        userId: req.user.sub
      });
      if (metadataResult.isErr()) {
        logger.error('Document metadata update failed', { 
          error: metadataResult.unwrapErr().message,
          documentId: id,
          userId: req.user.sub
        });
        return res.status(400).send({ error: metadataResult.unwrapErr().message });
      }
      result = metadataResult;
    }
    
    if (result) {
      if (result.isErr()) {
        const error = result.unwrapErr();
        logger.error('Document update failed', { error: error.message, documentId: id });
        res.status(400).send({ error: error.message });
        return;
      }

      const updated = result.unwrap();
      logger.info('Document updated successfully', { statusCode: 200, documentId: id });
      res.send(updated);
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
  logger.info('DELETE /documents/:id request received', { 
    params: req.params,
    user: req.user,
    userId: req.user?.sub,
    hasUser: !!req.user
  });
  
  try {
    const { id } = req.params as { id: string };
    
    if (!req.user?.sub) {
      logger.error('No user ID found in request', { 
        user: req.user, 
        headers: req.headers,
        hasUser: !!req.user 
      });
      return res.status(401).send({ error: 'User not authenticated' });
    }
    
    const result = await deleteDocumentUseCase.execute({ 
      documentId: id,
      userId: req.user.sub
    });
    
    if (result.isErr()) {
      const error = result.unwrapErr();
      logger.error('Document deletion failed', { error: error.message, documentId: id });
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).send({ error: error.message });
      return;
    }

    const deleteResult = result.unwrap();
    logger.info('Document deleted successfully', { statusCode: 200, documentId: id });
    res.send(deleteResult);
  } catch (err: any) {
    logger.error('Document deletion failed', { error: err.message, statusCode: err.statusCode || 404, documentId: req.params.id });
    res.status(err.statusCode || 404).send({ error: err.message });
  }
}

// POST /documents/upload
export async function handleUploadDocument(req: IHttpRequest, res: IHttpResponse): Promise<void> {
  logger.info('POST /documents/upload request received');
  
  try {
    // Extract both file and form data from multipart request
    const parts = req.parts();
    let fileData: any = null;
    let formData: any = {};
    
    // Iterate through all parts to separate files and form fields
    for await (const part of parts) {
      if (part.type === 'file') {
        fileData = part;
      } else if (part.type === 'field') {
        formData[part.fieldname] = part.value;
      }
    }
    
    if (!fileData) {
      return res.status(400).send({ error: 'No file uploaded' });
    }
    
    // Extract file information
    const filename = fileData.filename || 'unknown';
    const mimeType = fileData.mimetype || 'application/octet-stream';
    const buffer = await fileData.toBuffer();
    const size = buffer.length;
    
    // Extract form fields with defaults
    const name = formData.name || filename;
    const tags = formData.tags ? formData.tags.split(',').map((tag: string) => tag.trim()) : [];
    
    // Handle metadata - could be JSON string or already an object
    let metadata = {};
    if (formData.metadata) {
      try {
        metadata = typeof formData.metadata === 'string' ? JSON.parse(formData.metadata) : formData.metadata;
      } catch (error) {
        logger.warn('Invalid metadata format, using empty object', { 
          metadata: formData.metadata, 
          error: (error as Error).message 
        });
        metadata = {};
      }
    }
    
    logger.info('Upload data extracted', { 
      filename, 
      name, 
      tags, 
      metadata, 
      size,
      formFields: Object.keys(formData)
    });
    
    const result = await uploadDocumentUseCase.execute({ 
      name,
      file: buffer,
      filename,
      mimeType,
      size,
      tags,
      metadata,
      userId: req.user?.sub
    });
    
    if (result.isErr()) {
      const error = result.unwrapErr();
      logger.error('Document upload failed', { error: error.message });
      res.status(400).send({ error: error.message });
      return;
    }

    const docDto = result.unwrap();
    logger.info('Document uploaded successfully', { statusCode: 201 });
    res.status(201).send(docDto);
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
    
    if (result.isErr()) {
      const error = result.unwrapErr();
      logger.error('Download link generation failed', { error: error.message, documentId: id });
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).send({ error: error.message });
      return;
    }

    const downloadResult = result.unwrap();
    logger.info('Download link generated successfully', { statusCode: 200, documentId: id });
    res.send({ downloadUrl: downloadResult.downloadUrl });
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
      
      // Get document and file content from the application service
      const result = await downloadDocumentByTokenUseCase.execute({ token });
      
      if (result.isErr()) {
        const error = result.unwrapErr();
        logger.error('Token-based download failed', { error: error.message });
        res.status(400).send({ error: error.message });
        return;
      }

      const downloadResult = result.unwrap();
      logger.info('Document downloaded by token successfully', { statusCode: 200 });
      
      // Set appropriate headers for file download
      res.header('Content-Type', downloadResult.document.mimeType);
      res.header('Content-Disposition', `attachment; filename="${downloadResult.document.name}"`);
      res.header('Content-Length', downloadResult.document.size);
      
      // Stream the file content
      res.send(downloadResult.file);
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