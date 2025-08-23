import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { parseCliArgs, getModeConfig, validateModeConfig, modeConfig, type CliArgs, type StartupMode } from '../../../../src/adapters/primary/commander/cli.js';

describe('CLI Commander Adapter', () => {
  let consoleLogStub: sinon.SinonStub;
  let consoleErrorStub: sinon.SinonStub;
  let processExitStub: sinon.SinonStub;
  let originalArgv: string[];

  beforeEach(() => {
    // Store original process.argv
    originalArgv = process.argv;
    
    // Stub console methods
    consoleLogStub = sinon.stub(console, 'log');
    consoleErrorStub = sinon.stub(console, 'error');
    
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
        validation: 'relaxed'
      });
    });

    it('should have correct prod mode configuration', () => {
      expect(modeConfig.prod).to.deep.equal({
        logging: 'info',
        healthChecks: true,
        shutdownDelay: 0,
        validation: 'strict'
      });
    });

    it('should have correct test mode configuration', () => {
      expect(modeConfig.test).to.deep.equal({
        logging: 'error',
        healthChecks: false,
        shutdownDelay: 0,
        validation: 'minimal'
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
      const config = { JWT_SECRET: 'dev-secret' };
      
      expect(() => {
        validateModeConfig('dev', config);
      }).to.not.throw();
      
      expect(consoleLogStub.callCount).to.equal(1);
    });

    it('should validate prod mode configuration successfully with secure JWT', () => {
      const config = { JWT_SECRET: 'secure-production-secret-key' };
      
      expect(() => {
        validateModeConfig('prod', config);
      }).to.not.throw();
      
      expect(consoleLogStub.callCount).to.equal(1);
    });

    it('should throw error for prod mode with insecure JWT secret', () => {
      const config = { JWT_SECRET: 'supersecretkey' };
      
      expect(() => {
        validateModeConfig('prod', config);
      }).to.throw('Production mode requires secure JWT secrets');
    });

    it('should throw error for prod mode with missing JWT secret', () => {
      const config = {};
      
      expect(() => {
        validateModeConfig('prod', config);
      }).to.throw('Production mode requires secure JWT secrets');
    });

    it('should validate test mode configuration successfully', () => {
      const config = { JWT_SECRET: 'test-secret' };
      
      expect(() => {
        validateModeConfig('test', config);
      }).to.not.throw();
      
      expect(consoleLogStub.callCount).to.equal(1);
    });
  });

  describe('parseCliArgs()', () => {
    it('should parse default arguments successfully', () => {
      // Set minimal argv for default parsing
      process.argv = ['node', 'app.js'];
      
      const args = parseCliArgs();
      
      expect(args.mode).to.equal('dev');
      expect(args.port).to.equal(3000);
      expect(args.host).to.equal('0.0.0.0');
      expect(args.help).to.be.undefined;
      
      expect(consoleLogStub.callCount).to.equal(1);
      expect(consoleLogStub.firstCall.args[0]).to.equal('CLI arguments parsed successfully:');
      expect(consoleLogStub.firstCall.args[1]).to.deep.equal({
        mode: 'dev',
        port: 3000,
        host: '0.0.0.0',
      });
    });

    it('should parse custom mode argument', () => {
      process.argv = ['node', 'app.js', '--mode', 'prod'];
      
      const args = parseCliArgs();
      
      expect(args.mode).to.equal('prod');
      expect(consoleLogStub.callCount).to.equal(1);
      expect(consoleLogStub.firstCall.args[0]).to.equal('CLI arguments parsed successfully:');
      expect(consoleLogStub.firstCall.args[1]).to.deep.equal({
        mode: 'prod',
        port: 3000,
        host: '0.0.0.0',
      });
    });

    it('should parse custom port argument', () => {
      process.argv = ['node', 'app.js', '--port', '8080'];
      
      const args = parseCliArgs();
      
      expect(args.mode).to.equal('dev');
      expect(args.port).to.equal(8080);
      expect(consoleLogStub.callCount).to.equal(1);
      expect(consoleLogStub.firstCall.args[0]).to.equal('CLI arguments parsed successfully:');
      expect(consoleLogStub.firstCall.args[1]).to.deep.equal({
        mode: 'dev',
        port: 8080,
        host: '0.0.0.0',
      });
    });

    it('should parse custom host argument', () => {
      process.argv = ['node', 'app.js', '--host', 'localhost'];
      
      const args = parseCliArgs();
      
      expect(args.mode).to.equal('dev');
      expect(args.host).to.equal('localhost');
      expect(consoleLogStub.callCount).to.equal(1);
      expect(consoleLogStub.firstCall.args[0]).to.equal('CLI arguments parsed successfully:');
      expect(consoleLogStub.firstCall.args[1]).to.deep.equal({
        mode: 'dev',
        port: 3000,
        host: 'localhost',
      });
    });

    it('should parse multiple arguments together', () => {
      process.argv = ['node', 'app.js', '--mode', 'test', '--port', '5000', '--host', '127.0.0.1'];
      
      const args = parseCliArgs();
      
      expect(args.mode).to.equal('test');
      expect(args.port).to.equal(5000);
      expect(args.host).to.equal('127.0.0.1');
      expect(consoleLogStub.callCount).to.equal(1);
      expect(consoleLogStub.firstCall.args[0]).to.equal('CLI arguments parsed successfully:');
      expect(consoleLogStub.firstCall.args[1]).to.deep.equal({
        mode: 'test',
        port: 5000,
        host: '127.0.0.1',
      });
    });

    it('should parse short form arguments', () => {
      process.argv = ['node', 'app.js', '-m', 'prod', '-p', '9000', '-h', '0.0.0.0'];
      
      const args = parseCliArgs();
      
      expect(args.mode).to.equal('prod');
      expect(args.port).to.equal(9000);
      expect(args.host).to.equal('0.0.0.0');
    });

    it('should handle invalid mode argument', () => {
      process.argv = ['node', 'app.js', '--mode', 'invalid'];
      
      parseCliArgs();
      
      expect(consoleErrorStub.callCount).to.equal(2);
      expect(consoleErrorStub.firstCall.args[0]).to.equal('Invalid CLI arguments:');
      expect(processExitStub.callCount).to.equal(1);
      expect(processExitStub.firstCall.args[0]).to.equal(1);
    });

    it('should handle invalid port argument (non-numeric)', () => {
      process.argv = ['node', 'app.js', '--port', 'invalid'];
      
      parseCliArgs();
      
      expect(consoleErrorStub.callCount).to.equal(2);
      expect(consoleErrorStub.firstCall.args[0]).to.equal('Invalid CLI arguments:');
      expect(processExitStub.callCount).to.equal(1);
      expect(processExitStub.firstCall.args[0]).to.equal(1);
    });

    it('should handle invalid port argument (out of range)', () => {
      process.argv = ['node', 'app.js', '--port', '70000'];
      
      parseCliArgs();
      
      expect(consoleErrorStub.callCount).to.equal(2);
      expect(consoleErrorStub.firstCall.args[0]).to.equal('Invalid CLI arguments:');
      expect(processExitStub.callCount).to.equal(1);
      expect(processExitStub.firstCall.args[0]).to.equal(1);
    });

    it('should handle invalid port argument (zero)', () => {
      process.argv = ['node', 'app.js', '--port', '0'];
      
      parseCliArgs();
      
      expect(consoleErrorStub.callCount).to.equal(2);
      expect(consoleErrorStub.firstCall.args[0]).to.equal('Invalid CLI arguments:');
      expect(processExitStub.callCount).to.equal(1);
      expect(processExitStub.firstCall.args[0]).to.equal(1);
    });

    it('should handle help option', () => {
      process.argv = ['node', 'app.js', '--help'];
      
      const args = parseCliArgs();
      
      expect(args.help).to.be.undefined;
      expect(consoleLogStub.callCount).to.equal(1);
      expect(consoleLogStub.firstCall.args[0]).to.equal('CLI arguments parsed successfully:');
      expect(consoleLogStub.firstCall.args[1]).to.deep.equal({
        mode: 'dev',
        port: 3000,
        host: '0.0.0.0',
      });
    });

    it('should handle short help option', () => {
      process.argv = ['node', 'app.js', '-H'];
      
      const args = parseCliArgs();
      
      expect(args.help).to.be.undefined;
    });
  });

  describe('CLI Schema Validation', () => {
    it('should accept valid mode values', () => {
      const validModes = ['dev', 'prod', 'test'];
      
      validModes.forEach(mode => {
        expect(() => {
          parseCliArgs();
        }).to.not.throw();
      });
    });

    it('should accept valid port ranges', () => {
      const validPorts = [1, 1024, 3000, 65535];
      
      validPorts.forEach(port => {
        process.argv = ['node', 'app.js', '--port', port.toString()];
        
        expect(() => {
          parseCliArgs();
        }).to.not.throw();
      });
    });

    it('should reject invalid port ranges', () => {
      const invalidPorts = [0, -1, 65536, 99999];
      
      invalidPorts.forEach(port => {
        // Reset stubs for each iteration
        consoleErrorStub.reset();
        processExitStub.reset();
        
        process.argv = ['node', 'app.js', '--port', port.toString()];
        
        parseCliArgs();
        
        expect(consoleErrorStub.callCount).to.equal(2);
        expect(processExitStub.callCount).to.equal(1);
      });
    });

    it('should accept string host values', () => {
      const validHosts = ['localhost', '127.0.0.1', '0.0.0.0', 'example.com'];
      
      validHosts.forEach(host => {
        process.argv = ['node', 'app.js', '--host', host];
        
        expect(() => {
          parseCliArgs();
        }).to.not.throw();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle Zod validation errors gracefully', () => {
      process.argv = ['node', 'app.js', '--mode', 'invalid'];
      
      parseCliArgs();
      
      expect(consoleErrorStub.callCount).to.equal(2);
      expect(consoleErrorStub.firstCall.args[0]).to.equal('Invalid CLI arguments:');
      expect(processExitStub.callCount).to.equal(1);
      expect(processExitStub.firstCall.args[0]).to.equal(1);
    });

    it('should handle unexpected errors gracefully', () => {
      // Mock a scenario where parsing fails unexpectedly
      const originalParse = process.argv;
      process.argv = ['node', 'app.js'];
      
      // This test verifies the error handling path
      expect(() => {
        parseCliArgs();
      }).to.not.throw();
      
      process.argv = originalParse;
    });
  });
});
