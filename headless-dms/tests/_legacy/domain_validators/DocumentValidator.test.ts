// src/domain/validators/__tests__/DocumentValidator.test.ts
import { DocumentValidator, Document } from '../../src/domain/validators/DocumentValidator.js';

describe('DocumentValidator', () => {
  describe('Business Rules', () => {
    describe('validateNameUniqueness', () => {
      it('should validate unique document name', () => {
        const existingDocuments = [
          { name: 'Document1', id: '1' },
          { name: 'Document2', id: '2' }
        ];
        
        const result = DocumentValidator.validateNameUniqueness('NewDocument', existingDocuments);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe('NewDocument');
      });

      it('should reject duplicate document name', () => {
        const existingDocuments = [
          { name: 'Document1', id: '1' },
          { name: 'Document2', id: '2' }
        ];
        
        const result = DocumentValidator.validateNameUniqueness('Document1', existingDocuments);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Document name already exists in the system');
      });

      it('should allow updating document with same name', () => {
        const existingDocuments = [
          { name: 'Document1', id: '1' },
          { name: 'Document2', id: '2' }
        ];
        
        const result = DocumentValidator.validateNameUniqueness('Document1', existingDocuments, '1');
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe('Document1');
      });
    });

    describe('validateName', () => {
      it('should validate valid document name', () => {
        const result = DocumentValidator.validateName('Valid Document Name');
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe('Valid Document Name');
      });

      it('should reject empty name', () => {
        const result = DocumentValidator.validateName('');
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Document name is required');
      });

      it('should reject name shorter than 2 characters', () => {
        const result = DocumentValidator.validateName('a');
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Document name must be at least 2 characters');
      });

      it('should reject name longer than 255 characters', () => {
        const longName = 'a'.repeat(256);
        const result = DocumentValidator.validateName(longName);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Document name cannot exceed 255 characters');
      });
    });

    describe('validateFileSize', () => {
      it('should validate file size within limits', () => {
        const result = DocumentValidator.validateFileSize('5242880', 10); // 5MB
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe('5242880');
      });

      it('should reject invalid file size', () => {
        const result = DocumentValidator.validateFileSize('invalid', 10);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('File size must be a positive number');
      });

      it('should reject file size exceeding limit', () => {
        const result = DocumentValidator.validateFileSize('15728640', 10); // 15MB
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('File size cannot exceed 10MB');
      });
    });

    describe('validateFileType', () => {
      it('should validate allowed file type', () => {
        const result = DocumentValidator.validateFileType('text/plain');
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe('text/plain');
      });

      it('should reject disallowed file type', () => {
        const result = DocumentValidator.validateFileType('application/exe');
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('File type application/exe is not allowed for security reasons');
      });
    });

    describe('validateTagCount', () => {
      it('should validate tags within limit', () => {
        const tags = ['tag1', 'tag2', 'tag3'];
        const result = DocumentValidator.validateTagCount(tags, 10);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(tags);
      });

      it('should reject too many tags', () => {
        const tags = Array.from({ length: 11 }, (_, i) => `tag${i}`);
        const result = DocumentValidator.validateTagCount(tags, 10);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Maximum 10 tags allowed per document');
      });
    });

    describe('validateTagFormat', () => {
      it('should validate valid tag format', () => {
        const tags = ['valid-tag', 'valid_tag', 'validTag123'];
        const result = DocumentValidator.validateTagFormat(tags);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(tags);
      });

      it('should reject invalid tag format', () => {
        const tags = ['valid-tag', 'invalid tag', 'validTag123'];
        const result = DocumentValidator.validateTagFormat(tags);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Tag "invalid tag" must contain only letters, numbers, hyphens, and underscores');
      });

      it('should reject tag that is too long', () => {
        const longTag = 'a'.repeat(51);
        const tags = ['valid-tag', longTag];
        const result = DocumentValidator.validateTagFormat(tags);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe(`Tag "${longTag}" must be between 1 and 50 characters`);
      });
    });

    describe('validateMetadataSize', () => {
      it('should validate metadata within limits', () => {
        const metadata = { key1: 'value1', key2: 'value2' };
        const result = DocumentValidator.validateMetadataSize(metadata, 20);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(metadata);
      });

      it('should reject too many metadata keys', () => {
        const metadata = Object.fromEntries(
          Array.from({ length: 21 }, (_, i) => [`key${i}`, `value${i}`])
        );
        const result = DocumentValidator.validateMetadataSize(metadata, 20);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Maximum 20 metadata keys allowed per document');
      });

      it('should reject metadata key that is too long', () => {
        const longKey = 'a'.repeat(51);
        const metadata = { [longKey]: 'value' };
        const result = DocumentValidator.validateMetadataSize(metadata, 20);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe(`Metadata key "${longKey}" cannot exceed 50 characters`);
      });

      it('should reject metadata value that is too long', () => {
        const longValue = 'a'.repeat(501);
        const metadata = { key: longValue };
        const result = DocumentValidator.validateMetadataSize(metadata, 20);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Metadata value for "key" cannot exceed 500 characters');
      });
    });

    describe('validateUploadPermission', () => {
      it('should allow admin to upload', () => {
        const result = DocumentValidator.validateUploadPermission('admin');
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(true);
      });

      it('should reject user upload', () => {
        const result = DocumentValidator.validateUploadPermission('user');
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Only administrators can upload documents');
      });
    });

    describe('validateFilePath', () => {
      it('should validate valid file path', () => {
        const result = DocumentValidator.validateFilePath('/uploads/document.pdf');
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe('/uploads/document.pdf');
      });

      it('should reject empty file path', () => {
        const result = DocumentValidator.validateFilePath('');
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('File path is required');
      });

      it('should reject file path with directory traversal', () => {
        const result = DocumentValidator.validateFilePath('/uploads/../secret/file.pdf');
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Invalid file path format');
      });
    });
  });

  describe('Invariant Checking', () => {
    const validDocument: Document = {
      id: 'doc1',
      name: 'Test Document',
      userId: 'user1',
      filePath: '/uploads/test.pdf',
      mimeType: 'application/pdf',
      size: 1024,
      tags: ['test', 'document'],
      metadata: { author: 'John Doe', version: '1.0' },
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-02')
    };

    describe('validateDocumentIdInvariant', () => {
      it('should validate document with valid ID', () => {
        const result = DocumentValidator.validateDocumentIdInvariant(validDocument);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(validDocument);
      });

      it('should reject document with empty ID', () => {
        const document = { ...validDocument, id: '' };
        const result = DocumentValidator.validateDocumentIdInvariant(document);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Document must have a valid ID');
      });
    });

    describe('validateDocumentNameInvariant', () => {
      it('should validate document with valid name', () => {
        const result = DocumentValidator.validateDocumentNameInvariant(validDocument);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(validDocument);
      });

      it('should reject document with empty name', () => {
        const document = { ...validDocument, name: '' };
        const result = DocumentValidator.validateDocumentNameInvariant(document);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Document must have a valid name');
      });
    });

    describe('validateDocumentUserIdInvariant', () => {
      it('should validate document with valid user ID', () => {
        const result = DocumentValidator.validateDocumentUserIdInvariant(validDocument);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(validDocument);
      });

      it('should reject document with empty user ID', () => {
        const document = { ...validDocument, userId: '' };
        const result = DocumentValidator.validateDocumentUserIdInvariant(document);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Document must have a valid user ID');
      });
    });

    describe('validateDocumentFilePathInvariant', () => {
      it('should validate document with valid file path', () => {
        const result = DocumentValidator.validateDocumentFilePathInvariant(validDocument);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(validDocument);
      });

      it('should reject document with empty file path', () => {
        const document = { ...validDocument, filePath: '' };
        const result = DocumentValidator.validateDocumentFilePathInvariant(document);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Document must have a valid file path');
      });
    });

    describe('validateDocumentMimeTypeInvariant', () => {
      it('should validate document with valid MIME type', () => {
        const result = DocumentValidator.validateDocumentMimeTypeInvariant(validDocument);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(validDocument);
      });

      it('should reject document with empty MIME type', () => {
        const document = { ...validDocument, mimeType: '' };
        const result = DocumentValidator.validateDocumentMimeTypeInvariant(document);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Document must have a valid MIME type');
      });
    });

    describe('validateDocumentSizeInvariant', () => {
      it('should validate document with valid size', () => {
        const result = DocumentValidator.validateDocumentSizeInvariant(validDocument);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(validDocument);
      });

      it('should reject document with zero size', () => {
        const document = { ...validDocument, size: 0 };
        const result = DocumentValidator.validateDocumentSizeInvariant(document);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Document must have a valid positive file size');
      });

      it('should reject document with negative size', () => {
        const document = { ...validDocument, size: -1 };
        const result = DocumentValidator.validateDocumentSizeInvariant(document);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Document must have a valid positive file size');
      });
    });

    describe('validateDocumentTagsInvariant', () => {
      it('should validate document with valid tags', () => {
        const result = DocumentValidator.validateDocumentTagsInvariant(validDocument);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(validDocument);
      });

      it('should reject document with non-array tags', () => {
        const document = { ...validDocument, tags: 'not-an-array' as any };
        const result = DocumentValidator.validateDocumentTagsInvariant(document);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Document tags must be an array');
      });

      it('should reject document with non-string tags', () => {
        const document = { ...validDocument, tags: ['valid', 123 as any] };
        const result = DocumentValidator.validateDocumentTagsInvariant(document);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Document tags must be strings');
      });
    });

    describe('validateDocumentMetadataInvariant', () => {
      it('should validate document with valid metadata', () => {
        const result = DocumentValidator.validateDocumentMetadataInvariant(validDocument);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(validDocument);
      });

      it('should reject document with null metadata', () => {
        const document = { ...validDocument, metadata: null as any };
        const result = DocumentValidator.validateDocumentMetadataInvariant(document);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Document metadata must be an object');
      });

      it('should reject document with non-string metadata values', () => {
        const document = { ...validDocument, metadata: { key: 123 as any } };
        const result = DocumentValidator.validateDocumentMetadataInvariant(document);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Document metadata must have string keys and values');
      });
    });

    describe('validateDocumentTimestampsInvariant', () => {
      it('should validate document with valid timestamps', () => {
        const result = DocumentValidator.validateDocumentTimestampsInvariant(validDocument);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(validDocument);
      });

      it('should reject document with invalid creation timestamp', () => {
        const document = { ...validDocument, createdAt: new Date('invalid') };
        const result = DocumentValidator.validateDocumentTimestampsInvariant(document);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Document must have a valid creation timestamp');
      });

      it('should reject document with update timestamp before creation', () => {
        const document = { 
          ...validDocument, 
          createdAt: new Date('2023-01-02'),
          updatedAt: new Date('2023-01-01')
        };
        const result = DocumentValidator.validateDocumentTimestampsInvariant(document);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Document update timestamp cannot be before creation timestamp');
      });
    });

    describe('validateDocumentInvariants', () => {
      it('should validate document with all valid invariants', () => {
        const result = DocumentValidator.validateDocumentInvariants(validDocument);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(validDocument);
      });

      it('should reject document with invalid ID', () => {
        const document = { ...validDocument, id: '' };
        const result = DocumentValidator.validateDocumentInvariants(document);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Document must have a valid ID');
      });

      it('should reject document with invalid name', () => {
        const document = { ...validDocument, name: '' };
        const result = DocumentValidator.validateDocumentInvariants(document);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Document must have a valid name');
      });
    });

    describe('validateDocumentFileExistsInvariant', () => {
      it('should allow access when file exists', () => {
        const result = DocumentValidator.validateDocumentFileExistsInvariant(validDocument, true);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(true);
      });

      it('should reject access when file does not exist', () => {
        const result = DocumentValidator.validateDocumentFileExistsInvariant(validDocument, false);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Document file no longer exists on disk');
      });
    });

    describe('validateDocumentAccessInvariant', () => {
      it('should allow modification when not being accessed', () => {
        const result = DocumentValidator.validateDocumentAccessInvariant(validDocument, false);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(true);
      });

      it('should reject modification when being accessed', () => {
        const result = DocumentValidator.validateDocumentAccessInvariant(validDocument, true);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Document is currently being accessed and cannot be modified');
      });
    });
  });
}); 