import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { z } from 'zod';
import { ValidationBridge, LegacyBridge, safeParseResult, handleZodErr } from '../../../../src/shared/dto/validation/bridge-utils.js';
import { DtoValidationError } from '../../../../src/shared/dto/base/index.js';
import { AppResult, AppError } from '@carbonteq/hexapp';

// Test DTO class for validation testing
class TestDto {
  static readonly schema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email format'),
    age: z.number().min(18, 'Must be at least 18 years old')
  });

  static create(data: unknown): AppResult<z.infer<typeof TestDto.schema>> {
    return safeParseResult(this.schema, data);
  }
}

// Test schema for query parameter validation
const QuerySchema = z.object({
  page: z.coerce.number().min(1, 'Page must be at least 1'),
  limit: z.coerce.number().min(1).max(100, 'Limit must be between 1 and 100'),
  search: z.string().optional()
});

// Test schema for path parameter validation
const PathSchema = z.object({
  id: z.string().uuid('Invalid UUID format')
});

describe('ValidationBridge', () => {
  describe('safeParseResult', () => {
    it('should return AppResult.Ok for valid data', () => {
      const validData = 'valid string';
      const schema = z.string().min(3);
      
      const result = safeParseResult(schema, validData);
      
      expect(result.isOk()).to.be.true;
      if (result.isOk()) {
        expect(result.unwrap()).to.equal(validData);
      }
    });

    it('should return AppResult.Err for invalid data', () => {
      const invalidData = 'ab'; // Too short
      const schema = z.string().min(3, 'String too short');
      
      const result = safeParseResult(schema, invalidData);
      
      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        const error = result.unwrapErr();
              expect(error).to.be.instanceOf(Error);
      expect(error.message).to.include('String too short');
      }
    });

    it('should handle complex object validation', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25
      };
      
      const result = safeParseResult(TestDto.schema, validData);
      
      expect(result.isOk()).to.be.true;
      if (result.isOk()) {
        expect(result.unwrap()).to.deep.equal(validData);
      }
    });

    it('should handle complex object validation errors', () => {
      const invalidData = {
        name: '', // Too short
        email: 'invalid-email', // Invalid format
        age: 16 // Too young
      };
      
      const result = safeParseResult(TestDto.schema, invalidData);
      
      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        const error = result.unwrapErr();
        expect(error.message).to.include('name: Name is required');
        expect(error.message).to.include('email: Invalid email format');
        expect(error.message).to.include('age: Must be at least 18 years old');
      }
    });
  });

  describe('handleZodErr', () => {
    it('should transform ZodError to DtoValidationError', () => {
      const schema = z.string().min(5, 'String too short');
      const result = schema.safeParse('abc');
      const zodError = result.success ? undefined : result.error;
      
      if (!zodError) throw new Error('Expected ZodError');
      
      const error = handleZodErr(zodError);
      
      expect(error).to.be.instanceOf(Error);
      expect(error.message).to.include('String too short');
      expect(error.zodError).to.equal(zodError);
    });

    it('should handle ZodError with multiple validation issues', () => {
      const schema = z.object({
        field1: z.string().min(5, 'Field1 too short'),
        field2: z.number().positive('Field2 must be positive')
      });
      
      const result = schema.safeParse({ field1: 'abc', field2: -1 });
      const zodError = result.success ? undefined : result.error;
      
      if (!zodError) throw new Error('Expected ZodError');
      
      const error = handleZodErr(zodError);
      
      expect(error.message).to.include('field1: Field1 too short');
      expect(error.message).to.include('field2: Field2 must be positive');
    });
  });

  describe('ValidationBridge.validateRequestBody', () => {
    it('should validate request body using DTO class', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25
      };
      
      const result = ValidationBridge.validateRequestBody(TestDto, validData);
      
      expect(result.isOk()).to.be.true;
      if (result.isOk()) {
        expect(result.unwrap()).to.deep.equal(validData);
      }
    });

    it('should return validation error for invalid request body', () => {
      const invalidData = {
        name: '', // Too short
        email: 'invalid-email', // Invalid format
        age: 16 // Too young
      };
      
      const result = ValidationBridge.validateRequestBody(TestDto, invalidData);
      
      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        const error = result.unwrapErr();
              expect(error).to.be.instanceOf(Error);
      expect(error.message).to.include('Validation failed:');
      }
    });
  });

  describe('ValidationBridge.validateQueryParams', () => {
    it('should validate query parameters using schema', () => {
      const validQuery = {
        page: '1',
        limit: '10',
        search: 'test'
      };
      
      const result = ValidationBridge.validateQueryParams(QuerySchema, validQuery);
      
      expect(result.isOk()).to.be.true;
      if (result.isOk()) {
        expect(result.unwrap()).to.deep.equal({
          page: 1,
          limit: 10,
          search: 'test'
        });
      }
    });

    it('should return validation error for invalid query parameters', () => {
      const invalidQuery = {
        page: '0', // Too low
        limit: '150' // Too high
      };
      
      const result = ValidationBridge.validateQueryParams(QuerySchema, invalidQuery);
      
      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        const error = result.unwrapErr();
        expect(error.message).to.include('Page must be at least 1');
        expect(error.message).to.include('Limit must be between 1 and 100');
      }
    });

    it('should handle missing optional query parameters', () => {
      const minimalQuery = {
        page: '1',
        limit: '10'
      };
      
      const result = ValidationBridge.validateQueryParams(QuerySchema, minimalQuery);
      
      expect(result.isOk()).to.be.true;
      if (result.isOk()) {
        expect(result.unwrap()).to.deep.equal({
          page: 1,
          limit: 10
        });
      }
    });
  });

  describe('ValidationBridge.validatePathParams', () => {
    it('should validate path parameters using schema', () => {
      const validParams = {
        id: '123e4567-e89b-12d3-a456-426614174000'
      };
      
      const result = ValidationBridge.validatePathParams(PathSchema, validParams);
      
      expect(result.isOk()).to.be.true;
      if (result.isOk()) {
        expect(result.unwrap()).to.deep.equal(validParams);
      }
    });

    it('should return validation error for invalid path parameters', () => {
      const invalidParams = {
        id: 'invalid-uuid'
      };
      
      const result = ValidationBridge.validatePathParams(PathSchema, invalidParams);
      
      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        const error = result.unwrapErr();
        expect(error.message).to.include('Invalid UUID format');
      }
    });
  });

  describe('ValidationBridge.formatValidationError', () => {
    it('should format validation error with details', () => {
      const schema = z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.string().email('Invalid email format')
      });
      
      const result = schema.safeParse({ name: '', email: 'invalid-email' });
      const zodError = result.success ? undefined : result.error;
      
      if (!zodError) throw new Error('Expected ZodError');
      
      const validationError = DtoValidationError.fromZodError(zodError);
      const formatted = ValidationBridge.formatValidationError(validationError);
      
      expect(formatted.success).to.be.false;
      expect(formatted.message).to.equal('Validation failed');
      expect(formatted.error).to.include('Validation failed:');
      expect(formatted.details).to.exist;
      expect(formatted.details?.issues).to.have.length(2);
      
      const nameIssue = formatted.details?.issues.find(issue => issue.field === 'name');
      const emailIssue = formatted.details?.issues.find(issue => issue.field === 'email');
      
      expect(nameIssue?.message).to.equal('Name is required');
      expect(emailIssue?.message).to.equal('Invalid email format');
    });

    it('should handle validation error without ZodError details', () => {
      const validationError = new DtoValidationError('Custom validation error');
      const formatted = ValidationBridge.formatValidationError(validationError);
      
      expect(formatted.success).to.be.false;
      expect(formatted.message).to.equal('Validation failed');
      expect(formatted.error).to.equal('Custom validation error');
      expect(formatted.details).to.be.undefined;
    });
  });

  describe('ValidationBridge.createBodyValidationMiddleware', () => {
    it('should create middleware that validates request body', () => {
      const middleware = ValidationBridge.createBodyValidationMiddleware(TestDto);
      
      const mockRequest: any = {
        body: {
          name: 'John Doe',
          email: 'john@example.com',
          age: 25
        }
      };
      
      const mockReply = {
        code: sinon.stub().returnsThis(),
        send: sinon.stub()
      };
      
      const mockDone = sinon.stub();
      
      middleware(mockRequest, mockReply, mockDone);
      
      expect(mockRequest.validatedBody).to.deep.equal({
        name: 'John Doe',
        email: 'john@example.com',
        age: 25
      });
      expect(mockDone.calledOnce).to.be.true;
      expect(mockReply.code.called).to.be.false;
      expect(mockReply.send.called).to.be.false;
    });

    it('should create middleware that rejects invalid request body', () => {
      const middleware = ValidationBridge.createBodyValidationMiddleware(TestDto);
      
      const mockRequest: any = {
        body: {
          name: '', // Invalid
          email: 'invalid-email', // Invalid
          age: 16 // Invalid
        }
      };
      
      const mockReply = {
        code: sinon.stub().returnsThis(),
        send: sinon.stub()
      };
      
      const mockDone = sinon.stub();
      
      middleware(mockRequest, mockReply, mockDone);
      
      expect(mockRequest.validatedBody).to.be.undefined;
      expect(mockDone.called).to.be.false;
      expect(mockReply.code.calledWith(400)).to.be.true;
      expect(mockReply.send.calledWith({
        success: false,
        message: 'Validation failed',
        error: 'Invalid request body data'
      })).to.be.true;
    });
  });

  describe('ValidationBridge.createQueryValidationMiddleware', () => {
    it('should create middleware that validates query parameters', () => {
      const middleware = ValidationBridge.createQueryValidationMiddleware(QuerySchema);
      
      const mockRequest: any = {
        query: {
          page: '1',
          limit: '10',
          search: 'test'
        }
      };
      
      const mockReply = {
        code: sinon.stub().returnsThis(),
        send: sinon.stub()
      };
      
      const mockDone = sinon.stub();
      
      middleware(mockRequest, mockReply, mockDone);
      
      expect(mockRequest.validatedQuery).to.deep.equal({
        page: 1,
        limit: 10,
        search: 'test'
      });
      expect(mockDone.calledOnce).to.be.true;
      expect(mockReply.code.called).to.be.false;
      expect(mockReply.send.called).to.be.false;
    });

    it('should create middleware that rejects invalid query parameters', () => {
      const middleware = ValidationBridge.createQueryValidationMiddleware(QuerySchema);
      
      const mockRequest: any = {
        query: {
          page: '0', // Invalid
          limit: '150' // Invalid
        }
      };
      
      const mockReply = {
        code: sinon.stub().returnsThis(),
        send: sinon.stub()
      };
      
      const mockDone = sinon.stub();
      
      middleware(mockRequest, mockReply, mockDone);
      
      expect(mockRequest.validatedQuery).to.be.undefined;
      expect(mockDone.called).to.be.false;
      expect(mockReply.code.calledWith(400)).to.be.true;
      expect(mockReply.send.calledWith({
        success: false,
        message: 'Validation failed',
        error: 'Invalid query parameters'
      })).to.be.true;
    });
  });

  describe('ValidationBridge.createParamsValidationMiddleware', () => {
    it('should create middleware that validates path parameters', () => {
      const middleware = ValidationBridge.createParamsValidationMiddleware(PathSchema);
      
      const mockRequest: any = {
        params: {
          id: '123e4567-e89b-12d3-a456-426614174000'
        }
      };
      
      const mockReply = {
        code: sinon.stub().returnsThis(),
        send: sinon.stub()
      };
      
      const mockDone = sinon.stub();
      
      middleware(mockRequest, mockReply, mockDone);
      
      expect(mockRequest.validatedParams).to.deep.equal({
        id: '123e4567-e89b-12d3-a456-426614174000'
      });
      expect(mockDone.calledOnce).to.be.true;
      expect(mockReply.code.called).to.be.false;
      expect(mockReply.send.called).to.be.false;
    });

    it('should create middleware that rejects invalid path parameters', () => {
      const middleware = ValidationBridge.createParamsValidationMiddleware(PathSchema);
      
      const mockRequest: any = {
        params: {
          id: 'invalid-uuid'
        }
      };
      
      const mockReply = {
        code: sinon.stub().returnsThis(),
        send: sinon.stub()
      };
      
      const mockDone = sinon.stub();
      
      middleware(mockRequest, mockReply, mockDone);
      
      expect(mockRequest.validatedParams).to.be.undefined;
      expect(mockDone.called).to.be.false;
      expect(mockReply.code.calledWith(400)).to.be.true;
      expect(mockReply.send.calledWith({
        success: false,
        message: 'Validation failed',
        error: 'Invalid path parameters'
      })).to.be.true;
    });
  });
});

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

    it('should convert failed AppResult to legacy format', () => {
      const appResult = AppResult.Err(new Error('Validation failed'));
      const legacyResult = LegacyBridge.toLegacyValidationResult(appResult);
      
      expect(legacyResult.success).to.be.false;
      expect(legacyResult.data).to.be.undefined;
      expect(legacyResult.errors).to.have.length(1);
      expect(legacyResult.errors[0].field).to.equal('input');
      expect(legacyResult.errors[0].message).to.equal('Validation failed');
      expect(legacyResult.errors[0].code).to.equal('VALIDATION_ERROR');
      expect(legacyResult.errors[0].type).to.equal('business');
      expect(legacyResult.errors[0].severity).to.equal('error');
      expect(legacyResult.message).to.equal('Validation failed');
    });

    it('should handle technical-only validation errors', () => {
      const appResult = AppResult.Err(new Error('Technical validation failed'));
      const legacyResult = LegacyBridge.toLegacyValidationResult(appResult, true);
      
      expect(legacyResult.success).to.be.false;
      expect(legacyResult.technicalErrors).to.have.length(1);
      expect(legacyResult.businessErrors).to.be.an('array').that.is.empty;
      expect(legacyResult.errors[0].type).to.equal('technical');
    });
  });

  describe('wrapDtoValidation', () => {
    it('should wrap DTO validation in legacy format', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25
      };
      
      const legacyResult = LegacyBridge.wrapDtoValidation(TestDto, validData);
      
      expect(legacyResult.success).to.be.true;
      expect(legacyResult.data).to.deep.equal(validData);
      expect(legacyResult.message).to.equal('Validation successful');
    });

    it('should wrap failed DTO validation in legacy format', () => {
      const invalidData = {
        name: '', // Invalid
        email: 'invalid-email', // Invalid
        age: 16 // Invalid
      };
      
      const legacyResult = LegacyBridge.wrapDtoValidation(TestDto, invalidData);
      
      expect(legacyResult.success).to.be.false;
      expect(legacyResult.data).to.be.undefined;
      expect(legacyResult.errors).to.have.length(1);
      expect(legacyResult.errors[0].type).to.equal('technical');
      expect(legacyResult.message).to.equal('Validation failed');
    });

    it('should include context in legacy result', () => {
      const validData = { name: 'John Doe', email: 'john@example.com', age: 25 };
      const context = { source: 'test' };
      
      const legacyResult = LegacyBridge.wrapDtoValidation(TestDto, validData, context);
      
      expect(legacyResult.success).to.be.true;
      expect(legacyResult.data).to.deep.equal(validData);
    });
  });
});
