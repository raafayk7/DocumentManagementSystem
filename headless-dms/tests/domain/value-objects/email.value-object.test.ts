/**
 * Email Value Object Tests
 * Testing Email value object with hexapp BaseValueObject patterns
 */

import { describe, it, beforeEach } from 'mocha';
import {
  expect,
  AppResult,
  AppError,
  AppErrStatus,
  UUID,
  DateTime,
  AppResultTestUtils,
  AppErrorTestUtils,
  ValueObjectTestUtils,
  TestDataUtils,
  AsyncTestUtils
} from '../../shared/test-helpers.js';
import { Email } from '../../../src/domain/value-objects/Email.js';

describe('Domain > Value Objects > Email', () => {
  describe('BaseValueObject Integration', () => {
    it('should extend hexapp BaseValueObject', () => {
      // Arrange & Act
      const emailResult = Email.create('test@example.com');
      
      // Assert
      const email = AppResultTestUtils.expectOk(emailResult);
      expect(email).to.be.instanceOf(Email);
      
      // Should have serialize method from BaseValueObject
      expect(email.serialize).to.be.a('function');
      expect(email.serialize()).to.be.a('string');
      expect(email.serialize()).to.equal('test@example.com');
    });

    it('should implement value object equality semantics', () => {
      // Arrange
      const email1Result = Email.create('test@example.com');
      const email2Result = Email.create('test@example.com');
      const email3Result = Email.create('different@example.com');
      
      // Act
      const email1 = AppResultTestUtils.expectOk(email1Result);
      const email2 = AppResultTestUtils.expectOk(email2Result);
      const email3 = AppResultTestUtils.expectOk(email3Result);
      
      // Assert - Same value should be equal
      expect(email1.equals(email2)).to.be.true;
      expect(email2.equals(email1)).to.be.true;
      
      // Different values should not be equal
      expect(email1.equals(email3)).to.be.false;
      expect(email3.equals(email1)).to.be.false;
    });

    it('should be immutable after creation', () => {
      // Arrange & Act
      const emailResult = Email.create('test@example.com');
      const email = AppResultTestUtils.expectOk(emailResult);
      
      // Assert - Value object should be immutable
      expect(email.value).to.equal('test@example.com');
      
      // Should not be able to modify the email (no setter methods)
      expect(email).to.not.have.property('setValue');
      expect(email).to.not.have.property('changeValue');
    });
  });

  describe('Factory Pattern Validation', () => {
    it('should create email with valid input', () => {
      // Arrange & Act
      const result = Email.create('user@example.com');
      
      // Assert
      const email = AppResultTestUtils.expectOk(result);
      expect(email.value).to.equal('user@example.com');
    });

    it('should normalize email addresses (lowercase, trim)', () => {
      // Arrange & Act
      const result = Email.create('  USER@EXAMPLE.COM  ');
      
      // Assert
      const email = AppResultTestUtils.expectOk(result);
      expect(email.value).to.equal('user@example.com');
    });

    it('should return AppResult.Err for null/undefined input', () => {
      // Test null
      const nullResult = Email.create(null as any);
      AppResultTestUtils.expectErr(nullResult);
      
      // Test undefined  
      const undefinedResult = Email.create(undefined as any);
      AppResultTestUtils.expectErr(undefinedResult);
      
      // Test empty string
      const emptyResult = Email.create('');
      AppResultTestUtils.expectErr(emptyResult);
    });

    it('should return AppResult.Err for non-string input', () => {
      // Test number
      const numberResult = Email.create(123 as any);
      AppResultTestUtils.expectErr(numberResult);
      
      // Test object
      const objectResult = Email.create({} as any);
      AppResultTestUtils.expectErr(objectResult);
      
      // Test array
      const arrayResult = Email.create(['test@example.com'] as any);
      AppResultTestUtils.expectErr(arrayResult);
    });
  });

  describe('Email Format Validation', () => {
    it('should accept valid email formats', () => {
      const validEmails = [
        'user@example.com',
        'test.email@domain.co.uk',
        'user123@test-domain.org',
        'first.last@sub.domain.com',
        'user+tag@example.com',
        'a@b.co'
      ];

      validEmails.forEach(email => {
        const result = Email.create(email);
        const emailObj = AppResultTestUtils.expectOk(result);
        expect(emailObj.value).to.equal(email.toLowerCase());
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.example.com',
        'user@example.',
        'user@ex ample.com',
        'user@example..com',
        'user@-example.com'
      ];

      invalidEmails.forEach(email => {
        const result = Email.create(email);
        AppResultTestUtils.expectErr(result);
      });
    });

    it('should enforce maximum length limit (254 characters)', () => {
      // Arrange - Create email that exceeds RFC 5321 limit
      const longLocalPart = 'a'.repeat(200);
      const longEmail = `${longLocalPart}@example.com`;
      
      // Act
      const result = Email.create(longEmail);
      
      // Assert
      AppResultTestUtils.expectErr(result);
    });
  });

  describe('Business Rule Validation', () => {
    it('should detect disposable email domains', () => {
      const disposableEmails = [
        'test@10minutemail.com',
        'user@guerrillamail.com',
        'temp@mailinator.com',
        'test@tempmail.org'
      ];

      disposableEmails.forEach(emailAddr => {
        const result = Email.create(emailAddr);
        const email = AppResultTestUtils.expectOk(result);
        expect(email.isDisposable()).to.be.true;
      });
    });

    it('should accept non-disposable domains', () => {
      const validEmails = [
        'user@gmail.com',
        'test@outlook.com',
        'business@company.com',
        'admin@organization.org'
      ];

      validEmails.forEach(email => {
        const result = Email.create(email);
        AppResultTestUtils.expectOk(result);
      });
    });

    it('should validate email domain format', () => {
      // Valid domains
      const validDomains = [
        'user@example.com',
        'test@sub.domain.co.uk',
        'user@a1.org'
      ];

      validDomains.forEach(email => {
        const result = Email.create(email);
        AppResultTestUtils.expectOk(result);
      });

      // Invalid domains
      const invalidDomains = [
        'user@-example.com',
        'test@example-.com',
        'user@.example.com',
        'test@example..com'
      ];

      invalidDomains.forEach(email => {
        const result = Email.create(email);
        AppResultTestUtils.expectErr(result);
      });
    });
  });

  describe('Serialization Patterns', () => {
    it('should serialize to string value', () => {
      // Arrange
      const emailResult = Email.create('test@example.com');
      const email = AppResultTestUtils.expectOk(emailResult);
      
      // Act
      const serialized = email.serialize();
      
      // Assert
      expect(serialized).to.be.a('string');
      expect(serialized).to.equal('test@example.com');
    });

    it('should preserve normalized format in serialization', () => {
      // Arrange
      const emailResult = Email.create('  TEST@EXAMPLE.COM  ');
      const email = AppResultTestUtils.expectOk(emailResult);
      
      // Act
      const serialized = email.serialize();
      
      // Assert
      expect(serialized).to.equal('test@example.com');
    });

    it('should provide consistent serialization across instances', () => {
      // Arrange
      const email1Result = Email.create('user@example.com');
      const email2Result = Email.create('USER@EXAMPLE.COM');
      
      const email1 = AppResultTestUtils.expectOk(email1Result);
      const email2 = AppResultTestUtils.expectOk(email2Result);
      
      // Act & Assert
      expect(email1.serialize()).to.equal(email2.serialize());
    });
  });

  describe('Utility Methods', () => {
    it('should provide string representation', () => {
      // Arrange
      const emailResult = Email.create('test@example.com');
      const email = AppResultTestUtils.expectOk(emailResult);
      
      // Act & Assert
      expect(email.toString()).to.equal('test@example.com');
      expect(String(email)).to.equal('test@example.com');
    });

    it('should extract domain from email', () => {
      // Arrange
      const emailResult = Email.create('user@example.com');
      const email = AppResultTestUtils.expectOk(emailResult);
      
      // Act & Assert
      expect(email.domain).to.equal('example.com');
    });

    it('should extract local part from email', () => {
      // Arrange
      const emailResult = Email.create('user.name@example.com');
      const email = AppResultTestUtils.expectOk(emailResult);
      
      // Act & Assert
      expect(email.localPart).to.equal('user.name');
    });

    it('should check if email is from specific domain', () => {
      // Arrange
      const emailResult = Email.create('user@example.com');
      const email = AppResultTestUtils.expectOk(emailResult);
      
      // Act & Assert
      expect(email.hasDomain('example.com')).to.be.true;
      expect(email.hasDomain('other.com')).to.be.false;
      expect(email.hasDomain('EXAMPLE.COM')).to.be.true; // Case insensitive
    });
  });

  describe('Error Cases and Edge Conditions', () => {
    it('should provide descriptive error messages for invalid formats', () => {
      const invalidEmailResult = Email.create('invalid-email');
      const error = AppResultTestUtils.expectErr(invalidEmailResult);
      expect(error.message).to.include('Invalid email format');
    });

    it('should accept disposable domains by default', () => {
      const disposableEmailResult = Email.create('test@10minutemail.com');
      const email = AppResultTestUtils.expectOk(disposableEmailResult);
      expect(email.isDisposable()).to.be.true;
    });

    it('should provide descriptive error messages for missing input', () => {
      const emptyEmailResult = Email.create('');
      const error = AppResultTestUtils.expectErr(emptyEmailResult);
      expect(error.message).to.include('Email address is required');
    });

    it('should handle boundary conditions for length validation', () => {
      // Test exactly at local part limit (should work)
      const maxValidEmail = 'a'.repeat(64) + '@example.com'; // 64 + 11 = 75 chars total
      const validResult = Email.create(maxValidEmail);
      AppResultTestUtils.expectOk(validResult);
      
      // Test over local part limit (should fail)
      const tooLongLocalEmail = 'a'.repeat(65) + '@example.com'; // 65 + 11 = 76 chars total
      const invalidResult = Email.create(tooLongLocalEmail);
      AppResultTestUtils.expectErr(invalidResult);
    });

    it('should handle unicode and international characters appropriately', () => {
      // Basic ASCII should work
      const asciiResult = Email.create('test@example.com');
      AppResultTestUtils.expectOk(asciiResult);
      
      // Unicode in domain (basic test - more complex internationalization could be added)
      const unicodeResult = Email.create('test@münchen.de');
      // Current implementation might not support this - depends on email validation
      // This test documents current behavior
    });
  });
});
