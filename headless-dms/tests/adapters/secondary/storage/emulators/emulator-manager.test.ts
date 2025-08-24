import { expect } from 'chai';
import { EmulatorManager, EmulatorConfig } from '../../../../../src/adapters/secondary/storage/emulators/EmulatorManager.js';

describe('EmulatorManager', () => {
  let emulatorManager: EmulatorManager;
  
  const mockConfig: EmulatorConfig = {
    useEmulators: true,
    localStack: {
      endpoint: 'http://127.0.0.1:4566',
      port: 4566,
      usePathStyle: true,
      accessKey: 'test',
      secretKey: 'test',
      region: 'us-east-1',
    },
    azurite: {
      endpoint: 'http://127.0.0.1:10000',
      port: 10000,
      accountName: 'devstoreaccount1',
      accountKey: 'Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==',
    },
    healthCheck: {
      interval: 30000,
      timeout: 5000,
      maxRetries: 3,
    },
  };

  beforeEach(() => {
    emulatorManager = new EmulatorManager(mockConfig);
  });

  describe('Constructor and Configuration', () => {
    it('should create instance with valid configuration', () => {
      expect(emulatorManager).to.be.instanceOf(EmulatorManager);
    });

    it('should initialize with unknown health status', () => {
      const health = emulatorManager.getHealth();
      expect(health.status).to.equal('unknown');
      expect(health.localStack.status).to.equal('unknown');
      expect(health.azurite.status).to.equal('unknown');
    });

    it('should return correct emulator mode status', () => {
      expect(emulatorManager.isEmulatorMode()).to.be.true;
    });

    it('should return LocalStack configuration', () => {
      const config = emulatorManager.getLocalStackConfig();
      expect(config.endpoint).to.equal('http://127.0.0.1:4566');
      expect(config.port).to.equal(4566);
      expect(config.usePathStyle).to.be.true;
      expect(config.accessKey).to.equal('test');
      expect(config.secretKey).to.equal('test');
      expect(config.region).to.equal('us-east-1');
    });

    it('should return Azurite configuration', () => {
      const config = emulatorManager.getAzuriteConfig();
      expect(config.endpoint).to.equal('http://127.0.0.1:10000');
      expect(config.port).to.equal(10000);
      expect(config.accountName).to.equal('devstoreaccount1');
      expect(config.accountKey).to.equal('Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==');
    });
  });

  describe('Health Status Management', () => {
    it('should return health status object', () => {
      const health = emulatorManager.getHealth();
      expect(health).to.have.property('status');
      expect(health).to.have.property('localStack');
      expect(health).to.have.property('azurite');
      expect(health).to.have.property('metrics');
    });

    it('should have correct health status structure', () => {
      const health = emulatorManager.getHealth();
      
      expect(health.localStack).to.have.property('status');
      expect(health.localStack).to.have.property('endpoint');
      expect(health.localStack).to.have.property('responseTime');
      expect(health.localStack).to.have.property('lastChecked');
      
      expect(health.azurite).to.have.property('status');
      expect(health.azurite).to.have.property('endpoint');
      expect(health.azurite).to.have.property('responseTime');
      expect(health.azurite).to.have.property('lastChecked');
      
      expect(health.metrics).to.have.property('totalChecks');
      expect(health.metrics).to.have.property('successfulChecks');
      expect(health.metrics).to.have.property('failedChecks');
      expect(health.metrics).to.have.property('averageResponseTime');
      expect(health.metrics).to.have.property('lastUpdated');
    });
  });

  describe('Status Summary', () => {
    it('should return status summary when emulators are enabled', () => {
      const summary = emulatorManager.getStatusSummary();
      expect(summary).to.include('Emulators: unknown');
      expect(summary).to.include('LocalStack: unknown');
      expect(summary).to.include('Azurite: unknown');
    });

    it('should return disabled message when emulators are disabled', () => {
      const disabledConfig: EmulatorConfig = {
        ...mockConfig,
        useEmulators: false,
      };
      const disabledManager = new EmulatorManager(disabledConfig);
      const summary = disabledManager.getStatusSummary();
      expect(summary).to.equal('Emulators disabled - using cloud services');
    });
  });

  describe('Environment Configuration', () => {
    it('should return environment config when emulators are enabled', () => {
      const envConfig = emulatorManager.getEnvironmentConfig();
      expect(envConfig.useEmulators).to.be.true;
      // Initially endpoints are undefined because health status is 'unknown'
      expect(envConfig.s3Endpoint).to.be.undefined;
      expect(envConfig.azureEndpoint).to.be.undefined;
    });

    it('should return minimal config when emulators are disabled', () => {
      const disabledConfig: EmulatorConfig = {
        ...mockConfig,
        useEmulators: false,
      };
      const disabledManager = new EmulatorManager(disabledConfig);
      const envConfig = disabledManager.getEnvironmentConfig();
      expect(envConfig.useEmulators).to.be.false;
      expect(envConfig.s3Endpoint).to.be.undefined;
      expect(envConfig.azureEndpoint).to.be.undefined;
    });
  });

  describe('Health Check Methods', () => {
    it('should check if LocalStack is healthy', () => {
      const isHealthy = emulatorManager.isLocalStackHealthy();
      expect(typeof isHealthy).to.equal('boolean');
    });

    it('should check if Azurite is healthy', () => {
      const isHealthy = emulatorManager.isAzuriteHealthy();
      expect(typeof isHealthy).to.equal('boolean');
    });
  });

  describe('Lifecycle Management', () => {
    it('should start emulator manager', async () => {
      const result = await emulatorManager.start();
      expect(result.isOk()).to.be.true;
    });

    it('should stop emulator manager', async () => {
      // Start first
      await emulatorManager.start();
      
      // Then stop
      const result = await emulatorManager.stop();
      expect(result.isOk()).to.be.true;
    });

    it('should handle multiple start calls gracefully', async () => {
      const result1 = await emulatorManager.start();
      expect(result1.isOk()).to.be.true;
      
      const result2 = await emulatorManager.start();
      expect(result2.isOk()).to.be.true;
    });

    it('should handle multiple stop calls gracefully', async () => {
      await emulatorManager.start();
      
      const result1 = await emulatorManager.stop();
      expect(result1.isOk()).to.be.true;
      
      const result2 = await emulatorManager.stop();
      expect(result2.isOk()).to.be.true;
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid configuration gracefully', () => {
      const invalidConfig: EmulatorConfig = {
        ...mockConfig,
        localStack: {
          ...mockConfig.localStack,
          endpoint: 'invalid-url',
        },
      };
      
      // Should not throw during construction
      expect(() => new EmulatorManager(invalidConfig)).to.not.throw();
    });
  });
});
