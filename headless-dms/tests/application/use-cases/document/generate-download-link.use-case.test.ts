import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { container } from 'tsyringe';
import 'reflect-metadata';
import { AppResult, AppError } from '@carbonteq/hexapp';

import { GenerateDownloadLinkUseCase } from '../../../../src/application/use-cases/document/GenerateDownloadLinkUseCase.js';
import type { IDocumentApplicationService } from '../../../../src/ports/input/IDocumentApplicationService.js';
import type { ILogger, LogContext } from '../../../../src/ports/output/ILogger.js';
import { GenerateDownloadLinkRequest, GenerateDownloadLinkResponse } from '../../../../src/shared/dto/document/index.js';

describe('GenerateDownloadLinkUseCase', () => {
  let useCase: GenerateDownloadLinkUseCase;
  let mockDocumentApplicationService: sinon.SinonStubbedInstance<IDocumentApplicationService>;
  let mockLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockChildLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockRequest: GenerateDownloadLinkRequest;

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

    // Create mock request
    mockRequest = {
      documentId: 'test-document-id',
      expiresInMinutes: 30
    };

    // Create use case instance
    useCase = new GenerateDownloadLinkUseCase(
      mockDocumentApplicationService as IDocumentApplicationService,
      mockLogger as ILogger
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('execute', () => {
    it('should successfully generate download link and return response', async () => {
      // Arrange
      const mockToken = 'download-token-123';
      mockDocumentApplicationService.generateDownloadLink.resolves(AppResult.Ok(mockToken));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.isErr()).to.be.false;

      const response = result.unwrap();
      expect(response.token).to.equal(mockToken);
      expect(response.downloadUrl).to.equal(`/documents/download?token=${encodeURIComponent(mockToken)}`);
      expect(response.expiresAt).to.be.instanceOf(Date);

      // Verify expiration time calculation
      const expectedExpiresAt = new Date(Date.now() + 30 * 60000);
      expect(response.expiresAt.getTime()).to.be.closeTo(expectedExpiresAt.getTime(), 1000); // Within 1 second

      // Verify service call
      expect(mockDocumentApplicationService.generateDownloadLink.calledWith(
        'test-document-id',
        30
      )).to.be.true;

      // Verify logging
      expect(mockChildLogger.info.calledWith(
        'Executing generate download link use case',
        { 
          documentId: 'test-document-id',
          expiresInMinutes: 30
        }
      )).to.be.true;
      expect(mockChildLogger.info.calledWith(
        'Download link generated successfully',
        { 
          documentId: 'test-document-id',
          downloadUrl: response.downloadUrl,
          expiresAt: response.expiresAt
        }
      )).to.be.true;
    });

    it('should handle download link generation failure and return error', async () => {
      // Arrange
      const serviceError = AppError.InvalidOperation('Download link generation failed');
      mockDocumentApplicationService.generateDownloadLink.resolves(AppResult.Err(serviceError));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.status).to.equal(AppError.InvalidOperation().status);
      expect(error.message).to.equal('Download link generation failed'); // Preserve original error message

      // Verify service call
      expect(mockDocumentApplicationService.generateDownloadLink.calledOnce).to.be.true;

      // Verify logging
      expect(mockChildLogger.warn.calledWith(
        'Download link generation failed',
        { 
          documentId: 'test-document-id',
          expiresInMinutes: 30,
          error: 'Download link generation failed'
        }
      )).to.be.true;
    });

    it('should handle service errors and return generic error', async () => {
      // Arrange
      const serviceError = new Error('Service error');
      mockDocumentApplicationService.generateDownloadLink.rejects(serviceError);

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.message).to.equal('Service error'); // Preserve original error message

      // Verify service call
      expect(mockDocumentApplicationService.generateDownloadLink.calledWith(
        'test-document-id',
        30
      )).to.be.true;

      // Verify logging
      expect(mockChildLogger.error.calledWith(
        'Service error',
        { 
          documentId: 'test-document-id',
          expiresInMinutes: 30
        }
      )).to.be.true;
    });

    it('should handle unknown errors and return generic error', async () => {
      // Arrange
      const unknownError = new Error('Unknown error string');
      mockDocumentApplicationService.generateDownloadLink.rejects(unknownError);

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.message).to.equal('Unknown error string'); // Preserve original error message

      // Verify service call
      expect(mockDocumentApplicationService.generateDownloadLink.calledWith(
        'test-document-id',
        30
      )).to.be.true;

      // Verify logging
      expect(mockChildLogger.error.calledWith(
        'Unknown error string',
        { 
          documentId: 'test-document-id',
          expiresInMinutes: 30
        }
      )).to.be.true;
    });

    it('should handle request with default expiration time', async () => {
      // Arrange
      const requestWithDefaultExpiration: GenerateDownloadLinkRequest = {
        documentId: 'test-document-id',
        expiresInMinutes: 5
        // expiresInMinutes will use default value
      };

      const mockToken = 'default-token-456';
      mockDocumentApplicationService.generateDownloadLink.resolves(AppResult.Ok(mockToken));

      // Act
      const result = await useCase.execute(requestWithDefaultExpiration);

      // Assert
      expect(result.isOk()).to.be.true;

      const response = result.unwrap();
      expect(response.token).to.equal(mockToken);

      // Verify service call with default expiration (5 minutes)
      expect(mockDocumentApplicationService.generateDownloadLink.calledWith(
        'test-document-id',
        5
      )).to.be.true;
    });

    it('should handle request with short expiration time', async () => {
      // Arrange
      const requestWithShortExpiration: GenerateDownloadLinkRequest = {
        documentId: 'test-document-id',
        expiresInMinutes: 1
      };

      const mockToken = 'short-token-789';
      mockDocumentApplicationService.generateDownloadLink.resolves(AppResult.Ok(mockToken));

      // Act
      const result = await useCase.execute(requestWithShortExpiration);

      // Assert
      expect(result.isOk()).to.be.true;

      const response = result.unwrap();
      expect(response.token).to.equal(mockToken);

      // Verify expiration time calculation for 1 minute
      const expectedExpiresAt = new Date(Date.now() + 1 * 60000);
      expect(response.expiresAt.getTime()).to.be.closeTo(expectedExpiresAt.getTime(), 1000);

      // Verify service call with 1 minute expiration
      expect(mockDocumentApplicationService.generateDownloadLink.calledWith(
        'test-document-id',
        1
      )).to.be.true;
    });

    it('should handle request with long expiration time', async () => {
      // Arrange
      const requestWithLongExpiration: GenerateDownloadLinkRequest = {
        documentId: 'test-document-id',
        expiresInMinutes: 1440 // 24 hours
      };

      const mockToken = 'long-token-101';
      mockDocumentApplicationService.generateDownloadLink.resolves(AppResult.Ok(mockToken));

      // Act
      const result = await useCase.execute(requestWithLongExpiration);

      // Assert
      expect(result.isOk()).to.be.true;

      const response = result.unwrap();
      expect(response.token).to.equal(mockToken);

      // Verify expiration time calculation for 24 hours
      const expectedExpiresAt = new Date(Date.now() + 1440 * 60000);
      expect(response.expiresAt.getTime()).to.be.closeTo(expectedExpiresAt.getTime(), 1000);

      // Verify service call with 24 hours expiration
      expect(mockDocumentApplicationService.generateDownloadLink.calledWith(
        'test-document-id',
        1440
      )).to.be.true;
    });

    it('should handle different document IDs correctly', async () => {
      // Arrange
      const requestWithDifferentId: GenerateDownloadLinkRequest = {
        documentId: 'different-doc-id-123',
        expiresInMinutes: 15
      };

      const mockToken = 'different-token-202';
      mockDocumentApplicationService.generateDownloadLink.resolves(AppResult.Ok(mockToken));

      // Act
      const result = await useCase.execute(requestWithDifferentId);

      // Assert
      expect(result.isOk()).to.be.true;

      const response = result.unwrap();
      expect(response.token).to.equal(mockToken);

      // Verify service call with different document ID
      expect(mockDocumentApplicationService.generateDownloadLink.calledWith(
        'different-doc-id-123',
        15
      )).to.be.true;
    });

    it('should handle edge case with minimum expiration time', async () => {
      // Arrange
      const requestWithMinExpiration: GenerateDownloadLinkRequest = {
        documentId: 'test-document-id',
        expiresInMinutes: 1 // Minimum allowed
      };

      const mockToken = 'min-token-303';
      mockDocumentApplicationService.generateDownloadLink.resolves(AppResult.Ok(mockToken));

      // Act
      const result = await useCase.execute(requestWithMinExpiration);

      // Assert
      expect(result.isOk()).to.be.true;

      const response = result.unwrap();
      expect(response.token).to.equal(mockToken);

      // Verify service call with minimum expiration
      expect(mockDocumentApplicationService.generateDownloadLink.calledWith(
        'test-document-id',
        1
      )).to.be.true;
    });
  });
});
