/**
 * Test Setup Verification
 * 
 * Simple test to verify Mocha + Chai + Sinon + Hexapp setup is working
 */

import { describe, it } from 'mocha';
import { 
  expect, 
  sinon, 
  AppResult, 
  AppError, 
  AppErrStatus,
  AppResultTestUtils,
  AppErrorTestUtils,
  MockUtils,
  ValueObjectTestUtils
} from './test-helpers.js';

describe('Test Framework Setup', () => {
  describe('Mocha + Chai + Sinon', () => {
    it('should have Mocha describe and it functions', () => {
      expect(describe).to.be.a('function');
      expect(it).to.be.a('function');
    });

    it('should have Chai expect function', () => {
      expect(expect).to.be.a('function');
      expect(true).to.be.true;
      expect(false).to.be.false;
    });

    it('should have Sinon available', () => {
      expect(sinon).to.be.an('object');
      const stub = sinon.stub();
      expect(stub).to.be.a('function');
    });
  });

  describe('Hexapp Integration', () => {
    it('should have AppResult available', () => {
      const okResult = AppResult.Ok('test');
      const errResult = AppResult.Err(AppError.Generic('test error'));

      expect(okResult.isOk()).to.be.true;
      expect(errResult.isErr()).to.be.true;
    });

    it('should have AppError available', () => {
      const error = AppError.NotFound('Test not found');
      expect(error.status).to.equal(AppErrStatus.NotFound);
      expect(error.message).to.equal('Test not found');
    });

    it('should have test utilities working', () => {
      const okResult = AppResult.Ok('test value');
      const value = AppResultTestUtils.expectOk(okResult);
      expect(value).to.equal('test value');

      const errResult = AppResult.Err(AppError.InvalidData('Invalid'));
      const error = AppResultTestUtils.expectErr(errResult);
      expect(error.status).to.equal(AppErrStatus.InvalidData);
    });
  });

  describe('Value Object Utilities', () => {
    it('should create valid UUIDs', () => {
      const uuid = ValueObjectTestUtils.createTestUuid();
      ValueObjectTestUtils.expectValidUuid(uuid);
    });

    it('should create valid DateTimes', () => {
      const dateTime = ValueObjectTestUtils.createTestDateTime();
      ValueObjectTestUtils.expectValidDateTime(dateTime);
    });

    it('should create valid Emails', () => {
      const email = ValueObjectTestUtils.createTestEmail('test@domain.com');
      // Email value object returns the string value, not an object
      expect(email).to.be.a('string');
      expect(email).to.equal('test@domain.com');
    });
  });

  describe('Mock Utilities', () => {
    it('should create sinon sandbox', () => {
      const sandbox = MockUtils.createSandbox();
      expect(sandbox).to.be.an('object');
      expect(sandbox.stub).to.be.a('function');
    });

    it('should create AppResult stubs', () => {
      const okStub = MockUtils.stubAppResultOk('test');
      const errStub = MockUtils.stubAppResultErr(AppError.Generic('error'));

      expect(okStub).to.be.a('function');
      expect(errStub).to.be.a('function');
    });
  });
});
