/**
 * UUID Value Object Tests
 * Testing hexapp's UUID refined type and validation patterns
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
  HexappResultTestUtils,
  AppErrorTestUtils,
  ValueObjectTestUtils,
  TestDataUtils,
  AsyncTestUtils
} from '../../shared/test-helpers.js';

describe('Domain > Value Objects > UUID (Hexapp Refined Type)', () => {
  describe('UUID Generation', () => {
    it('should generate valid UUIDs', () => {
      // Act
      const uuid1 = UUID.init();
      const uuid2 = UUID.init();
      
      // Assert
      expect(uuid1).to.be.a('string');
      expect(uuid2).to.be.a('string');
      expect(uuid1).to.not.equal(uuid2); // Should be unique
      
      // Should be valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid1).to.match(uuidRegex);
      expect(uuid2).to.match(uuidRegex);
    });

    it('should generate unique UUIDs on multiple calls', () => {
      // Act
      const uuids = Array.from({ length: 100 }, () => UUID.init());
      
      // Assert - All should be unique
      const uniqueUuids = new Set(uuids);
      expect(uniqueUuids.size).to.equal(100);
    });

    it('should generate UUID v4 format', () => {
      // Act
      const uuid = UUID.init();
      
      // Assert - Should be UUID v4 (4 in position 14, and 8/9/a/b in position 19)
      expect(uuid[14]).to.equal('4'); // Version 4
      expect(['8', '9', 'a', 'b']).to.include(uuid[19]); // Variant bits
    });
  });

  describe('UUID Validation', () => {
    it('should validate and create UUID from valid string', () => {
      // Arrange
      const validUuidString = '123e4567-e89b-12d3-a456-426614174000';
      
      // Act
      const result = UUID.create(validUuidString);
      
      // Assert
      const uuid = HexappResultTestUtils.expectOk(result);
      expect(uuid).to.equal(validUuidString);
    });

    it('should accept various valid UUID formats', () => {
      const validUuids = [
        '123e4567-e89b-12d3-a456-426614174000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
        '00000000-0000-0000-0000-000000000000' // Nil UUID
      ];

      validUuids.forEach(uuidStr => {
        const result = UUID.create(uuidStr);
        const uuid = HexappResultTestUtils.expectOk(result);
        expect(uuid).to.equal(uuidStr);
      });
    });

    it('should reject invalid UUID formats', () => {
      const invalidUuids = [
        'not-a-uuid',
        '123e4567-e89b-12d3-a456', // Too short
        '123e4567-e89b-12d3-a456-426614174000-extra', // Too long
        '123e4567-e89b-12d3-g456-426614174000', // Invalid character 'g'
        '123e4567_e89b_12d3_a456_426614174000', // Wrong separators
        '123e4567-e89b-12d3-a456-42661417400', // Missing digit
        '', // Empty string
        '123e4567-e89b-12d3-a456-42661417400g' // Invalid character at end
      ];

      invalidUuids.forEach(uuidStr => {
        const result = UUID.create(uuidStr);
        HexappResultTestUtils.expectErr(result);
      });
    });

    it('should return InvalidUUID error for invalid input', () => {
      // Act
      const result = UUID.create('invalid-uuid');
      
      // Assert
      const error = HexappResultTestUtils.expectErr(result);
      expect(error.message).to.include('Invalid UUID');
    });

    it('should handle null and undefined input', () => {
      // Test null
      const nullResult = UUID.create(null as any);
      HexappResultTestUtils.expectErr(nullResult);
      
      // Test undefined
      const undefinedResult = UUID.create(undefined as any);
      HexappResultTestUtils.expectErr(undefinedResult);
    });

    it('should handle non-string input types', () => {
      // Test number
      const numberResult = UUID.create(123 as any);
      HexappResultTestUtils.expectErr(numberResult);
      
      // Test object
      const objectResult = UUID.create({} as any);
      HexappResultTestUtils.expectErr(objectResult);
      
      // Test array
      const arrayResult = UUID.create(['uuid'] as any);
      HexappResultTestUtils.expectErr(arrayResult);
    });
  });

  describe('UUID fromTrusted Method', () => {
    it('should create UUID from trusted string without validation', () => {
      // Arrange
      const trustedUuidString = '123e4567-e89b-12d3-a456-426614174000';
      
      // Act
      const uuid = UUID.fromTrusted(trustedUuidString);
      
      // Assert
      expect(uuid).to.equal(trustedUuidString);
    });

    it('should work with generated UUIDs', () => {
      // Arrange
      const generatedUuid = UUID.init();
      
      // Act
      const trustedUuid = UUID.fromTrusted(generatedUuid);
      
      // Assert
      expect(trustedUuid).to.equal(generatedUuid);
    });

    it('should bypass validation for performance (use with caution)', () => {
      // Note: This is intentionally testing unsafe usage
      // In real code, only use fromTrusted with validated input
      
      // Arrange
      const invalidButTrusted = 'invalid-uuid-format';
      
      // Act
      const uuid = UUID.fromTrusted(invalidButTrusted);
      
      // Assert
      expect(uuid).to.equal(invalidButTrusted); // No validation performed
    });
  });

  describe('UUID Type System Integration', () => {
    it('should work with TypeScript type system', () => {
      // Arrange
      const uuid = UUID.init();
      
      // Act & Assert - These should compile without issues
      const uuidVar: UUID = uuid;
      expect(uuidVar).to.equal(uuid);
      
      // Should work with functions expecting UUID type
      function acceptUuid(id: UUID): string {
        return `ID: ${id}`;
      }
      
      const result = acceptUuid(uuid);
      expect(result).to.include('ID:');
    });

    it('should provide primitive access through UUID.primitive()', () => {
      // Arrange
      const uuid = UUID.init();
      
      // Act
      const primitive = UUID.primitive(uuid);
      
      // Assert
      expect(primitive).to.be.a('string');
      expect(primitive).to.equal(uuid);
    });

    it('should work with hexapp branded type system', () => {
      // Arrange
      const validUuidString = '123e4567-e89b-12d3-a456-426614174000';
      
      // Act
      const createResult = UUID.create(validUuidString);
      const uuid = HexappResultTestUtils.expectOk(createResult);
      
      // Assert - Should maintain branded type
      expect(typeof uuid).to.equal('string');
      expect(uuid).to.equal(validUuidString);
    });
  });

  describe('UUID in Entity Context', () => {
    it('should work as entity ID in domain layer', () => {
      // This tests how UUID integrates with entities
      
      // Arrange
      const userId = UUID.init();
      const documentId = UUID.init();
      
      // Act & Assert - Should work as entity identifiers
      expect(userId).to.not.equal(documentId);
      expect(typeof userId).to.equal('string');
      expect(typeof documentId).to.equal('string');
      
      // Should maintain UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(userId).to.match(uuidRegex);
      expect(documentId).to.match(uuidRegex);
    });

    it('should support equality comparison in collections', () => {
      // Arrange
      const uuid1 = UUID.init();
      const uuid2 = UUID.init();
      const uuid1Copy = UUID.fromTrusted(uuid1);
      
      // Act
      const uuids = [uuid1, uuid2];
      const foundUuid = uuids.find(id => id === uuid1Copy);
      
      // Assert
      expect(foundUuid).to.equal(uuid1);
      expect(foundUuid).to.equal(uuid1Copy);
    });

    it('should work with Set and Map collections', () => {
      // Arrange
      const uuid1 = UUID.init();
      const uuid2 = UUID.init();
      
      // Act - Test with Set
      const uuidSet = new Set([uuid1, uuid2, uuid1]); // Duplicate uuid1
      
      // Assert - Set should have 2 unique UUIDs
      expect(uuidSet.size).to.equal(2);
      expect(uuidSet.has(uuid1)).to.be.true;
      expect(uuidSet.has(uuid2)).to.be.true;
      
      // Act - Test with Map
      const uuidMap = new Map();
      uuidMap.set(uuid1, 'value1');
      uuidMap.set(uuid2, 'value2');
      
      // Assert
      expect(uuidMap.get(uuid1)).to.equal('value1');
      expect(uuidMap.get(uuid2)).to.equal('value2');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should provide descriptive error messages', () => {
      const invalidInputs = [
        { input: 'invalid', expectedMessage: 'Invalid UUID' },
        { input: '', expectedMessage: 'Invalid UUID' },
        { input: '123', expectedMessage: 'Invalid UUID' }
      ];

      invalidInputs.forEach(({ input, expectedMessage }) => {
        const result = UUID.create(input);
        const error = HexappResultTestUtils.expectErr(result);
        expect(error.message).to.include(expectedMessage);
      });
    });

    it('should handle case sensitivity appropriately', () => {
      // UUID validation should be case-insensitive
      const mixedCaseUuid = '123E4567-E89B-12D3-A456-426614174000';
      const lowerCaseUuid = '123e4567-e89b-12d3-a456-426614174000';
      
      const mixedResult = UUID.create(mixedCaseUuid);
      const lowerResult = UUID.create(lowerCaseUuid);
      
      // Both should be valid
      HexappResultTestUtils.expectOk(mixedResult);
      HexappResultTestUtils.expectOk(lowerResult);
    });

    it('should handle boundary conditions', () => {
      // Test nil UUID (all zeros)
      const nilUuid = '00000000-0000-0000-0000-000000000000';
      const nilResult = UUID.create(nilUuid);
      HexappResultTestUtils.expectOk(nilResult);
      
      // Test max UUID (all F's)
      const maxUuid = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
      const maxResult = UUID.create(maxUuid);
      HexappResultTestUtils.expectOk(maxResult);
    });

    it('should handle whitespace in input', () => {
      const uuidWithWhitespace = '  123e4567-e89b-12d3-a456-426614174000  ';
      
      // Current implementation might not trim - test actual behavior
      const result = UUID.create(uuidWithWhitespace);
      
      // If implementation doesn't trim, this should fail
      // If it does trim, it should succeed
      // Document current behavior
      if (result.isErr()) {
        const error = HexappResultTestUtils.expectErr(result);
        expect(error.message).to.include('Invalid UUID');
      } else {
        const uuid = HexappResultTestUtils.expectOk(result);
        expect(uuid).to.include('123e4567-e89b-12d3-a456-426614174000');
      }
    });
  });
});
