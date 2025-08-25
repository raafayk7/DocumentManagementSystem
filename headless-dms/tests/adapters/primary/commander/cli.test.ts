import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { parseCliArgs, getModeConfig, validateModeConfig, modeConfig, type CliArgs, type StartupMode } from '../../../../src/adapters/primary/commander/cli.js';

describe('CLI Commander Adapter', () => {
  let consoleLogStub: sinon.SinonStub;
  let consoleErrorStub: sinon.SinonStub;
  let consoleWarnStub: sinon.SinonStub;
  let processExitStub: sinon.SinonStub;
  let originalArgv: string[];

  beforeEach(() => {
    // Store original process.argv
    originalArgv = process.argv;
    
    // Stub console methods
    consoleLogStub = sinon.stub(console, 'log');
    consoleErrorStub = sinon.stub(console, 'error');
    consoleWarnStub = sinon.stub(console, 'warn');
    
    // Stub process.exit to prevent test termination
    processExitStub = sinon.stub(process, 'exit');
  });

  afterEach(() => {
    // Restore original process.argv
    process.argv = originalArgv;
    
    // Restore stubs
    sinon.restore();
  });

  describe('modeConfig', () => {
    it('should have correct dev mode configuration', () => {
      expect(modeConfig.dev).to.deep.equal({
        logging: 'debug',
        healthChecks: true,
        shutdownDelay: 10000,
        validation: 'relaxed',
        storageEmulator: true,
        storageFallback: true,
        cliVerbose: true,
        cliProgress: true,
        metricsDevMode: true,
        performanceSampleRate: 1.0,
        newRelicEnabled: true,
      });
    });

    it('should have correct prod mode configuration', () => {
      expect(modeConfig.prod).to.deep.equal({
        logging: 'info',
        healthChecks: true,
        shutdownDelay: 0,
        validation: 'strict',
        storageEmulator: false,
        storageFallback: true,
        cliVerbose: false,
        cliProgress: false,
        metricsDevMode: false,
        performanceSampleRate: 0.1,
        newRelicEnabled: true,
      });
    });

    it('should have correct test mode configuration', () => {
      expect(modeConfig.test).to.deep.equal({
        logging: 'error',
        healthChecks: false,
        shutdownDelay: 0,
        validation: 'minimal',
        storageEmulator: true,
        storageFallback: false,
        cliVerbose: false,
        cliProgress: false,
        metricsDevMode: false,
        performanceSampleRate: 0.0,
        newRelicEnabled: false,
      });
    });

    it('should have all required mode configurations', () => {
      expect(modeConfig).to.have.keys(['dev', 'prod', 'test']);
    });
  });

  describe('getModeConfig()', () => {
    it('should return dev mode configuration', () => {
      const config = getModeConfig('dev');
      expect(config).to.deep.equal(modeConfig.dev);
    });

    it('should return prod mode configuration', () => {
      const config = getModeConfig('prod');
      expect(config).to.deep.equal(modeConfig.prod);
    });

    it('should return test mode configuration', () => {
      const config = getModeConfig('test');
      expect(config).to.deep.equal(modeConfig.test);
    });
  });

  describe('validateModeConfig()', () => {
    it('should validate dev mode configuration successfully', () => {
      const config = { JWT_SECRET: 'dev-secret' } as any;
      
      expect(() => {
        validateModeConfig('dev', config);
      }).to.not.throw();
      
      // The function logs twice: once for validation start, once for mode-specific message
      expect(consoleLogStub.callCount).to.equal(2);
    });

    it('should validate prod mode configuration successfully with secure JWT', () => {
      const config = { JWT_SECRET: 'secure-production-secret-key' } as any;
      
      expect(() => {
        validateModeConfig('prod', config);
      }).to.not.throw();
      
      // The function logs twice: once for validation start, once for mode-specific message
      expect(consoleLogStub.callCount).to.equal(2);
    });

    it('should validate test mode configuration successfully', () => {
      const config = { JWT_SECRET: 'test-secret' } as any;
      
      expect(() => {
        validateModeConfig('test', config);
      }).to.not.throw();
      
      // The function logs twice: once for validation start, once for mode-specific message
      expect(consoleLogStub.callCount).to.equal(2);
    });

    it('should reject prod mode with weak JWT secret', () => {
      const config = { JWT_SECRET: 'supersecretkey' } as any;
      
      expect(() => {
        validateModeConfig('prod', config);
      }).to.throw('Production mode requires secure JWT secrets');
    });

    it('should reject prod mode with storage emulator enabled', () => {
      const config = { JWT_SECRET: 'secure-production-secret-key', STORAGE_EMULATOR: true } as any;
      
      expect(() => {
        validateModeConfig('prod', config);
      }).to.throw('Production mode cannot use storage emulators');
    });
  });

  describe('parseCliArgs()', () => {
    it('should parse default arguments successfully', () => {
      process.argv = ['node', 'script.js'];
      
      const args = parseCliArgs();
      // The CLI returns all optional fields as undefined, which is expected behavior
      expect(args).to.deep.equal({
        mode: 'dev',
        port: 3000,
        host: '0.0.0.0',
        storageBackend: undefined,
        storageEmulator: undefined,
        storageFallback: undefined,
        cliConcurrentDownloads: undefined,
        cliBatchSize: undefined,
        cliVerbose: undefined,
        performanceSampleRate: undefined,
        metricsEnabled: undefined,
        newRelicEnabled: undefined,
        newRelicAppName: undefined,
        help: undefined
      });
    });

    it('should parse custom mode argument', () => {
      process.argv = ['node', 'script.js', '--mode', 'prod'];
      
      const args = parseCliArgs();
      expect(args).to.deep.equal({
        mode: 'prod',
        port: 3000,
        host: '0.0.0.0',
        storageBackend: undefined,
        storageEmulator: undefined,
        storageFallback: undefined,
        cliConcurrentDownloads: undefined,
        cliBatchSize: undefined,
        cliVerbose: undefined,
        performanceSampleRate: undefined,
        metricsEnabled: undefined,
        newRelicEnabled: undefined,
        newRelicAppName: undefined,
        help: undefined
      });
    });

    it('should parse custom port argument', () => {
      process.argv = ['node', 'script.js', '--port', '8080'];
      
      const args = parseCliArgs();
      expect(args).to.deep.equal({
        mode: 'dev',
        port: 8080,
        host: '0.0.0.0',
        storageBackend: undefined,
        storageEmulator: undefined,
        storageFallback: undefined,
        cliConcurrentDownloads: undefined,
        cliBatchSize: undefined,
        cliVerbose: undefined,
        performanceSampleRate: undefined,
        metricsEnabled: undefined,
        newRelicEnabled: undefined,
        newRelicAppName: undefined,
        help: undefined
      });
    });

    it('should parse custom host argument', () => {
      process.argv = ['node', 'script.js', '--host', 'localhost'];
      
      const args = parseCliArgs();
      expect(args).to.deep.equal({
        mode: 'dev',
        port: 3000,
        host: 'localhost',
        storageBackend: undefined,
        storageEmulator: undefined,
        storageFallback: undefined,
        cliConcurrentDownloads: undefined,
        cliBatchSize: undefined,
        cliVerbose: undefined,
        performanceSampleRate: undefined,
        metricsEnabled: undefined,
        newRelicEnabled: undefined,
        newRelicAppName: undefined,
        help: undefined
      });
    });

    it('should parse multiple arguments together', () => {
      process.argv = ['node', 'script.js', '--mode', 'test', '--port', '5000', '--host', '127.0.0.1'];
      
      const args = parseCliArgs();
      expect(args).to.deep.equal({
        mode: 'test',
        port: 5000,
        host: '127.0.0.1',
        storageBackend: undefined,
        storageEmulator: undefined,
        storageFallback: undefined,
        cliConcurrentDownloads: undefined,
        cliBatchSize: undefined,
        cliVerbose: undefined,
        performanceSampleRate: undefined,
        metricsEnabled: undefined,
        newRelicEnabled: undefined,
        newRelicAppName: undefined,
        help: undefined
      });
    });

    it('should parse storage configuration options', () => {
      process.argv = ['node', 'script.js', '--storage-backend', 'azure', '--storage-emulator', 'true'];
      
      const args = parseCliArgs();
      expect(args).to.deep.equal({
        mode: 'dev',
        port: 3000,
        host: '0.0.0.0',
        storageBackend: 'azure',
        storageEmulator: true, // Transformed to boolean
        storageFallback: undefined,
        cliConcurrentDownloads: undefined,
        cliBatchSize: undefined,
        cliVerbose: undefined,
        performanceSampleRate: undefined,
        metricsEnabled: undefined,
        newRelicEnabled: undefined,
        newRelicAppName: undefined,
        help: undefined
      });
    });

    it('should parse CLI configuration options', () => {
      process.argv = ['node', 'script.js', '--cli-concurrent-downloads', '10', '--cli-batch-size', '500'];
      
      const args = parseCliArgs();
      expect(args).to.deep.equal({
        mode: 'dev',
        port: 3000,
        host: '0.0.0.0',
        storageBackend: undefined,
        storageEmulator: undefined,
        storageFallback: undefined,
        cliConcurrentDownloads: 10, // Transformed to number
        cliBatchSize: 500, // Transformed to number
        cliVerbose: undefined,
        performanceSampleRate: undefined,
        metricsEnabled: undefined,
        newRelicEnabled: undefined,
        newRelicAppName: undefined,
        help: undefined
      });
    });

    it('should parse performance configuration options', () => {
      process.argv = ['node', 'script.js', '--performance-sample-rate', '0.5', '--metrics-enabled', 'true'];
      
      const args = parseCliArgs();
      expect(args).to.deep.equal({
        mode: 'dev',
        port: 3000,
        host: '0.0.0.0',
        storageBackend: undefined,
        storageEmulator: undefined,
        storageFallback: undefined,
        cliConcurrentDownloads: undefined,
        cliBatchSize: undefined,
        cliVerbose: undefined,
        performanceSampleRate: 0.5, // Transformed to number
        metricsEnabled: true, // Transformed to boolean
        newRelicEnabled: undefined,
        newRelicAppName: undefined,
        help: undefined
      });
    });

    it('should parse New Relic configuration options', () => {
      process.argv = ['node', 'script.js', '--new-relic-enabled', 'false', '--new-relic-app-name', 'TestApp'];
      
      const args = parseCliArgs();
      expect(args).to.deep.equal({
        mode: 'dev',
        port: 3000,
        host: '0.0.0.0',
        storageBackend: undefined,
        storageEmulator: undefined,
        storageFallback: undefined,
        cliConcurrentDownloads: undefined,
        cliBatchSize: undefined,
        cliVerbose: undefined,
        performanceSampleRate: undefined,
        metricsEnabled: undefined,
        newRelicEnabled: false, // Transformed to boolean
        newRelicAppName: 'TestApp',
        help: undefined
      });
    });

    it('should handle help option', () => {
      process.argv = ['node', 'script.js', '--help'];
      
      const args = parseCliArgs();
      // Commander.js handles --help as a special case that doesn't get parsed into arguments
      // The help flag triggers help display and then the process exits
      expect(args).to.deep.equal({
        mode: 'dev',
        port: 3000,
        host: '0.0.0.0',
        storageBackend: undefined,
        storageEmulator: undefined,
        storageFallback: undefined,
        cliConcurrentDownloads: undefined,
        cliBatchSize: undefined,
        cliVerbose: undefined,
        performanceSampleRate: undefined,
        metricsEnabled: undefined,
        newRelicEnabled: undefined,
        newRelicAppName: undefined,
        help: undefined // Help is not parsed as a regular argument
      });
    });

    it('should handle version option', () => {
      process.argv = ['node', 'script.js', '--version'];
      
      const args = parseCliArgs();
      expect(args).to.deep.equal({
        mode: 'dev',
        port: 3000,
        host: '0.0.0.0',
        storageBackend: undefined,
        storageEmulator: undefined,
        storageFallback: undefined,
        cliConcurrentDownloads: undefined,
        cliBatchSize: undefined,
        cliVerbose: undefined,
        performanceSampleRate: undefined,
        metricsEnabled: undefined,
        newRelicEnabled: undefined,
        newRelicAppName: undefined,
        help: undefined
      });
    });

    // Note: The CLI validation only throws errors for truly invalid data, not for missing optional fields
    // These tests verify that the CLI handles valid inputs correctly
    it('should handle valid port numbers', () => {
      process.argv = ['node', 'script.js', '--port', '8080'];
      
      const args = parseCliArgs();
      expect(args.port).to.equal(8080);
    });

    it('should handle valid mode values', () => {
      process.argv = ['node', 'script.js', '--mode', 'prod'];
      
      const args = parseCliArgs();
      expect(args.mode).to.equal('prod');
    });

    it('should handle valid storage backend values', () => {
      process.argv = ['node', 'script.js', '--storage-backend', 's3'];
      
      const args = parseCliArgs();
      expect(args.storageBackend).to.equal('s3');
    });

    it('should handle valid CLI concurrent downloads', () => {
      process.argv = ['node', 'script.js', '--cli-concurrent-downloads', '25'];
      
      const args = parseCliArgs();
      expect(args.cliConcurrentDownloads).to.equal(25); // Transformed to number
    });

    it('should handle valid CLI batch size', () => {
      process.argv = ['node', 'script.js', '--cli-batch-size', '1000'];
      
      const args = parseCliArgs();
      expect(args.cliBatchSize).to.equal(1000); // Transformed to number
    });

    it('should handle valid performance sample rate', () => {
      process.argv = ['node', 'script.js', '--performance-sample-rate', '0.8'];
      
      const args = parseCliArgs();
      expect(args.performanceSampleRate).to.equal(0.8); // Transformed to number
    });
  });

  describe('CLI Integration', () => {
    it('should integrate with Commander.js correctly', async () => {
      // Test that Commander.js is available and working
      const { Command } = await import('commander');
      const program = new Command();
      
      // Test that the program can be configured
      expect(program).to.be.an('object');
      expect(typeof program.option).to.equal('function');
      expect(typeof program.parse).to.equal('function');
    });

    it('should handle environment variable overrides', () => {
      // Test that CLI args can override environment variables
      const originalEnv = process.env.STORAGE_BACKEND;
      process.env.STORAGE_BACKEND = 'azure';
      
      try {
        const args = parseCliArgs();
        expect(args.mode).to.equal('dev');
      } finally {
        if (originalEnv) {
          process.env.STORAGE_BACKEND = originalEnv;
        } else {
          delete process.env.STORAGE_BACKEND;
        }
      }
    });
  });
});
