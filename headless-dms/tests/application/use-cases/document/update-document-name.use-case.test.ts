import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { container } from 'tsyringe';
import 'reflect-metadata';
import { AppResult, AppError } from '@carbonteq/hexapp';

import { UpdateDocumentNameUseCase } from '../../../../src/application/use-cases/document/UpdateDocumentNameUseCase.js';
import { Document } from '../../../../src/domain/entities/Document.js';
import { DocumentName } from '../../../../src/domain/value-objects/DocumentName.js';
import { MimeType } from '../../../../src/domain/value-objects/MimeType.js';
import { FileSize } from '../../../../src/domain/value-objects/FileSize.js';
import type { IDocumentApplicationService } from '../../../../src/ports/input/IDocumentApplicationService.js';
import type { ILogger, LogContext } from '../../../../src/ports/output/ILogger.js';
import { UpdateDocumentNameRequest, DocumentResponse } from '../../../../src/shared/dto/document/index.js';

describe('UpdateDocumentNameUseCase', () => {
  let useCase: UpdateDocumentNameUseCase;
  let mockDocumentApplicationService: sinon.SinonStubbedInstance<IDocumentApplicationService>;
  let mockLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockChildLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockDocument: Document;
  let mockRequest: UpdateDocumentNameRequest;

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
      name: { value: 'updated-document.pdf' } as DocumentName,
      filePath: '/uploads/test-document.pdf',
      mimeType: { value: 'application/pdf' } as MimeType,
      size: { bytes: 1024 } as FileSize,
      tags: ['test', 'document'],
      metadata: { category: 'test', priority: 'high' },
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      serialize: sinon.stub().returns({
        id: 'test-document-id',
        name: 'updated-document.pdf',
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
      documentId: 'test-document-id',
      name: 'updated-document.pdf',
      userId: 'test-user-id'
    };

    // Create use case instance
    useCase = new UpdateDocumentNameUseCase(
      mockDocumentApplicationService as IDocumentApplicationService,
      mockLogger as ILogger
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('execute', () => {
    it('should successfully update document name and return response', async () => {
      // Arrange
      mockDocumentApplicationService.updateDocumentName.resolves(AppResult.Ok(mockDocument));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.isErr()).to.be.false;

      const response = result.unwrap();
      expect(response).to.deep.equal({
        success: true,
        message: `Document name updated successfully to: ${mockRequest.name}`
      });

      // Verify service call
      expect(mockDocumentApplicationService.updateDocumentName.calledWith(
        'test-document-id',
        'updated-document.pdf'
      )).to.be.true;

      // Verify logging
      expect(mockChildLogger.info.calledWith(
        'Executing update document name use case',
        { documentId: 'test-document-id', newName: mockRequest.name, userId: 'test-user-id' }
      )).to.be.true;
      expect(mockChildLogger.info.calledWith(
        'Document name updated successfully',
        { documentId: 'test-document-id', oldName: 'updated-document.pdf', newName: 'updated-document.pdf' }
      )).to.be.true;
    });

    it('should handle document name update failure and return error', async () => {
      // Arrange
      const serviceError = AppError.InvalidData('Document name update failed');
      mockDocumentApplicationService.updateDocumentName.resolves(AppResult.Err(serviceError));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.status).to.equal(AppError.InvalidOperation().status);
      expect(error.message).to.include('Document name update failed for document ID: test-document-id');

      // Verify service call
      expect(mockDocumentApplicationService.updateDocumentName.calledOnce).to.be.true;

      // Verify logging
      expect(mockChildLogger.warn.calledWith(
        'Document name update failed',
        { documentId: 'test-document-id', newName: mockRequest.name, userId: 'test-user-id' }
      )).to.be.true;
    });

    it('should handle service errors and return generic error', async () => {
      // Arrange
      const serviceError = new Error('Service error');
      mockDocumentApplicationService.updateDocumentName.rejects(serviceError);

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.status).to.equal(AppError.Generic('Service error').status);
      expect(error.message).to.include('Failed to execute update document name use case for document ID: test-document-id');

      // Verify service call
      expect(mockDocumentApplicationService.updateDocumentName.calledOnce).to.be.true;

      // Verify logging
      expect(mockChildLogger.error.calledWith(
        'Service error',
        { documentId: 'test-document-id', newName: mockRequest.name, userId: 'test-user-id' }
      )).to.be.true;
    });

    it('should handle unknown errors and return generic error', async () => {
      // Arrange
      const unknownError = new Error('Unknown error string');
      mockDocumentApplicationService.updateDocumentName.rejects(unknownError);

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.status).to.equal(AppError.Generic('Unknown error string').status);
      expect(error.message).to.include('Failed to execute update document name use case for document ID: test-document-id');

      // Verify service call
      expect(mockDocumentApplicationService.updateDocumentName.calledOnce).to.be.true;

      // Verify logging
      expect(mockChildLogger.error.calledWith(
        'Unknown error string',
        { documentId: 'test-document-id', newName: mockRequest.name, userId: 'test-user-id' }
      )).to.be.true;
    });

    it('should handle different document name formats correctly', async () => {
      // Arrange
      const requestWithDifferentName: UpdateDocumentNameRequest = {
        ...mockRequest,
        name: 'report-2024.docx'
      };

      const documentWithNewName = {
        ...mockDocument,
        name: { value: 'report-2024.docx' } as DocumentName
      } as Document;

      mockDocumentApplicationService.updateDocumentName.resolves(AppResult.Ok(documentWithNewName));

      // Act
      const result = await useCase.execute(requestWithDifferentName);

      // Assert
      expect(result.isOk()).to.be.true;

      const response = result.unwrap();
      expect(response.message).to.equal('Document name updated successfully to: report-2024.docx');

      // Verify service call
      expect(mockDocumentApplicationService.updateDocumentName.calledWith(
        'test-document-id',
        'report-2024.docx'
      )).to.be.true;
    });

    it('should handle document name with special characters', async () => {
      // Arrange
      const requestWithSpecialChars: UpdateDocumentNameRequest = {
        ...mockRequest,
        name: 'report_2024-final (v2).pdf'
      };

      const documentWithSpecialName = {
        ...mockDocument,
        name: { value: 'report_2024-final (v2).pdf' } as DocumentName
      } as Document;

      mockDocumentApplicationService.updateDocumentName.resolves(AppResult.Ok(documentWithSpecialName));

      // Act
      const result = await useCase.execute(requestWithSpecialChars);

      // Assert
      expect(result.isOk()).to.be.true;

      const response = result.unwrap();
      expect(response.message).to.equal('Document name updated successfully to: report_2024-final (v2).pdf');

      // Verify service call
      expect(mockDocumentApplicationService.updateDocumentName.calledWith(
        'test-document-id',
        'report_2024-final (v2).pdf'
      )).to.be.true;
    });

    it('should handle document name with long names', async () => {
      // Arrange
      const longName = 'very-long-document-name-that-exceeds-normal-length-limits-for-testing-purposes.pdf';
      const requestWithLongName: UpdateDocumentNameRequest = {
        ...mockRequest,
        name: longName
      };

      const documentWithLongName = {
        ...mockDocument,
        name: { value: longName } as DocumentName
      } as Document;

      mockDocumentApplicationService.updateDocumentName.resolves(AppResult.Ok(documentWithLongName));

      // Act
      const result = await useCase.execute(requestWithLongName);

      // Assert
      expect(result.isOk()).to.be.true;

      const response = result.unwrap();
      expect(response.message).to.equal(`Document name updated successfully to: ${longName}`);

      // Verify service call
      expect(mockDocumentApplicationService.updateDocumentName.calledWith(
        'test-document-id',
        longName
      )).to.be.true;
    });
  });
});
