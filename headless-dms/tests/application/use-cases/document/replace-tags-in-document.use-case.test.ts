import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { container } from 'tsyringe';
import 'reflect-metadata';
import { AppResult, AppError } from '@carbonteq/hexapp';

import { ReplaceTagsInDocumentUseCase } from '../../../../src/application/use-cases/document/ReplaceTagsInDocumentUseCase.js';
import { Document } from '../../../../src/domain/entities/Document.js';
import { DocumentName } from '../../../../src/domain/value-objects/DocumentName.js';
import { MimeType } from '../../../../src/domain/value-objects/MimeType.js';
import { FileSize } from '../../../../src/domain/value-objects/FileSize.js';
import type { IDocumentApplicationService } from '../../../../src/ports/input/IDocumentApplicationService.js';
import type { ILogger, LogContext } from '../../../../src/ports/output/ILogger.js';
import { ReplaceTagsinDocumentRequest, ReplaceTagsinDocumentResponse } from '../../../../src/shared/dto/document/index.js';

describe('ReplaceTagsInDocumentUseCase', () => {
  let useCase: ReplaceTagsInDocumentUseCase;
  let mockDocumentApplicationService: sinon.SinonStubbedInstance<IDocumentApplicationService>;
  let mockLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockChildLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockDocument: Document;
  let mockRequest: ReplaceTagsinDocumentRequest;

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
      tags: ['new-tag', 'important', 'replaced'], // Tags after replacement
      metadata: { category: 'test', priority: 'high' },
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      serialize: sinon.stub().returns({
        id: 'test-document-id',
        name: 'test-document.pdf',
        filePath: '/uploads/test-document.pdf',
        mimeType: 'application/pdf',
        size: '1024',
        tags: ['new-tag', 'important', 'replaced'],
        metadata: { category: 'test', priority: 'high' },
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      })
    } as unknown as Document;

    // Create mock request
    mockRequest = {
      documentId: 'test-document-id',
      tags: ['new-tag', 'important', 'replaced'],
      userId: 'test-user-id'
    };

    // Create use case instance
    useCase = new ReplaceTagsInDocumentUseCase(
      mockDocumentApplicationService as IDocumentApplicationService,
      mockLogger as ILogger
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('execute', () => {
    it('should successfully replace tags in document and return response', async () => {
      // Arrange
      mockDocumentApplicationService.replaceTagsInDocument.resolves(AppResult.Ok(mockDocument));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.isErr()).to.be.false;

      const response = result.unwrap();
      expect(response).to.deep.equal({
        success: true,
        message: 'Tags replaced successfully in document: new-tag, important, replaced'
      });

      // Verify service call
      expect(mockDocumentApplicationService.replaceTagsInDocument.calledWith(
        'test-document-id',
        ['new-tag', 'important', 'replaced'],
        'test-user-id'
      )).to.be.true;

      // Verify logging
      expect(mockChildLogger.info.calledWith(
        'Executing replace tags in document use case',
        { 
          documentId: 'test-document-id', 
          tags: ['new-tag', 'important', 'replaced'],
          userId: 'test-user-id' 
        }
      )).to.be.true;
      expect(mockChildLogger.info.calledWith(
        'Document tags replaced successfully',
        { 
          documentId: 'test-document-id', 
          newTags: ['new-tag', 'important', 'replaced'],
          totalTags: 3 
        }
      )).to.be.true;
    });

    it('should handle document tags replacement failure and return error', async () => {
      // Arrange
      const serviceError = AppError.InvalidOperation('Document tags replacement failed');
      mockDocumentApplicationService.replaceTagsInDocument.resolves(AppResult.Err(serviceError));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.status).to.equal(AppError.InvalidOperation().status);
      expect(error.message).to.include('Document tags replacement failed for document ID: test-document-id with tags: new-tag, important, replaced');

      // Verify service call
      expect(mockDocumentApplicationService.replaceTagsInDocument.calledOnce).to.be.true;

      // Verify logging
      expect(mockChildLogger.warn.calledWith(
        'Document tags replacement failed',
        { 
          documentId: 'test-document-id', 
          tags: ['new-tag', 'important', 'replaced'],
          userId: 'test-user-id' 
        }
      )).to.be.true;
    });

    it('should handle service errors and return generic error', async () => {
      // Arrange
      const serviceError = new Error('Service error');
      mockDocumentApplicationService.replaceTagsInDocument.rejects(serviceError);

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.status).to.equal(AppError.Generic('Service error').status);
      expect(error.message).to.include('Failed to execute replace tags in document use case for document ID: test-document-id');

      // Verify service call
      expect(mockDocumentApplicationService.replaceTagsInDocument.calledOnce).to.be.true;

      // Verify logging
      expect(mockChildLogger.error.calledWith(
        'Service error',
        { 
          documentId: 'test-document-id', 
          tags: ['new-tag', 'important', 'replaced'],
          userId: 'test-user-id' 
        }
      )).to.be.true;
    });

    it('should handle unknown errors and return generic error', async () => {
      // Arrange
      const unknownError = new Error('Unknown error string');
      mockDocumentApplicationService.replaceTagsInDocument.rejects(unknownError);

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.status).to.equal(AppError.Generic('Unknown error string').status);
      expect(error.message).to.include('Failed to execute replace tags in document use case for document ID: test-document-id');

      // Verify service call
      expect(mockDocumentApplicationService.replaceTagsInDocument.calledOnce).to.be.true;

      // Verify logging
      expect(mockChildLogger.error.calledWith(
        'Unknown error string',
        { 
          documentId: 'test-document-id', 
          tags: ['new-tag', 'important', 'replaced'],
          userId: 'test-user-id' 
        }
      )).to.be.true;
    });

    it('should handle request with single tag', async () => {
      // Arrange
      const requestWithSingleTag: ReplaceTagsinDocumentRequest = {
        ...mockRequest,
        tags: ['urgent']
      };

      const documentWithSingleTag = {
        ...mockDocument,
        tags: ['urgent']
      } as unknown as Document;

      mockDocumentApplicationService.replaceTagsInDocument.resolves(AppResult.Ok(documentWithSingleTag));

      // Act
      const result = await useCase.execute(requestWithSingleTag);

      // Assert
      expect(result.isOk()).to.be.true;

      const response = result.unwrap();
      expect(response.success).to.be.true;
      expect(response.message).to.equal('Tags replaced successfully in document: urgent');

      // Verify service call with single tag
      expect(mockDocumentApplicationService.replaceTagsInDocument.calledWith(
        'test-document-id',
        ['urgent'],
        'test-user-id'
      )).to.be.true;
    });

    it('should handle request with multiple tags', async () => {
      // Arrange
      const requestWithMultipleTags: ReplaceTagsinDocumentRequest = {
        ...mockRequest,
        tags: ['financial', 'quarterly', 'review', 'approved']
      };

      const documentWithMultipleTags = {
        ...mockDocument,
        tags: ['financial', 'quarterly', 'review', 'approved']
      } as unknown as Document;

      mockDocumentApplicationService.replaceTagsInDocument.resolves(AppResult.Ok(documentWithMultipleTags));

      // Act
      const result = await useCase.execute(requestWithMultipleTags);

      // Assert
      expect(result.isOk()).to.be.true;

      const response = result.unwrap();
      expect(response.success).to.be.true;
      expect(response.message).to.equal('Tags replaced successfully in document: financial, quarterly, review, approved');

      // Verify service call with multiple tags
      expect(mockDocumentApplicationService.replaceTagsInDocument.calledWith(
        'test-document-id',
        ['financial', 'quarterly', 'review', 'approved'],
        'test-user-id'
      )).to.be.true;
    });

    it('should handle request with empty tags array', async () => {
      // Arrange
      const requestWithEmptyTags: ReplaceTagsinDocumentRequest = {
        ...mockRequest,
        tags: []
      };

      const documentWithEmptyTags = {
        ...mockDocument,
        tags: []
      } as unknown as Document;

      mockDocumentApplicationService.replaceTagsInDocument.resolves(AppResult.Ok(documentWithEmptyTags));

      // Act
      const result = await useCase.execute(requestWithEmptyTags);

      // Assert
      expect(result.isOk()).to.be.true;

      const response = result.unwrap();
      expect(response.success).to.be.true;
      expect(response.message).to.equal('Tags replaced successfully in document: ');

      // Verify service call with empty tags array
      expect(mockDocumentApplicationService.replaceTagsInDocument.calledWith(
        'test-document-id',
        [],
        'test-user-id'
      )).to.be.true;
    });

    it('should handle tags with special characters', async () => {
      // Arrange
      const requestWithSpecialChars: ReplaceTagsinDocumentRequest = {
        ...mockRequest,
        tags: ['tag-with-dashes', 'tag_with_underscores', 'tag.with.dots']
      };

      mockDocumentApplicationService.replaceTagsInDocument.resolves(AppResult.Ok(mockDocument));

      // Act
      const result = await useCase.execute(requestWithSpecialChars);

      // Assert
      expect(result.isOk()).to.be.true;

      // Verify service call with special character tags
      expect(mockDocumentApplicationService.replaceTagsInDocument.calledWith(
        'test-document-id',
        ['tag-with-dashes', 'tag_with_underscores', 'tag.with.dots'],
        'test-user-id'
      )).to.be.true;
    });

    it('should handle complete tag replacement', async () => {
      // Arrange
      const requestWithCompleteReplacement: ReplaceTagsinDocumentRequest = {
        ...mockRequest,
        tags: ['completely', 'new', 'set', 'of', 'tags']
      };

      const documentWithCompleteReplacement = {
        ...mockDocument,
        tags: ['completely', 'new', 'set', 'of', 'tags']
      } as unknown as Document;

      mockDocumentApplicationService.replaceTagsInDocument.resolves(AppResult.Ok(documentWithCompleteReplacement));

      // Act
      const result = await useCase.execute(requestWithCompleteReplacement);

      // Assert
      expect(result.isOk()).to.be.true;

      const response = result.unwrap();
      expect(response.success).to.be.true;
      expect(response.message).to.equal('Tags replaced successfully in document: completely, new, set, of, tags');

      // Verify service call with complete replacement
      expect(mockDocumentApplicationService.replaceTagsInDocument.calledWith(
        'test-document-id',
        ['completely', 'new', 'set', 'of', 'tags'],
        'test-user-id'
      )).to.be.true;
    });
  });
});
