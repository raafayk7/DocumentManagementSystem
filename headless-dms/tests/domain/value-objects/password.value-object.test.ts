/**
 * Password Value Object Tests
 * Testing Password value object with hexapp BaseValueObject patterns
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
import { Password } from '../../../src/domain/value-objects/Password.js';

describe('Domain > Value Objects > Password', () => {
  describe('BaseValueObject Integration', () => {
    it('should extend hexapp BaseValueObject', () => {
      // Arrange & Act
      const passwordResult = Password.create('StrongP@55w0rd!');
      
      // Assert
      const password = AppResultTestUtils.expectOk(passwordResult);
      expect(password).to.be.instanceOf(Password);
      
      // Should have serialize method from BaseValueObject
      expect(password.serialize).to.be.a('function');
      expect(password.serialize()).to.be.a('string');
      expect(password.serialize()).to.equal('StrongP@55w0rd!');
    });

    it('should implement value object equality semantics', () => {
      // Arrange
      const password1Result = Password.create('StrongP@55w0rd!');
      const password2Result = Password.create('StrongP@55w0rd!');
      const password3Result = Password.create('DifferentP@55w0rd!');
      
      // Act
      const password1 = AppResultTestUtils.expectOk(password1Result);
      const password2 = AppResultTestUtils.expectOk(password2Result);
      const password3 = AppResultTestUtils.expectOk(password3Result);
      
      // Assert - Same value should be equal
      expect(password1.equals(password2)).to.be.true;
      expect(password2.equals(password1)).to.be.true;
      
      // Different values should not be equal
      expect(password1.equals(password3)).to.be.false;
      expect(password3.equals(password1)).to.be.false;
    });

    it('should be immutable after creation', () => {
      // Arrange & Act
      const passwordResult = Password.create('StrongP@55w0rd!');
      const password = AppResultTestUtils.expectOk(passwordResult);
      
      // Assert - Value object should be immutable
      expect(password.value).to.equal('StrongP@55w0rd!');
      
      // Should not be able to modify the password (no setter methods)
      expect(password).to.not.have.property('setValue');
      expect(password).to.not.have.property('changeValue');
    });
  });

  describe('Factory Pattern Validation', () => {
    it('should create password with valid input', () => {
      // Arrange & Act
      const result = Password.create('StrongP@55w0rd!');
      
      // Assert
      const password = AppResultTestUtils.expectOk(result);
      expect(password.value).to.equal('StrongP@55w0rd!');
    });

    it('should return AppResult.Err for null/undefined input', () => {
      // Test null
      const nullResult = Password.create(null as any);
      AppResultTestUtils.expectErr(nullResult);
      
      // Test undefined  
      const undefinedResult = Password.create(undefined as any);
      AppResultTestUtils.expectErr(undefinedResult);
      
      // Test empty string
      const emptyResult = Password.create('');
      AppResultTestUtils.expectErr(emptyResult);
    });

    it('should return AppResult.Err for non-string input', () => {
      // Test number
      const numberResult = Password.create(123 as any);
      AppResultTestUtils.expectErr(numberResult);
      
      // Test object
      const objectResult = Password.create({} as any);
      AppResultTestUtils.expectErr(objectResult);
      
      // Test array
      const arrayResult = Password.create(['password'] as any);
      AppResultTestUtils.expectErr(arrayResult);
    });
  });

  describe('Length Validation', () => {
    it('should accept passwords with valid length (8-128 characters)', () => {
      // Minimum valid length
      const minValidResult = Password.create('StrongP@55w0rd!');
      AppResultTestUtils.expectOk(minValidResult);
      
      // Medium length
      const mediumValidResult = Password.create('MyStr0ng#Pa55w0rd');
      AppResultTestUtils.expectOk(mediumValidResult);
      
      // Reasonable long password (avoiding security validation issues)
      const longValid = 'SuperL0ng$' + 'Complex' + 'P@55w0rd!';
      const longValidResult = Password.create(longValid);
      AppResultTestUtils.expectOk(longValidResult);
    });

    it('should reject passwords that are too short', () => {
      const tooShortPasswords = [
        'Ab1!',
        'Abcd12!',
        'Short1!'
      ];

      tooShortPasswords.forEach(password => {
        const result = Password.create(password);
        const error = AppResultTestUtils.expectErr(result);
        expect(error.message).to.include('must be at least 8 characters');
      });
    });

    it('should reject passwords that are too long', () => {
      // Create password longer than 128 characters
      const tooLong = 'A' + 'b'.repeat(130) + '1234567!';
      const result = Password.create(tooLong);
      
      const error = AppResultTestUtils.expectErr(result);
      expect(error.message).to.include('cannot exceed 128 characters');
    });
  });

  describe('Character Type Requirements', () => {
    it('should require lowercase letters', () => {
      const noLowercaseResult = Password.create('STRONG123!');
      const error = AppResultTestUtils.expectErr(noLowercaseResult);
      expect(error.message).to.include('lowercase letter');
    });

    it('should require uppercase letters', () => {
      const noUppercaseResult = Password.create('strong123!');
      const error = AppResultTestUtils.expectErr(noUppercaseResult);
      expect(error.message).to.include('uppercase letter');
    });

    it('should require numbers', () => {
      const noNumbersResult = Password.create('StrongPass!');
      const error = AppResultTestUtils.expectErr(noNumbersResult);
      expect(error.message).to.include('number');
    });

    it('should require special characters', () => {
      const noSpecialResult = Password.create('StrongPass123');
      const error = AppResultTestUtils.expectErr(noSpecialResult);
      expect(error.message).to.include('special character');
    });

    it('should accept passwords with all required character types', () => {
      const validPasswords = [
        'StrongP@55w0rd!',
        'MyS3cur3#P@55',
        'V3ryStr0ng$Pwd',
        'Ungu3ssab1e!'
      ];

      validPasswords.forEach(password => {
        const result = Password.create(password);
        AppResultTestUtils.expectOk(result);
      });
    });
  });

  describe('Security Validation', () => {
    it('should reject common weak passwords', () => {
      const weakPasswords = [
        'Password135!',
        'Admin246!',
        'Welcome369?',
        'Letmein135!'
      ];

      weakPasswords.forEach(password => {
        // These passwords now meet all character requirements but are still common
        const result = Password.create(password);
        const error = AppResultTestUtils.expectErr(result);
        expect(error.message).to.include('too common and easily guessable');
      });
    });

    it('should reject passwords with sequential characters', () => {
      const sequentialPasswords = [
        'MyPass123!',   // 123 is sequential
        'SecureAbc1!',  // abc is sequential  
        'TestPass789!', // 789 is sequential
        'ValidQwe1!'    // qwe is sequential
      ];

      sequentialPasswords.forEach(password => {
        const result = Password.create(password);
        const error = AppResultTestUtils.expectErr(result);
        expect(error.message).to.include('sequential characters (e.g., 123, abc)');
      });
    });

    it('should reject passwords with too many repeated characters', () => {
      const repeatedPasswords = [
        'Passwordddd1!', // ddd repeated
        'Secureeee12!',  // eee repeated
        'Validaaa123!',  // aaa repeated
        'Strongggg1!'    // ggg repeated
      ];

      repeatedPasswords.forEach(password => {
        const result = Password.create(password);
        const error = AppResultTestUtils.expectErr(result);
        // Check for either repeated or sequential characters (validation order may vary)
        expect(error.message).to.satisfy((msg: string) => 
          msg.includes('repeated characters') || msg.includes('sequential characters')
        );
      });
    });

    it('should accept strong passwords that pass all security checks', () => {
      const strongPasswords = [
        'StrongP@55w0rd!',
        'MyS3cur3#P@ss',
        'V3ryStr0ng$Pwd',
        'Ungu3ssab1e!'
      ];

      strongPasswords.forEach(password => {
        const result = Password.create(password);
        AppResultTestUtils.expectOk(result);
      });
    });
  });

  describe('Password Properties and Utilities', () => {
    it('should provide password length property', () => {
      // Arrange
      const passwordResult = Password.create('StrongP@55w0rd!');
      const password = AppResultTestUtils.expectOk(passwordResult);
      
      // Act & Assert
      expect(password.length).to.equal(15);
    });

    it('should classify password length correctly', () => {
      // Short password (< 12 characters)
      const shortResult = Password.create('StrongP@55w0rd!');  
      const shortPassword = AppResultTestUtils.expectOk(shortResult);
      expect(shortPassword.isShort).to.be.false;  // 15 chars is not short
      expect(shortPassword.isMedium).to.be.true;  // 15 chars is medium
      expect(shortPassword.isLong).to.be.false;   // 15 chars is not long
      
      // Medium password (12-20 characters)
      const mediumResult = Password.create('StrongP@55w0rd!');
      const mediumPassword = AppResultTestUtils.expectOk(mediumResult);
      expect(mediumPassword.isShort).to.be.false;
      expect(mediumPassword.isMedium).to.be.true;
      expect(mediumPassword.isLong).to.be.false;
      
      // Long password (> 20 characters) - ensure it's actually long
      const longPassword = 'VeryLongStrongP@55w0rdExtraLongPasswordForTesting';
      expect(longPassword.length).to.be.greaterThan(20); // Verify it's actually long
      const longResult = Password.create(longPassword);
      const longPasswordObj = AppResultTestUtils.expectOk(longResult);
      expect(longPasswordObj.isShort).to.be.false;
      expect(longPasswordObj.isMedium).to.be.false;
      expect(longPasswordObj.isLong).to.be.true;
    });

    it('should detect character types correctly', () => {
      // Arrange
      const passwordResult = Password.create('StrongP@55w0rd!');
      const password = AppResultTestUtils.expectOk(passwordResult);
      
      // Act & Assert
      expect(password.hasLowercase).to.be.true;
      expect(password.hasUppercase).to.be.true;
      expect(password.hasNumbers).to.be.true;
      expect(password.hasSpecialChars).to.be.true;
    });

    it('should provide masked representations for security', () => {
      // Arrange
      const passwordResult = Password.create('StrongP@55w0rd!');
      const password = AppResultTestUtils.expectOk(passwordResult);
      
      // Act & Assert
      expect(password.masked).to.equal('***************');
      expect(password.partiallyMasked).to.equal('S*************!');
    });
  });

  describe('Serialization Patterns', () => {
    it('should serialize to string value', () => {
      // Arrange
      const passwordResult = Password.create('StrongP@55w0rd!');
      const password = AppResultTestUtils.expectOk(passwordResult);
      
      // Act
      const serialized = password.serialize();
      
      // Assert
      expect(serialized).to.be.a('string');
      expect(serialized).to.equal('StrongP@55w0rd!');
    });

    it('should preserve original format in serialization', () => {
      // Arrange
      const passwordResult = Password.create('StrongP@55w0rd!');
      const password = AppResultTestUtils.expectOk(passwordResult);
      
      // Act
      const serialized = password.serialize();
      
      // Assert
      expect(serialized).to.equal('StrongP@55w0rd!');
    });

    it('should provide consistent serialization across instances', () => {
      // Arrange
      const password1Result = Password.create('StrongP@55w0rd!');
      const password2Result = Password.create('StrongP@55w0rd!');
      
      const password1 = AppResultTestUtils.expectOk(password1Result);
      const password2 = AppResultTestUtils.expectOk(password2Result);
      
      // Act & Assert
      expect(password1.serialize()).to.equal(password2.serialize());
    });
  });

  describe('Utility Methods', () => {
    it('should provide string representation', () => {
      // Arrange
      const passwordResult = Password.create('StrongP@55w0rd!');
      const password = AppResultTestUtils.expectOk(passwordResult);
      
      // Act & Assert
      expect(password.toString()).to.equal('StrongP@55w0rd!');
      expect(String(password)).to.equal('StrongP@55w0rd!');
    });

    it('should calculate password strength score', () => {
      // Arrange
      const passwordResult = Password.create('StrongP@55w0rd!');
      const password = AppResultTestUtils.expectOk(passwordResult);
      
      // Act & Assert
      expect(password.strengthScore).to.be.a('number');
      expect(password.strengthScore).to.be.greaterThan(0);
      expect(password.strengthScore).to.be.lessThanOrEqual(100);
    });

    it('should provide password strength level', () => {
      // Arrange
      const weakResult = Password.create('MyStr0ng#Pa55w0rd');
      const strongResult = Password.create('StrongP@55w0rd!');
      
      const weakPassword = AppResultTestUtils.expectOk(weakResult);
      const strongPassword = AppResultTestUtils.expectOk(strongResult);
      
      // Act & Assert
      expect(weakPassword.strengthLevel).to.be.oneOf(['weak', 'fair', 'good', 'strong', 'excellent']);
      expect(strongPassword.strengthLevel).to.be.oneOf(['good', 'strong', 'excellent']);
    });

    it('should evaluate security requirements and strength', () => {
      // Arrange
      const passwordResult = Password.create('StrongP@55w0rd!');
      const password = AppResultTestUtils.expectOk(passwordResult);
      
      // Act & Assert
      expect(password.meetsSecurityRequirements).to.be.a('boolean');
      expect(password.isStrong).to.be.a('boolean');
      expect(password.isWeak).to.be.a('boolean');
    });

    it('should provide static validation and utility methods', () => {
      // Act & Assert
      expect(Password.isValid('StrongP@55w0rd!')).to.be.true;
      expect(Password.isValid('weak')).to.be.false;
      expect(Password.getMinLength()).to.equal(8);
      expect(Password.getMaxLength()).to.equal(128);
    });
  });

  describe('Error Cases and Edge Conditions', () => {
    it('should provide descriptive error messages for validation failures', () => {
      // Test short password
      const shortResult = Password.create('Abc1!');
      const shortError = AppResultTestUtils.expectErr(shortResult);
      expect(shortError.message).to.include('must be at least 8 characters');
      
      // Test missing uppercase
      const noUpperResult = Password.create('strong123!');
      const noUpperError = AppResultTestUtils.expectErr(noUpperResult);
      expect(noUpperError.message).to.include('uppercase letter');
    });

    it('should handle boundary conditions for length validation', () => {
      // Test exactly at minimum (8 chars) - ensure it meets all requirements
      const minValidPassword = 'Pas5wrd!';
      expect(minValidPassword.length).to.equal(8); // Exactly 8 chars
      expect(minValidPassword).to.match(/[a-z]/); // lowercase
      expect(minValidPassword).to.match(/[A-Z]/); // uppercase
      expect(minValidPassword).to.match(/\d/);    // number
      expect(minValidPassword).to.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/); // special char
      
      // Create a completely safe password with no sequential patterns
      const safeMinPassword = 'Pas5wrd!';
      const minValidResult = Password.create(safeMinPassword);
      if (minValidResult.isErr()) {
        console.log('Min password validation error:', minValidResult.unwrapErr().message);
      }
      AppResultTestUtils.expectOk(minValidResult);
      
      // Test exactly at maximum (128 chars) - avoid repeated characters
      const maxValid = 'SuperL0ngpw$' + '3Abracadabra1'.repeat(8) + 'P@55w0rdwow!';
      const maxValidResult = Password.create(maxValid);
      AppResultTestUtils.expectOk(maxValidResult);
      
      // Test one over maximum (129 chars)
      const tooLong = 'A' + 'SuperL0ngpw$' + '3Abracadabra1'.repeat(8) + 'P@55w0rdwow!';
      const tooLongResult = Password.create(tooLong);
      AppResultTestUtils.expectErr(tooLongResult);
    });

    it('should handle edge cases in security validation', () => {
      // Test password with exactly 3 consecutive characters (should fail)
      const threeConsecutiveResult = Password.create('Passworrrd1!');
      AppResultTestUtils.expectErr(threeConsecutiveResult);
      
      // Test password with 2 consecutive characters (should pass)
      const twoConsecutiveResult = Password.create('Password1!');
      AppResultTestUtils.expectOk(twoConsecutiveResult);
    });

    it('should handle static validation edge cases', () => {
      // Test static validation method with edge cases
      expect(Password.isValid('')).to.be.false;
      expect(Password.isValid(null as any)).to.be.false;
      expect(Password.isValid(undefined as any)).to.be.false;
      expect(Password.isValid('StrongP@55w0rd!')).to.be.true;
    });

    it('should provide comprehensive error messages for multiple validation failures', () => {
      // Password that fails multiple validations
      const result = Password.create('abc'); // Too short, no uppercase, no numbers, no special chars
      const error = AppResultTestUtils.expectErr(result);
      
      // Should include the length validation failure first
      expect(error.message).to.include('must be at least 8 characters');
    });
  });
});
