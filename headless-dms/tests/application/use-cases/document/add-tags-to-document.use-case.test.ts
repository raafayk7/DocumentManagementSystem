import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { container } from 'tsyringe';
import 'reflect-metadata';
import { AppResult, AppError } from '@carbonteq/hexapp';

import { AddTagsToDocumentUseCase } from '../../../../src/application/use-cases/document/AddTagstoDocumentUseCase.js';
import { Document } from '../../../../src/domain/entities/Document.js';
import { DocumentName } from '../../../../src/domain/value-objects/DocumentName.js';
import { MimeType } from '../../../../src/domain/value-objects/MimeType.js';
import { FileSize } from '../../../../src/domain/value-objects/FileSize.js';
import type { IDocumentApplicationService } from '../../../../src/ports/input/IDocumentApplicationService.js';
import type { ILogger, LogContext } from '../../../../src/ports/output/ILogger.js';
import { AddTagsToDocumentRequest, AddTagsToDocumentResponse } from '../../../../src/shared/dto/document/index.js';

describe('AddTagsToDocumentUseCase', () => {
  let useCase: AddTagsToDocumentUseCase;
  let mockDocumentApplicationService: sinon.SinonStubbedInstance<IDocumentApplicationService>;
  let mockLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockChildLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockDocument: Document;
  let mockRequest: AddTagsToDocumentRequest;

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
      tags: ['test', 'document', 'new-tag', 'important'],
      metadata: { category: 'test', priority: 'high' },
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      serialize: sinon.stub().returns({
        id: 'test-document-id',
        name: 'test-document.pdf',
        filePath: '/uploads/test-document.pdf',
        mimeType: 'application/pdf',
        size: '1024',
        tags: ['test', 'document', 'new-tag', 'important'],
        metadata: { category: 'test', priority: 'high' },
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      }),
      // Add missing Document properties
      _name: { value: 'test-document.pdf' } as DocumentName,
      _filePath: '/uploads/test-document.pdf',
      _mimeType: { value: 'application/pdf' } as MimeType,
      _size: { bytes: 1024 } as FileSize,
      _tags: ['test', 'document', 'new-tag', 'important'],
      _metadata: { category: 'test', priority: 'high' },
      _id: 'test-document-id',
      _createdAt: new Date('2024-01-01T00:00:00Z'),
      _updatedAt: new Date('2024-01-01T00:00:00Z'),
      _fromSerialized: sinon.stub(),
      isDeleted: false,
      delete: sinon.stub(),
      restore: sinon.stub(),
      toRepository: sinon.stub().returns({
        id: 'test-document-id',
        name: 'test-document.pdf',
        filePath: '/uploads/test-document.pdf',
        mimeType: 'application/pdf',
        size: '1024',
        tags: ['test', 'document', 'new-tag', 'important'],
        metadata: { category: 'test', priority: 'high' },
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      })
    } as unknown as Document;

    // Create mock request
    mockRequest = {
      documentId: 'test-document-id',
      tags: ['new-tag', 'important'],
      userId: 'test-user-id'
    };

    // Create use case instance
    useCase = new AddTagsToDocumentUseCase(
      mockDocumentApplicationService as IDocumentApplicationService,
      mockLogger as ILogger
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('execute', () => {
    it('should successfully add tags to document and return response', async () => {
      // Arrange
      mockDocumentApplicationService.addTagsToDocument.resolves(AppResult.Ok(mockDocument));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.isErr()).to.be.false;

      const response = result.unwrap();
      expect(response).to.deep.equal({
        success: true,
        message: 'Tags added successfully to document: new-tag, important'
      });

      // Verify service call
      expect(mockDocumentApplicationService.addTagsToDocument.calledWith(
        'test-document-id',
        ['new-tag', 'important'],
        'test-user-id'
      )).to.be.true;

      // Verify logging
      expect(mockChildLogger.info.calledWith(
        'Executing add tags to document use case',
        { 
          documentId: 'test-document-id', 
          tags: ['new-tag', 'important'],
          userId: 'test-user-id' 
        }
      )).to.be.true;
      expect(mockChildLogger.info.calledWith(
        'Document tags added successfully',
        { 
          documentId: 'test-document-id', 
          addedTags: ['new-tag', 'important'],
          totalTags: 4 
        }
      )).to.be.true;
    });

    it('should handle document tags addition failure and return error', async () => {
      // Arrange
      const serviceError = AppError.InvalidOperation('Document tags addition failed');
      mockDocumentApplicationService.addTagsToDocument.resolves(AppResult.Err(serviceError));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.status).to.equal(AppError.InvalidOperation().status);
      expect(error.message).to.include('Document tags addition failed for document ID: test-document-id with tags: new-tag, important');

      // Verify service call
      expect(mockDocumentApplicationService.addTagsToDocument.calledOnce).to.be.true;

      // Verify logging
      expect(mockChildLogger.warn.calledWith(
        'Document tags addition failed',
        { 
          documentId: 'test-document-id', 
          tags: ['new-tag', 'important'],
          userId: 'test-user-id' 
        }
      )).to.be.true;
    });

    it('should handle service errors and return generic error', async () => {
      // Arrange
      const serviceError = new Error('Service error');
      mockDocumentApplicationService.addTagsToDocument.rejects(serviceError);

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.status).to.equal(AppError.Generic('Service error').status);
      expect(error.message).to.include('Failed to execute add tags to document use case for document ID: test-document-id');

      // Verify service call
      expect(mockDocumentApplicationService.addTagsToDocument.calledOnce).to.be.true;

      // Verify logging
      expect(mockChildLogger.error.calledWith(
        'Service error',
        { 
          documentId: 'test-document-id', 
          tags: ['new-tag', 'important'],
          userId: 'test-user-id' 
        }
      )).to.be.true;
    });

    it('should handle unknown errors and return generic error', async () => {
      // Arrange
      const unknownError = new Error('Unknown error string');
      mockDocumentApplicationService.addTagsToDocument.rejects(unknownError);

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.status).to.equal(AppError.Generic('Unknown error string').status);
      expect(error.message).to.include('Failed to execute add tags to document use case for document ID: test-document-id');

      // Verify service call
      expect(mockDocumentApplicationService.addTagsToDocument.calledOnce).to.be.true;

      // Verify logging
      expect(mockChildLogger.error.calledWith(
        'Unknown error string',
        { 
          documentId: 'test-document-id', 
          tags: ['new-tag', 'important'],
          userId: 'test-user-id' 
        }
      )).to.be.true;
    });

    it('should handle request with single tag', async () => {
      // Arrange
      const requestWithSingleTag: AddTagsToDocumentRequest = {
        ...mockRequest,
        tags: ['urgent']
      };

      const documentWithSingleTag = {
        ...mockDocument,
        tags: ['test', 'document', 'urgent']
      } as Document;

      mockDocumentApplicationService.addTagsToDocument.resolves(AppResult.Ok(documentWithSingleTag));

      // Act
      const result = await useCase.execute(requestWithSingleTag);

      // Assert
      expect(result.isOk()).to.be.true;

      const response = result.unwrap();
      expect(response.success).to.be.true;
      expect(response.message).to.equal('Tags added successfully to document: urgent');

      // Verify service call with single tag
      expect(mockDocumentApplicationService.addTagsToDocument.calledWith(
        'test-document-id',
        ['urgent'],
        'test-user-id'
      )).to.be.true;
    });

    it('should handle request with multiple tags', async () => {
      // Arrange
      const requestWithMultipleTags: AddTagsToDocumentRequest = {
        ...mockRequest,
        tags: ['financial', 'quarterly', 'review']
      };

      const documentWithMultipleTags = {
        ...mockDocument,
        tags: ['test', 'document', 'financial', 'quarterly', 'review']
      } as Document;

      mockDocumentApplicationService.addTagsToDocument.resolves(AppResult.Ok(documentWithMultipleTags));

      // Act
      const result = await useCase.execute(requestWithMultipleTags);

      // Assert
      expect(result.isOk()).to.be.true;

      const response = result.unwrap();
      expect(response.success).to.be.true;
      expect(response.message).to.equal('Tags added successfully to document: financial, quarterly, review');

      // Verify service call with multiple tags
      expect(mockDocumentApplicationService.addTagsToDocument.calledWith(
        'test-document-id',
        ['financial', 'quarterly', 'review'],
        'test-user-id'
      )).to.be.true;
    });

    it('should handle request with empty tags array', async () => {
      // Arrange
      const requestWithEmptyTags: AddTagsToDocumentRequest = {
        ...mockRequest,
        tags: []
      };

      mockDocumentApplicationService.addTagsToDocument.resolves(AppResult.Ok(mockDocument));

      // Act
      const result = await useCase.execute(requestWithEmptyTags);

      // Assert
      expect(result.isOk()).to.be.true;

      const response = result.unwrap();
      expect(response.success).to.be.true;
      expect(response.message).to.equal('Tags added successfully to document: ');

      // Verify service call with empty tags array
      expect(mockDocumentApplicationService.addTagsToDocument.calledWith(
        'test-document-id',
        [],
        'test-user-id'
      )).to.be.true;
    });

    it('should handle tags with special characters', async () => {
      // Arrange
      const requestWithSpecialChars: AddTagsToDocumentRequest = {
        ...mockRequest,
        tags: ['tag-with-dashes', 'tag_with_underscores', 'tag.with.dots']
      };

      mockDocumentApplicationService.addTagsToDocument.resolves(AppResult.Ok(mockDocument));

      // Act
      const result = await useCase.execute(requestWithSpecialChars);

      // Assert
      expect(result.isOk()).to.be.true;

      // Verify service call with special character tags
      expect(mockDocumentApplicationService.addTagsToDocument.calledWith(
        'test-document-id',
        ['tag-with-dashes', 'tag_with_underscores', 'tag.with.dots'],
        'test-user-id'
      )).to.be.true;
    });
  });
});
