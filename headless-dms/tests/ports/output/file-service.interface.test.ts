/**
 * IFileService Output Port Interface Tests
 * 
 * Tests the contract and method signatures of the IFileService interface
 * without testing actual implementations (that's done in adapter tests)
 */

import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import { IFileService } from '../../../src/ports/output/IFileService.js';
import { FileInfo } from '../../../src/shared/types/FileInfo.js';
import { AppResult } from '@carbonteq/hexapp';

describe('IFileService Output Port Interface', () => {
  let mockFileService: IFileService;

  beforeEach(() => {
    // Create a mock implementation that satisfies the interface
    mockFileService = {
      saveFile: async (file: Buffer, name: string, mimeType: string): Promise<AppResult<FileInfo>> => {
        const fileInfo: FileInfo = {
          path: '/uploads/test-file.pdf',
          name: name,
          mimeType: mimeType,
          size: file.length.toString(),
          id: 'file123'
        };
        return AppResult.Ok(fileInfo);
      },

      saveFileFromRequest: async (request: any): Promise<AppResult<FileInfo>> => {
        const fileInfo: FileInfo = {
          path: '/uploads/test-file.pdf',
          name: 'test-file.pdf',
          mimeType: 'application/pdf',
          size: '1024',
          id: 'file123'
        };
        return AppResult.Ok(fileInfo);
      },

      getFile: async (filePath: string): Promise<AppResult<Buffer>> => {
        const fileContent = Buffer.from('test file content');
        return AppResult.Ok(fileContent);
      },

      fileExists: async (filePath: string): Promise<AppResult<boolean>> => {
        return AppResult.Ok(true);
      },

      deleteFile: async (filePath: string): Promise<AppResult<boolean>> => {
        return AppResult.Ok(true);
      },

      streamFile: async (filePath: string, response: any): Promise<AppResult<void>> => {
        return AppResult.Ok(undefined);
      },

      generateDownloadLink: async (filePath: string, expiresIn?: number): Promise<AppResult<string>> => {
        return AppResult.Ok('https://example.com/download/token123');
      },

      getFileInfo: async (filePath: string): Promise<AppResult<FileInfo>> => {
        const fileInfo: FileInfo = {
          path: filePath,
          name: 'test-file.pdf',
          mimeType: 'application/pdf',
          size: '1024',
          id: 'file123'
        };
        return AppResult.Ok(fileInfo);
      }
    };
  });

  describe('Interface Contract Compliance', () => {
    it('should implement all required methods', () => {
      expect(mockFileService).to.have.property('saveFile');
      expect(mockFileService).to.have.property('saveFileFromRequest');
      expect(mockFileService).to.have.property('getFile');
      expect(mockFileService).to.have.property('fileExists');
      expect(mockFileService).to.have.property('deleteFile');
      expect(mockFileService).to.have.property('streamFile');
      expect(mockFileService).to.have.property('generateDownloadLink');
      expect(mockFileService).to.have.property('getFileInfo');
    });

    it('should have correct method signatures', () => {
      expect(typeof mockFileService.saveFile).to.equal('function');
      expect(typeof mockFileService.saveFileFromRequest).to.equal('function');
      expect(typeof mockFileService.getFile).to.equal('function');
      expect(typeof mockFileService.fileExists).to.equal('function');
      expect(typeof mockFileService.deleteFile).to.equal('function');
      expect(typeof mockFileService.streamFile).to.equal('function');
      expect(typeof mockFileService.generateDownloadLink).to.equal('function');
      expect(typeof mockFileService.getFileInfo).to.equal('function');
    });
  });

  describe('File Operations Methods', () => {
    it('should handle saveFile with Buffer, name, and MIME type', async () => {
      const file = Buffer.from('test file content');
      const name = 'test-file.pdf';
      const mimeType = 'application/pdf';
      
      const result = await mockFileService.saveFile(file, name, mimeType);
      
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const fileInfo = result.unwrap();
      expect(fileInfo).to.have.property('path');
      expect(fileInfo).to.have.property('name');
      expect(fileInfo).to.have.property('mimeType');
      expect(fileInfo).to.have.property('size');
      expect(fileInfo.name).to.equal(name);
      expect(fileInfo.mimeType).to.equal(mimeType);
    });

    it('should handle saveFileFromRequest with request object', async () => {
      const request = { file: Buffer.from('test content'), filename: 'test.pdf' };
      
      const result = await mockFileService.saveFileFromRequest(request);
      
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const fileInfo = result.unwrap();
      expect(fileInfo).to.have.property('path');
      expect(fileInfo).to.have.property('name');
      expect(fileInfo).to.have.property('mimeType');
      expect(fileInfo).to.have.property('size');
    });

    it('should handle getFile with file path', async () => {
      const filePath = '/uploads/test-file.pdf';
      
      const result = await mockFileService.getFile(filePath);
      
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const fileContent = result.unwrap();
      expect(fileContent).to.be.instanceOf(Buffer);
    });

    it('should handle fileExists with file path', async () => {
      const filePath = '/uploads/test-file.pdf';
      
      const result = await mockFileService.fileExists(filePath);
      
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const exists = result.unwrap();
      expect(typeof exists).to.equal('boolean');
    });

    it('should handle deleteFile with file path', async () => {
      const filePath = '/uploads/test-file.pdf';
      
      const result = await mockFileService.deleteFile(filePath);
      
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const deleted = result.unwrap();
      expect(typeof deleted).to.equal('boolean');
    });

    it('should handle streamFile with file path and response', async () => {
      const filePath = '/uploads/test-file.pdf';
      const response = { write: () => {}, end: () => {} };
      
      const result = await mockFileService.streamFile(filePath, response);
      
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const streamResult = result.unwrap();
      expect(streamResult).to.be.undefined;
    });

    it('should handle generateDownloadLink with file path', async () => {
      const filePath = '/uploads/test-file.pdf';
      
      const result = await mockFileService.generateDownloadLink(filePath);
      
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const link = result.unwrap();
      expect(typeof link).to.equal('string');
      expect(link).to.include('http');
    });

    it('should handle generateDownloadLink with optional expiration', async () => {
      const filePath = '/uploads/test-file.pdf';
      const expiresIn = 30;
      
      const result = await mockFileService.generateDownloadLink(filePath, expiresIn);
      
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const link = result.unwrap();
      expect(typeof link).to.equal('string');
    });

    it('should handle getFileInfo with file path', async () => {
      const filePath = '/uploads/test-file.pdf';
      
      const result = await mockFileService.getFileInfo(filePath);
      
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const fileInfo = result.unwrap();
      expect(fileInfo).to.have.property('path');
      expect(fileInfo).to.have.property('name');
      expect(fileInfo).to.have.property('mimeType');
      expect(fileInfo).to.have.property('size');
      expect(fileInfo.path).to.equal(filePath);
    });
  });

  describe('Method Parameter Types', () => {
    it('should accept Buffer parameters for files', async () => {
      const file = Buffer.from('test content');
      const result = await mockFileService.saveFile(file, 'test.pdf', 'application/pdf');
      expect(result.isOk()).to.be.true;
    });

    it('should accept string parameters for file paths', async () => {
      const filePath = '/uploads/test-file.pdf';
      const result = await mockFileService.getFile(filePath);
      expect(result.isOk()).to.be.true;
    });

    it('should accept string parameters for file names', async () => {
      const file = Buffer.from('test content');
      const name = 'test-file.pdf';
      const result = await mockFileService.saveFile(file, name, 'application/pdf');
      expect(result.isOk()).to.be.true;
    });

    it('should accept string parameters for MIME types', async () => {
      const file = Buffer.from('test content');
      const mimeType = 'application/pdf';
      const result = await mockFileService.saveFile(file, 'test.pdf', mimeType);
      expect(result.isOk()).to.be.true;
    });

    it('should accept any parameters for requests', async () => {
      const request = { file: Buffer.from('test content') };
      const result = await mockFileService.saveFileFromRequest(request);
      expect(result.isOk()).to.be.true;
    });

    it('should accept any parameters for responses', async () => {
      const filePath = '/uploads/test-file.pdf';
      const response = { write: () => {} };
      const result = await mockFileService.streamFile(filePath, response);
      expect(result.isOk()).to.be.true;
    });

    it('should accept optional number parameters for expiration', async () => {
      const filePath = '/uploads/test-file.pdf';
      const result1 = await mockFileService.generateDownloadLink(filePath);
      const result2 = await mockFileService.generateDownloadLink(filePath, 30);
      
      expect(result1.isOk()).to.be.true;
      expect(result2.isOk()).to.be.true;
    });
  });

  describe('Return Type Consistency', () => {
    it('should consistently return AppResult types', async () => {
      const file = Buffer.from('test content');
      const filePath = '/uploads/test-file.pdf';
      const request = { file: Buffer.from('test content') };
      const response = { write: () => {} };
      
      const results = [
        await mockFileService.saveFile(file, 'test.pdf', 'application/pdf'),
        await mockFileService.saveFileFromRequest(request),
        await mockFileService.getFile(filePath),
        await mockFileService.fileExists(filePath),
        await mockFileService.deleteFile(filePath),
        await mockFileService.streamFile(filePath, response),
        await mockFileService.generateDownloadLink(filePath),
        await mockFileService.getFileInfo(filePath)
      ];
      
      results.forEach(result => {
        expect(result).to.be.instanceOf(AppResult);
      });
    });

    it('should return correct generic types', async () => {
      const file = Buffer.from('test content');
      const filePath = '/uploads/test-file.pdf';
      const request = { file: Buffer.from('test content') };
      const response = { write: () => {} };
      
      const saveResult = await mockFileService.saveFile(file, 'test.pdf', 'application/pdf');
      const saveFromRequestResult = await mockFileService.saveFileFromRequest(request);
      const getResult = await mockFileService.getFile(filePath);
      const existsResult = await mockFileService.fileExists(filePath);
      const deleteResult = await mockFileService.deleteFile(filePath);
      const streamResult = await mockFileService.streamFile(filePath, response);
      const linkResult = await mockFileService.generateDownloadLink(filePath);
      const infoResult = await mockFileService.getFileInfo(filePath);
      
      expect(saveResult.unwrap()).to.have.property('path');
      expect(saveFromRequestResult.unwrap()).to.have.property('path');
      expect(getResult.unwrap()).to.be.instanceOf(Buffer);
      expect(typeof existsResult.unwrap()).to.equal('boolean');
      expect(typeof deleteResult.unwrap()).to.equal('boolean');
      expect(streamResult.unwrap()).to.be.undefined;
      expect(typeof linkResult.unwrap()).to.equal('string');
      expect(infoResult.unwrap()).to.have.property('path');
    });
  });

  describe('Async Operation Handling', () => {
    it('should handle all methods as async operations', async () => {
      const file = Buffer.from('test content');
      const filePath = '/uploads/test-file.pdf';
      const request = { file: Buffer.from('test content') };
      const response = { write: () => {} };
      
      const methods = [
        mockFileService.saveFile(file, 'test.pdf', 'application/pdf'),
        mockFileService.saveFileFromRequest(request),
        mockFileService.getFile(filePath),
        mockFileService.fileExists(filePath),
        mockFileService.deleteFile(filePath),
        mockFileService.streamFile(filePath, response),
        mockFileService.generateDownloadLink(filePath),
        mockFileService.getFileInfo(filePath)
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

  describe('FileInfo Structure', () => {
    it('should return FileInfo with required properties', async () => {
      const file = Buffer.from('test content');
      const result = await mockFileService.saveFile(file, 'test.pdf', 'application/pdf');
      
      const fileInfo = result.unwrap();
      expect(fileInfo).to.have.property('path');
      expect(fileInfo).to.have.property('name');
      expect(fileInfo).to.have.property('mimeType');
      expect(fileInfo).to.have.property('size');
    });

    it('should return FileInfo with optional properties when available', async () => {
      const filePath = '/uploads/test-file.pdf';
      const result = await mockFileService.getFileInfo(filePath);
      
      const fileInfo = result.unwrap();
      expect(fileInfo).to.have.property('id');
      expect(fileInfo.id).to.equal('file123');
    });
  });

  describe('Interface Extensibility', () => {
    it('should allow additional methods in implementations', () => {
      const extendedService: IFileService & { additionalMethod?: () => void } = {
        ...mockFileService,
        additionalMethod: () => {}
      };
      
      expect(extendedService.saveFile).to.be.a('function');
      expect(extendedService.getFile).to.be.a('function');
      expect(extendedService.additionalMethod).to.be.a('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle file operations that may fail', async () => {
      // This test verifies the interface contract, not the implementation
      // The actual implementation will be tested in concrete adapter tests
      
      expect(mockFileService.saveFile).to.be.a('function');
      expect(mockFileService.saveFileFromRequest).to.be.a('function');
      expect(mockFileService.getFile).to.be.a('function');
      expect(mockFileService.fileExists).to.be.a('function');
      expect(mockFileService.deleteFile).to.be.a('function');
      expect(mockFileService.streamFile).to.be.a('function');
      expect(mockFileService.generateDownloadLink).to.be.a('function');
      expect(mockFileService.getFileInfo).to.be.a('function');
      
      // Verify that the methods return promises
      const file = Buffer.from('test content');
      const filePath = '/uploads/test-file.pdf';
      const request = { file: Buffer.from('test content') };
      const response = { write: () => {} };
      
      const savePromise = mockFileService.saveFile(file, 'test.pdf', 'application/pdf');
      const saveFromRequestPromise = mockFileService.saveFileFromRequest(request);
      const getPromise = mockFileService.getFile(filePath);
      const existsPromise = mockFileService.fileExists(filePath);
      const deletePromise = mockFileService.deleteFile(filePath);
      const streamPromise = mockFileService.streamFile(filePath, response);
      const linkPromise = mockFileService.generateDownloadLink(filePath);
      const infoPromise = mockFileService.getFileInfo(filePath);
      
      expect(savePromise).to.be.instanceOf(Promise);
      expect(saveFromRequestPromise).to.be.instanceOf(Promise);
      expect(getPromise).to.be.instanceOf(Promise);
      expect(existsPromise).to.be.instanceOf(Promise);
      expect(deletePromise).to.be.instanceOf(Promise);
      expect(streamPromise).to.be.instanceOf(Promise);
      expect(linkPromise).to.be.instanceOf(Promise);
      expect(infoPromise).to.be.instanceOf(Promise);
      
      // Verify that the promises resolve (we don't care about the actual values in interface tests)
      await Promise.all([
        savePromise,
        saveFromRequestPromise,
        getPromise,
        existsPromise,
        deletePromise,
        streamPromise,
        linkPromise,
        infoPromise
      ]);
    });
  });
});
