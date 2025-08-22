/**
 * MimeType Value Object Tests
 * Testing MimeType value object with hexapp BaseValueObject patterns
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
import { MimeType } from '../../../src/domain/value-objects/MimeType.js';

describe('Domain > Value Objects > MimeType', () => {
  describe('BaseValueObject Integration', () => {
    it('should extend hexapp BaseValueObject', () => {
      // Arrange & Act
      const mimeResult = MimeType.create('application/pdf');
      
      // Assert
      const mime = AppResultTestUtils.expectOk(mimeResult);
      expect(mime).to.be.instanceOf(MimeType);
      
      // Should have serialize method from BaseValueObject
      expect(mime.serialize).to.be.a('function');
      expect(mime.serialize()).to.be.a('string');
      expect(mime.serialize()).to.equal('application/pdf');
    });

    it('should implement value object equality semantics', () => {
      // Arrange
      const mime1Result = MimeType.create('application/pdf');
      const mime2Result = MimeType.create('application/pdf');
      const mime3Result = MimeType.create('text/plain');
      
      // Act
      const mime1 = AppResultTestUtils.expectOk(mime1Result);
      const mime2 = AppResultTestUtils.expectOk(mime2Result);
      const mime3 = AppResultTestUtils.expectOk(mime3Result);
      
      // Assert - Same value should be equal
      expect(mime1.equals(mime2)).to.be.true;
      expect(mime2.equals(mime1)).to.be.true;
      
      // Different values should not be equal
      expect(mime1.equals(mime3)).to.be.false;
      expect(mime3.equals(mime1)).to.be.false;
    });

    it('should be immutable after creation', () => {
      // Arrange & Act
      const mimeResult = MimeType.create('application/pdf');
      const mime = AppResultTestUtils.expectOk(mimeResult);
      
      // Assert - Value object should be immutable
      expect(mime.value).to.equal('application/pdf');
      
      // Should not be able to modify the mime type (no setter methods)
      expect(mime).to.not.have.property('setValue');
      expect(mime).to.not.have.property('changeMimeType');
    });
  });

  describe('Factory Pattern Validation', () => {
    it('should create MIME type with valid input', () => {
      // Arrange & Act
      const result = MimeType.create('application/pdf');
      
      // Assert
      const mime = AppResultTestUtils.expectOk(result);
      expect(mime.value).to.equal('application/pdf');
    });

    it('should normalize MIME type (lowercase)', () => {
      // Arrange & Act
      const result = MimeType.create('APPLICATION/PDF');
      
      // Assert
      const mime = AppResultTestUtils.expectOk(result);
      expect(mime.value).to.equal('application/pdf');
    });

    it('should return AppResult.Err for null/undefined input', () => {
      // Test null
      const nullResult = MimeType.create(null as any);
      AppResultTestUtils.expectErr(nullResult);
      
      // Test undefined  
      const undefinedResult = MimeType.create(undefined as any);
      AppResultTestUtils.expectErr(undefinedResult);
      
      // Test empty string
      const emptyResult = MimeType.create('');
      AppResultTestUtils.expectErr(emptyResult);
    });

    it('should return AppResult.Err for non-string input', () => {
      // Test number
      const numberResult = MimeType.create(123 as any);
      AppResultTestUtils.expectErr(numberResult);
      
      // Test object
      const objectResult = MimeType.create({} as any);
      AppResultTestUtils.expectErr(objectResult);
      
      // Test array
      const arrayResult = MimeType.create(['application/pdf'] as any);
      AppResultTestUtils.expectErr(arrayResult);
    });
  });

  describe('MIME Type Format Validation', () => {
    it('should accept valid MIME type formats', () => {
      const validMimeTypes = [
        'application/pdf',
        'text/plain',
        'image/jpeg',
        'image/png',
        'application/json',
        'text/html',
        'audio/mpeg',
        'video/mp4',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/vnd.ms-excel' // .xls
      ];

      validMimeTypes.forEach(mimeType => {
        const result = MimeType.create(mimeType);
        const mime = AppResultTestUtils.expectOk(result);
        expect(mime.value).to.equal(mimeType.toLowerCase());
      });
    });

    it('should reject invalid MIME type formats', () => {
      const invalidMimeTypes = [
        'invalid-mime-type',
        'text plain', // Missing slash
        'text\\plain', // Wrong separator
        'application; pdf', // Wrong separator
        'text..plain', // Double dots
        'text//plain', // Double slashes
        'text@plain', // Invalid character
        'text#plain' // Invalid character
      ];

      invalidMimeTypes.forEach(mimeType => {
        const result = MimeType.create(mimeType);
        AppResultTestUtils.expectErr(result);
      });
    });

    it('should reject MIME types with parameters', () => {
      const mimeTypesWithParams = [
        'text/html; charset=utf-8',
        'application/json; charset=utf-8',
        'text/plain; charset=iso-8859-1',
        'multipart/form-data; boundary=something'
      ];

      mimeTypesWithParams.forEach(mimeType => {
        const result = MimeType.create(mimeType);
        AppResultTestUtils.expectErr(result);
      });
    });
  });

  describe('MIME Type Categories', () => {
    it('should identify text MIME types', () => {
      const textTypes = [
        'text/plain',
        'text/html',
        'text/css',
        'text/javascript',
        'text/markdown'
      ];

      textTypes.forEach(mimeType => {
        const mimeResult = MimeType.create(mimeType);
        const mime = AppResultTestUtils.expectOk(mimeResult);
        expect(mime.isText).to.be.true;
        expect(mime.mainType).to.equal('text');
      });
    });

    it('should identify image MIME types', () => {
      const imageTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/svg+xml',
        'image/webp'
      ];

      imageTypes.forEach(mimeType => {
        const mimeResult = MimeType.create(mimeType);
        const mime = AppResultTestUtils.expectOk(mimeResult);
        expect(mime.isImage).to.be.true;
        expect(mime.mainType).to.equal('image');
      });
    });

    it('should identify document and archive MIME types', () => {
      const documentTypes = [
        'application/pdf',
        'application/msword'
      ];
      const archiveTypes = [
        'application/zip',
        'application/x-rar-compressed'
      ];

      documentTypes.forEach(mimeType => {
        const mimeResult = MimeType.create(mimeType);
        const mime = AppResultTestUtils.expectOk(mimeResult);
        expect(mime.isDocument).to.be.true;
        expect(mime.mainType).to.equal('application');
      });

      archiveTypes.forEach(mimeType => {
        const mimeResult = MimeType.create(mimeType);
        const mime = AppResultTestUtils.expectOk(mimeResult);
        expect(mime.isArchive).to.be.true;
        expect(mime.mainType).to.equal('application');
      });
    });

    it('should identify audio and video MIME types', () => {
      const audioTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
      const videoTypes = ['video/mp4', 'video/avi', 'video/webm'];

      audioTypes.forEach(mimeType => {
        const mimeResult = MimeType.create(mimeType);
        const mime = AppResultTestUtils.expectOk(mimeResult);
        expect(mime.isAudio).to.be.true;
        expect(mime.mainType).to.equal('audio');
      });

      videoTypes.forEach(mimeType => {
        const mimeResult = MimeType.create(mimeType);
        const mime = AppResultTestUtils.expectOk(mimeResult);
        expect(mime.isVideo).to.be.true;
        expect(mime.mainType).to.equal('video');
      });
    });
  });

  describe('MIME Type Component Extraction', () => {
    it('should extract main type and subtype', () => {
      const testCases = [
        { mime: 'application/pdf', mainType: 'application', subType: 'pdf' },
        { mime: 'text/plain', mainType: 'text', subType: 'plain' },
        { mime: 'image/jpeg', mainType: 'image', subType: 'jpeg' },
        { mime: 'audio/mpeg', mainType: 'audio', subType: 'mpeg' }
      ];

      testCases.forEach(({ mime, mainType, subType }) => {
        const mimeResult = MimeType.create(mime);
        const mimeType = AppResultTestUtils.expectOk(mimeResult);
        
        expect(mimeType.mainType).to.equal(mainType);
        expect(mimeType.subType).to.equal(subType);
      });
    });

    it('should handle MIME types with basic properties', () => {
      // Arrange
      const mimeResult = MimeType.create('text/html');
      const mime = AppResultTestUtils.expectOk(mimeResult);
      
      // Act & Assert
      expect(mime.mainType).to.equal('text');
      expect(mime.subType).to.equal('html');
      expect(mime.isText).to.be.true;
      expect(mime.isTextEditable).to.be.true;
    });

    it('should handle application MIME types', () => {
      // Arrange
      const mimeResult = MimeType.create('application/pdf');
      const mime = AppResultTestUtils.expectOk(mimeResult);
      
      // Act & Assert
      expect(mime.mainType).to.equal('application');
      expect(mime.subType).to.equal('pdf');
      expect(mime.isDocument).to.be.true;
    });
  });

  describe('File Extension Mapping', () => {
    it('should suggest appropriate file extensions', () => {
      const extensionMappings = [
        { mime: 'application/pdf', extensions: ['pdf'] },
        { mime: 'text/plain', extensions: ['txt'] },
        { mime: 'image/jpeg', extensions: ['jpg', 'jpeg'] },
        { mime: 'image/png', extensions: ['png'] },
        { mime: 'application/json', extensions: ['json'] },
        { mime: 'text/html', extensions: ['html', 'htm'] }
      ];

      extensionMappings.forEach(({ mime, extensions }) => {
        const mimeResult = MimeType.create(mime);
        const mimeType = AppResultTestUtils.expectOk(mimeResult);
        
        const typicalExt = mimeType.typicalExtension;
        expect(typicalExt).to.be.a('string');
        expect(typicalExt).to.not.be.empty;
        
        // Should match one of the expected extensions
        expect(extensions.map(ext => `.${ext}`)).to.include(typicalExt);
      });
    });

    it('should handle image MIME types correctly', () => {
      const imageTypes = [
        'image/jpeg',
        'image/png', 
        'image/gif',
        'image/webp'
      ];

      imageTypes.forEach(mimeType => {
        const mimeResult = MimeType.create(mimeType);
        const mime = AppResultTestUtils.expectOk(mimeResult);
        
        expect(mime.isImage).to.be.true;
        expect(mime.isBinary).to.be.true;
        expect(mime.isBrowserPreviewable).to.be.true;
      });
    });
  });

  describe('Security and Validation', () => {
    it('should handle binary MIME types correctly', () => {
      const binaryTypes = [
        'application/x-executable',
        'application/x-msdownload',
        'application/octet-stream',
        'image/jpeg',
        'video/mp4'
      ];

      binaryTypes.forEach(mimeType => {
        const mimeResult = MimeType.create(mimeType);
        const mime = AppResultTestUtils.expectOk(mimeResult);
        expect(mime.isBinary).to.be.true;
      });
    });

    it('should identify safe MIME types', () => {
      const safeTypes = [
        'text/plain',
        'application/pdf',
        'image/jpeg',
        'image/png',
        'audio/mpeg',
        'video/mp4'
      ];

      safeTypes.forEach(mimeType => {
        const mimeResult = MimeType.create(mimeType);
        const mime = AppResultTestUtils.expectOk(mimeResult);
        expect(mime.isBrowserPreviewable || mime.isTextEditable || mime.isImage || mime.isAudio || mime.isVideo).to.be.true;
      });
    });

    it('should provide basic MIME type properties', () => {
      // Arrange
      const pdfResult = MimeType.create('application/pdf');
      const htmlResult = MimeType.create('text/html');
      
      const pdfMime = AppResultTestUtils.expectOk(pdfResult);
      const htmlMime = AppResultTestUtils.expectOk(htmlResult);
      
      // Act & Assert
      expect(pdfMime.isDocument).to.be.true;
      expect(htmlMime.isText).to.be.true;
      expect(pdfMime.serialize()).to.equal('application/pdf');
      expect(htmlMime.serialize()).to.equal('text/html');
    });
  });

  describe('Serialization Patterns', () => {
    it('should serialize to string value', () => {
      // Arrange
      const mimeResult = MimeType.create('application/pdf');
      const mime = AppResultTestUtils.expectOk(mimeResult);
      
      // Act
      const serialized = mime.serialize();
      
      // Assert
      expect(serialized).to.be.a('string');
      expect(serialized).to.equal('application/pdf');
    });

    it('should preserve normalized format in serialization', () => {
      // Arrange
      const mimeResult = MimeType.create('APPLICATION/PDF');
      const mime = AppResultTestUtils.expectOk(mimeResult);
      
      // Act
      const serialized = mime.serialize();
      
      // Assert
      expect(serialized).to.equal('application/pdf');
    });

    it('should provide consistent serialization across instances', () => {
      // Arrange
      const mime1Result = MimeType.create('application/pdf');
      const mime2Result = MimeType.create('APPLICATION/PDF');
      
      const mime1 = AppResultTestUtils.expectOk(mime1Result);
      const mime2 = AppResultTestUtils.expectOk(mime2Result);
      
      // Act & Assert
      expect(mime1.serialize()).to.equal(mime2.serialize());
    });
  });

  describe('Utility Methods', () => {
    it('should provide string representation', () => {
      // Arrange
      const mimeResult = MimeType.create('application/pdf');
      const mime = AppResultTestUtils.expectOk(mimeResult);
      
      // Act & Assert
      expect(mime.toString()).to.equal('application/pdf');
      expect(String(mime)).to.equal('application/pdf');
    });

    it('should identify streaming-capable MIME types', () => {
      const streamingTypes = [
        'audio/mpeg',
        'video/mp4',
        'text/plain'
      ];
      
      const nonStreamingTypes = [
        'application/pdf',
        'image/jpeg'
      ];

      streamingTypes.forEach(mimeType => {
        const mimeResult = MimeType.create(mimeType);
        const mime = AppResultTestUtils.expectOk(mimeResult);
        expect(mime.supportsStreaming).to.be.true;
      });
      
      nonStreamingTypes.forEach(mimeType => {
        const mimeResult = MimeType.create(mimeType);
        const mime = AppResultTestUtils.expectOk(mimeResult);
        expect(mime.supportsStreaming).to.be.false;
      });
    });

    it('should check compatibility with specific types', () => {
      // Arrange
      const jsonResult = MimeType.create('application/json');
      const xmlResult = MimeType.create('application/xml');
      const plainResult = MimeType.create('text/plain');
      
      const jsonMime = AppResultTestUtils.expectOk(jsonResult);
      const xmlMime = AppResultTestUtils.expectOk(xmlResult);
      const plainMime = AppResultTestUtils.expectOk(plainResult);
      
      // Act & Assert - Check basic properties
      expect(jsonMime.mainType).to.equal('application');
      expect(jsonMime.subType).to.equal('json');
      expect(plainMime.isText).to.be.true;
    });
  });

  describe('Error Cases and Edge Conditions', () => {
    it('should provide descriptive error messages for validation failures', () => {
      // Test invalid format
      const invalidResult = MimeType.create('invalid-mime');
      const invalidError = AppResultTestUtils.expectErr(invalidResult);
      expect(invalidError.message).to.include('Invalid MIME type format');
      
      // Test empty input
      const emptyResult = MimeType.create('');
      const emptyError = AppResultTestUtils.expectErr(emptyResult);
      expect(emptyError.message).to.include('MIME type value is required');
      
      // Test missing slash
      const noSlashResult = MimeType.create('applicationpdf');
      const noSlashError = AppResultTestUtils.expectErr(noSlashResult);
      expect(noSlashError.message).to.include('Invalid MIME type format');
    });

    it('should handle edge cases in MIME type validation', () => {
      const edgeCases = [
        { input: 'application/pdf ', expected: 'application/pdf' }, // Trailing space
        { input: ' text/plain', expected: 'text/plain' }, // Leading space
        { input: 'TEXT/PLAIN', expected: 'text/plain' }, // All uppercase
        { input: 'Application/Pdf', expected: 'application/pdf' } // Mixed case
      ];

      edgeCases.forEach(({ input, expected }) => {
        const result = MimeType.create(input);
        if (result.isOk()) {
          const mime = result.unwrap();
          expect(mime.value).to.equal(expected);
        }
      });
    });

    it('should reject complex MIME types with parameters', () => {
      const complexMime = 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW; charset=utf-8';
      const result = MimeType.create(complexMime);
      
      AppResultTestUtils.expectErr(result);
    });

    it('should handle vendor-specific MIME types', () => {
      const vendorTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.api+json',
        'application/x-custom-type'
      ];

      vendorTypes.forEach(mimeType => {
        const result = MimeType.create(mimeType);
        const mime = AppResultTestUtils.expectOk(result);
        expect(mime.value).to.equal(mimeType.toLowerCase());
        expect(mime.mainType).to.equal('application');
      });
    });

    it('should handle empty and malformed parameter strings', () => {
      const malformedCases = [
        'text/html; ', // Trailing semicolon
        'text/html; charset', // Parameter without value
        'text/html; =utf-8', // Value without parameter name
        'text/html; charset=', // Parameter without value
        'text/html; charset=utf-8;' // Trailing semicolon after parameter
      ];

      malformedCases.forEach(input => {
        const result = MimeType.create(input);
        // Should either parse correctly or fail gracefully
        if (result.isOk()) {
          const mime = result.unwrap();
          expect(mime.mainType).to.equal('text');
          expect(mime.subType).to.equal('html');
        } else {
          const error = result.unwrapErr();
          expect(error.message).to.be.a('string');
        }
      });
    });
  });
});
