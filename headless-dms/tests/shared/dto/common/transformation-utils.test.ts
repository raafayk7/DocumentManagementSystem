import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import {
  transformEntityToDto,
  transformEntitiesToDtos,
  createNestedResponse,
  createPaginatedResponse,
  UserTransformations,
  DocumentTransformations,
  TransformationPipeline,
  CompositionHelpers,
  type EntityTransformer,
  type BatchTransformer
} from '../../../../src/shared/dto/common/transformation.utils.js';
import { UserResponseDto } from '../../../../src/shared/dto/user/UserResponse.js';
import { DocumentResponseDto } from '../../../../src/shared/dto/document/DocumentResponse.js';

// Mock entities for testing
const mockUser = {
  id: 'user-123',
  email: 'john@example.com',
  role: 'user',
  createdAt: '2023-01-01T00:00:00.000Z',
  updatedAt: '2023-01-02T00:00:00.000Z'
};

const mockDocument = {
  id: 'doc-123',
  name: 'test-document.pdf',
  filePath: '/uploads/test-document.pdf',
  mimeType: 'application/pdf',
  size: 1024,
  createdAt: '2023-01-01T00:00:00.000Z',
  updatedAt: '2023-01-02T00:00:00.000Z',
  tags: ['important', 'work'],
  metadata: { author: 'John Doe' }
};

