import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { container } from 'tsyringe';
import 'reflect-metadata';
import { AppResult, AppError } from '@carbonteq/hexapp';

import { DownloadDocumentByTokenUseCase } from '../../../../src/application/use-cases/document/DownloadDocumentByTokenUseCase.js';
import { Document } from '../../../../src/domain/entities/Document.js';
import { DocumentName } from '../../../../src/domain/value-objects/DocumentName.js';
import { MimeType } from '../../../../src/domain/value-objects/MimeType.js';
import { FileSize } from '../../../../src/domain/value-objects/FileSize.js';
import type { IDocumentApplicationService } from '../../../../src/ports/input/IDocumentApplicationService.js';
import type { ILogger, LogContext } from '../../../../src/ports/output/ILogger.js';
import { DownloadDocumentByTokenRequest, DownloadDocumentByTokenResponse } from '../../../../src/shared/dto/document/index.js';

describe('DownloadDocumentByTokenUseCase', () => {
  let useCase: DownloadDocumentByTokenUseCase;
  let mockDocumentApplicationService: sinon.SinonStubbedInstance<IDocumentApplicationService>;
  let mockLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockChildLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockDocument: Document;
  let mockRequest: DownloadDocumentByTokenRequest;
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
      token: 'download-token-12345678901234567890'
    };

    // Create use case instance
    useCase = new DownloadDocumentByTokenUseCase(
      mockDocumentApplicationService as IDocumentApplicationService,
      mockLogger as ILogger
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('execute', () => {
    it('should successfully download document by token and return response', async () => {
      // Arrange
      mockDocumentApplicationService.downloadDocumentByToken.resolves(AppResult.Ok(mockDownloadInfo));
      
      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.isErr()).to.be.false;

      const response = result.unwrap();
      expect(response.document).to.deep.equal({
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
      expect(response.file).to.deep.equal(Buffer.from('test file content'));

      // Verify service call
      expect(mockDocumentApplicationService.downloadDocumentByToken.calledWith(
        'download-token-12345678901234567890'
      )).to.be.true;

      // Verify logging (should truncate token for security)
      expect(mockChildLogger.info.calledWith(
        'Executing download document by token use case',
        { 
          token: 'download-token-12345...'
        }
      )).to.be.true;
      expect(mockChildLogger.info.calledWith(
        'Document downloaded successfully by token',
        { 
          documentId: 'test-document-id',
          fileSize: 17 // Length of 'test file content'
        }
      )).to.be.true;
    });

    it('should handle document download by token failure and return error', async () => {
      // Arrange
      const serviceError = AppError.InvalidOperation('Document download by token failed');
      mockDocumentApplicationService.downloadDocumentByToken.resolves(AppResult.Err(serviceError));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.status).to.equal(AppError.InvalidOperation().status);
      expect(error.message).to.equal('Document download by token failed - invalid or expired token');

      // Verify service call
      expect(mockDocumentApplicationService.downloadDocumentByToken.calledWith(
        'download-token-12345678901234567890'
      )).to.be.true;

      // Verify logging (should truncate token for security)
      expect(mockChildLogger.warn.calledWith(
        'Document download by token failed',
        { 
          token: 'download-token-12345...'
        }
      )).to.be.true;
    });

    it('should handle service errors and return generic error', async () => {
      // Arrange
      const serviceError = new Error('Service error');
      mockDocumentApplicationService.downloadDocumentByToken.rejects(serviceError);

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.status).to.equal(AppError.Generic('Failed to execute download document by token use case').status);
      expect(error.message).to.equal('Failed to execute download document by token use case');

      // Verify service call
      expect(mockDocumentApplicationService.downloadDocumentByToken.calledWith(
        'download-token-12345678901234567890'
      )).to.be.true;

      // Verify logging (should truncate token for security)
      expect(mockChildLogger.error.calledWith(
        'Service error',
        { 
          token: 'download-token-12345...'
        }
      )).to.be.true;
    });

    it('should handle unknown errors and return generic error', async () => {
      // Arrange
      const unknownError = new Error('Unknown error string');
      mockDocumentApplicationService.downloadDocumentByToken.rejects(unknownError);

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.status).to.equal(AppError.Generic('Failed to execute download document by token use case').status);
      expect(error.message).to.equal('Failed to execute download document by token use case');

      // Verify service call
      expect(mockDocumentApplicationService.downloadDocumentByToken.calledWith(
        'download-token-12345678901234567890'
      )).to.be.true;

      // Verify logging (should truncate token for security)
      expect(mockChildLogger.error.calledWith(
        'Unknown error string',
        { 
          token: 'download-token-12345...'
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

      mockDocumentApplicationService.downloadDocumentByToken.resolves(AppResult.Ok(imageDownloadInfo));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;

      const response = result.unwrap();
      expect(response.document.name).to.equal('test-image.jpg');
      expect(response.document.mimeType).to.equal('image/jpeg');
      expect(response.document.size).to.equal('2048');

      // Verify service call
      expect(mockDocumentApplicationService.downloadDocumentByToken.calledWith(
        'download-token-12345678901234567890'
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

      mockDocumentApplicationService.downloadDocumentByToken.resolves(AppResult.Ok(largeDownloadInfo));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;

      const response = result.unwrap();
      expect(response.document.size).to.equal('1048576');

      // Verify logging includes correct file size
      expect(mockChildLogger.info.calledWith(
        'Document downloaded successfully by token',
        { 
          documentId: 'test-document-id',
          fileSize: 1048576
        }
      )).to.be.true;
    });

    it('should handle different token formats correctly', async () => {
      // Arrange
      const requestWithDifferentToken: DownloadDocumentByTokenRequest = {
        token: 'different-token-abc123def456ghi789'
      };

      mockDocumentApplicationService.downloadDocumentByToken.resolves(AppResult.Ok(mockDownloadInfo));

      // Act
      const result = await useCase.execute(requestWithDifferentToken);

      // Assert
      expect(result.isOk()).to.be.true;

      // Verify service call with different token
      expect(mockDocumentApplicationService.downloadDocumentByToken.calledWith(
        'different-token-abc123def456ghi789'
      )).to.be.true;

      // Verify logging truncates different token
      expect(mockChildLogger.info.calledWith(
        'Executing download document by token use case',
        { 
          token: 'different-token-abc1...'
        }
      )).to.be.true;
    });

    it('should handle short tokens correctly', async () => {
      // Arrange
      const requestWithShortToken: DownloadDocumentByTokenRequest = {
        token: 'short'
      };

      mockDocumentApplicationService.downloadDocumentByToken.resolves(AppResult.Ok(mockDownloadInfo));

      // Act
      const result = await useCase.execute(requestWithShortToken);

      // Assert
      expect(result.isOk()).to.be.true;

      // Verify service call with short token
      expect(mockDocumentApplicationService.downloadDocumentByToken.calledWith(
        'short'
      )).to.be.true;

      // Verify logging handles short token (less than 20 chars)
      expect(mockChildLogger.info.calledWith(
        'Executing download document by token use case',
        { 
          token: 'short...'
        }
      )).to.be.true;
    });

    it('should handle empty file content gracefully', async () => {
      // Arrange
      const emptyFileDownloadInfo = {
        document: mockDocument,
        file: Buffer.alloc(0) // Empty buffer
      };

      mockDocumentApplicationService.downloadDocumentByToken.resolves(AppResult.Ok(emptyFileDownloadInfo));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;

      const response = result.unwrap();
      expect(response.file.length).to.equal(0);

      // Verify logging includes correct file size (0 for empty buffer)
      expect(mockChildLogger.info.calledWith(
        'Document downloaded successfully by token',
        { 
          documentId: 'test-document-id',
          fileSize: 0
        }
      )).to.be.true;
    });

    it('should handle tokens with special characters', async () => {
      // Arrange
      const requestWithSpecialToken: DownloadDocumentByTokenRequest = {
        token: 'token-with-special-chars!@#$%^&*()_+-=[]{}|;:,.<>?'
      };

      mockDocumentApplicationService.downloadDocumentByToken.resolves(AppResult.Ok(mockDownloadInfo));

      // Act
      const result = await useCase.execute(requestWithSpecialToken);

      // Assert
      expect(result.isOk()).to.be.true;

      // Verify service call with special character token
      expect(mockDocumentApplicationService.downloadDocumentByToken.calledWith(
        'token-with-special-chars!@#$%^&*()_+-=[]{}|;:,.<>?'
      )).to.be.true;

      // Verify logging truncates special character token
      expect(mockChildLogger.info.calledWith(
        'Executing download document by token use case',
        { 
          token: 'token-with-special-c...'
        }
      )).to.be.true;
    });
  });
});
