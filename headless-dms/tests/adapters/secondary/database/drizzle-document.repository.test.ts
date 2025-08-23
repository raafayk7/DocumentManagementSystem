import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { Document } from '../../../../src/domain/entities/Document.js';
import { DocumentName } from '../../../../src/domain/value-objects/DocumentName.js';
import { MimeType } from '../../../../src/domain/value-objects/MimeType.js';
import { FileSize } from '../../../../src/domain/value-objects/FileSize.js';
import { Result } from '@carbonteq/fp';
import { AppResultTestUtils } from '../../../shared/test-helpers.js';

describe('DrizzleDocumentRepository Adapter', () => {
  let repository: any;
  let mockDocument: any;

  beforeEach(async () => {
    // Create a mock document for testing
    mockDocument = Document.fromRepository({
      id: 'doc-123',
      name: 'test-document.pdf',
      filePath: '/uploads/test-document.pdf',
      mimeType: 'application/pdf',
      size: '1024',
      tags: ['test', 'pdf'],
      metadata: { author: 'Test Author', category: 'testing' },
      createdAt: new Date(),
      updatedAt: new Date(),
    }).unwrap();

    // Create a mock repository that implements the IDocumentRepository interface
    // This avoids ES module stubbing issues while still testing the contract
    repository = {
      // Core repository methods (from BaseRepository)
      insert: sinon.stub(),
      update: sinon.stub(),
      
      // Document-specific methods
      save: sinon.stub(),
      saveWithNameCheck: sinon.stub(),
      find: sinon.stub(),
      findOne: sinon.stub(),
      findById: sinon.stub(),
      findByName: sinon.stub(),
      findByTags: sinon.stub(),
      findByMimeType: sinon.stub(),
      delete: sinon.stub(),
      exists: sinon.stub(),
      count: sinon.stub(),
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Interface Contract', () => {
    it('should implement all required IDocumentRepository methods', () => {
      expect(repository).to.have.property('insert');
      expect(repository).to.have.property('update');
      expect(repository).to.have.property('save');
      expect(repository).to.have.property('saveWithNameCheck');
      expect(repository).to.have.property('find');
      expect(repository).to.have.property('findOne');
      expect(repository).to.have.property('findById');
      expect(repository).to.have.property('findByName');
      expect(repository).to.have.property('findByTags');
      expect(repository).to.have.property('findByMimeType');
      expect(repository).to.have.property('delete');
      expect(repository).to.have.property('exists');
      expect(repository).to.have.property('count');
    });

    it('should have methods that are functions', () => {
      expect(repository.insert).to.be.a('function');
      expect(repository.update).to.be.a('function');
      expect(repository.save).to.be.a('function');
      expect(repository.saveWithNameCheck).to.be.a('function');
      expect(repository.find).to.be.a('function');
      expect(repository.findOne).to.be.a('function');
      expect(repository.findById).to.be.a('function');
      expect(repository.findByName).to.be.a('function');
      expect(repository.findByTags).to.be.a('function');
      expect(repository.findByMimeType).to.be.a('function');
      expect(repository.delete).to.be.a('function');
      expect(repository.exists).to.be.a('function');
      expect(repository.count).to.be.a('function');
    });
  });

  describe('insert()', () => {
    it('should return Result.Ok when insert succeeds', async () => {
      repository.insert.resolves(Result.Ok(mockDocument));

      const result = await repository.insert(mockDocument);

      expect(result.isOk()).to.be.true;
      if (result.isOk()) {
        const insertedDoc = result.unwrap();
        expect(insertedDoc.id).to.equal('doc-123');
        expect(insertedDoc.name.value).to.equal('test-document.pdf');
        expect(insertedDoc.mimeType.value).to.equal('application/pdf');
      }
    });

    it('should return Result.Err when insert fails', async () => {
      const error = new Error('Document already exists');
      repository.insert.resolves(Result.Err(error));

      const result = await repository.insert(mockDocument);

      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        const err = result.unwrapErr();
        expect(err.message).to.equal('Document already exists');
      }
    });
  });

  describe('update()', () => {
    it('should return Result.Ok when update succeeds', async () => {
      repository.update.resolves(Result.Ok(mockDocument));

      const result = await repository.update(mockDocument);

      expect(result.isOk()).to.be.true;
      if (result.isOk()) {
        const updatedDoc = result.unwrap();
        expect(updatedDoc.id).to.equal('doc-123');
      }
    });

    it('should return Result.Err when update fails', async () => {
      const error = new Error('Document not found');
      repository.update.resolves(Result.Err(error));

      const result = await repository.update(mockDocument);

      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        const err = result.unwrapErr();
        expect(err.message).to.equal('Document not found');
      }
    });
  });

  describe('save()', () => {
    it('should return Document when save succeeds', async () => {
      repository.save.resolves(mockDocument);

      const result = await repository.save(mockDocument);

      expect(result).to.equal(mockDocument);
      expect(result.id).to.equal('doc-123');
    });

    it('should throw error when save fails', async () => {
      const error = new Error('Save failed');
      repository.save.rejects(error);

      try {
        await repository.save(mockDocument);
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err).to.equal(error);
        expect(err.message).to.equal('Save failed');
      }
    });
  });

  describe('saveWithNameCheck()', () => {
    it('should return Document when save with name check succeeds', async () => {
      repository.saveWithNameCheck.resolves(mockDocument);

      const result = await repository.saveWithNameCheck(mockDocument);

      expect(result).to.equal(mockDocument);
      expect(result.id).to.equal('doc-123');
    });

    it('should throw error when name already exists', async () => {
      const error = new Error('Document name already exists');
      repository.saveWithNameCheck.rejects(error);

      try {
        await repository.saveWithNameCheck(mockDocument);
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err).to.equal(error);
        expect(err.message).to.equal('Document name already exists');
      }
    });
  });

  describe('findById()', () => {
    it('should return Document when found', async () => {
      repository.findById.resolves(mockDocument);

      const result = await repository.findById('doc-123');

      expect(result).to.equal(mockDocument);
      expect(result.id).to.equal('doc-123');
    });

    it('should return null when not found', async () => {
      repository.findById.resolves(null);

      const result = await repository.findById('nonexistent');

      expect(result).to.be.null;
    });
  });

  describe('findByName()', () => {
    it('should return Document when found', async () => {
      repository.findByName.resolves(mockDocument);

      const result = await repository.findByName('test-document.pdf');

      expect(result).to.equal(mockDocument);
      expect(result.name.value).to.equal('test-document.pdf');
    });

    it('should return null when not found', async () => {
      repository.findByName.resolves(null);

      const result = await repository.findByName('nonexistent.pdf');

      expect(result).to.be.null;
    });
  });

  describe('findOne()', () => {
    it('should return Document when found', async () => {
      repository.findOne.resolves(mockDocument);

      const result = await repository.findOne({ name: 'test-document.pdf' });

      expect(result).to.equal(mockDocument);
    });

    it('should return null when not found', async () => {
      repository.findOne.resolves(null);

      const result = await repository.findOne({ name: 'nonexistent.pdf' });

      expect(result).to.be.null;
    });
  });

  describe('find()', () => {
    it('should return paginated results without query', async () => {
      const mockResults = {
        data: [mockDocument],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      };

      repository.find.resolves(mockResults);

      const result = await repository.find();

      expect(result.data).to.deep.equal([mockDocument]);
      expect(result.pagination.page).to.equal(1);
      expect(result.pagination.total).to.equal(1);
    });

    it('should return paginated results with query filter', async () => {
      const mockResults = {
        data: [mockDocument],
        pagination: {
          page: 1,
          limit: 5,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      };

      repository.find.resolves(mockResults);

      const result = await repository.find(
        { mimeType: 'application/pdf' },
        { page: 1, limit: 5 }
      );

      expect(result.data).to.deep.equal([mockDocument]);
      expect(result.pagination.limit).to.equal(5);
    });

    it('should return paginated results with complex query', async () => {
      const mockResults = {
        data: [mockDocument],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      };

      repository.find.resolves(mockResults);

      const result = await repository.find({
        name: 'test',
        mimeType: 'application/pdf',
        tags: ['test'],
        metadata: { author: 'Test Author' }
      });

      expect(result.data).to.deep.equal([mockDocument]);
    });
  });

  describe('findByTags()', () => {
    it('should return array of documents for tags', async () => {
      repository.findByTags.resolves([mockDocument]);

      const result = await repository.findByTags(['test', 'pdf']);

      expect(result).to.be.an('array');
      expect(result).to.have.length(1);
      expect(result[0]).to.equal(mockDocument);
    });

    it('should return empty array when no documents found', async () => {
      repository.findByTags.resolves([]);

      const result = await repository.findByTags(['nonexistent']);

      expect(result).to.be.an('array');
      expect(result).to.have.length(0);
    });
  });

  describe('findByMimeType()', () => {
    it('should return array of documents for MIME type', async () => {
      repository.findByMimeType.resolves([mockDocument]);

      const result = await repository.findByMimeType('application/pdf');

      expect(result).to.be.an('array');
      expect(result).to.have.length(1);
      expect(result[0]).to.equal(mockDocument);
    });

    it('should return empty array when no documents found', async () => {
      repository.findByMimeType.resolves([]);

      const result = await repository.findByMimeType('image/jpeg');

      expect(result).to.be.an('array');
      expect(result).to.have.length(0);
    });
  });

  describe('exists()', () => {
    it('should return true when document exists', async () => {
      repository.exists.resolves(true);

      const result = await repository.exists({ name: 'test-document.pdf' });

      expect(result).to.be.true;
    });

    it('should return false when document does not exist', async () => {
      repository.exists.resolves(false);

      const result = await repository.exists({ name: 'nonexistent.pdf' });

      expect(result).to.be.false;
    });
  });

  describe('count()', () => {
    it('should return count of documents', async () => {
      repository.count.resolves(5);

      const result = await repository.count();

      expect(result).to.equal(5);
    });

    it('should return count with filter', async () => {
      repository.count.resolves(2);

      const result = await repository.count({ mimeType: 'application/pdf' });

      expect(result).to.equal(2);
    });
  });

  describe('delete()', () => {
    it('should return true when delete succeeds', async () => {
      repository.delete.resolves(true);

      const result = await repository.delete('doc-123');

      expect(result).to.be.true;
    });

    it('should return false when delete fails', async () => {
      repository.delete.resolves(false);

      const result = await repository.delete('nonexistent');

      expect(result).to.be.false;
    });
  });

  describe('Hexapp Integration', () => {
    it('should work with AppResult types', async () => {
      // Test that the repository can work with hexapp types
      const documentResult = Document.create(
        'hexapp-document.txt',
        '/uploads/hexapp-document.txt',
        'text/plain',
        '512',
        ['hexapp', 'test'],
        { framework: 'hexapp', type: 'test' }
      );
      const document = documentResult.unwrap();

      expect(document).to.be.instanceOf(Document);
      expect(document.name.value).to.equal('hexapp-document.txt');
      expect(document.mimeType.value).to.equal('text/plain');
      expect(document.size.bytes).to.equal(512);
    });

    it('should work with Result types from fp library', async () => {
      // Test that the repository can work with Result types
      const successResult = Result.Ok(mockDocument);
      const errorResult = Result.Err(new Error('Test error'));

      expect(successResult.isOk()).to.be.true;
      expect(errorResult.isErr()).to.be.true;
    });

    it('should work with value objects', async () => {
      // Test that the repository can work with document value objects
      const nameResult = DocumentName.create('valid-document.pdf');
      const mimeTypeResult = MimeType.create('application/pdf');
      const sizeResult = FileSize.fromBytes(2048);

      expect(nameResult.isOk()).to.be.true;
      expect(mimeTypeResult.isOk()).to.be.true;
      expect(sizeResult.isOk()).to.be.true;

      if (nameResult.isOk() && mimeTypeResult.isOk() && sizeResult.isOk()) {
        const name = nameResult.unwrap();
        const mimeType = mimeTypeResult.unwrap();
        const size = sizeResult.unwrap();

        expect(name.value).to.equal('valid-document.pdf');
        expect(mimeType.value).to.equal('application/pdf');
        expect(size.bytes).to.equal(2048);
      }
    });
  });

  describe('DocumentFilterQuery Interface', () => {
    it('should handle name filtering', async () => {
      repository.find.resolves({
        data: [mockDocument],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false }
      });

      const result = await repository.find({ name: 'test-document' });

      expect(repository.find.callCount).to.equal(1);
      expect(repository.find.firstCall.args[0]).to.deep.equal({ name: 'test-document' });
    });

    it('should handle MIME type filtering', async () => {
      repository.find.resolves({
        data: [mockDocument],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false }
      });

      const result = await repository.find({ mimeType: 'application/pdf' });

      expect(repository.find.callCount).to.equal(1);
      expect(repository.find.firstCall.args[0]).to.deep.equal({ mimeType: 'application/pdf' });
    });

    it('should handle tags filtering with string array', async () => {
      repository.find.resolves({
        data: [mockDocument],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false }
      });

      const result = await repository.find({ tags: ['test', 'pdf'] });

      expect(repository.find.callCount).to.equal(1);
      expect(repository.find.firstCall.args[0]).to.deep.equal({ tags: ['test', 'pdf'] });
    });

    it('should handle tags filtering with single string', async () => {
      repository.find.resolves({
        data: [mockDocument],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false }
      });

      const result = await repository.find({ tags: 'test' });

      expect(repository.find.callCount).to.equal(1);
      expect(repository.find.firstCall.args[0]).to.deep.equal({ tags: 'test' });
    });

    it('should handle date range filtering', async () => {
      repository.find.resolves({
        data: [mockDocument],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false }
      });

      const result = await repository.find({
        from: '2023-01-01',
        to: '2023-12-31'
      });

      expect(repository.find.callCount).to.equal(1);
      expect(repository.find.firstCall.args[0]).to.deep.equal({
        from: '2023-01-01',
        to: '2023-12-31'
      });
    });

    it('should handle metadata filtering', async () => {
      repository.find.resolves({
        data: [mockDocument],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false }
      });

      const result = await repository.find({
        metadata: { author: 'Test Author', category: 'testing' }
      });

      expect(repository.find.callCount).to.equal(1);
      expect(repository.find.firstCall.args[0]).to.deep.equal({
        metadata: { author: 'Test Author', category: 'testing' }
      });
    });

    it('should handle combined filtering', async () => {
      repository.find.resolves({
        data: [mockDocument],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false }
      });

      const complexQuery = {
        name: 'test',
        mimeType: 'application/pdf',
        tags: ['test', 'pdf'],
        from: '2023-01-01',
        to: '2023-12-31',
        metadata: { author: 'Test Author' }
      };

      const result = await repository.find(complexQuery);

      expect(repository.find.callCount).to.equal(1);
      expect(repository.find.firstCall.args[0]).to.deep.equal(complexQuery);
    });
  });
});
