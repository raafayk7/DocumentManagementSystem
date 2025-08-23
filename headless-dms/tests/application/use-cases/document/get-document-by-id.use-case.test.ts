import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { container } from 'tsyringe';
import 'reflect-metadata';
import { AppResult, AppError } from '@carbonteq/hexapp';

import { GetDocumentByIdUseCase } from '../../../../src/application/use-cases/document/GetDocumentByIdUseCase.js';
import { Document } from '../../../../src/domain/entities/Document.js';
import { DocumentName } from '../../../../src/domain/value-objects/DocumentName.js';
import { MimeType } from '../../../../src/domain/value-objects/MimeType.js';
import { FileSize } from '../../../../src/domain/value-objects/FileSize.js';
import type { IDocumentApplicationService } from '../../../../src/ports/input/IDocumentApplicationService.js';
import type { ILogger, LogContext } from '../../../../src/ports/output/ILogger.js';
import { GetDocumentByIdRequest, GetDocumentByIdResponse } from '../../../../src/shared/dto/document/index.js';

describe('GetDocumentByIdUseCase', () => {
  let useCase: GetDocumentByIdUseCase;
  let mockDocumentApplicationService: sinon.SinonStubbedInstance<IDocumentApplicationService>;
  let mockLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockChildLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockDocument: Document;
  let mockRequest: GetDocumentByIdRequest;

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

    // Create mock request
    mockRequest = {
      documentId: 'test-document-id'
    };

    // Create use case instance
    useCase = new GetDocumentByIdUseCase(
      mockDocumentApplicationService as IDocumentApplicationService,
      mockLogger as ILogger
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('execute', () => {
    it('should successfully retrieve a document by ID and return response', async () => {
      // Arrange
      mockDocumentApplicationService.getDocumentById.resolves(AppResult.Ok(mockDocument));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.isErr()).to.be.false;

      const response = result.unwrap();
      expect(response).to.deep.equal({
        document: {
          id: 'test-document-id',
          name: 'test-document.pdf',
          filePath: '/uploads/test-document.pdf',
          mimeType: 'application/pdf',
          size: '1024',
          tags: ['test', 'document'],
          metadata: { category: 'test', priority: 'high' },
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z')
        }
      });

      // Verify service call
      expect(mockDocumentApplicationService.getDocumentById.calledWith(
        'test-document-id'
      )).to.be.true;

      // Verify logging
      expect(mockChildLogger.info.calledWith(
        'Executing get document by ID use case',
        { documentId: 'test-document-id', userId: 'dummy-user-id' }
      )).to.be.true;
      expect(mockChildLogger.info.calledWith(
        'Document retrieved successfully',
        { documentId: 'test-document-id', name: 'test-document.pdf' }
      )).to.be.true;
    });

    it('should handle document not found and return NotFound error', async () => {
      // Arrange
      const serviceError = AppError.NotFound('Document not found');
      mockDocumentApplicationService.getDocumentById.resolves(AppResult.Err(serviceError));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.status).to.equal(AppError.NotFound().status);
      expect(error.message).to.include('Document not found with ID: test-document-id');

      // Verify service call
      expect(mockDocumentApplicationService.getDocumentById.calledOnce).to.be.true;

      // Verify logging
      expect(mockChildLogger.warn.calledWith(
        'Document not found',
        { documentId: 'test-document-id' }
      )).to.be.true;
    });

    it('should handle service errors and return generic error', async () => {
      // Arrange
      const serviceError = new Error('Service error');
      mockDocumentApplicationService.getDocumentById.rejects(serviceError);

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.status).to.equal(AppError.Generic('Service error').status);
      expect(error.message).to.include('Failed to execute get document by ID use case for document ID: test-document-id');

      // Verify service call
      expect(mockDocumentApplicationService.getDocumentById.calledOnce).to.be.true;

      // Verify logging
      expect(mockChildLogger.error.calledWith(
        'Service error',
        { documentId: 'test-document-id' }
      )).to.be.true;
    });

    it('should handle unknown errors and return generic error', async () => {
      // Arrange
      const unknownError = new Error('Unknown error string');
      mockDocumentApplicationService.getDocumentById.rejects(unknownError);

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.status).to.equal(AppError.Generic('Unknown error string').status);
      expect(error.message).to.include('Failed to execute get document by ID use case for document ID: test-document-id');

      // Verify service call
      expect(mockDocumentApplicationService.getDocumentById.calledOnce).to.be.true;

      // Verify logging
      expect(mockChildLogger.error.called).to.be.true;
      expect(mockChildLogger.error.calledWith(
        'Unknown error string',
        { documentId: 'test-document-id' }
      )).to.be.true;
    });

    it('should handle different document types correctly', async () => {
      // Arrange
      const imageDocument = {
        ...mockDocument,
        name: { value: 'test-image.jpg' } as DocumentName,
        mimeType: { value: 'image/jpeg' } as MimeType,
        size: { bytes: 2048 } as FileSize,
        tags: ['image', 'photo'],
        metadata: { format: 'jpeg', resolution: '1920x1080' }
      } as unknown as Document;

      mockDocumentApplicationService.getDocumentById.resolves(AppResult.Ok(imageDocument));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;

      const response = result.unwrap();
      expect(response.document.name).to.equal('test-image.jpg');
      expect(response.document.mimeType).to.equal('image/jpeg');
      expect(response.document.size).to.equal('2048');
      expect(response.document.tags).to.deep.equal(['image', 'photo']);
      expect(response.document.metadata).to.deep.equal({ format: 'jpeg', resolution: '1920x1080' });

      // Verify service call
      expect(mockDocumentApplicationService.getDocumentById.calledWith(
        'test-document-id'
      )).to.be.true;
    });

    it('should handle document with empty tags and metadata', async () => {
      // Arrange
      const simpleDocument = {
        ...mockDocument,
        tags: [],
        metadata: {}
      } as unknown as Document;

      mockDocumentApplicationService.getDocumentById.resolves(AppResult.Ok(simpleDocument));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;

      const response = result.unwrap();
      expect(response.document.tags).to.deep.equal([]);
      expect(response.document.metadata).to.deep.equal({});

      // Verify service call
      expect(mockDocumentApplicationService.getDocumentById.calledWith(
        'test-document-id'
      )).to.be.true;
    });

    it('should handle document with null metadata', async () => {
      // Arrange
      const documentWithNullMetadata = {
        ...mockDocument,
        metadata: null
      } as unknown as Document;

      mockDocumentApplicationService.getDocumentById.resolves(AppResult.Ok(documentWithNullMetadata));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;

      const response = result.unwrap();
      expect(response.document.metadata).to.be.null;

      // Verify service call
      expect(mockDocumentApplicationService.getDocumentById.calledWith(
        'test-document-id'
      )).to.be.true;
    });
  });
});
