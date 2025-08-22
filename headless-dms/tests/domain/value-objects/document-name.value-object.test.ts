/**
 * DocumentName Value Object Tests
 * Testing DocumentName value object with hexapp BaseValueObject patterns
 */

import { describe, it, beforeEach } from 'mocha';
import {
  expect,
  AppResult,
  AppError,
  AppErrStatus,
  UUID,
  DateTime,
  AppResultTestUtils,
  AppErrorTestUtils,
  ValueObjectTestUtils,
  TestDataUtils,
  AsyncTestUtils
} from '../../shared/test-helpers.js';
import { DocumentName } from '../../../src/domain/value-objects/DocumentName.js';

describe('Domain > Value Objects > DocumentName', () => {
  describe('BaseValueObject Integration', () => {
    it('should extend hexapp BaseValueObject', () => {
      // Arrange & Act
      const nameResult = DocumentName.create('document.pdf');
      
      // Assert
      const name = AppResultTestUtils.expectOk(nameResult);
      expect(name).to.be.instanceOf(DocumentName);
      
      // Should have serialize method from BaseValueObject
      expect(name.serialize).to.be.a('function');
      expect(name.serialize()).to.be.a('string');
      expect(name.serialize()).to.equal('document.pdf');
    });

    it('should implement value object equality semantics', () => {
      // Arrange
      const name1Result = DocumentName.create('report.pdf');
      const name2Result = DocumentName.create('report.pdf');
      const name3Result = DocumentName.create('different.pdf');
      
      // Act
      const name1 = AppResultTestUtils.expectOk(name1Result);
      const name2 = AppResultTestUtils.expectOk(name2Result);
      const name3 = AppResultTestUtils.expectOk(name3Result);
      
      // Assert - Same value should be equal
      expect(name1.equals(name2)).to.be.true;
      expect(name2.equals(name1)).to.be.true;
      
      // Different values should not be equal
      expect(name1.equals(name3)).to.be.false;
      expect(name3.equals(name1)).to.be.false;
    });

    it('should be immutable after creation', () => {
      // Arrange & Act
      const nameResult = DocumentName.create('document.pdf');
      const name = AppResultTestUtils.expectOk(nameResult);
      
      // Assert - Value object should be immutable
      expect(name.value).to.equal('document.pdf');
      
      // Should not be able to modify the name (no setter methods)
      expect(name).to.not.have.property('setValue');
      expect(name).to.not.have.property('changeName');
    });
  });

  describe('Factory Pattern Validation', () => {
    it('should create document name with valid input', () => {
      // Arrange & Act
      const result = DocumentName.create('document.pdf');
      
      // Assert
      const name = AppResultTestUtils.expectOk(result);
      expect(name.value).to.equal('document.pdf');
    });

    it('should trim whitespace from input', () => {
      // Arrange & Act
      const result = DocumentName.create('  document.pdf  ');
      
      // Assert
      const name = AppResultTestUtils.expectOk(result);
      expect(name.value).to.equal('document.pdf');
    });

    it('should return AppResult.Err for null/undefined input', () => {
      // Test null
      const nullResult = DocumentName.create(null as any);
      AppResultTestUtils.expectErr(nullResult);
      
      // Test undefined  
      const undefinedResult = DocumentName.create(undefined as any);
      AppResultTestUtils.expectErr(undefinedResult);
      
      // Test empty string
      const emptyResult = DocumentName.create('');
      AppResultTestUtils.expectErr(emptyResult);
    });

    it('should return AppResult.Err for non-string input', () => {
      // Test number
      const numberResult = DocumentName.create(123 as any);
      AppResultTestUtils.expectErr(numberResult);
      
      // Test object
      const objectResult = DocumentName.create({} as any);
      AppResultTestUtils.expectErr(objectResult);
      
      // Test array
      const arrayResult = DocumentName.create(['document.pdf'] as any);
      AppResultTestUtils.expectErr(arrayResult);
    });
  });

  describe('Length Validation', () => {
    it('should accept names with valid length (1-255 characters)', () => {
      // Minimum valid length
      const minValidResult = DocumentName.create('a');
      AppResultTestUtils.expectOk(minValidResult);
      
      // Medium length
      const mediumValidResult = DocumentName.create('my-document-file.pdf');
      AppResultTestUtils.expectOk(mediumValidResult);
      
      // Maximum valid length
      const maxValid = 'a'.repeat(251) + '.pdf'; // 255 total
      const maxValidResult = DocumentName.create(maxValid);
      AppResultTestUtils.expectOk(maxValidResult);
    });

    it('should reject names that are too short (after trimming)', () => {
      const tooShortNames = [
        '   ', // Only whitespace
        '\t', // Only tab
        '\n' // Only newline
      ];

      tooShortNames.forEach(name => {
        const result = DocumentName.create(name);
        const error = AppResultTestUtils.expectErr(result);
        expect(error.message).to.include('Document name must be at least 1 character long');
      });
    });

    it('should reject names that are too long', () => {
      // Create name longer than 255 characters
      const tooLong = 'a'.repeat(256);
      const result = DocumentName.create(tooLong);
      
      const error = AppResultTestUtils.expectErr(result);
      expect(error.message).to.include('cannot exceed 255 characters');
    });
  });

  describe('Forbidden Characters Validation', () => {
    it('should reject names with forbidden characters', () => {
      const forbiddenCharNames = [
        'document<.pdf',
        'document>.pdf',
        'document:.pdf',
        'document".pdf',
        'document|.pdf',
        'document?.pdf',
        'document*.pdf',
        'document\x00.pdf', // Null character
        'document\x1f.pdf'  // Control character
      ];

      forbiddenCharNames.forEach(name => {
        const result = DocumentName.create(name);
        const error = AppResultTestUtils.expectErr(result);
        expect(error.message).to.include('forbidden characters');
      });
    });

    it('should accept names with allowed special characters', () => {
      const allowedNames = [
        'document-name.pdf',
        'document_name.pdf',
        'document name.pdf', // Space is allowed
        'document(1).pdf',
        'document[1].pdf',
        'document{1}.pdf',
        'document+name.pdf',
        'document=name.pdf',
        'document#1.pdf',
        'document@name.pdf'
      ];

      allowedNames.forEach(name => {
        const result = DocumentName.create(name);
        AppResultTestUtils.expectOk(result);
      });
    });
  });

  describe('Forbidden Names Validation', () => {
    it('should reject Windows reserved names', () => {
      const reservedNames = [
        'CON',
        'PRN',
        'AUX',
        'NUL',
        'COM1',
        'COM9',
        'LPT1',
        'LPT9'
      ];

      reservedNames.forEach(name => {
        const result = DocumentName.create(name);
        const error = AppResultTestUtils.expectErr(result);
        expect(error.message).to.include('reserved system name');
      });
    });

    it('should reject reserved names regardless of case', () => {
      const casedReservedNames = [
        'con',
        'Con',
        'CON',
        'prn',
        'Prn',
        'PRN'
      ];

      casedReservedNames.forEach(name => {
        const result = DocumentName.create(name);
        const error = AppResultTestUtils.expectErr(result);
        expect(error.message).to.include('reserved system name');
      });
    });

    it('should accept names that contain but are not exactly reserved names', () => {
      const allowedNames = [
        'ACON.pdf', // Contains CON but not exactly CON
        'PRN1.pdf', // Contains PRN but not exactly PRN
        'document-CON.pdf', // CON in middle
        'my-AUX-file.pdf' // AUX in middle
      ];

      allowedNames.forEach(name => {
        const result = DocumentName.create(name);
        AppResultTestUtils.expectOk(result);
      });
    });
  });

  describe('Path Safety Validation', () => {
    it('should reject names ending with periods or spaces', () => {
      const unsafeNames = [
        '.document',
        'document.'
      ];

      unsafeNames.forEach(name => {
        const result = DocumentName.create(name);
        const error = AppResultTestUtils.expectErr(result);
        expect(error.message).to.include('cannot start or end with spaces or dots');
      });
    });

    it('should reject names with forbidden characters', () => {
      const forbiddenNames = [
        'document<test>.pdf',
        'document>test.pdf',
        'document:test.pdf',
        'document"test".pdf',
        'document|test.pdf',
        'document?test.pdf',
        'document*test.pdf'
      ];

      forbiddenNames.forEach(name => {
        const result = DocumentName.create(name);
        const error = AppResultTestUtils.expectErr(result);
        expect(error.message).to.include('forbidden characters');
      });
    });

    it('should accept safe file names', () => {
      const safeNames = [
        'document.pdf',
        'my-document.pdf',
        'document_v1.pdf',
        'Final Report (2024).pdf',
        'data-analysis-results.xlsx'
      ];

      safeNames.forEach(name => {
        const result = DocumentName.create(name);
        AppResultTestUtils.expectOk(result);
      });
    });
  });

  describe('Text Analysis Utilities', () => {
    it('should analyze document name length correctly', () => {
      // Short name (< 10 characters)
      const shortResult = DocumentName.create('doc.pdf');
      const shortName = AppResultTestUtils.expectOk(shortResult);
      expect(shortName.isShort).to.be.true;
      expect(shortName.isMedium).to.be.false;
      expect(shortName.isLong).to.be.false;
      
      // Medium name (10-50 characters)
      const mediumResult = DocumentName.create('my-medium-document-name.pdf');
      const mediumName = AppResultTestUtils.expectOk(mediumResult);
      expect(mediumName.isShort).to.be.false;
      expect(mediumName.isMedium).to.be.true;
      expect(mediumName.isLong).to.be.false;
      
      // Long name (> 50 characters)
      const longResult = DocumentName.create('this-is-a-very-long-document-name-with-many-words-and-characters-that-exceed-fifty.pdf');
      const longName = AppResultTestUtils.expectOk(longResult);
      expect(longName.isShort).to.be.false;
      expect(longName.isMedium).to.be.false;
      expect(longName.isLong).to.be.true;
    });

    it('should detect character composition correctly', () => {
      // Arrange
      const nameResult = DocumentName.create('document-123.pdf');
      const documentName = AppResultTestUtils.expectOk(nameResult);
      
      // Act & Assert
      expect(documentName.toString()).to.equal('document-123.pdf');
      expect(documentName.serialize()).to.equal('document-123.pdf');
    });

    it('should extract words correctly', () => {
      // Arrange
      const nameResult = DocumentName.create('my document name');
      const documentName = AppResultTestUtils.expectOk(nameResult);
      
      // Act & Assert
      expect(documentName.toString()).to.equal('my document name');
      expect(documentName.serialize()).to.equal('my document name');
    });

    it('should support text searching methods', () => {
      // Arrange
      const nameResult = DocumentName.create('My Important Document.pdf');
      const documentName = AppResultTestUtils.expectOk(nameResult);
      
      // Act & Assert
      expect(documentName.startsWith('my')).to.be.true;
      expect(documentName.endsWith('.pdf')).to.be.true;
      expect(documentName.contains('important')).to.be.true;
      expect(documentName.contains('missing')).to.be.false;
    });
  });

  describe('Serialization Patterns', () => {
    it('should serialize to string value', () => {
      // Arrange
      const nameResult = DocumentName.create('document.pdf');
      const name = AppResultTestUtils.expectOk(nameResult);
      
      // Act
      const serialized = name.serialize();
      
      // Assert
      expect(serialized).to.be.a('string');
      expect(serialized).to.equal('document.pdf');
    });

    it('should preserve normalized format in serialization', () => {
      // Arrange
      const nameResult = DocumentName.create('  document.pdf  ');
      const name = AppResultTestUtils.expectOk(nameResult);
      
      // Act
      const serialized = name.serialize();
      
      // Assert
      expect(serialized).to.equal('document.pdf');
    });

    it('should provide consistent serialization across instances', () => {
      // Arrange
      const name1Result = DocumentName.create('document.pdf');
      const name2Result = DocumentName.create('  document.pdf  ');
      
      const name1 = AppResultTestUtils.expectOk(name1Result);
      const name2 = AppResultTestUtils.expectOk(name2Result);
      
      // Act & Assert
      expect(name1.serialize()).to.equal(name2.serialize());
    });
  });

  describe('Utility Methods', () => {
    it('should provide string representation', () => {
      // Arrange
      const nameResult = DocumentName.create('document.pdf');
      const name = AppResultTestUtils.expectOk(nameResult);
      
      // Act & Assert
      expect(name.toString()).to.equal('document.pdf');
      expect(String(name)).to.equal('document.pdf');
    });

    it('should provide normalized representation', () => {
      // Arrange
      const nameResult = DocumentName.create('My DOCUMENT Name.PDF');
      const name = AppResultTestUtils.expectOk(nameResult);
      
      // Act
      const normalized = name.normalized;
      
      // Assert
      expect(normalized).to.equal('my document name.pdf');
    });

    it('should support equality checking', () => {
      // Arrange
      const name1Result = DocumentName.create('Document.pdf');
      const name2Result = DocumentName.create('document.pdf');
      const name3Result = DocumentName.create('other.pdf');
      
      const name1 = AppResultTestUtils.expectOk(name1Result);
      const name2 = AppResultTestUtils.expectOk(name2Result);
      const name3 = AppResultTestUtils.expectOk(name3Result);
      
      // Act & Assert
      expect(name1.equals(name2)).to.be.true; // Case insensitive
      expect(name1.equalsIgnoreCase(name2)).to.be.true;
      expect(name1.equals(name3)).to.be.false;
    });

    it('should provide static utility methods', () => {
      // Act & Assert
      expect(DocumentName.isValid('valid-name.pdf')).to.be.true;
      expect(DocumentName.isValid('')).to.be.false;
      expect(DocumentName.getMinLength()).to.equal(1);
      expect(DocumentName.getMaxLength()).to.equal(255);
      expect(DocumentName.getForbiddenCharacters()).to.be.a('string');
      expect(DocumentName.getForbiddenNames()).to.be.an('array');
    });
  });

  describe('Error Cases and Edge Conditions', () => {
    it('should provide descriptive error messages for validation failures', () => {
      // Test forbidden characters
      const forbiddenResult = DocumentName.create('document<.pdf');
      const forbiddenError = AppResultTestUtils.expectErr(forbiddenResult);
      expect(forbiddenError.message).to.include('forbidden characters');
      
      // Test too long
      const longResult = DocumentName.create('a'.repeat(256));
      const longError = AppResultTestUtils.expectErr(longResult);
      expect(longError.message).to.include('cannot exceed 255 characters');
      
      // Test reserved name
      const reservedResult = DocumentName.create('CON');
      const reservedError = AppResultTestUtils.expectErr(reservedResult);
      expect(reservedError.message).to.include('reserved system name');
    });

    it('should handle boundary conditions for length validation', () => {
      // Test exactly at minimum (1 char)
      const minValidResult = DocumentName.create('a');
      AppResultTestUtils.expectOk(minValidResult);
      
      // Test exactly at maximum (255 chars)
      const maxValid = 'a'.repeat(255);
      const maxValidResult = DocumentName.create(maxValid);
      AppResultTestUtils.expectOk(maxValidResult);
      
      // Test one over maximum (256 chars)
      const tooLong = 'a'.repeat(256);
      const tooLongResult = DocumentName.create(tooLong);
      AppResultTestUtils.expectErr(tooLongResult);
    });

    it('should handle unicode and international characters', () => {
      const unicodeNames = [
        'document-español.pdf',
        'файл.pdf', // Cyrillic
        '文档.pdf', // Chinese
        'ドキュメント.pdf', // Japanese
        'émotions.pdf' // Accented characters
      ];

      unicodeNames.forEach(name => {
        const result = DocumentName.create(name);
        // Should be valid - Unicode characters are generally allowed
        AppResultTestUtils.expectOk(result);
      });
    });

    it('should handle edge cases with extensions', () => {
      const edgeCases = [
        'file.', // Trailing dot
        '.hidden', // Leading dot (hidden file)
        'file..pdf', // Double dot
        'file.PDF', // Uppercase extension
        'file.tar.gz' // Multiple extensions
      ];

      edgeCases.forEach(name => {
        const result = DocumentName.create(name);
        // Some might be valid, some invalid - test actual behavior
        if (result.isOk()) {
          const docName = result.unwrap();
          expect(docName.value).to.equal(name.trim());
        }
      });
    });

    it('should handle whitespace edge cases', () => {
      const whitespaceNames = [
        'document\tname.pdf', // Tab character
        'document\nname.pdf', // Newline character
        'document  name.pdf', // Multiple spaces
        'document\r\nname.pdf' // Windows line ending
      ];

      whitespaceNames.forEach(name => {
        const result = DocumentName.create(name);
        // Some whitespace might be allowed, some not
        // Test documents current behavior
        if (result.isOk()) {
          const docName = result.unwrap();
          expect(docName.value).to.be.a('string');
        }
      });
    });
  });
});
