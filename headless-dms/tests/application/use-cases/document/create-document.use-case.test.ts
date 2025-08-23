import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { container } from 'tsyringe';
import 'reflect-metadata';
import { AppResult, AppError } from '@carbonteq/hexapp';

import { CreateDocumentUseCase } from '../../../../src/application/use-cases/document/CreateDocumentUseCase.js';
import { Document } from '../../../../src/domain/entities/Document.js';
import { DocumentName } from '../../../../src/domain/value-objects/DocumentName.js';
import { MimeType } from '../../../../src/domain/value-objects/MimeType.js';
import { FileSize } from '../../../../src/domain/value-objects/FileSize.js';
import type { IDocumentApplicationService } from '../../../../src/ports/input/IDocumentApplicationService.js';
import type { ILogger, LogContext } from '../../../../src/ports/output/ILogger.js';
import { CreateDocumentRequest, DocumentResponse } from '../../../../src/shared/dto/document/index.js';

describe('CreateDocumentUseCase', () => {
  let useCase: CreateDocumentUseCase;
  let mockDocumentApplicationService: sinon.SinonStubbedInstance<IDocumentApplicationService>;
  let mockLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockChildLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockDocument: Document;
  let mockRequest: CreateDocumentRequest;

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
      name: 'test-document.pdf',
      filePath: '/uploads/test-document.pdf',
      mimeType: 'application/pdf',
      size: '1024',
      userId: 'test-user-id',
      tags: ['test', 'document'],
      metadata: { category: 'test', priority: 'high' }
    };

    // Create use case instance
    useCase = new CreateDocumentUseCase(
      mockDocumentApplicationService as IDocumentApplicationService,
      mockLogger as ILogger
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('execute', () => {
    it('should successfully create a document and return response', async () => {
      // Arrange
      mockDocumentApplicationService.createDocument.resolves(AppResult.Ok(mockDocument));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.isErr()).to.be.false;

      const response = result.unwrap();
      expect(response).to.deep.equal({
        id: 'test-document-id',
        name: 'test-document.pdf',
        filePath: '/uploads/test-document.pdf',
        mimeType: 'application/pdf',
        size: '1024',
        tags: ['test', 'document'],
        metadata: { category: 'test', priority: 'high' },
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
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
        'Executing create document use case',
        { name: 'test-document.pdf', filePath: '/uploads/test-document.pdf', userId: 'test-user-id' }
      )).to.be.true;
      expect(mockChildLogger.info.calledWith(
        'Document created successfully',
        { documentId: 'test-document-id', name: 'test-document.pdf', userId: 'test-user-id' }
      )).to.be.true;
    });

    it('should handle document creation failure and return error', async () => {
      // Arrange
      const serviceError = AppError.InvalidData('Document creation failed');
      mockDocumentApplicationService.createDocument.resolves(AppResult.Err(serviceError));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.status).to.equal(AppError.InvalidData().status);
      expect(error.message).to.equal('Document creation failed');

      // Verify service call
      expect(mockDocumentApplicationService.createDocument.calledOnce).to.be.true;

      // Verify logging
      expect(mockChildLogger.warn.calledWith(
        'Document creation failed',
        { name: 'test-document.pdf', filePath: '/uploads/test-document.pdf', userId: 'test-user-id', error: 'Document creation failed' }
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
      expect(error.message).to.equal('Service error');

      // Verify service call
      expect(mockDocumentApplicationService.createDocument.calledOnce).to.be.true;

      // Verify logging
      expect(mockChildLogger.error.calledWith(
        'Service error',
        { name: 'test-document.pdf', filePath: '/uploads/test-document.pdf', userId: 'test-user-id' }
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
      expect(error.message).to.equal('Unknown error string');

      // Verify service call
      expect(mockDocumentApplicationService.createDocument.calledOnce).to.be.true;

      // Verify logging
      expect(mockChildLogger.error.calledWith(
        'Unknown error string',
        { name: 'test-document.pdf', filePath: '/uploads/test-document.pdf', userId: 'test-user-id' }
      )).to.be.true;
    });

    it('should handle request with optional fields', async () => {
      // Arrange
      const requestWithoutOptionals: CreateDocumentRequest = {
        name: 'simple-document.pdf',
        filePath: '/uploads/simple-document.pdf',
        mimeType: 'application/pdf',
        size: '512',
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
      expect(response.tags).to.deep.equal([]);
      expect(response.metadata).to.deep.equal({});

      // Verify service call with default values
      expect(mockDocumentApplicationService.createDocument.calledWith(
        'test-user-id',
        'simple-document.pdf',
        '/uploads/simple-document.pdf',
        'application/pdf',
        '512',
        [],
        undefined
      )).to.be.true;
    });

    it('should handle empty tags array in request', async () => {
      // Arrange
      const requestWithEmptyTags: CreateDocumentRequest = {
        ...mockRequest,
        tags: []
      };

      mockDocumentApplicationService.createDocument.resolves(AppResult.Ok(mockDocument));

      // Act
      const result = await useCase.execute(requestWithEmptyTags);

      // Assert
      expect(result.isOk()).to.be.true;

      // Verify service call with empty tags array
      expect(mockDocumentApplicationService.createDocument.calledWith(
        'test-user-id',
        'test-document.pdf',
        '/uploads/test-document.pdf',
        'application/pdf',
        '1024',
        [],
        { category: 'test', priority: 'high' }
      )).to.be.true;
    });

    it('should handle null metadata in request', async () => {
      // Arrange
      const requestWithNullMetadata: CreateDocumentRequest = {
        ...mockRequest,
        metadata: null as any
      };

      mockDocumentApplicationService.createDocument.resolves(AppResult.Ok(mockDocument));

      // Act
      const result = await useCase.execute(requestWithNullMetadata);

      // Assert
      expect(result.isOk()).to.be.true;

      // Verify service call with null metadata
      expect(mockDocumentApplicationService.createDocument.calledWith(
        'test-user-id',
        'test-document.pdf',
        '/uploads/test-document.pdf',
        'application/pdf',
        '1024',
        ['test', 'document']
      )).to.be.true;
    });
  });
});
