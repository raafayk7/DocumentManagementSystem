import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { container } from 'tsyringe';
import 'reflect-metadata';
import { AppResult, AppError } from '@carbonteq/hexapp';

import { UpdateDocumentMetadataUseCase } from '../../../../src/application/use-cases/document/UpdateDocumentMetadataUseCase.js';
import { Document } from '../../../../src/domain/entities/Document.js';
import { DocumentName } from '../../../../src/domain/value-objects/DocumentName.js';
import { MimeType } from '../../../../src/domain/value-objects/MimeType.js';
import { FileSize } from '../../../../src/domain/value-objects/FileSize.js';
import type { IDocumentApplicationService } from '../../../../src/ports/input/IDocumentApplicationService.js';
import type { ILogger, LogContext } from '../../../../src/ports/output/ILogger.js';
import { UpdateDocumentMetadataRequest, UpdateDocumentMetadataResponse } from '../../../../src/shared/dto/document/index.js';

describe('UpdateDocumentMetadataUseCase', () => {
  let useCase: UpdateDocumentMetadataUseCase;
  let mockDocumentApplicationService: sinon.SinonStubbedInstance<IDocumentApplicationService>;
  let mockLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockChildLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockDocument: Document;
  let mockRequest: UpdateDocumentMetadataRequest;

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
      metadata: { category: 'test', priority: 'high', status: 'active' },
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      serialize: sinon.stub().returns({
        id: 'test-document-id',
        name: 'test-document.pdf',
        filePath: '/uploads/test-document.pdf',
        mimeType: 'application/pdf',
        size: '1024',
        tags: ['test', 'document'],
        metadata: { category: 'test', priority: 'high', status: 'active' },
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      })
    } as unknown as Document;

    // Create mock request
    mockRequest = {
      documentId: 'test-document-id',
      metadata: { category: 'updated', priority: 'medium', status: 'inactive' },
      userId: 'test-user-id'
    };

    // Create use case instance
    useCase = new UpdateDocumentMetadataUseCase(
      mockDocumentApplicationService as IDocumentApplicationService,
      mockLogger as ILogger
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('execute', () => {
    it('should successfully update document metadata and return response', async () => {
      // Arrange
      mockDocumentApplicationService.updateDocumentMetadata.resolves(AppResult.Ok(mockDocument));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.isErr()).to.be.false;

      const response = result.unwrap();
      expect(response).to.deep.equal({
        success: true,
        message: 'Document metadata updated successfully'
      });

      // Verify service call
      expect(mockDocumentApplicationService.updateDocumentMetadata.calledWith(
        'test-document-id',
        { category: 'updated', priority: 'medium', status: 'inactive' },
        'test-user-id'
      )).to.be.true;

      // Verify logging
      expect(mockChildLogger.info.calledWith(
        'Executing update document metadata use case',
        { 
          documentId: 'test-document-id', 
          metadata: { category: 'updated', priority: 'medium', status: 'inactive' },
          userId: 'test-user-id' 
        }
      )).to.be.true;
      expect(mockChildLogger.info.calledWith(
        'Document metadata updated successfully',
        { 
          documentId: 'test-document-id', 
          metadataKeys: ['category', 'priority', 'status'],
          totalMetadataKeys: 3 
        }
      )).to.be.true;
    });

    it('should handle document metadata update failure and return error', async () => {
      // Arrange
      const serviceError = AppError.InvalidOperation('Document metadata update failed');
      mockDocumentApplicationService.updateDocumentMetadata.resolves(AppResult.Err(serviceError));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.status).to.equal(AppError.InvalidOperation().status);
      expect(error.message).to.include('Document metadata update failed for document ID: test-document-id');

      // Verify service call
      expect(mockDocumentApplicationService.updateDocumentMetadata.calledOnce).to.be.true;

      // Verify logging
      expect(mockChildLogger.warn.calledWith(
        'Document metadata update failed',
        { 
          documentId: 'test-document-id', 
          metadata: { category: 'updated', priority: 'medium', status: 'inactive' },
          userId: 'test-user-id' 
        }
      )).to.be.true;
    });

    it('should handle service errors and return generic error', async () => {
      // Arrange
      const serviceError = new Error('Service error');
      mockDocumentApplicationService.updateDocumentMetadata.rejects(serviceError);

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.status).to.equal(AppError.Generic('Service error').status);
      expect(error.message).to.include('Failed to execute update document metadata use case for document ID: test-document-id');

      // Verify service call
      expect(mockDocumentApplicationService.updateDocumentMetadata.calledOnce).to.be.true;

      // Verify logging
      expect(mockChildLogger.error.calledWith(
        'Service error',
        { 
          documentId: 'test-document-id', 
          metadata: { category: 'updated', priority: 'medium', status: 'inactive' },
          userId: 'test-user-id' 
        }
      )).to.be.true;
    });

    it('should handle unknown errors and return generic error', async () => {
      // Arrange
      const unknownError = new Error('Unknown error string');
      mockDocumentApplicationService.updateDocumentMetadata.rejects(unknownError);

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.status).to.equal(AppError.Generic('Unknown error string').status);
      expect(error.message).to.include('Failed to execute update document metadata use case for document ID: test-document-id');

      // Verify service call
      expect(mockDocumentApplicationService.updateDocumentMetadata.calledOnce).to.be.true;

      // Verify logging
      expect(mockChildLogger.error.calledWith(
        'Unknown error string',
        { 
          documentId: 'test-document-id', 
          metadata: { category: 'updated', priority: 'medium', status: 'inactive' },
          userId: 'test-user-id' 
        }
      )).to.be.true;
    });

    it('should handle request with empty metadata', async () => {
      // Arrange
      const requestWithEmptyMetadata: UpdateDocumentMetadataRequest = {
        ...mockRequest,
        metadata: {}
      };

      mockDocumentApplicationService.updateDocumentMetadata.resolves(AppResult.Ok(mockDocument));

      // Act
      const result = await useCase.execute(requestWithEmptyMetadata);

      // Assert
      expect(result.isOk()).to.be.true;

      const response = result.unwrap();
      expect(response.success).to.be.true;
      expect(response.message).to.equal('Document metadata updated successfully');

      // Verify service call with empty metadata
      expect(mockDocumentApplicationService.updateDocumentMetadata.calledWith(
        'test-document-id',
        {},
        'test-user-id'
      )).to.be.true;
    });

    it('should handle request with null metadata', async () => {
      // Arrange
      const requestWithNullMetadata: UpdateDocumentMetadataRequest = {
        ...mockRequest,
        metadata: null as any
      };

      mockDocumentApplicationService.updateDocumentMetadata.resolves(AppResult.Ok(mockDocument));

      // Act
      const result = await useCase.execute(requestWithNullMetadata);

      // Assert
      expect(result.isOk()).to.be.true;

      // Verify service call with empty object (null becomes {})
      expect(mockDocumentApplicationService.updateDocumentMetadata.calledWith(
        'test-document-id',
        {},
        'test-user-id'
      )).to.be.true;
    });

    it('should handle different metadata types correctly', async () => {
      // Arrange
      const complexMetadata = {
        category: 'financial',
        priority: 'urgent',
        department: 'accounting',
        fiscalYear: '2024',
        approvalStatus: 'pending',
        retentionPolicy: '7-years'
      };

      const requestWithComplexMetadata: UpdateDocumentMetadataRequest = {
        ...mockRequest,
        metadata: complexMetadata
      };

      const documentWithComplexMetadata = {
        ...mockDocument,
        metadata: complexMetadata
      } as unknown as Document;

      mockDocumentApplicationService.updateDocumentMetadata.resolves(AppResult.Ok(documentWithComplexMetadata));

      // Act
      const result = await useCase.execute(requestWithComplexMetadata);

      // Assert
      expect(result.isOk()).to.be.true;

      // Verify service call with complex metadata
      expect(mockDocumentApplicationService.updateDocumentMetadata.calledWith(
        'test-document-id',
        complexMetadata,
        'test-user-id'
      )).to.be.true;
    });

    it('should handle single metadata field update', async () => {
      // Arrange
      const singleFieldMetadata = { priority: 'critical' };
      const requestWithSingleField: UpdateDocumentMetadataRequest = {
        ...mockRequest,
        metadata: singleFieldMetadata
      };

      mockDocumentApplicationService.updateDocumentMetadata.resolves(AppResult.Ok(mockDocument));

      // Act
      const result = await useCase.execute(requestWithSingleField);

      // Assert
      expect(result.isOk()).to.be.true;

      // Verify service call with single field
      expect(mockDocumentApplicationService.updateDocumentMetadata.calledWith(
        'test-document-id',
        singleFieldMetadata,
        'test-user-id'
      )).to.be.true;
    });
  });
});
