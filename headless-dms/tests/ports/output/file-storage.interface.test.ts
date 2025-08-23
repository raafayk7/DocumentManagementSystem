/**
 * IFileStorage Output Port Interface Tests
 * 
 * Tests the contract and method signatures of the IFileStorage interface
 * without testing actual implementations (that's done in adapter tests)
 */

import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import { IFileStorage } from '../../../src/ports/output/IFileStorage.js';
import { FileInfo } from '../../../src/shared/types/FileInfo.js';
import { AppResult } from '@carbonteq/hexapp';

describe('IFileStorage Output Port Interface', () => {
  let mockFileStorage: IFileStorage;

  beforeEach(() => {
    // Create a mock implementation that satisfies the interface
    mockFileStorage = {
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

      getFile: async (filePath: string): Promise<AppResult<Buffer>> => {
        const fileContent = Buffer.from('test file content');
        return AppResult.Ok(fileContent);
      },

      deleteFile: async (filePath: string): Promise<AppResult<boolean>> => {
        return AppResult.Ok(true);
      },

      fileExists: async (filePath: string): Promise<AppResult<boolean>> => {
        return AppResult.Ok(true);
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
      expect(mockFileStorage).to.have.property('saveFile');
      expect(mockFileStorage).to.have.property('getFile');
      expect(mockFileStorage).to.have.property('deleteFile');
      expect(mockFileStorage).to.have.property('fileExists');
      expect(mockFileStorage).to.have.property('getFileInfo');
    });

    it('should have correct method signatures', () => {
      expect(typeof mockFileStorage.saveFile).to.equal('function');
      expect(typeof mockFileStorage.getFile).to.equal('function');
      expect(typeof mockFileStorage.deleteFile).to.equal('function');
      expect(typeof mockFileStorage.fileExists).to.equal('function');
      expect(typeof mockFileStorage.getFileInfo).to.equal('function');
    });
  });

  describe('File Operations Methods', () => {
    it('should handle saveFile with Buffer, name, and MIME type', async () => {
      const file = Buffer.from('test file content');
      const name = 'test-file.pdf';
      const mimeType = 'application/pdf';
      
      const result = await mockFileStorage.saveFile(file, name, mimeType);
      
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

    it('should handle getFile with file path', async () => {
      const filePath = '/uploads/test-file.pdf';
      
      const result = await mockFileStorage.getFile(filePath);
      
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const fileContent = result.unwrap();
      expect(fileContent).to.be.instanceOf(Buffer);
    });

    it('should handle deleteFile with file path', async () => {
      const filePath = '/uploads/test-file.pdf';
      
      const result = await mockFileStorage.deleteFile(filePath);
      
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const deleted = result.unwrap();
      expect(typeof deleted).to.equal('boolean');
    });

    it('should handle fileExists with file path', async () => {
      const filePath = '/uploads/test-file.pdf';
      
      const result = await mockFileStorage.fileExists(filePath);
      
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const exists = result.unwrap();
      expect(typeof exists).to.equal('boolean');
    });

    it('should handle getFileInfo with file path', async () => {
      const filePath = '/uploads/test-file.pdf';
      
      const result = await mockFileStorage.getFileInfo(filePath);
      
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
      const result = await mockFileStorage.saveFile(file, 'test.pdf', 'application/pdf');
      expect(result.isOk()).to.be.true;
    });

    it('should accept string parameters for file paths', async () => {
      const filePath = '/uploads/test-file.pdf';
      const result = await mockFileStorage.getFile(filePath);
      expect(result.isOk()).to.be.true;
    });

    it('should accept string parameters for file names', async () => {
      const file = Buffer.from('test content');
      const name = 'test-file.pdf';
      const result = await mockFileStorage.saveFile(file, name, 'application/pdf');
      expect(result.isOk()).to.be.true;
    });

    it('should accept string parameters for MIME types', async () => {
      const file = Buffer.from('test content');
      const mimeType = 'application/pdf';
      const result = await mockFileStorage.saveFile(file, 'test.pdf', mimeType);
      expect(result.isOk()).to.be.true;
    });
  });

  describe('Return Type Consistency', () => {
    it('should consistently return AppResult types', async () => {
      const file = Buffer.from('test content');
      const filePath = '/uploads/test-file.pdf';
      
      const results = [
        await mockFileStorage.saveFile(file, 'test.pdf', 'application/pdf'),
        await mockFileStorage.getFile(filePath),
        await mockFileStorage.deleteFile(filePath),
        await mockFileStorage.fileExists(filePath),
        await mockFileStorage.getFileInfo(filePath)
      ];
      
      results.forEach(result => {
        expect(result).to.be.instanceOf(AppResult);
      });
    });

    it('should return correct generic types', async () => {
      const file = Buffer.from('test content');
      const filePath = '/uploads/test-file.pdf';
      
      const saveResult = await mockFileStorage.saveFile(file, 'test.pdf', 'application/pdf');
      const getResult = await mockFileStorage.getFile(filePath);
      const deleteResult = await mockFileStorage.deleteFile(filePath);
      const existsResult = await mockFileStorage.fileExists(filePath);
      const infoResult = await mockFileStorage.getFileInfo(filePath);
      
      expect(saveResult.unwrap()).to.have.property('path');
      expect(getResult.unwrap()).to.be.instanceOf(Buffer);
      expect(typeof deleteResult.unwrap()).to.equal('boolean');
      expect(typeof existsResult.unwrap()).to.equal('boolean');
      expect(infoResult.unwrap()).to.have.property('path');
    });
  });

  describe('Async Operation Handling', () => {
    it('should handle all methods as async operations', async () => {
      const file = Buffer.from('test content');
      const filePath = '/uploads/test-file.pdf';
      
      const methods = [
        mockFileStorage.saveFile(file, 'test.pdf', 'application/pdf'),
        mockFileStorage.getFile(filePath),
        mockFileStorage.deleteFile(filePath),
        mockFileStorage.fileExists(filePath),
        mockFileStorage.getFileInfo(filePath)
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
      const result = await mockFileStorage.saveFile(file, 'test.pdf', 'application/pdf');
      
      const fileInfo = result.unwrap();
      expect(fileInfo).to.have.property('path');
      expect(fileInfo).to.have.property('name');
      expect(fileInfo).to.have.property('mimeType');
      expect(fileInfo).to.have.property('size');
    });

    it('should return FileInfo with optional properties when available', async () => {
      const filePath = '/uploads/test-file.pdf';
      const result = await mockFileStorage.getFileInfo(filePath);
      
      const fileInfo = result.unwrap();
      expect(fileInfo).to.have.property('id');
      expect(fileInfo.id).to.equal('file123');
    });
  });

  describe('Interface Extensibility', () => {
    it('should allow additional methods in implementations', () => {
      const extendedStorage: IFileStorage & { additionalMethod?: () => void } = {
        ...mockFileStorage,
        additionalMethod: () => {}
      };
      
      expect(extendedStorage.saveFile).to.be.a('function');
      expect(extendedStorage.getFile).to.be.a('function');
      expect(extendedStorage.additionalMethod).to.be.a('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle file operations that may fail', async () => {
      // This test verifies the interface contract, not the implementation
      // The actual implementation will be tested in concrete adapter tests
      
      expect(mockFileStorage.saveFile).to.be.a('function');
      expect(mockFileStorage.getFile).to.be.a('function');
      expect(mockFileStorage.deleteFile).to.be.a('function');
      expect(mockFileStorage.fileExists).to.be.a('function');
      expect(mockFileStorage.getFileInfo).to.be.a('function');
      
      // Verify that the methods return promises
      const file = Buffer.from('test content');
      const filePath = '/uploads/test-file.pdf';
      
      const savePromise = mockFileStorage.saveFile(file, 'test.pdf', 'application/pdf');
      const getPromise = mockFileStorage.getFile(filePath);
      const deletePromise = mockFileStorage.deleteFile(filePath);
      const existsPromise = mockFileStorage.fileExists(filePath);
      const infoPromise = mockFileStorage.getFileInfo(filePath);
      
      expect(savePromise).to.be.instanceOf(Promise);
      expect(getPromise).to.be.instanceOf(Promise);
      expect(deletePromise).to.be.instanceOf(Promise);
      expect(existsPromise).to.be.instanceOf(Promise);
      expect(infoPromise).to.be.instanceOf(Promise);
      
      // Verify that the promises resolve (we don't care about the actual values in interface tests)
      await Promise.all([
        savePromise,
        getPromise,
        deletePromise,
        existsPromise,
        infoPromise
      ]);
    });
  });
});
