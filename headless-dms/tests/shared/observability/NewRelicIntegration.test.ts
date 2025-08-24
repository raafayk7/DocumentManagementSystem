import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { NewRelicIntegration } from '../../../src/shared/observability/new-relic/NewRelicIntegration.js';

describe('NewRelicIntegration', () => {
  let integration: NewRelicIntegration;
  let consoleLogStub: sinon.SinonStub;
  let consoleWarnStub: sinon.SinonStub;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env };
    
    // Set required New Relic environment variables for testing
    process.env.NEW_RELIC_LICENSE_KEY = 'test-license-key';
    process.env.NEW_RELIC_APP_NAME = 'test-app';
    process.env.NEW_RELIC_ACCOUNT_ID = 'test-account-id';
    process.env.NEW_RELIC_ENABLED = 'false'; // Disable for testing
    
    integration = NewRelicIntegration.getInstance();
    
    // Stub console methods to prevent output during tests
    consoleLogStub = sinon.stub(console, 'log');
    consoleWarnStub = sinon.stub(console, 'warn');
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    
    // Restore stubs
    consoleLogStub.restore();
    consoleWarnStub.restore();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = NewRelicIntegration.getInstance();
      const instance2 = NewRelicIntegration.getInstance();
      expect(instance1).to.equal(instance2);
      expect(instance1).to.be.an('object');
    });
  });

  describe('initialize', () => {
    it('should initialize successfully with valid config', async () => {
      const result = await integration.initialize();
      expect(result.isOk()).to.be.true;
    });

    it('should return initialization status', () => {
      const status = integration.getInitializationStatus();
      expect(typeof status).to.equal('boolean');
    });
  });

  describe('getInitializationStatus', () => {
    it('should return initialization status', () => {
      const status = integration.getInitializationStatus();
      expect(typeof status).to.equal('boolean');
    });
  });
});
