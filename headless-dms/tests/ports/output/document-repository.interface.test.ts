/**
 * IDocumentRepository Output Port Interface Tests
 * 
 * Tests the contract and method signatures of the IDocumentRepository interface
 * without testing actual implementations (that's done in adapter tests)
 */

import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import { IDocumentRepository, DocumentFilterQuery } from '../../../src/ports/output/IDocumentRepository.js';
import { Document } from '../../../src/domain/entities/Document.js';
import { PaginationInput, PaginationOutput } from '../../../src/shared/dto/common/pagination.dto.js';
import { BaseRepository, RepositoryResult, Paginated, PaginationOptions } from '@carbonteq/hexapp';
import { AppResult } from '@carbonteq/hexapp';

describe('IDocumentRepository Output Port Interface', () => {
  let mockRepository: IDocumentRepository;

  beforeEach(() => {
    // Create a mock implementation that satisfies the interface
    mockRepository = {
      // BaseRepository required methods
      insert: async (document: Document): Promise<RepositoryResult<Document, any>> => {
        return {
          isOk: (): this is RepositoryResult<Document, never> => true,
          isErr: (): this is RepositoryResult<never, any> => false,
          unwrap: () => document,
          unwrapErr: () => new Error()
        } as RepositoryResult<Document, any>;
      },

      update: async (document: Document): Promise<RepositoryResult<Document, any>> => {
        return {
          isOk: (): this is RepositoryResult<Document, never> => true,
          isErr: (): this is RepositoryResult<never, any> => false,
          unwrap: () => document,
          unwrapErr: () => new Error()
        } as RepositoryResult<Document, any>;
      },

      // Existing custom methods
      findById: async (id: string): Promise<Document | null> => {
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
        if (documentResult.isOk()) {
          return documentResult.unwrap();
        }
        return null;
      },

      save: async (document: Document): Promise<Document> => {
        // Ensure we return the document that was passed in
        return document;
      },

      saveWithNameCheck: async (document: Document): Promise<Document> => {
        // Ensure we return the document that was passed in
        return document;
      },

      find: async (query?: DocumentFilterQuery, pagination?: PaginationInput): Promise<PaginationOutput<Document>> => {
        const documents = [
          {
            id: 'doc123',
            name: 'test-document.pdf',
            mimeType: 'application/pdf',
            size: '1024',
            tags: ['test', 'document'],
            metadata: { author: 'test-user' },
            createdAt: new Date(),
            updatedAt: new Date()
          } as any
        ];
        
        return {
          data: documents,
          pagination: {
            page: pagination?.page || 1,
            limit: pagination?.limit || 10,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        };
      },

      findOne: async (query: DocumentFilterQuery): Promise<Document | null> => {
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
        if (documentResult.isOk()) {
          return documentResult.unwrap();
        }
        return null;
      },

      findByName: async (name: string): Promise<Document | null> => {
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
        if (documentResult.isOk()) {
          return documentResult.unwrap();
        }
        return null;
      },

      findByTags: async (tags: string[]): Promise<Document[]> => {
        const documents = [
          {
            id: 'doc123',
            name: 'test-document.pdf',
            mimeType: 'application/pdf',
            size: '1024',
            tags: tags,
            metadata: { author: 'test-user' },
            createdAt: new Date(),
            updatedAt: new Date()
          } as any
        ];
        
        return documents;
      },

      findByMimeType: async (mimeType: string): Promise<Document[]> => {
        const documents = [
          {
            id: 'doc123',
            name: 'test-document.pdf',
            mimeType: mimeType,
            size: '1024',
            tags: ['test', 'document'],
            metadata: { author: 'test-user' },
            createdAt: new Date(),
            updatedAt: new Date()
          } as any
        ];
        
        return documents;
      },

      exists: async (query: DocumentFilterQuery): Promise<boolean> => {
        return true;
      },

      count: async (query?: DocumentFilterQuery): Promise<number> => {
        return 1;
      },

      delete: async (id: string): Promise<boolean> => {
        return true;
      },

      // New hexapp standardized methods (optional)
      fetchAll: async (): Promise<RepositoryResult<Document[]>> => {
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
        return {
          isOk: (): this is RepositoryResult<Document[], never> => true,
          isErr: (): this is RepositoryResult<never, any> => false,
          unwrap: () => [documentResult.unwrap()],
          unwrapErr: () => new Error()
        } as RepositoryResult<Document[]>;
      },

      fetchPaginated: async (options: PaginationOptions): Promise<RepositoryResult<Paginated<Document>>> => {
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
        return {
          isOk: (): this is RepositoryResult<Paginated<Document>, never> => true,
          isErr: (): this is RepositoryResult<never, any> => false,
          unwrap: () => ({ 
            data: [documentResult.unwrap()], 
            pageNum: 1, 
            pageSize: 10, 
            totalPages: 1
          }),
          unwrapErr: () => new Error()
        } as RepositoryResult<Paginated<Document>>;
      },

      fetchById: async (id: string): Promise<RepositoryResult<Document, any>> => {
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
        return {
          isOk: (): this is RepositoryResult<Document, never> => true,
          isErr: (): this is RepositoryResult<never, any> => false,
          unwrap: () => documentResult.unwrap(),
          unwrapErr: () => new Error()
        } as RepositoryResult<Document, any>;
      },

      deleteById: async (id: string): Promise<RepositoryResult<Document, any>> => {
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
        return {
          isOk: (): this is RepositoryResult<Document, never> => true,
          isErr: (): this is RepositoryResult<never, any> => false,
          unwrap: () => documentResult.unwrap(),
          unwrapErr: () => new Error()
        } as RepositoryResult<Document, any>;
      },

      fetchBy: async <U extends keyof Document>(prop: U, val: Document[U]): Promise<RepositoryResult<Document, any>> => {
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
        return {
          isOk: (): this is RepositoryResult<Document, never> => true,
          isErr: (): this is RepositoryResult<never, any> => false,
          unwrap: () => documentResult.unwrap(),
          unwrapErr: () => new Error()
        } as RepositoryResult<Document, any>;
      },

      existsBy: async <U extends keyof Document>(prop: U, val: Document[U]): Promise<RepositoryResult<boolean>> => {
        return {
          isOk: (): this is RepositoryResult<boolean, never> => true,
          isErr: (): this is RepositoryResult<never, any> => false,
          unwrap: () => true,
          unwrapErr: () => new Error()
        } as RepositoryResult<boolean>;
      },

      deleteBy: async <U extends keyof Document>(prop: U, val: Document[U]): Promise<RepositoryResult<Document, any>> => {
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
        return {
          isOk: (): this is RepositoryResult<Document, never> => true,
          isErr: (): this is RepositoryResult<never, any> => false,
          unwrap: () => documentResult.unwrap(),
          unwrapErr: () => new Error()
        } as RepositoryResult<Document, any>;
      }
    };
  });

  describe('Interface Contract Compliance', () => {
    it('should extend BaseRepository', () => {
      expect(mockRepository).to.be.instanceOf(Object);
      expect(mockRepository).to.have.property('insert');
      expect(mockRepository).to.have.property('update');
    });

    it('should implement all required BaseRepository methods', () => {
      expect(mockRepository).to.have.property('insert');
      expect(mockRepository).to.have.property('update');
    });

    it('should implement all existing custom methods', () => {
      expect(mockRepository).to.have.property('findById');
      expect(mockRepository).to.have.property('save');
      expect(mockRepository).to.have.property('saveWithNameCheck');
      expect(mockRepository).to.have.property('find');
      expect(mockRepository).to.have.property('findOne');
      expect(mockRepository).to.have.property('findByName');
      expect(mockRepository).to.have.property('findByTags');
      expect(mockRepository).to.have.property('findByMimeType');
      expect(mockRepository).to.have.property('exists');
      expect(mockRepository).to.have.property('count');
      expect(mockRepository).to.have.property('delete');
    });

    it('should implement all optional hexapp methods', () => {
      expect(mockRepository).to.have.property('fetchAll');
      expect(mockRepository).to.have.property('fetchPaginated');
      expect(mockRepository).to.have.property('fetchById');
      expect(mockRepository).to.have.property('deleteById');
      expect(mockRepository).to.have.property('fetchBy');
      expect(mockRepository).to.have.property('existsBy');
      expect(mockRepository).to.have.property('deleteBy');
    });

    it('should have correct method signatures', () => {
      expect(typeof mockRepository.insert).to.equal('function');
      expect(typeof mockRepository.update).to.equal('function');
      expect(typeof mockRepository.findById).to.equal('function');
      expect(typeof mockRepository.save).to.equal('function');
      expect(typeof mockRepository.saveWithNameCheck).to.equal('function');
      expect(typeof mockRepository.find).to.equal('function');
      expect(typeof mockRepository.findOne).to.equal('function');
      expect(typeof mockRepository.findByName).to.equal('function');
      expect(typeof mockRepository.findByTags).to.equal('function');
      expect(typeof mockRepository.findByMimeType).to.equal('function');
      expect(typeof mockRepository.exists).to.equal('function');
      expect(typeof mockRepository.count).to.equal('function');
      expect(typeof mockRepository.delete).to.equal('function');
    });
  });

  describe('BaseRepository Methods', () => {
    it('should handle insert with Document entity', async () => {
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
      const document = documentResult.unwrap();
      const result = await mockRepository.insert(document);
      
      expect(result).to.have.property('isOk');
      expect(result).to.have.property('isErr');
      expect(result).to.have.property('unwrap');
      expect(result).to.have.property('unwrapErr');
      expect(result.isOk()).to.be.true;
    });

    it('should handle update with Document entity', async () => {
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
      const document = documentResult.unwrap();
      const result = await mockRepository.update(document);
      
      expect(result).to.have.property('isOk');
      expect(result).to.have.property('isErr');
      expect(result).to.have.property('unwrap');
      expect(result).to.have.property('unwrapErr');
      expect(result.isOk()).to.be.true;
    });
  });

  describe('Document Retrieval Methods', () => {
    it('should handle findById with string parameter', async () => {
      const result = await mockRepository.findById('doc123');
      expect(result).to.be.instanceOf(Document);
    });

    it('should handle findByName with string parameter', async () => {
      const result = await mockRepository.findByName('Test Document');
      expect(result).to.be.instanceOf(Document);
    });

    it('should handle findOne with DocumentFilterQuery', async () => {
      const query: DocumentFilterQuery = { name: 'Test Document' };
      const result = await mockRepository.findOne(query);
      expect(result).to.be.instanceOf(Document);
    });

    it('should handle findByTags with tags array', async () => {
      const tags = ['test', 'document'];
      
      const result = await mockRepository.findByTags(tags);
      
      expect(Array.isArray(result)).to.be.true;
      expect(result.length).to.be.greaterThan(0);
      expect(result[0]).to.have.property('id');
      expect(result[0]).to.have.property('name');
      expect(result[0]).to.have.property('mimeType');
      expect(result[0]).to.have.property('tags');
    });

    it('should handle findByMimeType with MIME type string', async () => {
      const mimeType = 'application/pdf';
      
      const result = await mockRepository.findByMimeType(mimeType);
      
      expect(Array.isArray(result)).to.be.true;
      expect(result.length).to.be.greaterThan(0);
      expect(result[0]).to.have.property('id');
      expect(result[0]).to.have.property('name');
      expect(result[0]).to.have.property('mimeType');
      expect(result[0].mimeType).to.equal(mimeType);
    });
  });

  describe('Document Management Methods', () => {
    it('should handle save with Document entity', async () => {
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
      const document = documentResult.unwrap();
      const result = await mockRepository.save(document);
      expect(result).to.be.instanceOf(Document);
    });

    it('should handle saveWithNameCheck with Document entity', async () => {
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
      const document = documentResult.unwrap();
      const result = await mockRepository.saveWithNameCheck(document);
      expect(result).to.be.instanceOf(Document);
    });

    it('should handle delete with string parameter', async () => {
      const result = await mockRepository.delete('doc123');
      expect(typeof result).to.equal('boolean');
    });
  });

  describe('Query and Pagination Methods', () => {
    it('should handle find with no parameters', async () => {
      const result = await mockRepository.find();
      expect(result).to.have.property('data');
      expect(result).to.have.property('pagination');
      expect(Array.isArray(result.data)).to.be.true;
    });

    it('should handle find with DocumentFilterQuery', async () => {
      const query: DocumentFilterQuery = { name: 'Test Document', mimeType: 'application/pdf' };
      const result = await mockRepository.find(query);
      expect(result).to.have.property('data');
      expect(result).to.have.property('pagination');
    });

    it('should handle find with pagination', async () => {
      const pagination: PaginationInput = { page: 1, limit: 10, order: 'asc' };
      const result = await mockRepository.find(undefined, pagination);
      expect(result).to.have.property('data');
      expect(result).to.have.property('pagination');
    });

    it('should handle find with both query and pagination', async () => {
      const query: DocumentFilterQuery = { mimeType: 'application/pdf' };
      const pagination: PaginationInput = { page: 2, limit: 20, order: 'desc' };
      const result = await mockRepository.find(query, pagination);
      expect(result).to.have.property('data');
      expect(result).to.have.property('pagination');
    });
  });

  describe('Utility Methods', () => {
    it('should handle exists with DocumentFilterQuery', async () => {
      const query: DocumentFilterQuery = { name: 'Test Document' };
      const result = await mockRepository.exists(query);
      expect(typeof result).to.equal('boolean');
    });

    it('should handle count with no parameters', async () => {
      const result = await mockRepository.count();
      expect(typeof result).to.equal('number');
    });

    it('should handle count with DocumentFilterQuery', async () => {
      const query: DocumentFilterQuery = { mimeType: 'application/pdf' };
      const result = await mockRepository.count(query);
      expect(typeof result).to.equal('number');
    });
  });

  describe('Hexapp Standardized Methods', () => {
    it('should handle fetchAll', async () => {
      const result = await mockRepository.fetchAll!();
      expect(result).to.have.property('isOk');
      expect(result).to.have.property('isErr');
      expect(result).to.have.property('unwrap');
      expect(result).to.have.property('unwrapErr');
      expect(result.isOk()).to.be.true;
    });

    it('should handle fetchPaginated with PaginationOptions', async () => {
      const options = PaginationOptions.create({ pageNum: 1, pageSize: 10 }).unwrap();
      const result = await mockRepository.fetchPaginated!(options);
      expect(result).to.have.property('isOk');
      expect(result).to.have.property('isErr');
      expect(result).to.have.property('unwrap');
      expect(result).to.have.property('unwrapErr');
      expect(result.isOk()).to.be.true;
    });

    it('should handle fetchById with string parameter', async () => {
      const result = await mockRepository.fetchById!('doc123');
      expect(result).to.have.property('isOk');
      expect(result).to.have.property('isErr');
      expect(result).to.have.property('unwrap');
      expect(result).to.have.property('unwrapErr');
      expect(result.isOk()).to.be.true;
    });

    it('should handle deleteById with string parameter', async () => {
      const result = await mockRepository.deleteById!('doc123');
      expect(result).to.have.property('isOk');
      expect(result).to.have.property('isErr');
      expect(result).to.have.property('unwrap');
      expect(result).to.have.property('unwrapErr');
      expect(result.isOk()).to.be.true;
    });

    it('should handle fetchBy with property and value', async () => {
      const result = await mockRepository.fetchBy!('name', 'Test Document' as any);
      expect(result).to.have.property('isOk');
      expect(result).to.have.property('isErr');
      expect(result).to.have.property('unwrap');
      expect(result).to.have.property('unwrapErr');
      expect(result.isOk()).to.be.true;
    });

    it('should handle existsBy with property and value', async () => {
      const result = await mockRepository.existsBy!('name', 'Test Document' as any);
      expect(result).to.have.property('isOk');
      expect(result).to.have.property('isErr');
      expect(result).to.have.property('unwrap');
      expect(result).to.have.property('unwrapErr');
      expect(result.isOk()).to.be.true;
    });

    it('should handle deleteBy with property and value', async () => {
      const result = await mockRepository.deleteBy!('name', 'Test Document' as any);
      expect(result).to.have.property('isOk');
      expect(result).to.have.property('isErr');
      expect(result).to.have.property('unwrap');
      expect(result).to.have.property('unwrapErr');
      expect(result.isOk()).to.be.true;
    });
  });

  describe('Method Parameter Types', () => {
    it('should accept string parameters for IDs', async () => {
      const result = await mockRepository.findById('doc123');
      expect(result).to.be.instanceOf(Document);
    });

    it('should accept string parameters for names', async () => {
      const result = await mockRepository.findByName('Test Document');
      expect(result).to.be.instanceOf(Document);
    });

    it('should accept DocumentFilterQuery for queries', async () => {
      const queries: DocumentFilterQuery[] = [
        { name: 'Test Document' },
        { mimeType: 'application/pdf' },
        { tags: ['important'] },
        { name: 'Test Document', mimeType: 'application/pdf' }
      ];
      
      for (const query of queries) {
        const result = await mockRepository.findOne(query);
        expect(result).to.be.instanceOf(Document);
      }
    });

    it('should accept Document entities', async () => {
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
      const document = documentResult.unwrap();
      const insertResult = await mockRepository.insert(document);
      const updateResult = await mockRepository.update(document);
      
      expect(insertResult.isOk()).to.be.true;
      expect(updateResult.isOk()).to.be.true;
    });
  });

  describe('Return Type Consistency', () => {
    it('should consistently return RepositoryResult for BaseRepository methods', async () => {
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
      const document = documentResult.unwrap();
      const results = [
        await mockRepository.insert(document),
        await mockRepository.update(document)
      ];
      
      results.forEach(result => {
        expect(result).to.have.property('isOk');
        expect(result).to.have.property('isErr');
        expect(result).to.have.property('unwrap');
        expect(result).to.have.property('unwrapErr');
      });
    });

    it('should consistently return Document or Document[] for retrieval methods', async () => {
      // This test verifies the interface contract, not the implementation
      // The actual implementation will be tested in concrete repository tests
      
      // Verify that the interface methods exist and have the correct signatures
      expect(mockRepository.findById).to.be.a('function');
      expect(mockRepository.findByName).to.be.a('function');
      expect(mockRepository.findOne).to.be.a('function');
      expect(mockRepository.save).to.be.a('function');
      expect(mockRepository.saveWithNameCheck).to.be.a('function');
      expect(mockRepository.findByTags).to.be.a('function');
      expect(mockRepository.findByMimeType).to.be.a('function');
      expect(mockRepository.find).to.be.a('function');
      
      // Verify that the methods return promises
      const findByIdPromise = mockRepository.findById('doc123');
      const findByNamePromise = mockRepository.findByName('Test Document');
      const findOnePromise = mockRepository.findOne({ name: 'Test Document' });
      const savePromise = mockRepository.save({} as any);
      const saveWithNameCheckPromise = mockRepository.saveWithNameCheck({} as any);
      const findByTagsPromise = mockRepository.findByTags(['important']);
      const findByMimeTypePromise = mockRepository.findByMimeType('application/pdf');
      const findPromise = mockRepository.find();
      
      expect(findByIdPromise).to.be.instanceOf(Promise);
      expect(findByNamePromise).to.be.instanceOf(Promise);
      expect(findOnePromise).to.be.instanceOf(Promise);
      expect(savePromise).to.be.instanceOf(Promise);
      expect(saveWithNameCheckPromise).to.be.instanceOf(Promise);
      expect(findByTagsPromise).to.be.instanceOf(Promise);
      expect(findByMimeTypePromise).to.be.instanceOf(Promise);
      expect(findPromise).to.be.instanceOf(Promise);
      
      // Verify that the promises resolve (we don't care about the actual values in interface tests)
      await Promise.all([
        findByIdPromise,
        findByNamePromise,
        findOnePromise,
        savePromise,
        saveWithNameCheckPromise,
        findByTagsPromise,
        findByMimeTypePromise,
        findPromise
      ]);
    });

    it('should consistently return boolean for existence and deletion methods', async () => {
      const booleanResults = [
        await mockRepository.exists({ name: 'Test Document' }),
        await mockRepository.delete('doc123')
      ];
      
      booleanResults.forEach(result => {
        expect(typeof result).to.equal('boolean');
      });
    });

    it('should consistently return number for count method', async () => {
      const result = await mockRepository.count();
      expect(typeof result).to.equal('number');
    });
  });

  describe('Async Operation Handling', () => {
    it('should handle all methods as async operations', async () => {
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
      const document = documentResult.unwrap();
      
      const methods = [
        mockRepository.findById('doc123'),
        mockRepository.find(),
        mockRepository.insert(document),
        mockRepository.update(document)
      ];
      
      methods.forEach(promise => {
        expect(promise).to.be.instanceOf(Promise);
      });
      
      await Promise.all(methods);
    });
  });

  describe('Interface Extensibility', () => {
    it('should allow additional methods in implementations', () => {
      const extendedRepository: IDocumentRepository & { additionalMethod?: () => void } = {
        ...mockRepository,
        additionalMethod: () => {}
      };
      
      expect(extendedRepository.findById).to.be.a('function');
      expect(extendedRepository.insert).to.be.a('function');
      expect(extendedRepository.additionalMethod).to.be.a('function');
    });
  });

  describe('DocumentFilterQuery Interface', () => {
    it('should support name filtering', async () => {
      const query: DocumentFilterQuery = { name: 'Test Document' };
      const result = await mockRepository.findOne(query);
      expect(result).to.be.instanceOf(Document);
    });

    it('should support MIME type filtering', async () => {
      const query: DocumentFilterQuery = { mimeType: 'application/pdf' };
      const result = await mockRepository.findOne(query);
      expect(result).to.be.instanceOf(Document);
    });

    it('should support tags filtering', async () => {
      const query: DocumentFilterQuery = { tags: ['important'] };
      const result = await mockRepository.findOne(query);
      expect(result).to.be.instanceOf(Document);
    });

    it('should support combined filtering', async () => {
      const query: DocumentFilterQuery = { 
        name: 'Test Document', 
        mimeType: 'application/pdf',
        tags: ['important']
      };
      const result = await mockRepository.findOne(query);
      expect(result).to.be.instanceOf(Document);
    });
  });
});
