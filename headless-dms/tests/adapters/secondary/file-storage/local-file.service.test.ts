import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { LocalFileService } from '../../../../src/adapters/secondary/file-storage/local-file.service.js';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { AppResultTestUtils } from '../../../shared/test-helpers.js';
import fs from 'fs';
import path from 'path';

describe('LocalFileService Adapter', () => {
  let fileService: LocalFileService;
  let mockLogger: any;
  let mockFs: any;
  let mockPath: any;

  beforeEach(() => {
    // Create mock child logger that will be returned by parent.child()
    const mockChildLogger = {
      info: sinon.stub(),
      warn: sinon.stub(),
      debug: sinon.stub(),
      error: sinon.stub(),
      logError: sinon.stub(),
    };

    // Create mock logger
    mockLogger = {
      info: sinon.stub(),
      warn: sinon.stub(),
      debug: sinon.stub(),
      error: sinon.stub(),
      logError: sinon.stub(),
      child: sinon.stub().returns(mockChildLogger),
    };

    // Store reference to child logger for test assertions
    (mockLogger as any).childLogger = mockChildLogger;

    // Create mock fs
    mockFs = {
      promises: {
        mkdir: sinon.stub().resolves(),
        writeFile: sinon.stub().resolves(),
        stat: sinon.stub().resolves({ size: 1024 }),
        unlink: sinon.stub().resolves(),
      },
      createWriteStream: sinon.stub(),
      createReadStream: sinon.stub(),
      existsSync: sinon.stub().returns(true),
      statSync: sinon.stub().returns({ size: 1024 }),
      unlinkSync: sinon.stub(),
    };

    // Create mock path
    mockPath = {
      join: sinon.stub(),
      extname: sinon.stub(),
    };

    // Create LocalFileService instance with mocked dependencies
    fileService = new LocalFileService(mockLogger);
    
    // Mock fs and path modules
    sinon.stub(fs, 'promises').value(mockFs.promises);
    sinon.stub(fs, 'createWriteStream').value(mockFs.createWriteStream);
    sinon.stub(fs, 'createReadStream').value(mockFs.createReadStream);
    sinon.stub(fs, 'existsSync').value(mockFs.existsSync);
    sinon.stub(fs, 'statSync').value(mockFs.statSync);
    sinon.stub(fs, 'unlinkSync').value(mockFs.unlinkSync);
    sinon.stub(path, 'join').value(mockPath.join);
    sinon.stub(path, 'extname').value(mockPath.extname);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Constructor', () => {
    it('should create LocalFileService instance', () => {
      expect(fileService).to.be.instanceOf(LocalFileService);
    });

    it('should set up child logger with service context', () => {
      expect(mockLogger.child.callCount).to.equal(1);
      expect(mockLogger.child.firstCall.args[0]).to.deep.equal({ service: 'LocalFileService' });
    });

    it('should set default upload directory', () => {
      expect((fileService as any).uploadDir).to.equal('uploads');
    });
  });

  describe('saveFile()', () => {
    it('should save file successfully', async () => {
      const fileBuffer = Buffer.from('test file content');
      const fileName = 'test.txt';
      const mimeType = 'text/plain';
      const uniqueName = '1234567890-uuid-123.txt';
      const uploadPath = 'uploads/1234567890-uuid-123.txt';

      mockPath.extname.returns('.txt');
      mockPath.join.returns(uploadPath);

      const result = await fileService.saveFile(fileBuffer, fileName, mimeType);

      expect(result.isOk()).to.be.true;
      if (result.isOk()) {
        const fileInfo = result.unwrap();
        expect(fileInfo.path).to.equal(uploadPath);
        expect(fileInfo.name).to.equal(fileName);
        expect(fileInfo.mimeType).to.equal(mimeType);
        expect(fileInfo.size).to.equal('17'); // Buffer length for 'test file content'
        expect(fileInfo.fields).to.deep.equal({});
      }

      expect(mockFs.promises.mkdir.callCount).to.equal(1);
      expect(mockFs.promises.mkdir.firstCall.args[0]).to.equal('uploads');
      expect(mockFs.promises.mkdir.firstCall.args[1]).to.deep.equal({ recursive: true });
      expect(mockFs.promises.writeFile.callCount).to.equal(1);
      expect(mockFs.promises.writeFile.firstCall.args[0]).to.equal(uploadPath);
      expect(mockFs.promises.writeFile.firstCall.args[1]).to.equal(fileBuffer);
      expect(mockLogger.childLogger.info.callCount).to.equal(2); // Starting + success
      expect(mockLogger.childLogger.info.firstCall.args[0]).to.equal('Starting direct file upload');
      expect(mockLogger.childLogger.info.secondCall.args[0]).to.equal('File saved successfully via direct upload');
      expect(mockLogger.childLogger.info.secondCall.args[1]).to.deep.equal({
        fileName: 'test.txt',
        fileSize: '17',
        uploadPath: 'uploads/1234567890-uuid-123.txt',
      });
    });

    it('should create upload directory if it does not exist', async () => {
      const fileBuffer = Buffer.from('test content');
      const fileName = 'test.txt';
      const mimeType = 'text/plain';

      mockPath.extname.returns('.txt');
      mockPath.join.returns('uploads/test.txt');

      await fileService.saveFile(fileBuffer, fileName, mimeType);

      expect(mockFs.promises.mkdir.callCount).to.equal(1);
      expect(mockFs.promises.mkdir.firstCall.args[0]).to.equal('uploads');
      expect(mockFs.promises.mkdir.firstCall.args[1]).to.deep.equal({ recursive: true });
      expect(mockLogger.childLogger.info.callCount).to.equal(2); // Starting + success
    });

    it('should generate unique filename with timestamp and UUID', async () => {
      const fileBuffer = Buffer.from('test content');
      const fileName = 'test.txt';
      const mimeType = 'text/plain';

      mockPath.extname.returns('.txt');
      mockPath.join.returns('uploads/1234567890-uuid-123.txt');

      await fileService.saveFile(fileBuffer, fileName, mimeType);

      expect(mockPath.join.callCount).to.equal(1);
      expect(mockPath.join.firstCall.args[0]).to.equal('uploads');
      expect(mockPath.join.firstCall.args[1]).to.match(/^\d+-[a-f0-9-]+\.txt$/);
      expect(mockLogger.childLogger.info.callCount).to.equal(2); // Starting + success
    });

    it('should handle file write errors gracefully', async () => {
      const fileBuffer = Buffer.from('test content');
      const fileName = 'test.txt';
      const mimeType = 'text/plain';
      const writeError = new Error('Disk full');

      mockPath.extname.returns('.txt');
      mockPath.join.returns('uploads/test.txt');
      mockFs.promises.writeFile.rejects(writeError);

      const result = await fileService.saveFile(fileBuffer, fileName, mimeType);

      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        const error = result.unwrapErr();
        expect(error).to.be.instanceOf(AppError);
        expect(error.message).to.equal('Disk full');
      }

      expect(mockLogger.childLogger.logError.callCount).to.equal(1);
      expect(mockLogger.childLogger.logError.firstCall.args[0]).to.be.instanceOf(Error);
      expect(mockLogger.childLogger.logError.firstCall.args[1]).to.deep.equal({ uploadDir: 'uploads', name: 'test.txt' });
    });

    it('should handle directory creation errors gracefully', async () => {
      const fileBuffer = Buffer.from('test content');
      const fileName = 'test.txt';
      const mimeType = 'text/plain';
      const mkdirError = new Error('Permission denied');

      mockPath.extname.returns('.txt');
      mockFs.promises.mkdir.rejects(mkdirError);

      const result = await fileService.saveFile(fileBuffer, fileName, mimeType);

      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        const error = result.unwrapErr();
        expect(error).to.be.instanceOf(AppError);
        expect(error.message).to.equal('Permission denied');
      }
    });

    it('should log file upload start', async () => {
      const fileBuffer = Buffer.from('test content');
      const fileName = 'test.txt';
      const mimeType = 'text/plain';

      mockPath.extname.returns('.txt');
      mockPath.join.returns('uploads/test.txt');

      await fileService.saveFile(fileBuffer, fileName, mimeType);

      expect(mockLogger.childLogger.info.callCount).to.equal(2); // Starting + success
      expect(mockLogger.childLogger.info.firstCall.args[0]).to.equal('Starting direct file upload');
      expect(mockLogger.childLogger.info.firstCall.args[1]).to.deep.equal({
        name: 'test.txt',
        mimeType: 'text/plain',
        size: 12, // 'test content' is 12 characters
      });
    });
  });

  describe('saveFileFromRequest()', () => {
    it('should save file from FastifyRequest successfully', async () => {
      const mockRequest = {
        parts: sinon.stub().returns([
          {
            type: 'file',
            filename: 'test.pdf',
            mimetype: 'application/pdf',
            file: {
              pipe: sinon.stub().returns({
                on: sinon.stub().yields(),
              }),
            },
          },
        ]),
      };

      const uniqueName = '1234567890-uuid-123.pdf';
      const uploadPath = 'uploads/1234567890-uuid-123.pdf';

      mockPath.extname.returns('.pdf');
      mockPath.join.returns(uploadPath);

      const mockWriteStream = {
        on: sinon.stub().yields(),
      };
      mockFs.createWriteStream.returns(mockWriteStream);

      const result = await fileService.saveFileFromRequest(mockRequest as any);

      expect(result.isOk()).to.be.true;
      if (result.isOk()) {
        const fileInfo = result.unwrap();
        expect(fileInfo.path).to.equal(uploadPath);
        expect(fileInfo.name).to.equal('test.pdf');
        expect(fileInfo.mimeType).to.equal('application/pdf');
        expect(fileInfo.size).to.equal('1024');
      }

      expect(mockFs.promises.mkdir.callCount).to.equal(1);
      expect(mockFs.promises.mkdir.firstCall.args[0]).to.equal('uploads');
      expect(mockFs.promises.mkdir.firstCall.args[1]).to.deep.equal({ recursive: true });
      expect(mockFs.createWriteStream.callCount).to.equal(1);
      expect(mockFs.createWriteStream.firstCall.args[0]).to.equal(uploadPath);
      expect(mockLogger.childLogger.info.callCount).to.equal(2); // Starting + success
      expect(mockLogger.childLogger.info.firstCall.args[0]).to.equal('Starting file upload from request');
      expect(mockLogger.childLogger.info.secondCall.args[0]).to.equal('File saved successfully from request');
      expect(mockLogger.childLogger.info.secondCall.args[1]).to.deep.equal({
        fileName: 'test.pdf',
        fileSize: '1024',
        uploadPath: 'uploads/1234567890-uuid-123.pdf',
      });
    });

    it('should handle form fields in request', async () => {
      const mockRequest = {
        parts: sinon.stub().returns([
          {
            type: 'file',
            filename: 'test.pdf',
            mimetype: 'application/pdf',
            file: {
              pipe: sinon.stub().returns({
                on: sinon.stub().yields(),
              }),
            },
          },
          {
            type: 'field',
            fieldname: 'description',
            value: 'Test document',
          },
          {
            type: 'field',
            fieldname: 'tags',
            value: 'important,urgent',
          },
        ]),
      };

      mockPath.extname.returns('.pdf');
      mockPath.join.returns('uploads/test.pdf');

      const mockWriteStream = {
        on: sinon.stub().yields(),
      };
      mockFs.createWriteStream.returns(mockWriteStream);

      const result = await fileService.saveFileFromRequest(mockRequest as any);

      expect(result.isOk()).to.be.true;
      if (result.isOk()) {
        const fileInfo = result.unwrap();
        expect(fileInfo.fields).to.deep.equal({
          description: 'Test document',
          tags: 'important,urgent',
        });
      }
      
      expect(mockLogger.childLogger.info.callCount).to.equal(2); // Starting + success
    });

    it('should return error when no file in request', async () => {
      const mockRequest = {
        parts: sinon.stub().returns([
          {
            type: 'field',
            fieldname: 'description',
            value: 'No file here',
          },
        ]),
      };

      const result = await fileService.saveFileFromRequest(mockRequest as any);

      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        const error = result.unwrapErr();
        expect(error).to.be.instanceOf(AppError);
        expect(error.message).to.equal('No file found in request');
      }

      expect(mockLogger.childLogger.info.callCount).to.equal(1); // Starting only
      expect(mockLogger.childLogger.error.callCount).to.equal(1);
      expect(mockLogger.childLogger.error.firstCall.args[0]).to.equal('No file found in request');
    });

    it('should handle request parsing errors gracefully', async () => {
      const mockRequest = {
        parts: sinon.stub().rejects(new Error('parts is not async iterable')),
      };

      const result = await fileService.saveFileFromRequest(mockRequest as any);

      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        const error = result.unwrapErr();
        expect(error).to.be.instanceOf(AppError);
        expect(error.message).to.equal('parts is not async iterable');
      }
      
      expect(mockLogger.childLogger.info.callCount).to.equal(1); // Starting only
    });
  });

  describe('deleteFile()', () => {
    it('should delete file successfully', async () => {
      const filePath = 'uploads/test.txt';

      const result = await fileService.deleteFile(filePath);

      expect(result.isOk()).to.be.true;
      if (result.isOk()) {
        const deleteResult = result.unwrap();
        expect(deleteResult).to.be.true; // Returns boolean directly
      }

      expect(mockFs.existsSync.callCount).to.equal(1);
      expect(mockFs.existsSync.firstCall.args[0]).to.equal(filePath);
      expect(mockFs.unlinkSync.callCount).to.equal(1);
      expect(mockFs.unlinkSync.firstCall.args[0]).to.equal(filePath);
      expect(mockLogger.childLogger.info.callCount).to.equal(2); // Attempt + success
      expect(mockLogger.childLogger.info.firstCall.args[0]).to.equal('Attempting to delete file');
      expect(mockLogger.childLogger.info.secondCall.args[0]).to.equal('File deleted successfully');
      expect(mockLogger.childLogger.info.secondCall.args[1]).to.deep.equal({
        filePath: 'uploads/test.txt',
      });
    });

    it('should handle file deletion errors gracefully', async () => {
      const filePath = 'uploads/nonexistent.txt';
      const deleteError = new Error('ENOENT: no such file or directory, unlink');

      mockFs.existsSync.returns(true); // File exists initially
      mockFs.unlinkSync.throws(deleteError); // But unlink fails

      const result = await fileService.deleteFile(filePath);

      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        const error = result.unwrapErr();
        expect(error).to.be.instanceOf(AppError);
        expect(error.message).to.equal('ENOENT: no such file or directory, unlink');
      }

      expect(mockLogger.childLogger.info.callCount).to.equal(1); // Attempt only
      expect(mockLogger.childLogger.logError.callCount).to.equal(1);
      expect(mockLogger.childLogger.logError.firstCall.args[0]).to.be.instanceOf(Error);
      expect(mockLogger.childLogger.logError.firstCall.args[1]).to.deep.equal({ filePath: 'uploads/nonexistent.txt' });
    });
  });

  describe('getFileInfo()', () => {
    it('should get file info successfully', async () => {
      const filePath = 'uploads/test.txt';
      const mockStats = {
        size: 1024,
        birthtime: new Date('2024-01-01'),
        mtime: new Date('2024-01-02'),
      };

      mockFs.statSync.returns(mockStats);

      const result = await fileService.getFileInfo(filePath);

      expect(result.isOk()).to.be.true;
      if (result.isOk()) {
        const fileInfo = result.unwrap();
        expect(fileInfo.path).to.equal(filePath);
        expect(fileInfo.size).to.equal('1024');
        expect(fileInfo.name).to.equal('test.txt');
        expect(fileInfo.mimeType).to.equal('application/octet-stream');
        expect(fileInfo.fields).to.deep.equal({});
      }

      expect(mockFs.existsSync.callCount).to.equal(1);
      expect(mockFs.existsSync.firstCall.args[0]).to.equal(filePath);
      expect(mockFs.statSync.callCount).to.equal(1);
      expect(mockFs.statSync.firstCall.args[0]).to.equal(filePath);
    });

    it('should handle file info retrieval errors gracefully', async () => {
      const filePath = 'uploads/nonexistent.txt';

      mockFs.existsSync.returns(false); // File doesn't exist

      const result = await fileService.getFileInfo(filePath);

      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        const error = result.unwrapErr();
        expect(error).to.be.instanceOf(Error); // getFileInfo returns Error, not AppError
        expect(error.message).to.equal('File not found');
      }
      
      expect(mockLogger.childLogger.info.callCount).to.equal(1); // Starting only
      expect(mockLogger.childLogger.error.callCount).to.equal(1); // Error log
    });
  });

  describe('fileExists()', () => {
    it('should return true when file exists', async () => {
      const filePath = 'uploads/test.txt';

      const result = await fileService.fileExists(filePath);

      expect(result.isOk()).to.be.true;
      if (result.isOk()) {
        const exists = result.unwrap();
        expect(exists).to.be.true;
      }

      expect(mockFs.existsSync.callCount).to.equal(1);
      expect(mockFs.existsSync.firstCall.args[0]).to.equal(filePath);
      expect(mockLogger.childLogger.debug.callCount).to.equal(1); // Debug log for existence check
    });

    it('should return false when file does not exist', async () => {
      const filePath = 'uploads/nonexistent.txt';

      mockFs.existsSync.returns(false);

      const result = await fileService.fileExists(filePath);

      expect(result.isOk()).to.be.true;
      if (result.isOk()) {
        const exists = result.unwrap();
        expect(exists).to.be.false;
      }
      
      expect(mockLogger.childLogger.debug.callCount).to.equal(1); // Debug log for existence check
    });
  });

  describe('Hexapp Integration', () => {
    it('should return AppResult types', async () => {
      const fileBuffer = Buffer.from('test content');
      const fileName = 'test.txt';
      const mimeType = 'text/plain';

      mockPath.extname.returns('.txt');
      mockPath.join.returns('uploads/test.txt');

      const result = await fileService.saveFile(fileBuffer, fileName, mimeType);
      
      // Should return AppResult<T> from hexapp
      expect(result).to.have.property('isOk');
      expect(result).to.have.property('isErr');
      expect(result).to.have.property('unwrap');
      expect(result).to.have.property('unwrapErr');
    });

    it('should use AppError for error handling', async () => {
      const fileBuffer = Buffer.from('test content');
      const fileName = 'test.txt';
      const mimeType = 'text/plain';

      mockPath.extname.returns('.txt');
      mockPath.join.returns('uploads/test.txt');
      mockFs.promises.writeFile.rejects(new Error('Write failed'));

      const result = await fileService.saveFile(fileBuffer, fileName, mimeType);

      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        const error = result.unwrapErr();
        expect(error).to.be.instanceOf(AppError);
      }
      
      expect(mockLogger.childLogger.info.callCount).to.equal(1); // Starting only
    });

    it('should use hexapp UUID for unique filename generation', async () => {
      const fileBuffer = Buffer.from('test content');
      const fileName = 'test.txt';
      const mimeType = 'text/plain';

      mockPath.extname.returns('.txt');
      mockPath.join.returns('uploads/test.txt');

      await fileService.saveFile(fileBuffer, fileName, mimeType);

      // Verify that UUID.init() is used for filename generation
      expect(mockPath.join.firstCall.args[1]).to.match(/^\d+-[a-f0-9-]+\.txt$/);
      expect(mockLogger.childLogger.info.callCount).to.equal(2); // Starting + success
    });
  });
});
