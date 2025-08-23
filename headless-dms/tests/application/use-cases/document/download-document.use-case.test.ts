import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { container } from 'tsyringe';
import 'reflect-metadata';
import { AppResult, AppError } from '@carbonteq/hexapp';

import { DownloadDocumentUseCase } from '../../../../src/application/use-cases/document/DownloadDocumentUseCase.js';
import { Document } from '../../../../src/domain/entities/Document.js';
import { DocumentName } from '../../../../src/domain/value-objects/DocumentName.js';
import { MimeType } from '../../../../src/domain/value-objects/MimeType.js';
import { FileSize } from '../../../../src/domain/value-objects/FileSize.js';
import type { IDocumentApplicationService } from '../../../../src/ports/input/IDocumentApplicationService.js';
import type { ILogger, LogContext } from '../../../../src/ports/output/ILogger.js';
import { DownloadDocumentRequest, DownloadDocumentResponse } from '../../../../src/shared/dto/document/index.js';

describe('DownloadDocumentUseCase', () => {
  let useCase: DownloadDocumentUseCase;
  let mockDocumentApplicationService: sinon.SinonStubbedInstance<IDocumentApplicationService>;
  let mockLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockChildLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockDocument: Document;
  let mockRequest: DownloadDocumentRequest;
  let mockDownloadInfo: { document: Document; file: Buffer };

  beforeEach(() => {
    // Create mock instances
    mockDocumentApplicationService = {
      createDocument: sinon.stub(),
      getDocument: sinon.stub(),
      getDocumentById: sinon.stub(),
      getDocumentByName: sinon.stub(),
      getDocuments: sinon.stub(),
      getDocumentsByTags: sinon.stub(),
      getDocumentsByMimeType: sinon.stub(),
      updateDocumentName: sinon.stub(),
      updateDocumentMetadata: sinon.stub(),
      addTagsToDocument: sinon.stub(),
      removeTagsFromDocument: sinon.stub(),
      replaceTagsInDocument: sinon.stub(),
      deleteDocument: sinon.stub(),
      uploadDocument: sinon.stub(),
      downloadDocument: sinon.stub(),
      generateDownloadLink: sinon.stub(),
      downloadDocumentByToken: sinon.stub()
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
      child: sinon.stub()
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

    // Create mock download info
    mockDownloadInfo = {
      document: mockDocument,
      file: Buffer.from('test file content')
    };

    // Create mock request
    mockRequest = {
      documentId: 'test-document-id',
      userId: 'test-user-id'
    };

    // Create use case instance
    useCase = new DownloadDocumentUseCase(
      mockDocumentApplicationService as IDocumentApplicationService,
      mockLogger as ILogger
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('execute', () => {
    it('should successfully download document and return response', async () => {
      // Arrange
      mockDocumentApplicationService.downloadDocument.resolves(AppResult.Ok(mockDownloadInfo));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.isErr()).to.be.false;

      const response = result.unwrap();
      expect(response).to.deep.equal({
        filename: 'test-document.pdf',
        filePath: '/uploads/test-document.pdf',
        mimeType: 'application/pdf',
        size: 1024
      });

      // Verify service call
      expect(mockDocumentApplicationService.downloadDocument.calledWith(
        'test-document-id',
        'test-user-id'
      )).to.be.true;

      // Verify logging
      expect(mockChildLogger.info.calledWith(
        'Executing download document use case',
        { 
          documentId: 'test-document-id',
          userId: 'test-user-id'
        }
      )).to.be.true;
      expect(mockChildLogger.info.calledWith(
        'Document downloaded successfully',
        { 
          documentId: 'test-document-id',
          userId: 'test-user-id',
          fileSize: 17 // Length of 'test file content'
        }
      )).to.be.true;
    });

    it('should handle document download failure and return error', async () => {
      // Arrange
      const serviceError = AppError.InvalidOperation('Document download failed');
      mockDocumentApplicationService.downloadDocument.resolves(AppResult.Err(serviceError));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.status).to.equal(AppError.InvalidOperation().status);
      expect(error.message).to.include('Document download failed for document ID: test-document-id');

      // Verify service call
      expect(mockDocumentApplicationService.downloadDocument.calledWith(
        'test-document-id',
        'test-user-id'
      )).to.be.true;

      // Verify logging
      expect(mockChildLogger.warn.calledWith(
        'Document download failed',
        { 
          documentId: 'test-document-id',
          userId: 'test-user-id'
        }
      )).to.be.true;
    });

    it('should handle service errors and return generic error', async () => {
      // Arrange
      const serviceError = new Error('Service error');
      mockDocumentApplicationService.downloadDocument.rejects(serviceError);

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.status).to.equal(AppError.Generic('Failed to execute download document use case').status);
      expect(error.message).to.include('Failed to execute download document use case for document ID: test-document-id');

      // Verify service call
      expect(mockDocumentApplicationService.downloadDocument.calledWith(
        'test-document-id',
        'test-user-id'
      )).to.be.true;

      // Verify logging
      expect(mockChildLogger.error.calledWith(
        'Service error',
        { 
          documentId: 'test-document-id',
          userId: 'test-user-id'
        }
      )).to.be.true;
    });

    it('should handle unknown errors and return generic error', async () => {
      // Arrange
      const unknownError = new Error('Unknown error string');
      mockDocumentApplicationService.downloadDocument.rejects(unknownError);

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.status).to.equal(AppError.Generic('Failed to execute download document use case').status);
      expect(error.message).to.include('Failed to execute download document use case for document ID: test-document-id');

      // Verify service call
      expect(mockDocumentApplicationService.downloadDocument.calledWith(
        'test-document-id',
        'test-user-id'
      )).to.be.true;

      // Verify logging
      expect(mockChildLogger.error.calledWith(
        'Unknown error string',
        { 
          documentId: 'test-document-id',
          userId: 'test-user-id'
        }
      )).to.be.true;
    });

    it('should handle different document types correctly', async () => {
      // Arrange
      const imageDocument = {
        ...mockDocument,
        name: { value: 'test-image.jpg' } as DocumentName,
        mimeType: { value: 'image/jpeg' } as MimeType,
        size: { bytes: 2048 } as FileSize
      } as unknown as Document;

      const imageDownloadInfo = {
        document: imageDocument,
        file: Buffer.from('image file content')
      };

      mockDocumentApplicationService.downloadDocument.resolves(AppResult.Ok(imageDownloadInfo));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;

      const response = result.unwrap();
      expect(response.filename).to.equal('test-image.jpg');
      expect(response.mimeType).to.equal('image/jpeg');
      expect(response.size).to.equal(2048);

      // Verify service call
      expect(mockDocumentApplicationService.downloadDocument.calledWith(
        'test-document-id',
        'test-user-id'
      )).to.be.true;
    });

    it('should handle large file sizes correctly', async () => {
      // Arrange
      const largeDocument = {
        ...mockDocument,
        size: { bytes: 1048576 } as FileSize // 1MB
      } as unknown as Document;

      const largeDownloadInfo = {
        document: largeDocument,
        file: Buffer.alloc(1048576) // 1MB buffer
      };

      mockDocumentApplicationService.downloadDocument.resolves(AppResult.Ok(largeDownloadInfo));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;

      const response = result.unwrap();
      expect(response.size).to.equal(1048576);

      // Verify logging includes correct file size
      expect(mockChildLogger.info.calledWith(
        'Document downloaded successfully',
        { 
          documentId: 'test-document-id',
          userId: 'test-user-id',
          fileSize: 1048576
        }
      )).to.be.true;
    });

    it('should handle different user IDs correctly', async () => {
      // Arrange
      const requestWithDifferentUser: DownloadDocumentRequest = {
        documentId: 'test-document-id',
        userId: 'different-user-id'
      };

      mockDocumentApplicationService.downloadDocument.resolves(AppResult.Ok(mockDownloadInfo));

      // Act
      const result = await useCase.execute(requestWithDifferentUser);

      // Assert
      expect(result.isOk()).to.be.true;

      // Verify service call with different user ID
      expect(mockDocumentApplicationService.downloadDocument.calledWith(
        'test-document-id',
        'different-user-id'
      )).to.be.true;
    });

    it('should handle different document IDs correctly', async () => {
      // Arrange
      const requestWithDifferentDocument: DownloadDocumentRequest = {
        documentId: 'different-doc-id-123',
        userId: 'test-user-id'
      };

      mockDocumentApplicationService.downloadDocument.resolves(AppResult.Ok(mockDownloadInfo));

      // Act
      const result = await useCase.execute(requestWithDifferentDocument);

      // Assert
      expect(result.isOk()).to.be.true;

      // Verify service call with different document ID
      expect(mockDocumentApplicationService.downloadDocument.calledWith(
        'different-doc-id-123',
        'test-user-id'
      )).to.be.true;
    });

    it('should handle empty file content gracefully', async () => {
      // Arrange
      const emptyFileDownloadInfo = {
        document: mockDocument,
        file: Buffer.alloc(0) // Empty buffer
      };

      mockDocumentApplicationService.downloadDocument.resolves(AppResult.Ok(emptyFileDownloadInfo));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;

      const response = result.unwrap();
      expect(response.size).to.equal(1024); // Document size, not file buffer size

      // Verify logging includes correct file size (0 for empty buffer)
      expect(mockChildLogger.info.calledWith(
        'Document downloaded successfully',
        { 
          documentId: 'test-document-id',
          userId: 'test-user-id',
          fileSize: 0
        }
      )).to.be.true;
    });
  });
});
