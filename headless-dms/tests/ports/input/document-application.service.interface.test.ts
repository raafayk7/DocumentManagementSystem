/**
 * IDocumentApplicationService Input Port Interface Tests
 * 
 * Tests the contract and method signatures of the IDocumentApplicationService interface
 * without testing actual implementations (that's done in adapter tests)
 */

import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import { IDocumentApplicationService } from '../../../src/ports/input/IDocumentApplicationService.js';
import { Document } from '../../../src/domain/entities/Document.js';
import { AppResult } from '@carbonteq/hexapp';

describe('IDocumentApplicationService Input Port Interface', () => {
  let mockService: IDocumentApplicationService;

  beforeEach(() => {
    // Create a mock implementation that satisfies the interface
    mockService = {
      createDocument: async (
        userId: string,
        name: string,
        filename: string,
        mimeType: string,
        size: string,
        tags?: string[],
        metadata?: Record<string, string>
      ): Promise<AppResult<Document>> => {
        const documentResult = Document.fromRepository({
          id: 'doc123',
          name: 'Test Document',
          filePath: '/path/to/file',
          mimeType: 'application/pdf',
          size: '1024',
          tags: [],
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return documentResult;
      },

      getDocument: async (documentId: string, userId: string): Promise<AppResult<Document>> => {
        const documentResult = Document.fromRepository({
          id: 'doc123',
          name: 'Test Document',
          filePath: '/path/to/file',
          mimeType: 'application/pdf',
          size: '1024',
          tags: [],
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return documentResult;
      },

      updateDocumentName: async (
        documentId: string,
        newName: string,
        userId: string
      ): Promise<AppResult<Document>> => {
        const documentResult = Document.fromRepository({
          id: 'doc123',
          name: 'Test Document',
          filePath: '/path/to/file',
          mimeType: 'application/pdf',
          size: '1024',
          tags: [],
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return documentResult;
      },

      addTagsToDocument: async (
        documentId: string,
        tags: string[],
        userId: string
      ): Promise<AppResult<Document>> => {
        const documentResult = Document.fromRepository({
          id: 'doc123',
          name: 'Test Document',
          filePath: '/path/to/file',
          mimeType: 'application/pdf',
          size: '1024',
          tags: [],
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return documentResult;
      },

      removeTagsFromDocument: async (
        documentId: string,
        tags: string[],
        userId: string
      ): Promise<AppResult<Document>> => {
        const documentResult = Document.fromRepository({
          id: 'doc123',
          name: 'Test Document',
          filePath: '/path/to/file',
          mimeType: 'application/pdf',
          size: '1024',
          tags: [],
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return documentResult;
      },

      updateDocumentMetadata: async (
        documentId: string,
        metadata: Record<string, string>,
        userId: string
      ): Promise<AppResult<Document>> => {
        const documentResult = Document.fromRepository({
          id: 'doc123',
          name: 'Test Document',
          filePath: '/path/to/file',
          mimeType: 'application/pdf',
          size: '1024',
          tags: [],
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return documentResult;
      },

      deleteDocument: async (documentId: string, userId: string): Promise<AppResult<void>> => {
        return AppResult.Ok(undefined);
      },

      getDocumentById: async (documentId: string): Promise<AppResult<Document>> => {
        const documentResult = Document.fromRepository({
          id: 'doc123',
          name: 'Test Document',
          filePath: '/path/to/file',
          mimeType: 'application/pdf',
          size: '1024',
          tags: [],
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return documentResult;
      },

      getDocumentByName: async (name: string): Promise<AppResult<Document>> => {
        const documentResult = Document.fromRepository({
          id: 'doc123',
          name: 'Test Document',
          filePath: '/path/to/file',
          mimeType: 'application/pdf',
          size: '1024',
          tags: [],
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return documentResult;
      },

      getDocuments: async (
        page?: number,
        limit?: number,
        sortBy?: string,
        sortOrder?: 'asc' | 'desc',
        filters?: {
          name?: string;
          mimeType?: string;
          tags?: string[];
          metadata?: Record<string, string>;
          from?: string;
          to?: string;
        }
      ): Promise<AppResult<Document[]>> => {
        const documentResult = Document.fromRepository({
          id: 'doc123',
          name: 'Test Document',
          filePath: '/path/to/file',
          mimeType: 'application/pdf',
          size: '1024',
          tags: [],
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return AppResult.Ok([documentResult.unwrap()]);
      },

      getDocumentsByTags: async (tags: string[]): Promise<AppResult<Document[]>> => {
        const documentResult = Document.fromRepository({
          id: 'doc123',
          name: 'Test Document',
          filePath: '/path/to/file',
          mimeType: 'application/pdf',
          size: '1024',
          tags: [],
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return AppResult.Ok([documentResult.unwrap()]);
      },

      getDocumentsByMimeType: async (mimeType: string): Promise<AppResult<Document[]>> => {
        const documentResult = Document.fromRepository({
          id: 'doc123',
          name: 'Test Document',
          filePath: '/path/to/file',
          mimeType: 'application/pdf',
          size: '1024',
          tags: [],
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return AppResult.Ok([documentResult.unwrap()]);
      },

      uploadDocument: async (
        file: Buffer,
        name: string,
        mimeType: string,
        userId: string,
        tags?: string[],
        metadata?: Record<string, string>
      ): Promise<AppResult<Document>> => {
        const documentResult = Document.fromRepository({
          id: 'doc123',
          name: 'Test Document',
          filePath: '/path/to/file',
          mimeType: 'application/pdf',
          size: '1024',
          tags: [],
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return documentResult;
      },

      downloadDocument: async (
        documentId: string,
        userId: string
      ): Promise<AppResult<{ document: Document; file: Buffer }>> => {
        const documentResult = Document.fromRepository({
          id: 'doc123',
          name: 'Test Document',
          filePath: '/path/to/file',
          mimeType: 'application/pdf',
          size: '1024',
          tags: [],
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return AppResult.Ok({ document: documentResult.unwrap(), file: Buffer.from('test') });
      },

      downloadDocumentByToken: async (token: string): Promise<AppResult<{ document: Document; file: Buffer }>> => {
        const documentResult = Document.fromRepository({
          id: 'doc123',
          name: 'Test Document',
          filePath: '/path/to/file',
          mimeType: 'application/pdf',
          size: '1024',
          tags: [],
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return AppResult.Ok({ document: documentResult.unwrap(), file: Buffer.from('test') });
      },

      generateDownloadLink: async (documentId: string, expiresInMinutes?: number): Promise<AppResult<string>> => {
        return AppResult.Ok('https://example.com/download/token123');
      },

      replaceTagsInDocument: async (
        documentId: string,
        tags: string[],
        userId: string
      ): Promise<AppResult<Document>> => {
        const documentResult = Document.fromRepository({
          id: 'doc123',
          name: 'Test Document',
          filePath: '/path/to/file',
          mimeType: 'application/pdf',
          size: '1024',
          tags: [],
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return documentResult;
      }
    };
  });

  describe('Interface Contract Compliance', () => {
    it('should implement all required methods', () => {
      expect(mockService).to.have.property('createDocument');
      expect(mockService).to.have.property('getDocument');
      expect(mockService).to.have.property('updateDocumentName');
      expect(mockService).to.have.property('addTagsToDocument');
      expect(mockService).to.have.property('removeTagsFromDocument');
      expect(mockService).to.have.property('updateDocumentMetadata');
      expect(mockService).to.have.property('deleteDocument');
      expect(mockService).to.have.property('getDocumentById');
      expect(mockService).to.have.property('getDocumentByName');
      expect(mockService).to.have.property('getDocuments');
      expect(mockService).to.have.property('getDocumentsByTags');
      expect(mockService).to.have.property('getDocumentsByMimeType');
      expect(mockService).to.have.property('uploadDocument');
      expect(mockService).to.have.property('downloadDocument');
      expect(mockService).to.have.property('downloadDocumentByToken');
      expect(mockService).to.have.property('generateDownloadLink');
      expect(mockService).to.have.property('replaceTagsInDocument');
    });

    it('should have correct method signatures', () => {
      expect(typeof mockService.createDocument).to.equal('function');
      expect(typeof mockService.getDocument).to.equal('function');
      expect(typeof mockService.updateDocumentName).to.equal('function');
      expect(typeof mockService.addTagsToDocument).to.equal('function');
      expect(typeof mockService.removeTagsFromDocument).to.equal('function');
      expect(typeof mockService.updateDocumentMetadata).to.equal('function');
      expect(typeof mockService.deleteDocument).to.equal('function');
      expect(typeof mockService.getDocumentById).to.equal('function');
      expect(typeof mockService.getDocumentByName).to.equal('function');
      expect(typeof mockService.getDocuments).to.equal('function');
      expect(typeof mockService.getDocumentsByTags).to.equal('function');
      expect(typeof mockService.getDocumentsByMimeType).to.equal('function');
      expect(typeof mockService.uploadDocument).to.equal('function');
      expect(typeof mockService.downloadDocument).to.equal('function');
      expect(typeof mockService.downloadDocumentByToken).to.equal('function');
      expect(typeof mockService.generateDownloadLink).to.equal('function');
      expect(typeof mockService.replaceTagsInDocument).to.equal('function');
    });
  });

  describe('Document CRUD Methods', () => {
    it('should handle createDocument with required parameters', async () => {
      const result = await mockService.createDocument(
        'user123',
        'Test Document',
        'test.pdf',
        'application/pdf',
        '1024'
      );
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const document = result.unwrap();
      expect(document).to.be.instanceOf(Document);
    });

    it('should handle createDocument with optional parameters', async () => {
      const result = await mockService.createDocument(
        'user123',
        'Test Document',
        'test.pdf',
        'application/pdf',
        '1024',
        ['important', 'test'],
        { category: 'work', priority: 'high' }
      );
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
    });

    it('should handle updateDocumentName with all parameters', async () => {
      const result = await mockService.updateDocumentName('doc123', 'New Name', 'user123');
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
    });

    it('should handle deleteDocument with document and user IDs', async () => {
      const result = await mockService.deleteDocument('doc123', 'user123');
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
    });
  });

  describe('Document Retrieval Methods', () => {
    it('should handle getDocumentById with string parameter', async () => {
      const result = await mockService.getDocumentById('doc123');
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const document = result.unwrap();
      expect(document).to.be.instanceOf(Document);
    });

    it('should handle getDocumentByName with string parameter', async () => {
      const result = await mockService.getDocumentByName('Test Document');
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const document = result.unwrap();
      expect(document).to.be.instanceOf(Document);
    });

    it('should handle getDocument with document and user IDs', async () => {
      const result = await mockService.getDocument('doc123', 'user123');
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
    });

    it('should handle getDocuments with no parameters', async () => {
      const result = await mockService.getDocuments();
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const documents = result.unwrap();
      expect(Array.isArray(documents)).to.be.true;
    });

    it('should handle getDocuments with all parameters', async () => {
      const result = await mockService.getDocuments(
        1,
        10,
        'name',
        'asc',
        { name: 'test', mimeType: 'application/pdf', tags: ['important'] }
      );
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
    });
  });

  describe('Tag Management Methods', () => {
    it('should handle addTagsToDocument with all parameters', async () => {
      const result = await mockService.addTagsToDocument('doc123', ['new', 'tags'], 'user123');
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
    });

    it('should handle removeTagsFromDocument with all parameters', async () => {
      const result = await mockService.removeTagsFromDocument('doc123', ['old', 'tags'], 'user123');
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
    });

    it('should handle replaceTagsInDocument with all parameters', async () => {
      const result = await mockService.replaceTagsInDocument('doc123', ['replaced', 'tags'], 'user123');
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
    });

    it('should handle getDocumentsByTags with tags array', async () => {
      const result = await mockService.getDocumentsByTags(['important', 'urgent']);
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const documents = result.unwrap();
      expect(Array.isArray(documents)).to.be.true;
    });
  });

  describe('File Operations Methods', () => {
    it('should handle uploadDocument with all parameters', async () => {
      const file = Buffer.from('test file content');
      const result = await mockService.uploadDocument(
        file,
        'Test Document',
        'text/plain',
        'user123',
        ['uploaded'],
        { source: 'test' }
      );
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
    });

    it('should handle downloadDocument with document and user IDs', async () => {
      const result = await mockService.downloadDocument('doc123', 'user123');
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const download = result.unwrap();
      expect(download.document).to.be.instanceOf(Document);
      expect(download.file).to.be.instanceOf(Buffer);
    });

    it('should handle downloadDocumentByToken with token string', async () => {
      const result = await mockService.downloadDocumentByToken('token123');
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const download = result.unwrap();
      expect(download.document).to.be.instanceOf(Document);
      expect(download.file).to.be.instanceOf(Buffer);
    });

    it('should handle generateDownloadLink with document ID', async () => {
      const result = await mockService.generateDownloadLink('doc123');
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const link = result.unwrap();
      expect(typeof link).to.equal('string');
      expect(link).to.include('http');
    });

    it('should handle generateDownloadLink with optional expiration', async () => {
      const result = await mockService.generateDownloadLink('doc123', 30);
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
    });
  });

  describe('Metadata Management Methods', () => {
    it('should handle updateDocumentMetadata with all parameters', async () => {
      const result = await mockService.updateDocumentMetadata(
        'doc123',
        { category: 'work', priority: 'high' },
        'user123'
      );
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
    });

    it('should handle getDocumentsByMimeType with MIME type string', async () => {
      const result = await mockService.getDocumentsByMimeType('application/pdf');
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const documents = result.unwrap();
      expect(Array.isArray(documents)).to.be.true;
    });
  });

  describe('Method Parameter Types', () => {
    it('should accept string parameters for IDs', async () => {
      const result = await mockService.getDocumentById('doc123');
      expect(result.isOk()).to.be.true;
    });

    it('should accept string parameters for names', async () => {
      const result = await mockService.getDocumentByName('Test Document');
      expect(result.isOk()).to.be.true;
    });

    it('should accept Buffer parameters for files', async () => {
      const file = Buffer.from('test content');
      const result = await mockService.uploadDocument(file, 'Test', 'text/plain', 'user123');
      expect(result.isOk()).to.be.true;
    });

    it('should accept array parameters for tags', async () => {
      const result = await mockService.getDocumentsByTags(['tag1', 'tag2']);
      expect(result.isOk()).to.be.true;
    });

    it('should accept record parameters for metadata', async () => {
      const result = await mockService.updateDocumentMetadata('doc123', { key: 'value' }, 'user123');
      expect(result.isOk()).to.be.true;
    });

    it('should accept optional parameters', async () => {
      const result1 = await mockService.getDocuments();
      const result2 = await mockService.getDocuments(1);
      const result3 = await mockService.getDocuments(1, 10);
      
      expect(result1.isOk()).to.be.true;
      expect(result2.isOk()).to.be.true;
      expect(result3.isOk()).to.be.true;
    });
  });

  describe('Return Type Consistency', () => {
    it('should consistently return AppResult types', async () => {
      const results = [
        await mockService.getDocumentById('doc123'),
        await mockService.getDocuments(),
        await mockService.uploadDocument(Buffer.from('test'), 'test', 'text/plain', 'user123'),
        await mockService.generateDownloadLink('doc123')
      ];
      
      results.forEach(result => {
        expect(result).to.be.instanceOf(AppResult);
      });
    });

    it('should return correct generic types', async () => {
      const documentResult = await mockService.getDocumentById('doc123');
      const documentsResult = await mockService.getDocuments();
      const voidResult = await mockService.deleteDocument('doc123', 'user123');
      const linkResult = await mockService.generateDownloadLink('doc123');
      
      expect(documentResult.unwrap()).to.be.instanceOf(Document);
      expect(Array.isArray(documentsResult.unwrap())).to.be.true;
      expect(voidResult.unwrap()).to.be.undefined;
      expect(typeof linkResult.unwrap()).to.equal('string');
    });
  });

  describe('Async Operation Handling', () => {
    it('should handle all methods as async operations', async () => {
      const methods = [
        mockService.getDocumentById('doc123'),
        mockService.getDocuments(),
        mockService.uploadDocument(Buffer.from('test'), 'test', 'text/plain', 'user123'),
        mockService.generateDownloadLink('doc123')
      ];
      
      methods.forEach(promise => {
        expect(promise).to.be.instanceOf(Promise);
      });
      
      const results = await Promise.all(methods);
      results.forEach(result => {
        expect(result).to.be.instanceOf(AppResult);
      });
    });
  });

  describe('Interface Extensibility', () => {
    it('should allow additional methods in implementations', () => {
      const extendedService: IDocumentApplicationService & { additionalMethod?: () => void } = {
        ...mockService,
        additionalMethod: () => {}
      };
      
      expect(extendedService.getDocumentById).to.be.a('function');
      expect(extendedService.uploadDocument).to.be.a('function');
      expect(extendedService.additionalMethod).to.be.a('function');
    });
  });
});
