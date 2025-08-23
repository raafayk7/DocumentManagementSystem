import { describe, it } from 'mocha';
import { expect } from 'chai';
import { z, ZodError } from 'zod';
import { AppResult } from '@carbonteq/hexapp';
import { 
  safeParseResult, 
  handleZodErr 
} from '../../../../src/shared/dto/validation/bridge-utils.js';
import { DtoValidationError } from '../../../../src/shared/dto/base/BaseDto.js';

describe('Zod Integration Utilities', () => {
  describe('safeParseResult', () => {
    it('should return AppResult.Ok for valid simple types', () => {
      const stringSchema = z.string();
      const numberSchema = z.number();
      const booleanSchema = z.boolean();
      
      const stringResult = safeParseResult(stringSchema, 'valid string');
      const numberResult = safeParseResult(numberSchema, 42);
      const booleanResult = safeParseResult(booleanSchema, true);
      
      expect(stringResult.isOk()).to.be.true;
      expect(numberResult.isOk()).to.be.true;
      expect(booleanResult.isOk()).to.be.true;
      
      if (stringResult.isOk()) expect(stringResult.unwrap()).to.equal('valid string');
      if (numberResult.isOk()) expect(numberResult.unwrap()).to.equal(42);
      if (booleanResult.isOk()) expect(booleanResult.unwrap()).to.equal(true);
    });

    it('should return AppResult.Err for invalid simple types', () => {
      const stringSchema = z.string();
      const numberSchema = z.number();
      const booleanSchema = z.boolean();
      
      const stringResult = safeParseResult(stringSchema, 123);
      const numberResult = safeParseResult(numberSchema, 'not a number');
      const booleanResult = safeParseResult(booleanSchema, 'not a boolean');
      
      expect(stringResult.isErr()).to.be.true;
      expect(numberResult.isErr()).to.be.true;
      expect(booleanResult.isErr()).to.be.true;
      
      if (stringResult.isErr()) {
        expect(stringResult.unwrapErr()).to.be.instanceOf(Error);
      }
    });

    it('should handle complex object schemas', () => {
      const userSchema = z.object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
        email: z.string().email('Invalid email format'),
        age: z.number().min(18, 'Must be at least 18 years old'),
        preferences: z.object({
          theme: z.enum(['light', 'dark']),
          notifications: z.boolean()
        })
      });
      
      const validUser = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
        preferences: {
          theme: 'dark' as const,
          notifications: true
        }
      };
      
      const result = safeParseResult(userSchema, validUser);
      
      expect(result.isOk()).to.be.true;
      if (result.isOk()) {
        const data = result.unwrap();
        expect(data.name).to.equal('John Doe');
        expect(data.preferences.theme).to.equal('dark');
      }
    });

    it('should handle complex object validation errors', () => {
      const userSchema = z.object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
        email: z.string().email('Invalid email format'),
        age: z.number().min(18, 'Must be at least 18 years old')
      });
      
      const invalidUser = {
        name: 'A', // Too short
        email: 'invalid-email', // Invalid format
        age: 16 // Too young
      };
      
      const result = safeParseResult(userSchema, invalidUser);
      
      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        const error = result.unwrapErr();
        expect(error).to.be.instanceOf(Error);
        expect(error.message).to.include('name:');
        expect(error.message).to.include('email:');
        expect(error.message).to.include('age:');
      }
    });

    it('should handle array schemas', () => {
      const arraySchema = z.array(z.string().min(1));
      
      const validArray = ['item1', 'item2', 'item3'];
      const invalidArray = ['valid', '', 'another']; // Empty string is invalid
      
      const validResult = safeParseResult(arraySchema, validArray);
      const invalidResult = safeParseResult(arraySchema, invalidArray);
      
      expect(validResult.isOk()).to.be.true;
      expect(invalidResult.isErr()).to.be.true;
      
      if (validResult.isOk()) {
        expect(validResult.unwrap()).to.deep.equal(validArray);
      }
    });

    it('should handle union schemas', () => {
      const unionSchema = z.union([
        z.string(),
        z.number(),
        z.object({ type: z.literal('custom'), value: z.any() })
      ]);
      
      const stringResult = safeParseResult(unionSchema, 'text');
      const numberResult = safeParseResult(unionSchema, 42);
      const objectResult = safeParseResult(unionSchema, { type: 'custom', value: 'anything' });
      const invalidResult = safeParseResult(unionSchema, true); // Boolean not in union
      
      expect(stringResult.isOk()).to.be.true;
      expect(numberResult.isOk()).to.be.true;
      expect(objectResult.isOk()).to.be.true;
      expect(invalidResult.isErr()).to.be.true;
    });

    it('should handle optional and nullable schemas', () => {
      const optionalSchema = z.string().optional();
      const nullableSchema = z.string().nullable();
      const optionalNullableSchema = z.string().optional().nullable();
      
      const validOptional = safeParseResult(optionalSchema, undefined);
      const validNullable = safeParseResult(nullableSchema, null);
      const validOptionalNullable1 = safeParseResult(optionalNullableSchema, undefined);
      const validOptionalNullable2 = safeParseResult(optionalNullableSchema, null);
      const validString = safeParseResult(optionalNullableSchema, 'actual string');
      
      expect(validOptional.isOk()).to.be.true;
      expect(validNullable.isOk()).to.be.true;
      expect(validOptionalNullable1.isOk()).to.be.true;
      expect(validOptionalNullable2.isOk()).to.be.true;
      expect(validString.isOk()).to.be.true;
    });

    it('should handle transformation schemas', () => {
      const transformSchema = z.string()
        .transform(val => val.toUpperCase())
        .transform(val => val.split(''));
      
      const result = safeParseResult(transformSchema, 'hello');
      
      expect(result.isOk()).to.be.true;
      if (result.isOk()) {
        expect(result.unwrap()).to.deep.equal(['H', 'E', 'L', 'L', 'O']);
      }
    });

    it('should handle refinement schemas', () => {
      const refinedSchema = z.string()
        .min(5, 'Must be at least 5 characters')
        .refine(val => val.includes('@'), 'Must contain @ symbol')
        .refine(val => val.endsWith('.com'), 'Must end with .com');
      
      const validResult = safeParseResult(refinedSchema, 'user@example.com');
      const invalidResult = safeParseResult(refinedSchema, 'user@example.org'); // Doesn't end with .com
      
      expect(validResult.isOk()).to.be.true;
      expect(invalidResult.isErr()).to.be.true;
    });

    it('should handle deeply nested object schemas', () => {
      const nestedSchema = z.object({
        level1: z.object({
          level2: z.object({
            level3: z.object({
              value: z.string().min(1, 'Value is required'),
              count: z.number().positive('Count must be positive')
            })
          })
        })
      });
      
      const validNested = {
        level1: {
          level2: {
            level3: {
              value: 'deep value',
              count: 5
            }
          }
        }
      };
      
      const invalidNested = {
        level1: {
          level2: {
            level3: {
              value: '', // Invalid
              count: -1 // Invalid
            }
          }
        }
      };
      
      const validResult = safeParseResult(nestedSchema, validNested);
      const invalidResult = safeParseResult(nestedSchema, invalidNested);
      
      expect(validResult.isOk()).to.be.true;
      expect(invalidResult.isErr()).to.be.true;
      
      if (invalidResult.isErr()) {
        const error = invalidResult.unwrapErr();
        expect(error.message).to.include('level1.level2.level3.value');
        expect(error.message).to.include('level1.level2.level3.count');
      }
    });
  });

  describe('handleZodErr', () => {
    it('should convert ZodError to DtoValidationError', () => {
      const schema = z.string().min(5, 'Must be at least 5 characters');
      const result = schema.safeParse('abc');
      
      if (!result.success) {
        const dtoError = handleZodErr(result.error);
        
        expect(dtoError).to.be.instanceOf(DtoValidationError);
        expect(dtoError.zodError).to.equal(result.error);
        expect(dtoError.message).to.include('Must be at least 5 characters');
      }
    });

    it('should handle ZodError with multiple issues', () => {
      const schema = z.object({
        name: z.string().min(2, 'Name too short'),
        email: z.string().email('Invalid email'),
        age: z.number().min(18, 'Too young')
      });
      
      const result = schema.safeParse({
        name: 'A',
        email: 'invalid',
        age: 16
      });
      
      if (!result.success) {
        const dtoError = handleZodErr(result.error);
        
        expect(dtoError.message).to.include('name: Name too short');
        expect(dtoError.message).to.include('email: Invalid email');
        expect(dtoError.message).to.include('age: Too young');
      }
    });

    it('should handle ZodError with nested path issues', () => {
      const schema = z.object({
        user: z.object({
          profile: z.object({
            settings: z.object({
              theme: z.enum(['light', 'dark'], { message: 'Invalid theme' })
            })
          })
        })
      });
      
      const result = schema.safeParse({
        user: {
          profile: {
            settings: {
              theme: 'invalid'
            }
          }
        }
      });
      
      if (!result.success) {
        const dtoError = handleZodErr(result.error);
        
        expect(dtoError.message).to.include('user.profile.settings.theme');
        expect(dtoError.message).to.include('Invalid theme');
      }
    });

    it('should handle ZodError with array index paths', () => {
      const schema = z.object({
        items: z.array(z.object({
          id: z.string().min(1, 'ID required'),
          value: z.number().positive('Must be positive')
        }))
      });
      
      const result = schema.safeParse({
        items: [
          { id: 'valid', value: 10 },
          { id: '', value: -5 }, // Both invalid
          { id: 'also-valid', value: 20 }
        ]
      });
      
      if (!result.success) {
        const dtoError = handleZodErr(result.error);
        
        expect(dtoError.message).to.include('items.1.id');
        expect(dtoError.message).to.include('items.1.value');
        expect(dtoError.message).to.include('ID required');
        expect(dtoError.message).to.include('Must be positive');
      }
    });

    it('should preserve original ZodError for detailed inspection', () => {
      const schema = z.string().email('Must be valid email');
      const result = schema.safeParse('not-an-email');
      
      if (!result.success) {
        const dtoError = handleZodErr(result.error);
        
        expect(dtoError.zodError).to.be.instanceOf(ZodError);
        expect(dtoError.zodError).to.equal(result.error);
        expect(dtoError.zodError!.issues).to.have.length(1);
        expect(dtoError.zodError!.issues[0].code).to.be.oneOf(['invalid_string', 'invalid_format']);
      }
    });
  });

  describe('Integration Between safeParseResult and handleZodErr', () => {
    it('should produce consistent errors between direct usage', () => {
      const schema = z.object({
        field: z.string().min(3, 'Too short')
      });
      const invalidData = { field: 'ab' };
      
      // Using safeParseResult
      const appResult = safeParseResult(schema, invalidData);
      
      // Using handleZodErr directly
      const zodResult = schema.safeParse(invalidData);
      const directError = zodResult.success ? null : handleZodErr(zodResult.error);
      
      expect(appResult.isErr()).to.be.true;
      expect(directError).to.not.be.null;
      
      if (appResult.isErr() && directError) {
        const appError = appResult.unwrapErr();
        expect(appError.message).to.equal(directError.message);
        // For AppError, zodError property may not exist, so we'll just check message consistency
      }
    });

    it('should handle complex validation scenarios consistently', () => {
      const schema = z.object({
        metadata: z.record(z.string(), z.string().min(1, 'Value cannot be empty')),
        tags: z.array(z.string().min(1, 'Tag cannot be empty')),
        config: z.object({
          enabled: z.boolean(),
          threshold: z.number().min(0).max(100, 'Must be between 0 and 100')
        })
      });
      
      const invalidData = {
        metadata: { key1: 'valid', key2: '' }, // Empty value
        tags: ['valid-tag', ''], // Empty tag
        config: {
          enabled: true,
          threshold: 150 // Out of range
        }
      };
      
      const result = safeParseResult(schema, invalidData);
      expect(result.isErr()).to.be.true;
      
      if (result.isErr()) {
        const error = result.unwrapErr();
        expect(error.message).to.include('metadata.key2');
        expect(error.message).to.include('tags.1');
        expect(error.message).to.include('config.threshold');
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle schemas that always pass', () => {
      const anySchema = z.any();
      const unknownSchema = z.unknown();
      
      const anyResult = safeParseResult(anySchema, { literally: 'anything' });
      const unknownResult = safeParseResult(unknownSchema, null);
      
      expect(anyResult.isOk()).to.be.true;
      expect(unknownResult.isOk()).to.be.true;
    });

    it('should handle schemas that always fail custom validation', () => {
      const alwaysFailSchema = z.any().refine(() => false, 'Always fails');
      
      const result = safeParseResult(alwaysFailSchema, 'anything');
      
      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        expect(result.unwrapErr().message).to.include('Always fails');
      }
    });

    it('should handle recursive/circular schema references', () => {
      type Node = {
        value: string;
        children?: Node[];
      };
      
      const nodeSchema: z.ZodType<Node> = z.lazy(() => z.object({
        value: z.string(),
        children: z.array(nodeSchema).optional()
      }));
      
      const validNode = {
        value: 'root',
        children: [
          { value: 'child1' },
          { 
            value: 'child2', 
            children: [
              { value: 'grandchild' }
            ]
          }
        ]
      };
      
      const result = safeParseResult(nodeSchema, validNode);
      expect(result.isOk()).to.be.true;
    });

    it('should handle very large objects without performance issues', () => {
      const largeObjectSchema = z.object({
        data: z.record(z.string(), z.number())
      });
      
      const largeData: Record<string, number> = {};
      for (let i = 0; i < 1000; i++) {
        largeData[`key${i}`] = i;
      }
      
      const result = safeParseResult(largeObjectSchema, { data: largeData });
      expect(result.isOk()).to.be.true;
    });

    it('should handle schemas with custom error messages', () => {
      const customSchema = z.string().min(5, {
        message: 'Custom error: String must have at least 5 characters'
      });
      
      const result = safeParseResult(customSchema, 'abc');
      
      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        expect(result.unwrapErr().message).to.include('Custom error: String must have at least 5 characters');
      }
    });
  });
});