describe('Transformation Utilities', () => {
  describe('Core Transformation Functions', () => {
    it('should transform single entity to DTO', () => {
      const entity = { 
        id: 'test-123', 
        name: 'Test Entity',
        serialize: () => ({ name: 'Test Entity' })
      };
      const dtoFactory = (serialized: any, id: string) => ({ ...serialized, id });

      const result = transformEntityToDto(entity, dtoFactory);

      expect(result).to.deep.equal({ name: 'Test Entity', id: 'test-123' });
    });

    it('should transform array of entities to DTOs', () => {
      const entities = [
        { id: 1, name: 'Entity 1' },
        { id: 2, name: 'Entity 2' }
      ];
      const transformer: EntityTransformer<any, any> = (entity) => ({ 
        ...entity, 
        transformed: true 
      });

      const result = transformEntitiesToDtos(entities, transformer);

      expect(result).to.have.length(2);
      expect(result[0]).to.deep.equal({ id: 1, name: 'Entity 1', transformed: true });
      expect(result[1]).to.deep.equal({ id: 2, name: 'Entity 2', transformed: true });
    });

    it('should create nested response', () => {
      const data = { message: 'Hello World' };
      
      const result = createNestedResponse('test', data);

      expect(result).to.have.property('test');
      expect(result.test).to.deep.equal(data);
    });

    it('should create paginated response', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const pagination = { page: 1, limit: 10, total: 2 };

      const result = createPaginatedResponse('results', data, pagination);

      expect(result).to.have.property('results');
      expect(result.results).to.have.property('data');
      expect(result.results).to.have.property('pagination');
      expect(result.results.data).to.deep.equal(data);
      expect(result.results.pagination).to.deep.equal(pagination);
    });
  });

  describe('UserTransformations', () => {
    it('should transform user entity to DTO', () => {
      const mockUserWithSerialize = {
        ...mockUser,
        serialize: () => mockUser
      };
      const result = UserTransformations.entityToDto(mockUserWithSerialize);

      expect(result).to.be.instanceOf(UserResponseDto);
      expect(result.id).to.equal('user-123');
      expect(result.email).to.equal('john@example.com');
      expect(result.role).to.equal('user');
    });

    it('should transform array of user entities to DTOs', () => {
      const usersWithSerialize = [
        { ...mockUser, serialize: () => mockUser }, 
        { ...mockUser, id: 'user-456', serialize: () => ({ ...mockUser, id: 'user-456' }) }
      ];
      
      const result = UserTransformations.entitiesToDtos(usersWithSerialize);

      expect(result).to.have.length(2);
      expect(result[0]).to.be.instanceOf(UserResponseDto);
      expect(result[1]).to.be.instanceOf(UserResponseDto);
    });

    it('should create nested user response', () => {
      const userDto = new UserResponseDto(
        'user-123',
        'john@example.com',
        'user',
        new Date('2023-01-01T00:00:00.000Z'),
        new Date('2023-01-02T00:00:00.000Z')
      );

      const result = UserTransformations.toNestedResponse(userDto);

      expect(result).to.have.property('user');
      expect(result.user).to.deep.equal(userDto.toPlain());
    });

    it('should create paginated users response', () => {
      const userDtos = [
        new UserResponseDto('user-123', 'john@example.com', 'user', new Date('2023-01-01'), new Date('2023-01-02')),
        new UserResponseDto('user-456', 'jane@example.com', 'admin', new Date('2023-01-01'), new Date('2023-01-02'))
      ];
      const pagination = { page: 1, limit: 10, total: 2 };

      const result = UserTransformations.toPaginatedResponse(userDtos, pagination);

      expect(result).to.have.property('users');
      expect(result.users).to.have.property('data');
      expect(result.users).to.have.property('pagination');
      expect(result.users.data).to.deep.equal(userDtos.map(dto => dto.toPlain()));
      expect(result.users.pagination).to.deep.equal(pagination);
    });
  });

  describe('DocumentTransformations', () => {
    it('should transform document entity to DTO', () => {
      const mockDocumentWithSerialize = {
        ...mockDocument,
        serialize: () => mockDocument
      };
      const result = DocumentTransformations.entityToDto(mockDocumentWithSerialize);

      expect(result).to.be.instanceOf(DocumentResponseDto);
      expect(result.id).to.equal('doc-123');
      expect(result.name).to.equal('test-document.pdf');
      expect(result.mimeType).to.equal('application/pdf');
    });

    it('should transform array of document entities to DTOs', () => {
      const documentsWithSerialize = [
        { ...mockDocument, serialize: () => mockDocument }, 
        { ...mockDocument, id: 'doc-456', serialize: () => ({ ...mockDocument, id: 'doc-456' }) }
      ];
      
      const result = DocumentTransformations.entitiesToDtos(documentsWithSerialize);

      expect(result).to.have.length(2);
      expect(result[0]).to.be.instanceOf(DocumentResponseDto);
      expect(result[1]).to.be.instanceOf(DocumentResponseDto);
    });

    it('should create nested document response', () => {
      const docDto = new DocumentResponseDto(
        'doc-123',
        'test-document.pdf',
        '/uploads/test-document.pdf',
        'application/pdf',
        '1024',
        new Date('2023-01-01T00:00:00.000Z'),
        new Date('2023-01-02T00:00:00.000Z'),
        ['important'],
        { author: 'John' }
      );

      const result = DocumentTransformations.toNestedResponse(docDto);

      expect(result).to.have.property('document');
      expect(result.document).to.deep.equal(docDto.toPlain());
    });

    it('should create paginated documents response', () => {
      const docDtos = [
        new DocumentResponseDto('doc-123', 'doc1.pdf', '/path1', 'application/pdf', '1024', new Date('2023-01-01'), new Date('2023-01-02'), [], {}),
        new DocumentResponseDto('doc-456', 'doc2.pdf', '/path2', 'application/pdf', '2048', new Date('2023-01-01'), new Date('2023-01-02'), [], {})
      ];
      const pagination = { page: 1, limit: 10, total: 2 };

      const result = DocumentTransformations.toPaginatedResponse(docDtos, pagination);

      expect(result).to.have.property('documents');
      expect(result.documents).to.have.property('data');
      expect(result.documents).to.have.property('pagination');
      expect(result.documents.data).to.deep.equal(docDtos.map(dto => dto.toPlain()));
      expect(result.documents.pagination).to.deep.equal(pagination);
    });
  });

  describe('TransformationPipeline', () => {
    it('should create pipeline from data', () => {
      const data = { name: 'Test' };
      const pipeline = TransformationPipeline.from(data);

      expect(pipeline.result()).to.deep.equal(data);
    });

    it('should transform data in pipeline', () => {
      const data = { value: 10 };
      
      const result = TransformationPipeline
        .from(data)
        .transform(d => ({ ...d, value: d.value * 2 }))
        .transform(d => ({ ...d, doubled: true }))
        .result();

      expect(result).to.deep.equal({ value: 20, doubled: true });
    });

    it('should nest data in pipeline', () => {
      const data = { message: 'Hello' };
      
      const result = TransformationPipeline
        .from(data)
        .nest('nested')
        .result();

      expect(result).to.have.property('nested');
      expect(result.nested).to.deep.equal(data);
    });

    it('should chain multiple operations', () => {
      const data = { count: 1 };
      
      const result = TransformationPipeline
        .from(data)
        .transform(d => ({ ...d, count: d.count + 1 }))
        .result();

      expect(result).to.deep.equal({ count: 2 });
    });
  });

  describe('CompositionHelpers', () => {
    it('should compose multiple transformation functions', () => {
      const addOne = (x: number) => x + 1;
      const multiplyByTwo = (x: number) => x * 2;
      const toString = (x: number) => x.toString();

      const composed = CompositionHelpers.compose(addOne, multiplyByTwo, toString);
      const result = composed(5);

      expect(result).to.equal('12'); // (5 + 1) * 2 = 12, then toString
    });

    it('should create pipeline helper', () => {
      const data = { value: 42 };
      const pipeline = CompositionHelpers.pipeline(data);

      expect(pipeline).to.be.instanceOf(TransformationPipeline);
      expect(pipeline.result()).to.deep.equal(data);
    });

    it('should batch transform entities successfully', () => {
      const entities = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const transformer = (entity: any) => ({ ...entity, processed: true });

      const result = CompositionHelpers.batchTransform(entities, transformer);

      expect(result).to.have.length(3);
      expect(result[0]).to.deep.equal({ id: 1, processed: true });
      expect(result[1]).to.deep.equal({ id: 2, processed: true });
      expect(result[2]).to.deep.equal({ id: 3, processed: true });
    });

    it('should handle errors in batch transform with error handler', () => {
      const entities = [{ id: 1 }, { id: 2, throwError: true }, { id: 3 }];
      const transformer = (entity: any) => {
        if (entity.throwError) {
          throw new Error('Processing failed');
        }
        return { ...entity, processed: true };
      };
      const errorHandler = (error: Error, entity: any) => ({ ...entity, error: true });

      const result = CompositionHelpers.batchTransform(entities, transformer, errorHandler);

      expect(result).to.have.length(3);
      expect(result[0]).to.deep.equal({ id: 1, processed: true });
      expect(result[1]).to.deep.equal({ id: 2, throwError: true, error: true });
      expect(result[2]).to.deep.equal({ id: 3, processed: true });
    });

    it('should skip failed entities when no error handler provided', () => {
      const entities = [{ id: 1 }, { id: 2, throwError: true }, { id: 3 }];
      const transformer = (entity: any) => {
        if (entity.throwError) {
          throw new Error('Processing failed');
        }
        return { ...entity, processed: true };
      };

      const result = CompositionHelpers.batchTransform(entities, transformer);

      expect(result).to.have.length(2);
      expect(result[0]).to.deep.equal({ id: 1, processed: true });
      expect(result[1]).to.deep.equal({ id: 3, processed: true });
    });

    it('should handle error handler returning null', () => {
      const entities = [{ id: 1 }, { id: 2, throwError: true }, { id: 3 }];
      const transformer = (entity: any) => {
        if (entity.throwError) {
          throw new Error('Processing failed');
        }
        return { ...entity, processed: true };
      };
      const errorHandler = () => null; // Skip failed items

      const result = CompositionHelpers.batchTransform(entities, transformer, errorHandler);

      expect(result).to.have.length(2);
      expect(result[0]).to.deep.equal({ id: 1, processed: true });
      expect(result[1]).to.deep.equal({ id: 3, processed: true });
    });
  });

  describe('Type Definitions', () => {
    it('should work with EntityTransformer type', () => {
      const transformer: EntityTransformer<{ id: number }, { id: number; name: string }> = 
        (entity) => ({ ...entity, name: 'test' });

      const result = transformer({ id: 1 });
      expect(result).to.deep.equal({ id: 1, name: 'test' });
    });

    it('should work with BatchTransformer type', () => {
      const batchTransformer: BatchTransformer<{ id: number }, { id: number; batch: boolean }> = 
        (entities) => entities.map(e => ({ ...e, batch: true }));

      const result = batchTransformer([{ id: 1 }, { id: 2 }]);
      expect(result).to.deep.equal([
        { id: 1, batch: true },
        { id: 2, batch: true }
      ]);
    });
  });

  describe('Integration Tests', () => {
    it('should handle end-to-end user transformation pipeline', () => {
      const usersWithSerialize = [{ ...mockUser, serialize: () => mockUser }];
      const pagination = { page: 1, limit: 10, total: 1 };

      const result = CompositionHelpers.pipeline(usersWithSerialize)
        .transform(UserTransformations.entitiesToDtos)
        .transform(dtos => UserTransformations.toPaginatedResponse(dtos, pagination))
        .result();

      expect(result).to.have.property('users');
      expect(result.users).to.have.property('data');
      expect(result.users).to.have.property('pagination');
      expect(result.users.data).to.have.length(1);
    });

    it('should handle complex document transformation with error recovery', () => {
      const documentsWithSerialize = [
        { ...mockDocument, serialize: () => mockDocument },
        { ...mockDocument, id: 'invalid-doc', serialize: () => { throw new Error('Serialization failed'); } },
        { ...mockDocument, id: 'doc-456', serialize: () => ({ ...mockDocument, id: 'doc-456' }) }
      ];

      const transformer = (doc: any) => DocumentTransformations.entityToDto(doc);
      const errorHandler = (error: Error, doc: any) => null; // Skip failed documents

      const result = CompositionHelpers.batchTransform(documentsWithSerialize, transformer, errorHandler);

      expect(result).to.have.length(2); // One document should be skipped due to error
    });
  });
});
