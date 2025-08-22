/**
 * Test Helpers for Hexapp Patterns
 * 
 * Utilities for testing with Mocha + Chai + Sinon and hexapp components
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { AppResult, AppError, AppErrStatus } from '@carbonteq/hexapp';
import { UUID, DateTime, Email } from '@carbonteq/hexapp';

// =============================================================================
// HEXAPP TEST UTILITIES
// =============================================================================

/**
 * Test utilities for AppResult
 */
export const AppResultTestUtils = {
  /**
   * Assert that AppResult is Ok and return the value
   */
  expectOk<T>(result: AppResult<T>): T {
    expect(result.isOk()).to.be.true;
    expect(result.isErr()).to.be.false;
    return result.unwrap();
  },

  /**
   * Assert that AppResult is Err and return the error
   */
  expectErr<T>(result: AppResult<T>): AppError {
    expect(result.isErr()).to.be.true;
    expect(result.isOk()).to.be.false;
    return result.unwrapErr();
  },

  /**
   * Assert that AppResult is Ok with specific value
   */
  expectOkValue<T>(result: AppResult<T>, expectedValue: T): void {
    const value = this.expectOk(result);
    expect(value).to.deep.equal(expectedValue);
  },

  /**
   * Assert that AppResult is Err with specific error status
   */
  expectErrStatus<T>(result: AppResult<T>, expectedStatus: AppErrStatus): AppError {
    const error = this.expectErr(result);
    expect(error.status).to.equal(expectedStatus);
    return error;
  },

  /**
   * Assert that AppResult is Err with specific error message
   */
  expectErrMessage<T>(result: AppResult<T>, expectedMessage: string): AppError {
    const error = this.expectErr(result);
    expect(error.message).to.equal(expectedMessage);
    return error;
  }
};

/**
 * Test utilities for AppError
 */
export const AppErrorTestUtils = {
  /**
   * Create test AppError instances
   */
  createNotFound(message?: string): AppError {
    return AppError.NotFound(message);
  },

  createUnauthorized(message?: string): AppError {
    return AppError.Unauthorized(message);
  },

  createInvalidData(message?: string): AppError {
    return AppError.InvalidData(message);
  },

  createGeneric(message: string): AppError {
    return AppError.Generic(message);
  },

  /**
   * Assert error has specific status
   */
  expectStatus(error: AppError, expectedStatus: AppErrStatus): void {
    expect(error.status).to.equal(expectedStatus);
  },

  /**
   * Assert error has specific message
   */
  expectMessage(error: AppError, expectedMessage: string): void {
    expect(error.message).to.equal(expectedMessage);
  }
};

/**
 * Test utilities for hexapp value objects
 */
export const ValueObjectTestUtils = {
  /**
   * Create test UUID
   */
  createTestUuid(): string {
    return UUID.init();
  },

  /**
   * Create test DateTime
   */
  createTestDateTime(): DateTime {
    return DateTime.now();
  },

  /**
   * Create test Email
   */
  createTestEmail(email = 'test@example.com'): Email {
    const result = Email.create(email);
    if (result.isErr()) {
      throw new Error(`Failed to create test email: ${result.unwrapErr().message}`);
    }
    return result.unwrap();
  },

  /**
   * Assert UUID is valid
   */
  expectValidUuid(uuid: string): void {
    expect(uuid).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  },

  /**
   * Assert DateTime is valid
   */
  expectValidDateTime(dateTime: DateTime): void {
    expect(dateTime).to.be.instanceOf(Date);
    expect(dateTime.getTime()).to.be.a('number');
  }
};

// =============================================================================
// MOCHA + CHAI + SINON UTILITIES
// =============================================================================

/**
 * Sinon utilities for mocking
 */
export const MockUtils = {
  /**
   * Create a sinon sandbox for isolated test mocking
   */
  createSandbox() {
    return sinon.createSandbox();
  },

  /**
   * Create a stub that returns an Ok AppResult
   */
  stubAppResultOk<T>(value: T): sinon.SinonStub {
    return sinon.stub().resolves(AppResult.Ok(value));
  },

  /**
   * Create a stub that returns an Err AppResult
   */
  stubAppResultErr(error: AppError): sinon.SinonStub {
    return sinon.stub().resolves(AppResult.Err(error));
  },

  /**
   * Create a stub that throws an error
   */
  stubThrows(error: Error): sinon.SinonStub {
    return sinon.stub().throws(error);
  }
};

/**
 * Common test data generators
 */
export const TestDataUtils = {
  /**
   * Generate test user data
   */
  generateUserData(overrides: Partial<any> = {}) {
    return {
      id: ValueObjectTestUtils.createTestUuid(),
      email: 'test@example.com',
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  },

  /**
   * Generate test document data
   */
  generateDocumentData(overrides: Partial<any> = {}) {
    return {
      id: ValueObjectTestUtils.createTestUuid(),
      name: 'test-document.pdf',
      filePath: '/uploads/test-document.pdf',
      mimeType: 'application/pdf',
      size: '1024',
      tags: ['test', 'document'],
      metadata: { category: 'test' },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  },

  /**
   * Generate invalid test data for validation testing
   */
  generateInvalidData() {
    return {
      invalidEmail: 'not-an-email',
      invalidUuid: 'not-a-uuid',
      invalidMimeType: '',
      emptyString: '',
      nullValue: null,
      undefinedValue: undefined
    };
  }
};

/**
 * Async test utilities
 */
export const AsyncTestUtils = {
  /**
   * Wait for a specified amount of time
   */
  async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Test async function that should throw
   */
  async expectAsyncThrow(asyncFn: () => Promise<any>, expectedError?: string): Promise<void> {
    try {
      await asyncFn();
      expect.fail('Expected function to throw, but it did not');
    } catch (error) {
      if (expectedError) {
        expect((error as Error).message).to.include(expectedError);
      }
    }
  },

  /**
   * Test async function that should return AppResult.Err
   */
  async expectAsyncAppResultErr<T>(
    asyncFn: () => Promise<AppResult<T>>,
    expectedStatus?: AppErrStatus
  ): Promise<AppError> {
    const result = await asyncFn();
    const error = AppResultTestUtils.expectErr(result);
    if (expectedStatus) {
      AppErrorTestUtils.expectStatus(error, expectedStatus);
    }
    return error;
  },

  /**
   * Test async function that should return AppResult.Ok
   */
  async expectAsyncAppResultOk<T>(
    asyncFn: () => Promise<AppResult<T>>,
    expectedValue?: T
  ): Promise<T> {
    const result = await asyncFn();
    const value = AppResultTestUtils.expectOk(result);
    if (expectedValue !== undefined) {
      expect(value).to.deep.equal(expectedValue);
    }
    return value;
  }
};

// =============================================================================
// EXPORTS
// =============================================================================

export {
  expect,
  sinon,
  AppResult,
  AppError,
  AppErrStatus,
  UUID,
  DateTime,
  Email
};
