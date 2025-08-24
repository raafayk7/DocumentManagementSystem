import { expect } from 'chai';
import { AzureStorageStrategy, AzureStorageConfig } from '../../../../src/adapters/secondary/storage/strategies/AzureStorageStrategy.js';
import { FileInfo } from '../../../../src/shared/storage/StorageTypes.js';

describe('AzureStorageStrategy', () => {
  let azureStorageStrategy: AzureStorageStrategy;
  
  const config: AzureStorageConfig = {
    containerName: 'test-container',
    useEmulator: true,
    emulatorEndpoint: 'http://127.0.0.1:10000',
    accountName: 'devstoreaccount1',
    accountKey: 'Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==',
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedMimeTypes: ['text/plain', 'image/jpeg', 'image/png']
  };

  beforeEach(() => {
    // Create strategy instance
    azureStorageStrategy = new AzureStorageStrategy(config);
  });

  describe('constructor', () => {
    it('should create instance with valid configuration', () => {
      const strategy = new AzureStorageStrategy(config);
      expect(strategy).to.be.instanceOf(AzureStorageStrategy);
    });

    it('should create instance with emulator configuration', () => {
      const emulatorConfig: AzureStorageConfig = {
        containerName: 'test-container',
        useEmulator: true
      };
      
      const strategy = new AzureStorageStrategy(emulatorConfig);
      expect(strategy).to.be.instanceOf(AzureStorageStrategy);
    });

    it('should throw error for empty container name', () => {
      const invalidConfig = { ...config, containerName: '' };
      expect(() => new AzureStorageStrategy(invalidConfig)).to.throw('Container name is required');
    });

    it('should throw error for whitespace container name', () => {
      const invalidConfig = { ...config, containerName: '   ' };
      expect(() => new AzureStorageStrategy(invalidConfig)).to.throw('Container name is required');
    });
  });

  describe('upload', () => {
    it('should validate file input', async () => {
      const invalidFile = {} as FileInfo;
      
      const result = await azureStorageStrategy.upload(invalidFile);
      
      expect(result.isOk()).to.be.false;
    });

    it('should validate file size', async () => {
      const largeFile: FileInfo = {
        name: 'large.txt',
        path: 'large.txt',
        content: Buffer.alloc(config.maxFileSize! + 1),
        mimeType: 'text/plain',
        size: config.maxFileSize! + 1
      };
      
      const result = await azureStorageStrategy.upload(largeFile);
      
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
      
      const result = await azureStorageStrategy.upload(invalidMimeFile);
      
      expect(result.isOk()).to.be.false;
    });
  });

  describe('download', () => {
    it('should validate file path', async () => {
      const result = await azureStorageStrategy.download('');
      
      expect(result.isOk()).to.be.false;
    });
  });

  describe('delete', () => {
    it('should validate file path', async () => {
      const result = await azureStorageStrategy.delete('');
      
      expect(result.isOk()).to.be.false;
    });
  });

  describe('exists', () => {
    it('should validate file path', async () => {
      const result = await azureStorageStrategy.exists('');
      
      expect(result.isOk()).to.be.false;
    });
  });

  describe('copyFile', () => {
    it('should validate source and destination paths', async () => {
      const result = await azureStorageStrategy.copyFile('', '');
      
      expect(result.isOk()).to.be.false;
    });
  });

  describe('getFileInfo', () => {
    it('should validate file path', async () => {
      const result = await azureStorageStrategy.getFileInfo('');
      
      expect(result.isOk()).to.be.false;
    });
  });

  describe('moveFile', () => {
    it('should validate file path', async () => {
      const result = await azureStorageStrategy.moveFile('', '');
      
      expect(result.isOk()).to.be.false;
    });
  });

  describe('createDirectory', () => {
    it('should validate directory path', async () => {
      const result = await azureStorageStrategy.createDirectory('');
      
      expect(result.isOk()).to.be.false;
    });
  });

  describe('performance metrics', () => {
    it('should have getPerformanceMetrics method', () => {
      expect(azureStorageStrategy.getPerformanceMetrics).to.be.a('function');
    });

    it('should have getAllPerformanceMetrics method', () => {
      expect(azureStorageStrategy.getAllPerformanceMetrics).to.be.a('function');
    });

    it('should have clearPerformanceMetrics method', () => {
      expect(azureStorageStrategy.clearPerformanceMetrics).to.be.a('function');
    });

    it('should return empty metrics initially', () => {
      const metrics = azureStorageStrategy.getAllPerformanceMetrics();
      expect(metrics.size).to.equal(0);
    });

    it('should clear performance metrics', () => {
      azureStorageStrategy.clearPerformanceMetrics();
      const metrics = azureStorageStrategy.getAllPerformanceMetrics();
      expect(metrics.size).to.equal(0);
    });
  });

  describe('error handling', () => {
    it('should handle validation errors gracefully', async () => {
      const invalidFile = {} as FileInfo;
      
      const result = await azureStorageStrategy.upload(invalidFile);
      
      expect(result.isOk()).to.be.false;
      expect(result.unwrapErr()).to.be.instanceOf(Error);
    });
  });

  describe('Azure-specific functionality', () => {
    it('should support emulator configuration', () => {
      const emulatorConfig: AzureStorageConfig = {
        containerName: 'test-container',
        useEmulator: true,
        emulatorEndpoint: 'http://localhost:10000'
      };
      
      const strategy = new AzureStorageStrategy(emulatorConfig);
      expect(strategy).to.be.instanceOf(AzureStorageStrategy);
    });
  });
});
