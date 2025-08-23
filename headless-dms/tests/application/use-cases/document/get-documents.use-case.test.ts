import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { container } from 'tsyringe';
import 'reflect-metadata';
import { AppResult, AppError } from '@carbonteq/hexapp';

import { GetDocumentsUseCase } from '../../../../src/application/use-cases/document/GetDocumentsUseCase.js';
import { Document } from '../../../../src/domain/entities/Document.js';
import { DocumentName } from '../../../../src/domain/value-objects/DocumentName.js';
import { MimeType } from '../../../../src/domain/value-objects/MimeType.js';
import { FileSize } from '../../../../src/domain/value-objects/FileSize.js';
import type { IDocumentApplicationService } from '../../../../src/ports/input/IDocumentApplicationService.js';
import type { ILogger, LogContext } from '../../../../src/ports/output/ILogger.js';
import { GetDocumentsRequest, GetDocumentsResponse } from '../../../../src/shared/dto/document/index.js';

describe('GetDocumentsUseCase', () => {
  let useCase: GetDocumentsUseCase;
  let mockDocumentApplicationService: sinon.SinonStubbedInstance<IDocumentApplicationService>;
  let mockLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockChildLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockDocuments: Document[];
  let mockRequest: GetDocumentsRequest;

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

    // Create mock documents
    mockDocuments = [
      {
        id: 'test-document-1',
        name: { value: 'test-document-1.pdf' } as DocumentName,
        filePath: '/uploads/test-document-1.pdf',
        mimeType: { value: 'application/pdf' } as MimeType,
        size: { bytes: 1024 } as FileSize,
        tags: ['test', 'document'],
        metadata: { category: 'test', priority: 'high' },
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        serialize: sinon.stub().returns({
          id: 'test-document-1',
          name: 'test-document-1.pdf',
          filePath: '/uploads/test-document-1.pdf',
          mimeType: 'application/pdf',
          size: '1024',
          tags: ['test', 'document'],
          metadata: { category: 'test', priority: 'high' },
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z')
        })
      } as unknown as Document,
      {
        id: 'test-document-2',
        name: { value: 'test-document-2.docx' } as DocumentName,
        filePath: '/uploads/test-document-2.docx',
        mimeType: { value: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' } as MimeType,
        size: { bytes: 2048 } as FileSize,
        tags: ['test', 'word'],
        metadata: { category: 'test', priority: 'medium' },
        createdAt: new Date('2024-01-02T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        serialize: sinon.stub().returns({
          id: 'test-document-2',
          name: 'test-document-2.docx',
          filePath: '/uploads/test-document-2.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: '2048',
          tags: ['test', 'word'],
          metadata: { category: 'test', priority: 'medium' },
          createdAt: new Date('2024-01-02T00:00:00Z'),
          updatedAt: new Date('2024-01-02T00:00:00Z')
        })
      } as unknown as Document
    ];

    // Create mock request
    mockRequest = {
      name: 'test',
      mimeType: 'application/pdf',
      fromDate: '2024-01-01',
      toDate: '2024-01-31',
      tags: ['test'],
      metadata: { category: 'test' },
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    };

    // Create use case instance
    useCase = new GetDocumentsUseCase(
      mockDocumentApplicationService as IDocumentApplicationService,
      mockLogger as ILogger
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('execute', () => {
    it('should successfully retrieve documents and return response', async () => {
      // Arrange
      mockDocumentApplicationService.getDocuments.resolves(AppResult.Ok(mockDocuments));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.isErr()).to.be.false;

      const response = result.unwrap();
      expect(response).to.deep.equal({
        document: [
          {
            id: 'test-document-1',
            name: 'test-document-1.pdf',
            filePath: '/uploads/test-document-1.pdf',
            mimeType: 'application/pdf',
            size: '1024',
            tags: ['test', 'document'],
            metadata: { category: 'test', priority: 'high' },
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-01T00:00:00Z')
          },
          {
            id: 'test-document-2',
            name: 'test-document-2.docx',
            filePath: '/uploads/test-document-2.docx',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            size: '2048',
            tags: ['test', 'word'],
            metadata: { category: 'test', priority: 'medium' },
            createdAt: new Date('2024-01-02T00:00:00Z'),
            updatedAt: new Date('2024-01-02T00:00:00Z')
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      });

      // Verify service call
      expect(mockDocumentApplicationService.getDocuments.called).to.be.true;
      const actualArgs = mockDocumentApplicationService.getDocuments.getCall(0).args;
      expect(actualArgs[0]).to.equal(1); // page
      expect(actualArgs[1]).to.equal(10); // limit
      expect(actualArgs[2]).to.equal('createdAt'); // sortBy
      expect(actualArgs[3]).to.equal('desc'); // sortOrder
      expect(actualArgs[4]).to.deep.equal({
        name: 'test',
        mimeType: 'application/pdf',
        tags: ['test'],
        from: '2024-01-01',
        to: '2024-01-31'
      }); // filters

      // Verify logging
      expect(mockChildLogger.info.calledWith(
        'Executing get documents use case',
        { 
          page: 1,
          limit: 10,
          name: 'test', 
          mimeType: 'application/pdf', 
          tags: ['test'], 
          fromDate: '2024-01-01',
          toDate: '2024-01-31'
        }
      )).to.be.true;
      expect(mockChildLogger.info.calledWith(
        'Documents retrieved successfully',
        { 
          documentCount: 2, 
          totalDocuments: 2,
          page: 1, 
          limit: 10 
        }
      )).to.be.true;
    });

    it('should handle empty documents result and return empty response', async () => {
      // Arrange
      mockDocumentApplicationService.getDocuments.resolves(AppResult.Ok([]));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.isErr()).to.be.false;

      const response = result.unwrap();
      expect(response.document).to.deep.equal([]);

      // Verify service call
      expect(mockDocumentApplicationService.getDocuments.calledOnce).to.be.true;

      // Verify logging
      expect(mockChildLogger.info.calledWith(
        'Documents retrieved successfully',
        { 
          documentCount: 0, 
          totalDocuments: 0,
          page: 1, 
          limit: 10 
        }
      )).to.be.true;
    });

    it('should handle documents retrieval failure and return error', async () => {
      // Arrange
      const serviceError = AppError.InvalidData('Documents retrieval failed');
      mockDocumentApplicationService.getDocuments.resolves(AppResult.Err(serviceError));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.status).to.equal(AppError.InvalidOperation().status);
      expect(error.message).to.include('Documents retrieval failed');

      // Verify service call
      expect(mockDocumentApplicationService.getDocuments.calledOnce).to.be.true;

      // Verify logging
      expect(mockChildLogger.warn.calledWith(
        'Documents retrieval failed',
        { 
          page: 1, 
          limit: 10,
          name: 'test', 
          mimeType: 'application/pdf'
        }
      )).to.be.true;
    });

    it('should handle service errors and return generic error', async () => {
      // Arrange
      const serviceError = new Error('Service error');
      mockDocumentApplicationService.getDocuments.rejects(serviceError);

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.status).to.equal(AppError.Generic('Service error').status);
      expect(error.message).to.include('Failed to execute get documents use case');

      // Verify service call
      expect(mockDocumentApplicationService.getDocuments.calledOnce).to.be.true;

      // Verify logging
      expect(mockChildLogger.error.calledWith(
        'Service error',
        { 
          page: 1, 
          limit: 10,
          name: 'test', 
          mimeType: 'application/pdf'
        }
      )).to.be.true;
    });

    it('should handle unknown errors and return generic error', async () => {
      // Arrange
      const unknownError = new Error('Unknown error string');
      mockDocumentApplicationService.getDocuments.rejects(unknownError);

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.status).to.equal(AppError.Generic('Unknown error string').status);
      expect(error.message).to.include('Failed to execute get documents use case');

      // Verify service call
      expect(mockDocumentApplicationService.getDocuments.calledOnce).to.be.true;

      // Verify logging
      expect(mockChildLogger.error.calledWith(
        'Unknown error string',
        { 
          page: 1, 
          limit: 10,
          name: 'test', 
          mimeType: 'application/pdf'
        }
      )).to.be.true;
    });

    it('should handle request with minimal parameters', async () => {
      // Arrange
      const minimalRequest: GetDocumentsRequest = {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      mockDocumentApplicationService.getDocuments.resolves(AppResult.Ok(mockDocuments));

      // Act
      const result = await useCase.execute(minimalRequest);

      // Assert
      expect(result.isOk()).to.be.true;

      // Verify service call with undefined filters
      expect(mockDocumentApplicationService.getDocuments.called).to.be.true;
      const actualArgs = mockDocumentApplicationService.getDocuments.getCall(0).args;
      expect(actualArgs[0]).to.equal(1); // page
      expect(actualArgs[1]).to.equal(20); // limit
      expect(actualArgs[2]).to.equal('createdAt'); // sortBy
      expect(actualArgs[3]).to.equal('desc'); // sortOrder
      expect(actualArgs[4]).to.deep.equal({
        name: undefined,
        mimeType: undefined,
        tags: undefined,
        from: undefined,
        to: undefined
      }); // filters

      // Verify logging
      expect(mockChildLogger.info.calledWith(
        'Executing get documents use case',
        { 
          page: 1,
          limit: 20,
          name: undefined,
          mimeType: undefined,
          tags: undefined,
          fromDate: undefined,
          toDate: undefined
        }
      )).to.be.true;
    });

    it('should handle request with only name filter', async () => {
      // Arrange
      const nameOnlyRequest: GetDocumentsRequest = {
        name: 'report',
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      mockDocumentApplicationService.getDocuments.resolves(AppResult.Ok(mockDocuments));

      // Act
      const result = await useCase.execute(nameOnlyRequest);

      // Assert
      expect(result.isOk()).to.be.true;

      // Verify service call with only name filter
      expect(mockDocumentApplicationService.getDocuments.called).to.be.true;
      const actualArgs = mockDocumentApplicationService.getDocuments.getCall(0).args;
      expect(actualArgs[0]).to.equal(1); // page
      expect(actualArgs[1]).to.equal(10); // limit
      expect(actualArgs[2]).to.equal('createdAt'); // sortBy
      expect(actualArgs[3]).to.equal('desc'); // sortOrder
      expect(actualArgs[4]).to.deep.equal({
        name: 'report',
        mimeType: undefined,
        tags: undefined,
        from: undefined,
        to: undefined
      }); // filters
    });

    it('should handle request with only tags filter', async () => {
      // Arrange
      const tagsOnlyRequest: GetDocumentsRequest = {
        tags: ['important', 'urgent'],
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      mockDocumentApplicationService.getDocuments.resolves(AppResult.Ok(mockDocuments));

      // Act
      const result = await useCase.execute(tagsOnlyRequest);

      // Assert
      expect(result.isOk()).to.be.true;

      // Verify service call with only tags filter
      expect(mockDocumentApplicationService.getDocuments.called).to.be.true;
      const actualArgs = mockDocumentApplicationService.getDocuments.getCall(0).args;
      expect(actualArgs[0]).to.equal(1); // page
      expect(actualArgs[1]).to.equal(10); // limit
      expect(actualArgs[2]).to.equal('createdAt'); // sortBy
      expect(actualArgs[3]).to.equal('desc'); // sortOrder
      expect(actualArgs[4]).to.deep.equal({
        name: undefined,
        mimeType: undefined,
        tags: ['important', 'urgent'],
        from: undefined,
        to: undefined
      }); // filters
    });

    it('should handle request with complex metadata filter', async () => {
      // Arrange
      const complexMetadataRequest: GetDocumentsRequest = {
        metadata: { 
          department: 'engineering', 
          priority: 'high',
          status: 'active'
        },
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      mockDocumentApplicationService.getDocuments.resolves(AppResult.Ok(mockDocuments));

      // Act
      const result = await useCase.execute(complexMetadataRequest);

      // Assert
      expect(result.isOk()).to.be.true;

      // Verify service call with complex metadata filter
      expect(mockDocumentApplicationService.getDocuments.calledWith(
        1, // page
        10, // limit
        'createdAt', // sortBy
        'desc', // sortOrder
        { 
          name: undefined,
          mimeType: undefined,
          tags: undefined,
          from: undefined,
          to: undefined
        }
      )).to.be.true;
    });

    it('should handle request with date range filter', async () => {
      // Arrange
      const dateRangeRequest: GetDocumentsRequest = {
        fromDate: '2024-01-01',
        toDate: '2024-12-31',
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      mockDocumentApplicationService.getDocuments.resolves(AppResult.Ok(mockDocuments));

      // Act
      const result = await useCase.execute(dateRangeRequest);

      // Assert
      expect(result.isOk()).to.be.true;

      // Verify service call with date range filter
      expect(mockDocumentApplicationService.getDocuments.called).to.be.true;
      const actualArgs = mockDocumentApplicationService.getDocuments.getCall(0).args;
      expect(actualArgs[0]).to.equal(1); // page
      expect(actualArgs[1]).to.equal(10); // limit
      expect(actualArgs[2]).to.equal('createdAt'); // sortBy
      expect(actualArgs[3]).to.equal('desc'); // sortOrder
      expect(actualArgs[4]).to.deep.equal({
        name: undefined,
        mimeType: undefined,
        tags: undefined,
        from: '2024-01-01',
        to: '2024-12-31'
      }); // filters
    });

    it('should handle request with MIME type filter', async () => {
      // Arrange
      const mimeTypeRequest: GetDocumentsRequest = {
        mimeType: 'image/jpeg',
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      mockDocumentApplicationService.getDocuments.resolves(AppResult.Ok(mockDocuments));

      // Act
      const result = await useCase.execute(mimeTypeRequest);

      // Assert
      expect(result.isOk()).to.be.true;

      // Verify service call with MIME type filter
      expect(mockDocumentApplicationService.getDocuments.called).to.be.true;
      const actualArgs = mockDocumentApplicationService.getDocuments.getCall(0).args;
      expect(actualArgs[0]).to.equal(1); // page
      expect(actualArgs[1]).to.equal(10); // limit
      expect(actualArgs[2]).to.equal('createdAt'); // sortBy
      expect(actualArgs[3]).to.equal('desc'); // sortOrder
      expect(actualArgs[4]).to.deep.equal({
        name: undefined,
        mimeType: 'image/jpeg',
        tags: undefined,
        from: undefined,
        to: undefined
      }); // filters
    });
  });
});
