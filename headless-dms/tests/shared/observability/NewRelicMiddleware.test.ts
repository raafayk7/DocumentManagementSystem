import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { NewRelicMiddleware } from '../../../src/shared/observability/new-relic/NewRelicMiddleware.js';

describe('NewRelicMiddleware', () => {
  let consoleLogStub: sinon.SinonStub;
  let consoleWarnStub: sinon.SinonStub;

  beforeEach(() => {
    // Stub console methods to prevent output during tests
    consoleLogStub = sinon.stub(console, 'log');
    consoleWarnStub = sinon.stub(console, 'warn');
  });

  afterEach(() => {
    // Restore stubs
    consoleLogStub.restore();
    consoleWarnStub.restore();
  });

  describe('trackDatabaseOperation', () => {
    it('should track database operation successfully', () => {
      expect(() => {
        NewRelicMiddleware.trackDatabaseOperation(
          'SELECT',
          'SELECT * FROM users WHERE id = 1',
          150,
          true
        );
      }).to.not.throw();
    });

    it('should handle long queries by truncating', () => {
      const longQuery = 'a'.repeat(200);
      expect(() => {
        NewRelicMiddleware.trackDatabaseOperation(
          'SELECT',
          longQuery,
          100,
          true
        );
      }).to.not.throw();
    });
  });

  describe('trackStorageOperation', () => {
    it('should track storage operation successfully', () => {
      expect(() => {
        NewRelicMiddleware.trackStorageOperation(
          'upload',
          'local',
          250,
          true,
          { fileSize: 1024, fileType: 'pdf' }
        );
      }).to.not.throw();
    });

    it('should handle storage operation with metadata', () => {
      const metadata = { 
        filePath: '/uploads/test.pdf',
        destinationPath: '/storage/test.pdf'
      };
      
      expect(() => {
        NewRelicMiddleware.trackStorageOperation(
          'upload',
          'local',
          300,
          true,
          metadata
        );
      }).to.not.throw();
    });
  });
});
