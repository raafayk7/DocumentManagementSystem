import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import { z } from 'zod';
import { BaseDto, DtoValidationError } from '../../../../src/shared/dto/base/index.js';
import { AppResult, AppError } from '@carbonteq/hexapp';

// Test DTO class that extends BaseDto
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

// Test DTO with simple schema
class SimpleDto extends BaseDto {
  static readonly schema = z.string().min(3, 'String must be at least 3 characters');

  static create(data: unknown): AppResult<string> {
    return this.validate(this.schema, data);
  }
}

describe('BaseDto and DtoValidationError', () => {
  describe('DtoValidationError', () => {
    it('should create error with message', () => {
      const error = new DtoValidationError('Test error message');
      
      expect(error.message).to.equal('Test error message');
      expect(error.name).to.equal('DtoValidationError');
      expect(error.zodError).to.be.undefined;
    });

    it('should create error with message and ZodError', () => {
      const zodError = z.string().safeParse(123).success ? undefined : z.string().safeParse(123).error;
      const error = new DtoValidationError('Test error message', zodError);
      
      expect(error.message).to.equal('Test error message');
      expect(error.name).to.equal('DtoValidationError');
      expect(error.zodError).to.equal(zodError);
    });

    it('should create error from ZodError with formatted message', () => {
      const schema = z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.string().email('Invalid email format')
      });
      
      const result = schema.safeParse({ name: '', email: 'invalid-email' });
      const zodError = result.success ? undefined : result.error;
      
      if (!zodError) throw new Error('Expected ZodError');
      
      const error = DtoValidationError.fromZodError(zodError);
      
      expect(error.message).to.include('Validation failed:');
      expect(error.message).to.include('name: Name is required');
      expect(error.message).to.include('email: Invalid email format');
      expect(error.zodError).to.equal(zodError);
    });

    it('should handle ZodError with multiple validation issues', () => {
      const schema = z.object({
        field1: z.string().min(5, 'Field1 too short'),
        field2: z.number().positive('Field2 must be positive'),
        field3: z.boolean()
      });
      
      const result = schema.safeParse({ field1: 'abc', field2: -1, field3: 'not-boolean' });
      const zodError = result.success ? undefined : result.error;
      
      if (!zodError) throw new Error('Expected ZodError');
      
      const error = DtoValidationError.fromZodError(zodError);
      
      expect(error.message).to.include('field1: Field1 too short');
      expect(error.message).to.include('field2: Field2 must be positive');
      expect(error.message).to.include('field3');
    });
  });

  describe('BaseDto.validate', () => {
    it('should return AppResult.Ok for valid data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25
      };
      
      const result = TestDto.create(validData);
      
      expect(result.isOk()).to.be.true;
      if (result.isOk()) {
        expect(result.unwrap()).to.deep.equal(validData);
      }
    });

    it('should return AppResult.Err for invalid data', () => {
      const invalidData = {
        name: '', // Too short
        email: 'invalid-email', // Invalid format
        age: 16 // Too young
      };
      
      const result = TestDto.create(invalidData);
      
      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        const error = result.unwrapErr();
        expect(error).to.be.instanceOf(AppError);
        expect(error.message).to.include('Validation failed:');
      }
    });

    it('should handle single field validation errors', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 16 // Only age is invalid
      };
      
      const result = TestDto.create(invalidData);
      
      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        const error = result.unwrapErr();
        expect(error.message).to.include('age: Must be at least 18 years old');
      }
    });

    it('should handle multiple validation errors', () => {
      const invalidData = {
        name: '', // Too short
        email: 'invalid-email', // Invalid format
        age: 16 // Too young
      };
      
      const result = TestDto.create(invalidData);
      
      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        const error = result.unwrapErr();
        expect(error.message).to.include('name: Name is required');
        expect(error.message).to.include('email: Invalid email format');
        expect(error.message).to.include('age: Must be at least 18 years old');
      }
    });

    it('should handle simple string validation', () => {
      const result = SimpleDto.create('valid string');
      
      expect(result.isOk()).to.be.true;
      if (result.isOk()) {
        expect(result.unwrap()).to.equal('valid string');
      }
    });

    it('should handle simple string validation errors', () => {
      const result = SimpleDto.create('ab'); // Too short
      
      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        const error = result.unwrapErr();
        expect(error.message).to.include('String must be at least 3 characters');
      }
    });

    it('should handle unexpected errors during validation', () => {
      // Create a schema that throws an error
      const throwingSchema = z.string().transform(() => {
        throw new Error('Unexpected error during validation');
      });
      
      class ThrowingDto extends BaseDto {
        static create(data: unknown): AppResult<string> {
          return this.validate(throwingSchema, data);
        }
      }
      
      const result = ThrowingDto.create('test');
      
      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        const error = result.unwrapErr();
        expect(error.message).to.include('Validation failed: Unexpected error during validation');
      }
    });
  });

  describe('BaseDto.handleZodErr', () => {
    it('should transform ZodError to AppError', () => {
      const schema = z.string().min(5, 'String too short');
      const result = schema.safeParse('abc');
      const zodError = result.success ? undefined : result.error;
      
      if (!zodError) throw new Error('Expected ZodError');
      
      // Access protected method through test subclass
      const appError = TestDto['handleZodErr'](zodError);
      
      expect(appError).to.be.instanceOf(AppError);
      expect(appError.message).to.include('String too short');
    });

    it('should handle complex ZodError with nested paths', () => {
      const schema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string().min(1, 'Name is required')
          })
        })
      });
      
      const result = schema.safeParse({ user: { profile: { name: '' } } });
      const zodError = result.success ? undefined : result.error;
      
      if (!zodError) throw new Error('Expected ZodError');
      
      // Access protected method through test subclass
      const appError = TestDto['handleZodErr'](zodError);
      
      expect(appError).to.be.instanceOf(AppError);
      expect(appError.message).to.include('user.profile.name: Name is required');
    });
  });

  describe('BaseDto.safeParseResult', () => {
    it('should return AppResult.Ok for valid data', () => {
      const schema = z.string().min(3);
      const result = TestDto['safeParseResult'](schema, 'valid string');
      
      expect(result.isOk()).to.be.true;
      if (result.isOk()) {
        expect(result.unwrap()).to.equal('valid string');
      }
    });

    it('should return AppResult.Err for invalid data', () => {
      const schema = z.string().min(5);
      const result = TestDto['safeParseResult'](schema, 'abc');
      
      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        const error = result.unwrapErr();
        expect(error.message).to.include('Too small');
      }
    });

    it('should be equivalent to validate method', () => {
      const schema = z.number().positive();
      const data = 42;
      
      const validateResult = TestDto['validate'](schema, data);
      const safeParseResult = TestDto['safeParseResult'](schema, data);
      
      expect(validateResult.isOk()).to.equal(safeParseResult.isOk());
      if (validateResult.isOk() && safeParseResult.isOk()) {
        expect(validateResult.unwrap()).to.equal(safeParseResult.unwrap());
      }
    });
  });

  describe('Integration with AppResult', () => {
    it('should work with AppResult.Ok pattern matching', () => {
      const result = TestDto.create({
        name: 'John Doe',
        email: 'john@example.com',
        age: 25
      });
      
      let success = false;
      let data: any = null;
      
      if (result.isOk()) {
        success = true;
        data = result.unwrap();
      }
      
      expect(success).to.be.true;
      expect(data).to.deep.equal({
        name: 'John Doe',
        email: 'john@example.com',
        age: 25
      });
    });

    it('should work with AppResult.Err pattern matching', () => {
      const result = TestDto.create({
        name: '',
        email: 'invalid-email',
        age: 16
      });
      
      let failure = false;
      let error: any = null;
      
      if (result.isErr()) {
        failure = true;
        error = result.unwrapErr();
      }
      
      expect(failure).to.be.true;
      expect(error).to.be.instanceOf(AppError);
    });

    it('should handle chaining with AppResult methods', () => {
      const result = TestDto.create({
        name: 'John Doe',
        email: 'john@example.com',
        age: 25
      });
      
      const transformed = result.map(data => ({
        ...data,
        displayName: `${data.name} (${data.email})`
      }));
      
      expect(transformed.isOk()).to.be.true;
      if (transformed.isOk()) {
        const data = transformed.unwrap();
        expect(data.displayName).to.equal('John Doe (john@example.com)');
      }
    });
  });
});
