import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { container } from 'tsyringe';
import 'reflect-metadata';
import { AppResult, AppError } from '@carbonteq/hexapp';

import { DeleteDocumentUseCase } from '../../../../src/application/use-cases/document/DeleteDocumentUseCase.js';
import type { IDocumentApplicationService } from '../../../../src/ports/input/IDocumentApplicationService.js';
import type { ILogger, LogContext } from '../../../../src/ports/output/ILogger.js';
import { DeleteDocumentRequest, DeleteDocumentResponse } from '../../../../src/shared/dto/document/index.js';

describe('DeleteDocumentUseCase', () => {
  let useCase: DeleteDocumentUseCase;
  let mockDocumentApplicationService: sinon.SinonStubbedInstance<IDocumentApplicationService>;
  let mockLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockChildLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockRequest: DeleteDocumentRequest;

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

    // Create mock request
    mockRequest = {
      documentId: 'test-document-id',
      userId: 'test-user-id'
    };

    // Create use case instance
    useCase = new DeleteDocumentUseCase(
      mockDocumentApplicationService as IDocumentApplicationService,
      mockLogger as ILogger
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('execute', () => {
    it('should successfully delete a document and return response', async () => {
      // Arrange
      mockDocumentApplicationService.deleteDocument.resolves(AppResult.Ok(undefined));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.isErr()).to.be.false;

      const response = result.unwrap();
      expect(response).to.deep.equal({
        success: true,
        message: `Document with ID ${mockRequest.documentId} deleted successfully`
      });

      // Verify service call
      expect(mockDocumentApplicationService.deleteDocument.calledWith(
        'test-document-id'
      )).to.be.true;

      // Verify logging
      expect(mockChildLogger.info.calledWith(
        'Executing delete document use case',
        { documentId: 'test-document-id', userId: 'test-user-id' }
      )).to.be.true;
      expect(mockChildLogger.info.calledWith(
        'Document deleted successfully',
        { documentId: 'test-document-id', userId: 'test-user-id' }
      )).to.be.true;
    });

    it('should handle document deletion failure and return error', async () => {
      // Arrange
      const serviceError = AppError.InvalidOperation('Document deletion failed');
      mockDocumentApplicationService.deleteDocument.resolves(AppResult.Err(serviceError));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.status).to.equal(AppError.InvalidOperation().status);
      expect(error.message).to.include('Document deletion failed for document ID: test-document-id');

      // Verify service call
      expect(mockDocumentApplicationService.deleteDocument.calledOnce).to.be.true;

      // Verify logging
      expect(mockChildLogger.warn.calledWith(
        'Document deletion failed',
        { documentId: 'test-document-id', userId: 'test-user-id' }
      )).to.be.true;
    });

    it('should handle service errors and return generic error', async () => {
      // Arrange
      const serviceError = new Error('Service error');
      mockDocumentApplicationService.deleteDocument.rejects(serviceError);

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.status).to.equal(AppError.Generic('Service error').status);
      expect(error.message).to.include('Failed to execute delete document use case for document ID: test-document-id');

      // Verify service call
      expect(mockDocumentApplicationService.deleteDocument.calledOnce).to.be.true;

      // Verify logging
      expect(mockChildLogger.error.calledWith(
        'Service error',
        { documentId: 'test-document-id', userId: 'test-user-id' }
      )).to.be.true;
    });

    it('should handle unknown errors and return generic error', async () => {
      // Arrange
      const unknownError = new Error('Unknown error string');
      mockDocumentApplicationService.deleteDocument.rejects(unknownError);

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.status).to.equal(AppError.Generic('Unknown error string').status);
      expect(error.message).to.include('Failed to execute delete document use case for document ID: test-document-id');

      // Verify service call
      expect(mockDocumentApplicationService.deleteDocument.calledOnce).to.be.true;

      // Verify logging
      expect(mockChildLogger.error.calledWith(
        'Unknown error string',
        { documentId: 'test-document-id', userId: 'test-user-id' }
      )).to.be.true;
    });

    it('should handle different document IDs correctly', async () => {
      // Arrange
      const requestWithDifferentId: DeleteDocumentRequest = {
        ...mockRequest,
        documentId: 'another-document-id'
      };

      mockDocumentApplicationService.deleteDocument.resolves(AppResult.Ok(undefined));

      // Act
      const result = await useCase.execute(requestWithDifferentId);

      // Assert
      expect(result.isOk()).to.be.true;

      // Verify service call
      expect(mockDocumentApplicationService.deleteDocument.calledWith(
        'another-document-id'
      )).to.be.true;

      // Verify logging
      expect(mockChildLogger.info.calledWith(
        'Executing delete document use case',
        { documentId: 'another-document-id', userId: 'test-user-id' }
      )).to.be.true;
    });

    it('should handle different user IDs correctly', async () => {
      // Arrange
      const requestWithDifferentUserId: DeleteDocumentRequest = {
        ...mockRequest,
        userId: 'another-user-id'
      };

      mockDocumentApplicationService.deleteDocument.resolves(AppResult.Ok(undefined));

      // Act
      const result = await useCase.execute(requestWithDifferentUserId);

      // Assert
      expect(result.isOk()).to.be.true;

      // Verify service call
      expect(mockDocumentApplicationService.deleteDocument.calledWith(
        'test-document-id'
      )).to.be.true;

      // Verify logging
      expect(mockChildLogger.info.calledWith(
        'Executing delete document use case',
        { documentId: 'test-document-id', userId: 'another-user-id' }
      )).to.be.true;
    });

    it('should handle UUID format document IDs', async () => {
      // Arrange
      const uuidDocumentId = '123e4567-e89b-12d3-a456-426614174000';
      const requestWithUuid: DeleteDocumentRequest = {
        ...mockRequest,
        documentId: uuidDocumentId
      };

      mockDocumentApplicationService.deleteDocument.resolves(AppResult.Ok(undefined));

      // Act
      const result = await useCase.execute(requestWithUuid);

      // Assert
      expect(result.isOk()).to.be.true;

      // Verify service call
      expect(mockDocumentApplicationService.deleteDocument.calledWith(
        uuidDocumentId
      )).to.be.true;

      // Verify logging
      expect(mockChildLogger.info.calledWith(
        'Executing delete document use case',
        { documentId: uuidDocumentId, userId: 'test-user-id' }
      )).to.be.true;
    });

    it('should handle long document IDs', async () => {
      // Arrange
      const longDocumentId = 'very-long-document-id-that-exceeds-normal-length-limits-for-testing-purposes-123456789';
      const requestWithLongId: DeleteDocumentRequest = {
        ...mockRequest,
        documentId: longDocumentId
      };

      mockDocumentApplicationService.deleteDocument.resolves(AppResult.Ok(undefined));

      // Act
      const result = await useCase.execute(requestWithLongId);

      // Assert
      expect(result.isOk()).to.be.true;

      // Verify service call
      expect(mockDocumentApplicationService.deleteDocument.calledWith(
        longDocumentId
      )).to.be.true;

      // Verify logging
      expect(mockChildLogger.info.calledWith(
        'Executing delete document use case',
        { documentId: longDocumentId, userId: 'test-user-id' }
      )).to.be.true;
    });
  });
});
