import { describe, it } from 'mocha';
import { expect } from 'chai';
import { z } from 'zod';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { LegacyBridge } from '../../../../src/shared/dto/validation/bridge-utils.js';
import { BaseDto } from '../../../../src/shared/dto/base/BaseDto.js';

// Test DTO for legacy bridge testing
class TestDto extends BaseDto {
  static readonly schema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email format'),
    age: z.number().min(18, 'Must be at least 18 years old')
  });

  static create(data: unknown): AppResult<z.infer<typeof TestDto.schema>> {
    return this.validate(this.schema, data);
  }
}

describe('LegacyBridge', () => {
  describe('toLegacyValidationResult', () => {
    it('should convert successful AppResult to legacy format', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25
      };
      const appResult = AppResult.Ok(validData);
      
      const legacyResult = LegacyBridge.toLegacyValidationResult(appResult);
      
      expect(legacyResult.success).to.be.true;
      expect(legacyResult.data).to.deep.equal(validData);
      expect(legacyResult.errors).to.be.an('array').that.is.empty;
      expect(legacyResult.technicalErrors).to.be.an('array').that.is.empty;
      expect(legacyResult.businessErrors).to.be.an('array').that.is.empty;
      expect(legacyResult.message).to.equal('Validation successful');
    });

    it('should convert failed AppResult to legacy format with business error', () => {
      const error = AppError.Generic('Validation failed');
      const appResult = AppResult.Err(error);
      
      const legacyResult = LegacyBridge.toLegacyValidationResult(appResult);
      
      expect(legacyResult.success).to.be.false;
      expect(legacyResult.data).to.be.undefined;
      expect(legacyResult.errors).to.have.length(1);
      expect(legacyResult.errors[0]).to.deep.equal({
        field: 'input',
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        type: 'business',
        severity: 'error'
      });
      expect(legacyResult.technicalErrors).to.be.an('array').that.is.empty;
      expect(legacyResult.businessErrors).to.have.length(1);
      expect(legacyResult.message).to.equal('Validation failed');
    });

    it('should convert failed AppResult to legacy format with technical error', () => {
      const error = AppError.Generic('Technical validation failed');
      const appResult = AppResult.Err(error);
      
      const legacyResult = LegacyBridge.toLegacyValidationResult(appResult, true);
      
      expect(legacyResult.success).to.be.false;
      expect(legacyResult.data).to.be.undefined;
      expect(legacyResult.errors).to.have.length(1);
      expect(legacyResult.errors[0]).to.deep.equal({
        field: 'input',
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        type: 'technical',
        severity: 'error'
      });
      expect(legacyResult.technicalErrors).to.have.length(1);
      expect(legacyResult.businessErrors).to.be.an('array').that.is.empty;
      expect(legacyResult.message).to.equal('Validation failed');
    });

    it('should handle complex data structures in successful results', () => {
      const complexData = {
        user: {
          name: 'John Doe',
          email: 'john@example.com',
          preferences: {
            theme: 'dark',
            notifications: true
          }
        },
        metadata: {
          created: '2024-01-01',
          version: '1.0'
        }
      };
      const appResult = AppResult.Ok(complexData);
      
      const legacyResult = LegacyBridge.toLegacyValidationResult(appResult);
      
      expect(legacyResult.success).to.be.true;
      expect(legacyResult.data).to.deep.equal(complexData);
      expect(legacyResult.data?.user.preferences.theme).to.equal('dark');
      expect(legacyResult.data?.metadata.version).to.equal('1.0');
    });

    it('should handle null and undefined data', () => {
      const nullResult = AppResult.Ok(null);
      const undefinedResult = AppResult.Ok(undefined);
      
      const nullLegacyResult = LegacyBridge.toLegacyValidationResult(nullResult);
      const undefinedLegacyResult = LegacyBridge.toLegacyValidationResult(undefinedResult);
      
      expect(nullLegacyResult.success).to.be.true;
      expect(nullLegacyResult.data).to.be.null;
      
      expect(undefinedLegacyResult.success).to.be.true;
      expect(undefinedLegacyResult.data).to.be.undefined;
    });

    it('should differentiate between technical and business error types', () => {
      const error = AppError.Generic('Some error');
      const appResult = AppResult.Err(error);
      
      const businessResult = LegacyBridge.toLegacyValidationResult(appResult, false);
      const technicalResult = LegacyBridge.toLegacyValidationResult(appResult, true);
      
      expect(businessResult.errors[0].type).to.equal('business');
      expect(businessResult.businessErrors).to.have.length(1);
      expect(businessResult.technicalErrors).to.have.length(0);
      
      expect(technicalResult.errors[0].type).to.equal('technical');
      expect(technicalResult.technicalErrors).to.have.length(1);
      expect(technicalResult.businessErrors).to.have.length(0);
    });
  });

  describe('wrapDtoValidation', () => {
    it('should wrap successful DTO validation in legacy format', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25
      };
      
      const legacyResult = LegacyBridge.wrapDtoValidation(TestDto, validData);
      
      expect(legacyResult.success).to.be.true;
      expect(legacyResult.data).to.deep.equal(validData);
      expect(legacyResult.errors).to.be.an('array').that.is.empty;
      expect(legacyResult.technicalErrors).to.be.an('array').that.is.empty;
      expect(legacyResult.businessErrors).to.be.an('array').that.is.empty;
      expect(legacyResult.message).to.equal('Validation successful');
    });

    it('should wrap failed DTO validation in legacy format', () => {
      const invalidData = {
        name: '', // Too short
        email: 'invalid-email', // Invalid format
        age: 16 // Too young
      };
      
      const legacyResult = LegacyBridge.wrapDtoValidation(TestDto, invalidData);
      
      expect(legacyResult.success).to.be.false;
      expect(legacyResult.data).to.be.undefined;
      expect(legacyResult.errors).to.have.length(1);
      expect(legacyResult.errors[0].type).to.equal('technical');
      expect(legacyResult.technicalErrors).to.have.length(1);
      expect(legacyResult.businessErrors).to.be.an('array').that.is.empty;
      expect(legacyResult.message).to.equal('Validation failed');
    });

    it('should include context in wrapped validation (context parameter)', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25
      };
      const context = { source: 'API', requestId: 'req-123' };
      
      const legacyResult = LegacyBridge.wrapDtoValidation(TestDto, validData, context);
      
      expect(legacyResult.success).to.be.true;
      expect(legacyResult.data).to.deep.equal(validData);
      // Context is passed but doesn't affect the result structure in current implementation
    });

    it('should handle edge cases in DTO validation', () => {
      const edgeCases = [
        null,
        undefined,
        {},
        [],
        '',
        0,
        false
      ];
      
      edgeCases.forEach((testCase, index) => {
        const legacyResult = LegacyBridge.wrapDtoValidation(TestDto, testCase);
        
        expect(legacyResult.success).to.be.false;
        expect(legacyResult.errors).to.have.length(1);
        expect(legacyResult.errors[0].type).to.equal('technical');
      });
    });

    it('should always mark DTO validation as technical validation', () => {
      const validData = { name: 'John', email: 'john@example.com', age: 25 };
      const invalidData = { name: '', email: 'invalid', age: 16 };
      
      const validResult = LegacyBridge.wrapDtoValidation(TestDto, validData);
      const invalidResult = LegacyBridge.wrapDtoValidation(TestDto, invalidData);
      
      // Valid results don't have error classifications
      expect(validResult.technicalErrors).to.be.an('array').that.is.empty;
      expect(validResult.businessErrors).to.be.an('array').that.is.empty;
      
      // Invalid results should be marked as technical
      expect(invalidResult.errors[0].type).to.equal('technical');
      expect(invalidResult.technicalErrors).to.have.length(1);
      expect(invalidResult.businessErrors).to.be.an('array').that.is.empty;
    });
  });

  describe('Legacy Format Structure Validation', () => {
    it('should always include required legacy result properties', () => {
      const appResult = AppResult.Ok({ test: 'data' });
      const legacyResult = LegacyBridge.toLegacyValidationResult(appResult);
      
      expect(legacyResult).to.have.property('success');
      expect(legacyResult).to.have.property('errors');
      expect(legacyResult).to.have.property('technicalErrors');
      expect(legacyResult).to.have.property('businessErrors');
      expect(legacyResult).to.have.property('message');
      
      expect(legacyResult.errors).to.be.an('array');
      expect(legacyResult.technicalErrors).to.be.an('array');
      expect(legacyResult.businessErrors).to.be.an('array');
    });

    it('should include data property for successful results', () => {
      const testData = { name: 'test', value: 42 };
      const appResult = AppResult.Ok(testData);
      const legacyResult = LegacyBridge.toLegacyValidationResult(appResult);
      
      expect(legacyResult).to.have.property('data');
      expect(legacyResult.data).to.deep.equal(testData);
    });

    it('should not include data property for failed results', () => {
      const error = AppError.Generic('Test error');
      const appResult = AppResult.Err(error);
      const legacyResult = LegacyBridge.toLegacyValidationResult(appResult);
      
      expect(legacyResult.data).to.be.undefined;
    });

    it('should format error objects with all required properties', () => {
      const error = AppError.Generic('Test validation error');
      const appResult = AppResult.Err(error);
      const legacyResult = LegacyBridge.toLegacyValidationResult(appResult);
      
      const errorObj = legacyResult.errors[0];
      expect(errorObj).to.have.property('field');
      expect(errorObj).to.have.property('message');
      expect(errorObj).to.have.property('code');
      expect(errorObj).to.have.property('type');
      expect(errorObj).to.have.property('severity');
      
      expect(errorObj.field).to.equal('input');
      expect(errorObj.message).to.equal('Validation failed');
      expect(errorObj.code).to.equal('VALIDATION_ERROR');
      expect(errorObj.type).to.be.oneOf(['business', 'technical']);
      expect(errorObj.severity).to.equal('error');
    });
  });

  describe('Integration with Legacy Systems', () => {
    it('should be compatible with legacy validation orchestrator format', () => {
      const testData = { name: 'John', email: 'john@example.com', age: 25 };
      const legacyResult = LegacyBridge.wrapDtoValidation(TestDto, testData);
      
      // Should match expected legacy orchestrator result structure
      expect(legacyResult).to.have.all.keys([
        'success',
        'data',
        'errors',
        'technicalErrors',
        'businessErrors',
        'message'
      ]);
    });

    it('should maintain backward compatibility with error categorization', () => {
      const error = AppError.Generic('Legacy error');
      const appResult = AppResult.Err(error);
      
      const businessResult = LegacyBridge.toLegacyValidationResult(appResult, false);
      const technicalResult = LegacyBridge.toLegacyValidationResult(appResult, true);
      
      // Business errors should appear in both errors and businessErrors arrays
      expect(businessResult.errors).to.have.length(1);
      expect(businessResult.businessErrors).to.have.length(1);
      expect(businessResult.technicalErrors).to.have.length(0);
      
      // Technical errors should appear in both errors and technicalErrors arrays
      expect(technicalResult.errors).to.have.length(1);
      expect(technicalResult.technicalErrors).to.have.length(1);
      expect(technicalResult.businessErrors).to.have.length(0);
    });

    it('should handle migration scenarios with different DTO types', () => {
      // Test with different DTO schemas to ensure generality
      class SimpleDto extends BaseDto {
        static readonly schema = z.string().min(3);
        static create(data: unknown) {
          return this.validate(this.schema, data);
        }
      }
      
      class ComplexDto extends BaseDto {
        static readonly schema = z.object({
          nested: z.object({
            field: z.number()
          }),
          array: z.array(z.string())
        });
        static create(data: unknown) {
          return this.validate(this.schema, data);
        }
      }
      
      const simpleValid = LegacyBridge.wrapDtoValidation(SimpleDto, 'valid string');
      const complexValid = LegacyBridge.wrapDtoValidation(ComplexDto, {
        nested: { field: 42 },
        array: ['a', 'b', 'c']
      });
      
      expect(simpleValid.success).to.be.true;
      expect(complexValid.success).to.be.true;
      
      const simpleInvalid = LegacyBridge.wrapDtoValidation(SimpleDto, 'ab'); // Too short
      const complexInvalid = LegacyBridge.wrapDtoValidation(ComplexDto, { invalid: 'structure' });
      
      expect(simpleInvalid.success).to.be.false;
      expect(complexInvalid.success).to.be.false;
    });
  });

  describe('Error Message Consistency', () => {
    it('should use consistent error messages across different scenarios', () => {
      const error1 = AppError.Generic('Different error message 1');
      const error2 = AppError.Generic('Different error message 2');
      
      const result1 = LegacyBridge.toLegacyValidationResult(AppResult.Err(error1));
      const result2 = LegacyBridge.toLegacyValidationResult(AppResult.Err(error2));
      
      // Should normalize to consistent message
      expect(result1.errors[0].message).to.equal('Validation failed');
      expect(result2.errors[0].message).to.equal('Validation failed');
      expect(result1.message).to.equal('Validation failed');
      expect(result2.message).to.equal('Validation failed');
    });

    it('should use consistent success messages', () => {
      const result1 = LegacyBridge.toLegacyValidationResult(AppResult.Ok('data1'));
      const result2 = LegacyBridge.toLegacyValidationResult(AppResult.Ok({ complex: 'data2' }));
      
      expect(result1.message).to.equal('Validation successful');
      expect(result2.message).to.equal('Validation successful');
    });
  });
});
