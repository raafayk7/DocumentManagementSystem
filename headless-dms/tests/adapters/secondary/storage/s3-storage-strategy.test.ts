import { expect } from 'chai';
import { S3StorageStrategy } from '../../../../src/adapters/secondary/storage/strategies/S3StorageStrategy.js';
import { S3Client } from '@aws-sdk/client-s3';
import { FileInfo } from '../../../../src/shared/storage/StorageTypes.js';

describe('S3StorageStrategy', () => {
  let s3StorageStrategy: S3StorageStrategy;
  let mockS3Client: S3Client;
  const bucketName = 'test-bucket';
  const maxFileSize = 100 * 1024 * 1024; // 100MB
  const allowedMimeTypes = [
    'text/plain', 
    'image/jpeg', 
    'image/png'
  ];

  beforeEach(() => {
    // Create a mock S3Client
    mockS3Client = {
      send: async () => Promise.resolve({}),
      config: {
        region: 'us-east-1',
        endpoint: undefined
      }
    } as any;

    s3StorageStrategy = new S3StorageStrategy(
      mockS3Client,
      bucketName,
      maxFileSize,
      allowedMimeTypes
    );
  });

  describe('constructor', () => {
    it('should create instance with valid parameters', () => {
      const strategy = new S3StorageStrategy(
        mockS3Client,
        'test-bucket',
        50 * 1024 * 1024,
        ['text/plain']
      );
      
      expect(strategy).to.be.instanceOf(S3StorageStrategy);
    });

    it('should create instance with default parameters', () => {
      const strategy = new S3StorageStrategy(
        mockS3Client,
        'test-bucket'
      );
      
      expect(strategy).to.be.instanceOf(S3StorageStrategy);
    });

    it('should create instance with custom allowed MIME types', () => {
      const strategy = new S3StorageStrategy(
        mockS3Client,
        'test-bucket',
        100 * 1024 * 1024,
        ['image/jpeg']
      );
      
      expect(strategy).to.be.instanceOf(S3StorageStrategy);
    });

    it('should throw error for empty bucket name', () => {
      expect(() => new S3StorageStrategy(mockS3Client, '')).to.throw('Bucket name is required');
    });

    it('should throw error for whitespace bucket name', () => {
      expect(() => new S3StorageStrategy(mockS3Client, '   ')).to.throw('Bucket name is required');
    });
  });

  describe('upload', () => {
    it('should validate file input', async () => {
      const invalidFile = {} as FileInfo;
      
      const result = await s3StorageStrategy.upload(invalidFile);
      
      expect(result.isOk()).to.be.false;
    });

    it('should validate file size', async () => {
      const largeFile: FileInfo = {
        name: 'large.txt',
        path: 'large.txt',
        content: Buffer.alloc(maxFileSize + 1),
        mimeType: 'text/plain',
        size: maxFileSize + 1
      };
      
      const result = await s3StorageStrategy.upload(largeFile);
      
      expect(result.isOk()).to.be.false;
    });

    it('should validate MIME type', async () => {
      const invalidMimeFile: FileInfo = {
        name: 'test.exe',
        path: 'test.exe',
        content: Buffer.from('test'),
        mimeType: 'application/exe',
        size: 4
      };
      
      const result = await s3StorageStrategy.upload(invalidMimeFile);
      
      expect(result.isOk()).to.be.false;
    });
  });

  describe('download', () => {
    it('should validate file path', async () => {
      const result = await s3StorageStrategy.download('');
      
      expect(result.isOk()).to.be.false;
    });
  });

  describe('delete', () => {
    it('should validate file path', async () => {
      const result = await s3StorageStrategy.delete('');
      
      expect(result.isOk()).to.be.false;
    });
  });

  describe('exists', () => {
    it('should validate file path', async () => {
      const result = await s3StorageStrategy.exists('');
      
      expect(result.isOk()).to.be.false;
    });
  });

  describe('copyFile', () => {
    it('should validate source and destination paths', async () => {
      const result = await s3StorageStrategy.copyFile('', '');
      
      expect(result.isOk()).to.be.false;
    });
  });

  describe('getFileInfo', () => {
    it('should validate file path', async () => {
      const result = await s3StorageStrategy.getFileInfo('');
      
      expect(result.isOk()).to.be.false;
    });
  });

  describe('moveFile', () => {
    it('should validate source and destination paths', async () => {
      const result = await s3StorageStrategy.moveFile('', '');
      
      expect(result.isOk()).to.be.false;
    });
  });

  describe('createDirectory', () => {
    it('should validate directory path', async () => {
      const result = await s3StorageStrategy.createDirectory('');
      
      expect(result.isOk()).to.be.false;
    });
  });

  describe('performance metrics', () => {
    it('should have getPerformanceMetrics method', () => {
      expect(s3StorageStrategy.getPerformanceMetrics).to.be.a('function');
    });

    it('should have getAllPerformanceMetrics method', () => {
      expect(s3StorageStrategy.getAllPerformanceMetrics).to.be.a('function');
    });

    it('should have clearPerformanceMetrics method', () => {
      expect(s3StorageStrategy.clearPerformanceMetrics).to.be.a('function');
    });

    it('should return empty metrics initially', () => {
      const metrics = s3StorageStrategy.getAllPerformanceMetrics();
      expect(metrics.size).to.equal(0);
    });

    it('should clear performance metrics', () => {
      s3StorageStrategy.clearPerformanceMetrics();
      const metrics = s3StorageStrategy.getAllPerformanceMetrics();
      expect(metrics.size).to.equal(0);
    });
  });

  describe('generateDownloadUrl', () => {
    it('should validate file path', async () => {
      const result = await s3StorageStrategy.generateDownloadUrl('');
      
      expect(result.isOk()).to.be.false;
    });
  });

  describe('error handling', () => {
    it('should handle validation errors gracefully', async () => {
      const invalidFile = {} as FileInfo;
      
      const result = await s3StorageStrategy.upload(invalidFile);
      
      expect(result.isOk()).to.be.false;
      expect(result.unwrapErr()).to.be.instanceOf(Error);
    });
  });
});
