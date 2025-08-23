/**
 * DateTime Value Object Tests
 * Testing hexapp's DateTime refined type and validation patterns
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

describe('Domain > Value Objects > DateTime (Hexapp Refined Type)', () => {
  describe('DateTime Creation', () => {
    it('should create DateTime.now() with current timestamp', () => {
      // Act
      const dateTime1 = DateTime.now();
      const dateTime2 = DateTime.now();
      
      // Assert
      expect(dateTime1).to.be.instanceOf(Date);
      expect(dateTime2).to.be.instanceOf(Date);
      
      // Should be very close in time (within 1 second)
      const timeDiff = Math.abs(dateTime2.getTime() - dateTime1.getTime());
      expect(timeDiff).to.be.lessThan(1000);
    });

    it('should create DateTime from Date object', () => {
      // Arrange
      const sourceDate = new Date('2024-01-15T10:30:00Z');
      
      // Act
      const dateTime = DateTime.from(sourceDate);
      
      // Assert
      expect(dateTime).to.be.instanceOf(Date);
      expect(dateTime.getTime()).to.equal(sourceDate.getTime());
    });

    it('should create DateTime from existing DateTime', () => {
      // Arrange
      const sourceDateTime = DateTime.now();
      
      // Act
      const dateTime = DateTime.from(sourceDateTime);
      
      // Assert
      expect(dateTime).to.be.instanceOf(Date);
      expect(dateTime.getTime()).to.equal(sourceDateTime.getTime());
    });

    it('should create consistent DateTime from same source', () => {
      // Arrange
      const sourceDate = new Date('2024-01-15T10:30:00Z');
      
      // Act
      const dateTime1 = DateTime.from(sourceDate);
      const dateTime2 = DateTime.from(sourceDate);
      
      // Assert - Should be the same time
      expect(dateTime1.getTime()).to.equal(dateTime2.getTime());
      expect(dateTime1.toISOString()).to.equal(dateTime2.toISOString());
    });
  });

  describe('DateTime Validation', () => {
    it('should validate and create DateTime from valid Date object', () => {
      // Arrange
      const validDate = new Date('2024-01-15T10:30:00Z');
      
      // Act
      const result = DateTime.create(validDate);
      
      // Assert
      const dateTime = HexappResultTestUtils.expectOk(result);
      expect(dateTime).to.be.instanceOf(Date);
      expect(dateTime.getTime()).to.equal(validDate.getTime());
    });

    it('should validate and create DateTime from valid timestamp number', () => {
      // Arrange
      const timestamp = 1705316200000; // 2024-01-15T10:30:00Z
      
      // Act
      const result = DateTime.create(timestamp);
      
      // Assert
      const dateTime = HexappResultTestUtils.expectOk(result);
      expect(dateTime).to.be.instanceOf(Date);
      expect(dateTime.getTime()).to.equal(timestamp);
    });

    it('should validate and create DateTime from valid date string', () => {
      const validDateStrings = [
        '2024-01-15T10:30:00Z',
        '2024-01-15T10:30:00.000Z',
        '2024-01-15',
        'January 15, 2024',
        '2024/01/15',
        'Mon Jan 15 2024'
      ];

      validDateStrings.forEach(dateStr => {
        const result = DateTime.create(dateStr);
        const dateTime = HexappResultTestUtils.expectOk(result);
        expect(dateTime).to.be.instanceOf(Date);
        expect(dateTime.getTime()).to.be.a('number');
        expect(isNaN(dateTime.getTime())).to.be.false;
      });
    });

    it('should reject invalid date inputs', () => {
      const invalidInputs = [
        'invalid-date',
        'not a date',
        'abc123',
        {},
        [],
        null,
        undefined
      ];

      invalidInputs.forEach(input => {
        const result = DateTime.create(input);
        HexappResultTestUtils.expectErr(result);
      });
    });

    it('should return InvalidDateTime error for invalid input', () => {
      // Act
      const result = DateTime.create('invalid-date');
      
      // Assert
      const error = HexappResultTestUtils.expectErr(result);
      expect(error.message).to.include('Invalid DateTime');
    });

    it('should handle edge case date values', () => {
      // Test Unix epoch
      const epochResult = DateTime.create(0);
      const epochDateTime = HexappResultTestUtils.expectOk(epochResult);
      expect(epochDateTime.getTime()).to.equal(0);
      
      // Test far future date
      const futureResult = DateTime.create('2099-12-31T23:59:59Z');
      HexappResultTestUtils.expectOk(futureResult);
      
      // Test far past date
      const pastResult = DateTime.create('1900-01-01T00:00:00Z');
      HexappResultTestUtils.expectOk(pastResult);
    });
  });

  describe('DateTime Type System Integration', () => {
    it('should work with TypeScript type system', () => {
      // Arrange
      const dateTime = DateTime.now();
      
      // Act & Assert - These should compile without issues
      const dateTimeVar: DateTime = dateTime;
      expect(dateTimeVar).to.equal(dateTime);
      
      // Should work with functions expecting DateTime type
      function acceptDateTime(dt: DateTime): string {
        return `DateTime: ${dt.toISOString()}`;
      }
      
      const result = acceptDateTime(dateTime);
      expect(result).to.include('DateTime:');
    });

    it('should provide primitive access through DateTime.primitive()', () => {
      // Arrange
      const dateTime = DateTime.now();
      
      // Act
      const primitive = DateTime.primitive(dateTime);
      
      // Assert
      expect(primitive).to.be.instanceOf(Date);
      expect(primitive.getTime()).to.equal(dateTime.getTime());
    });

    it('should work with hexapp branded type system', () => {
      // Arrange
      const validDate = new Date('2024-01-15T10:30:00Z');
      
      // Act
      const createResult = DateTime.create(validDate);
      const dateTime = HexappResultTestUtils.expectOk(createResult);
      
      // Assert - Should maintain branded type
      expect(dateTime).to.be.instanceOf(Date);
      expect(dateTime.getTime()).to.equal(validDate.getTime());
    });
  });

  describe('DateTime in Entity Context', () => {
    it('should work as entity timestamps in domain layer', () => {
      // This tests how DateTime integrates with entities
      
      // Arrange
      const createdAt = DateTime.now();
      const updatedAt = DateTime.now();
      
      // Act & Assert - Should work as entity timestamps
      expect(createdAt).to.be.instanceOf(Date);
      expect(updatedAt).to.be.instanceOf(Date);
      expect(updatedAt.getTime()).to.be.greaterThanOrEqual(createdAt.getTime());
    });

    it('should support timestamp comparison operations', () => {
      // Arrange
      const date1 = DateTime.create('2024-01-15T10:30:00Z');
      const date2 = DateTime.create('2024-01-15T11:30:00Z');
      const date3 = DateTime.create('2024-01-15T10:30:00Z');
      
      const dateTime1 = HexappResultTestUtils.expectOk(date1);
      const dateTime2 = HexappResultTestUtils.expectOk(date2);
      const dateTime3 = HexappResultTestUtils.expectOk(date3);
      
      // Act & Assert - Comparison operations
      expect(dateTime1.getTime()).to.be.lessThan(dateTime2.getTime());
      expect(dateTime2.getTime()).to.be.greaterThan(dateTime1.getTime());
      expect(dateTime1.getTime()).to.equal(dateTime3.getTime());
    });

    it('should work with date arithmetic and business logic', () => {
      // Arrange
      const baseDate = DateTime.create('2024-01-15T10:30:00Z');
      const dateTime = HexappResultTestUtils.expectOk(baseDate);
      
      // Act - Business logic examples
      const oneDayLater = new Date(dateTime.getTime() + 24 * 60 * 60 * 1000);
      const oneHourEarlier = new Date(dateTime.getTime() - 60 * 60 * 1000);
      
      // Assert
      expect(oneDayLater.getTime()).to.be.greaterThan(dateTime.getTime());
      expect(oneHourEarlier.getTime()).to.be.lessThan(dateTime.getTime());
      
      // Test age calculation
      const ageInMs = DateTime.now().getTime() - dateTime.getTime();
      expect(ageInMs).to.be.greaterThan(0);
    });

    it('should support date formatting for various contexts', () => {
      // Arrange
      const dateTime = DateTime.create('2024-01-15T10:30:00Z');
      const dt = HexappResultTestUtils.expectOk(dateTime);
      
      // Act & Assert - Various formatting options
      expect(dt.toISOString()).to.equal('2024-01-15T10:30:00.000Z');
      expect(dt.toDateString()).to.include('Mon Jan 15 2024');
      expect(dt.getUTCHours()).to.equal(10);
      expect(dt.getUTCMinutes()).to.equal(30);
      
      // Test components
      expect(dt.getFullYear()).to.equal(2024);
      expect(dt.getMonth()).to.equal(0); // January = 0
      expect(dt.getDate()).to.equal(15);
      expect(dt.getUTCHours()).to.equal(10);
      expect(dt.getUTCMinutes()).to.equal(30);
    });
  });

  describe('DateTime Serialization and Persistence', () => {
    it('should serialize to ISO string for JSON', () => {
      // Arrange
      const dateTime = DateTime.create('2024-01-15T10:30:00Z');
      const dt = HexappResultTestUtils.expectOk(dateTime);
      
      // Act
      const serialized = JSON.stringify({ timestamp: dt });
      
      // Assert
      expect(serialized).to.include('"2024-01-15T10:30:00.000Z"');
      
      // Test round-trip
      const parsed = JSON.parse(serialized);
      const reconstructed = DateTime.create(parsed.timestamp);
      const reconstructedDt = HexappResultTestUtils.expectOk(reconstructed);
      expect(reconstructedDt.getTime()).to.equal(dt.getTime());
    });

    it('should work with database timestamp formats', () => {
      // Common database timestamp formats
      const dbFormats = [
        '2024-01-15 10:30:00',
        '2024-01-15T10:30:00',
        '2024-01-15T10:30:00Z',
        '2024-01-15T10:30:00.000Z',
        '2024-01-15T10:30:00+00:00'
      ];

      dbFormats.forEach(format => {
        const result = DateTime.create(format);
        const dateTime = HexappResultTestUtils.expectOk(result);
        expect(dateTime).to.be.instanceOf(Date);
        expect(isNaN(dateTime.getTime())).to.be.false;
      });
    });

    it('should handle timezone considerations', () => {
      // Arrange - Same moment in different timezone representations
      const utcTime = DateTime.create('2024-01-15T10:30:00Z');
      const timezoneTime = DateTime.create('2024-01-15T10:30:00+00:00');
      
      const utcDt = HexappResultTestUtils.expectOk(utcTime);
      const tzDt = HexappResultTestUtils.expectOk(timezoneTime);
      
      // Assert - Should represent the same moment
      expect(utcDt.getTime()).to.equal(tzDt.getTime());
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should provide descriptive error messages', () => {
      const invalidInputs = [
        { input: 'invalid', expectedMessage: 'Invalid DateTime' },
        { input: '', expectedMessage: 'Invalid DateTime' },
        { input: 'not-a-date', expectedMessage: 'Invalid DateTime' }
      ];

      invalidInputs.forEach(({ input, expectedMessage }) => {
        const result = DateTime.create(input);
        const error = HexappResultTestUtils.expectErr(result);
        expect(error.message).to.include(expectedMessage);
      });
    });

    it('should handle numeric edge cases', () => {
      // Valid numbers
      const validNumbers = [
        0, // Unix epoch
        Date.now(), // Current timestamp
        1705316200000, // Specific timestamp
        -62135596800000 // Year 0001
      ];

      validNumbers.forEach(num => {
        const result = DateTime.create(num);
        HexappResultTestUtils.expectOk(result);
      });

      // Invalid numbers
      const invalidNumbers = [
        NaN,
        Infinity,
        -Infinity
      ];

      invalidNumbers.forEach(num => {
        const result = DateTime.create(num);
        HexappResultTestUtils.expectErr(result);
      });
    });

    it('should handle string edge cases', () => {
      // Empty and whitespace strings
      const emptyStrings = ['', '   ', '\t', '\n'];
      
      emptyStrings.forEach(str => {
        const result = DateTime.create(str);
        HexappResultTestUtils.expectErr(result);
      });
    });

    it('should handle object and array inputs', () => {
      // Objects that are not Date instances
      const objectInputs = [
        {},
        { year: 2024, month: 1, day: 15 },
        [],
        [2024, 1, 15],
        function() {}
      ];

      objectInputs.forEach(input => {
        const result = DateTime.create(input);
        HexappResultTestUtils.expectErr(result);
      });
    });

    it('should handle Date objects with invalid time', () => {
      // Create invalid Date object
      const invalidDate = new Date('invalid');
      
      // Act
      const result = DateTime.create(invalidDate);
      
      // Assert
      HexappResultTestUtils.expectErr(result);
    });

    it('should maintain precision for high-precision timestamps', () => {
      // Test millisecond precision
      const timestamp = 1705316200123; // With milliseconds
      const result = DateTime.create(timestamp);
      const dateTime = HexappResultTestUtils.expectOk(result);
      
      expect(dateTime.getTime()).to.equal(timestamp);
      expect(dateTime.getMilliseconds()).to.equal(123);
    });
  });
});
