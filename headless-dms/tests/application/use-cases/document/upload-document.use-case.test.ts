import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { container } from 'tsyringe';
import 'reflect-metadata';
import { AppResult, AppError } from '@carbonteq/hexapp';

import { UploadDocumentUseCase } from '../../../../src/application/use-cases/document/UploadDocumentUseCase.js';
import { Document } from '../../../../src/domain/entities/Document.js';
import { DocumentName } from '../../../../src/domain/value-objects/DocumentName.js';
import { MimeType } from '../../../../src/domain/value-objects/MimeType.js';
import { FileSize } from '../../../../src/domain/value-objects/FileSize.js';
import type { IDocumentApplicationService } from '../../../../src/ports/input/IDocumentApplicationService.js';
import type { ILogger, LogContext } from '../../../../src/ports/output/ILogger.js';
import { UploadDocumentRequest, UploadDocumentResponse } from '../../../../src/shared/dto/document/index.js';

describe('UploadDocumentUseCase', () => {
  let useCase: UploadDocumentUseCase;
  let mockDocumentApplicationService: sinon.SinonStubbedInstance<IDocumentApplicationService>;
  let mockLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockChildLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockDocument: Document;
  let mockRequest: UploadDocumentRequest;

  beforeEach(() => {
    // Create mock instances
    mockDocumentApplicationService = {
      createDocument: sinon.stub(),
      getDocumentById: sinon.stub(),
      getDocuments: sinon.stub(),
      updateDocumentName: sinon.stub(),
      updateDocumentMetadata: sinon.stub(),
      addTagsToDocument: sinon.stub(),
      removeTagsFromDocument: sinon.stub(),
      replaceTagsInDocument: sinon.stub(),
      deleteDocument: sinon.stub(),
      uploadDocument: sinon.stub(),
      downloadDocument: sinon.stub(),
      generateDownloadLink: sinon.stub(),
      downloadDocumentByToken: sinon.stub(),
      getDocument: sinon.stub(),
      getDocumentByName: sinon.stub(),
      getDocumentsByTags: sinon.stub(),
      getDocumentsByMimeType: sinon.stub()
    };

    // Create child logger mock
    mockChildLogger = {
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
      log: sinon.stub(),
      logError: sinon.stub(),
      logRequest: sinon.stub(),
      logResponse: sinon.stub(),
      child: sinon.stub<[LogContext], ILogger>().returns(mockChildLogger as ILogger)
    };

    mockLogger = {
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
      log: sinon.stub(),
      logError: sinon.stub(),
      logRequest: sinon.stub(),
      logResponse: sinon.stub(),
      child: sinon.stub<[LogContext], ILogger>().returns(mockChildLogger as ILogger)
    };

    // Create mock document entity
    mockDocument = {
      id: 'test-document-id',
      name: { value: 'test-document.pdf' } as DocumentName,
      filePath: '/uploads/test-document.pdf',
      mimeType: { value: 'application/pdf' } as MimeType,
      size: { bytes: 1024 } as FileSize,
      tags: ['test', 'document'],
      metadata: { category: 'test', priority: 'high' },
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      serialize: sinon.stub().returns({
        id: 'test-document-id',
        name: 'test-document.pdf',
        filePath: '/uploads/test-document.pdf',
        mimeType: 'application/pdf',
        size: '1024',
        tags: ['test', 'document'],
        metadata: { category: 'test', priority: 'high' },
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      })
    } as unknown as Document;

    // Create mock request
    mockRequest = {
      name: 'test-document.pdf',
      file: Buffer.from('test file content'),
      filename: '/uploads/test-document.pdf',
      mimeType: 'application/pdf',
      size: 1024,
      userId: 'test-user-id',
      tags: ['test', 'document'],
      metadata: { category: 'test', priority: 'high' }
    };

    // Create use case instance
    useCase = new UploadDocumentUseCase(
      mockDocumentApplicationService as IDocumentApplicationService,
      mockLogger as ILogger
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('execute', () => {
    it('should successfully upload a document and return response', async () => {
      // Arrange
      mockDocumentApplicationService.createDocument.resolves(AppResult.Ok(mockDocument));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.isErr()).to.be.false;

      const response = result.unwrap();
      expect(response).to.deep.equal({
        success: true,
        message: 'Document uploaded successfully'
      });

      // Verify service call
      expect(mockDocumentApplicationService.createDocument.calledWith(
        'test-user-id',
        'test-document.pdf',
        '/uploads/test-document.pdf',
        'application/pdf',
        '1024',
        ['test', 'document'],
        { category: 'test', priority: 'high' }
      )).to.be.true;

      // Verify logging
      expect(mockChildLogger.info.calledWith(
        'Executing upload document use case',
        { 
          name: 'test-document.pdf', 
          filePath: '/uploads/test-document.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          userId: 'test-user-id' 
        }
      )).to.be.true;
      expect(mockChildLogger.info.calledWith(
        'Document uploaded successfully',
        { name: 'test-document.pdf', userId: 'test-user-id' }
      )).to.be.true;
    });

    it('should handle document upload failure and return error', async () => {
      // Arrange
      const serviceError = AppError.InvalidData('Document upload failed');
      mockDocumentApplicationService.createDocument.resolves(AppResult.Err(serviceError));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.status).to.equal(AppError.InvalidData().status);
      expect(error.message).to.include('Document upload failed for name: test-document.pdf, filePath: /uploads/test-document.pdf');

      // Verify service call
      expect(mockDocumentApplicationService.createDocument.calledOnce).to.be.true;

      // Verify logging
      expect(mockChildLogger.warn.calledWith(
        'Document upload failed',
        { 
          name: 'test-document.pdf', 
          filePath: '/uploads/test-document.pdf',
          userId: 'test-user-id' 
        }
      )).to.be.true;
    });

    it('should handle service errors and return generic error', async () => {
      // Arrange
      const serviceError = new Error('Service error');
      mockDocumentApplicationService.createDocument.rejects(serviceError);

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.status).to.equal(AppError.Generic('Service error').status);
      expect(error.message).to.include('Failed to execute upload document use case for name: test-document.pdf, filePath: /uploads/test-document.pdf');

      // Verify service call
      expect(mockDocumentApplicationService.createDocument.calledOnce).to.be.true;

      // Verify logging
      expect(mockChildLogger.error.calledWith(
        'Service error',
        { 
          name: 'test-document.pdf', 
          filePath: '/uploads/test-document.pdf',
          userId: 'test-user-id' 
        }
      )).to.be.true;
    });

    it('should handle unknown errors and return generic error', async () => {
      // Arrange
      const unknownError = new Error('Unknown error string');
      mockDocumentApplicationService.createDocument.rejects(unknownError);

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.status).to.equal(AppError.Generic('Unknown error string').status);
      expect(error.message).to.include('Failed to execute upload document use case for name: test-document.pdf, filePath: /uploads/test-document.pdf');

      // Verify service call
      expect(mockDocumentApplicationService.createDocument.calledOnce).to.be.true;

      // Verify logging
      expect(mockChildLogger.error.calledWith(
        'Unknown error string',
        { 
          name: 'test-document.pdf', 
          filePath: '/uploads/test-document.pdf',
          userId: 'test-user-id' 
        }
      )).to.be.true;
    });

    it('should handle request with optional fields', async () => {
      // Arrange
      const requestWithoutOptionals: UploadDocumentRequest = {
        name: 'simple-document.pdf',
        file: Buffer.from('simple content'),
        filename: '/uploads/simple-document.pdf',
        mimeType: 'application/pdf',
        size: 512,
        userId: 'test-user-id'
        // tags and metadata are optional
      };

      const simpleDocument = {
        ...mockDocument,
        name: { value: 'simple-document.pdf' } as DocumentName,
        tags: [],
        metadata: {}
      } as unknown as Document;

      mockDocumentApplicationService.createDocument.resolves(AppResult.Ok(simpleDocument));

      // Act
      const result = await useCase.execute(requestWithoutOptionals);

      // Assert
      expect(result.isOk()).to.be.true;

      const response = result.unwrap();
      expect(response.success).to.be.true;
      expect(response.message).to.equal('Document uploaded successfully');

      // Verify service call with default values
      expect(mockDocumentApplicationService.createDocument.calledWith(
        'test-user-id',
        'simple-document.pdf',
        '/uploads/simple-document.pdf',
        'application/pdf',
        '512',
        undefined,
        undefined
      )).to.be.true;
    });

    it('should handle different file types correctly', async () => {
      // Arrange
      const imageRequest: UploadDocumentRequest = {
        ...mockRequest,
        name: 'test-image.jpg',
        filename: '/uploads/test-image.jpg',
        mimeType: 'image/jpeg',
        size: 2048
      };

      mockDocumentApplicationService.createDocument.resolves(AppResult.Ok(mockDocument));

      // Act
      const result = await useCase.execute(imageRequest);

      // Assert
      expect(result.isOk()).to.be.true;

      // Verify service call with image parameters
      expect(mockDocumentApplicationService.createDocument.calledWith(
        'test-user-id',
        'test-image.jpg',
        '/uploads/test-image.jpg',
        'image/jpeg',
        '2048',
        ['test', 'document'],
        { category: 'test', priority: 'high' }
      )).to.be.true;
    });

    it('should handle large file sizes correctly', async () => {
      // Arrange
      const largeFileRequest: UploadDocumentRequest = {
        ...mockRequest,
        size: 1048576 // 1MB
      };

      mockDocumentApplicationService.createDocument.resolves(AppResult.Ok(mockDocument));

      // Act
      const result = await useCase.execute(largeFileRequest);

      // Assert
      expect(result.isOk()).to.be.true;

      // Verify service call with large file size
      expect(mockDocumentApplicationService.createDocument.calledWith(
        'test-user-id',
        'test-document.pdf',
        '/uploads/test-document.pdf',
        'application/pdf',
        '1048576',
        ['test', 'document'],
        { category: 'test', priority: 'high' }
      )).to.be.true;
    });
  });
});
