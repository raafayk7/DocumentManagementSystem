/**
 * FileSize Value Object Tests
 * Testing FileSize value object with hexapp BaseValueObject patterns
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
import { FileSize } from '../../../src/domain/value-objects/FileSize.js';

describe('Domain > Value Objects > FileSize', () => {
  describe('BaseValueObject Integration', () => {
    it('should extend hexapp BaseValueObject', () => {
      // Arrange & Act
      const sizeResult = FileSize.fromBytes(1024);
      
      // Assert
      const size = AppResultTestUtils.expectOk(sizeResult);
      expect(size).to.be.instanceOf(FileSize);
      
      // Should have serialize method from BaseValueObject
      expect(size.serialize).to.be.a('function');
      expect(size.serialize()).to.be.a('number');
      expect(size.serialize()).to.equal(1024);
    });

    it('should implement value object equality semantics', () => {
      // Arrange
      const size1Result = FileSize.fromBytes(1024);
      const size2Result = FileSize.fromBytes(1024);
      const size3Result = FileSize.fromBytes(2048);
      
      // Act
      const size1 = AppResultTestUtils.expectOk(size1Result);
      const size2 = AppResultTestUtils.expectOk(size2Result);
      const size3 = AppResultTestUtils.expectOk(size3Result);
      
      // Assert - Same value should be equal
      expect(size1.equals(size2)).to.be.true;
      expect(size2.equals(size1)).to.be.true;
      
      // Different values should not be equal
      expect(size1.equals(size3)).to.be.false;
      expect(size3.equals(size1)).to.be.false;
    });

    it('should be immutable after creation', () => {
      // Arrange & Act
      const sizeResult = FileSize.fromBytes(1024);
      const size = AppResultTestUtils.expectOk(sizeResult);
      
      // Assert - Value object should be immutable
      expect(size.bytes).to.equal(1024);
      
      // Should not be able to modify the size (no setter methods)
      expect(size).to.not.have.property('setValue');
      expect(size).to.not.have.property('changeSize');
    });
  });

  describe('Factory Pattern Validation', () => {
    it('should create file size from bytes', () => {
      // Arrange & Act
      const result = FileSize.fromBytes(1024);
      
      // Assert
      const size = AppResultTestUtils.expectOk(result);
      expect(size.bytes).to.equal(1024);
    });

    it('should create file size from kilobytes', () => {
      // Arrange & Act
      const result = FileSize.fromKB(1);
      
      // Assert
      const size = AppResultTestUtils.expectOk(result);
      expect(size.bytes).to.equal(1024);
      expect(size.kilobytes).to.equal(1);
    });

    it('should create file size from megabytes', () => {
      // Arrange & Act
      const result = FileSize.fromMB(1);
      
      // Assert
      const size = AppResultTestUtils.expectOk(result);
      expect(size.bytes).to.equal(1048576);
      expect(size.megabytes).to.equal(1);
    });

    it('should create file size from gigabytes', () => {
      // Arrange & Act
      const result = FileSize.fromGB(1);
      
      // Assert
      const size = AppResultTestUtils.expectOk(result);
      expect(size.bytes).to.equal(1073741824);
      expect(size.gigabytes).to.equal(1);
    });

    it('should return AppResult.Err for invalid numeric input', () => {
      // Test NaN
      const nanResult = FileSize.fromBytes(NaN);
      AppResultTestUtils.expectErr(nanResult);
      
      // Test non-number  
      const stringResult = FileSize.fromBytes('1024' as any);
      AppResultTestUtils.expectErr(stringResult);
      
      // Test undefined
      const undefinedResult = FileSize.fromBytes(undefined as any);
      AppResultTestUtils.expectErr(undefinedResult);
    });
  });

  describe('Size Validation', () => {
    it('should accept valid file sizes', () => {
      const validSizes = [
        0, // Empty file
        1, // 1 byte
        1024, // 1 KB
        1048576, // 1 MB
        1073741824, // 1 GB
        5368709120 // 5 GB
      ];

      validSizes.forEach(size => {
        const result = FileSize.fromBytes(size);
        AppResultTestUtils.expectOk(result);
      });
    });

    it('should reject negative sizes', () => {
      const negativeSizes = [
        -1,
        -1024,
        -100
      ];

      negativeSizes.forEach(size => {
        const result = FileSize.fromBytes(size);
        const error = AppResultTestUtils.expectErr(result);
        expect(error.message).to.include('cannot be negative');
      });
    });

    it('should reject sizes exceeding maximum limit', () => {
      // Test sizes larger than 100GB limit
      const oversizedSizes = [
        100 * 1024 * 1024 * 1024 + 1, // 100GB + 1 byte
        200 * 1024 * 1024 * 1024, // 200GB
        500 * 1024 * 1024 * 1024  // 500GB
      ];

      oversizedSizes.forEach(size => {
        const result = FileSize.fromBytes(size);
        const error = AppResultTestUtils.expectErr(result);
        expect(error.message).to.include('cannot exceed');
      });
    });

    it('should handle zero size correctly', () => {
      // Test zero
      const zeroResult = FileSize.fromBytes(0);
      const size = AppResultTestUtils.expectOk(zeroResult);
      expect(size.isEmpty).to.be.true;
    });

    it('should validate using static isValid method', () => {
      // Valid sizes
      expect(FileSize.isValid(1024)).to.be.true;
      expect(FileSize.isValid(0)).to.be.true;
      
      // Invalid sizes
      expect(FileSize.isValid(-1)).to.be.false;
      expect(FileSize.isValid(NaN)).to.be.false;
    });
  });

  describe('Size Access Properties', () => {
    it('should provide size in different units', () => {
      // Arrange
      const sizeResult = FileSize.fromBytes(2048); // 2 KB
      const size = AppResultTestUtils.expectOk(sizeResult);
      
      // Act & Assert
      expect(size.bytes).to.equal(2048);
      expect(size.kilobytes).to.equal(2);
      expect(size.megabytes).to.be.closeTo(0.001953125, 0.0001);
      expect(size.gigabytes).to.be.closeTo(0.000001907, 0.0000001);
    });

    it('should categorize file sizes correctly', () => {
      // Small file (< 1MB)
      const smallResult = FileSize.fromBytes(512000);
      const smallSize = AppResultTestUtils.expectOk(smallResult);
      expect(smallSize.isSmall).to.be.true;
      expect(smallSize.isMedium).to.be.false;
      
      // Medium file (1MB - 100MB)
      const mediumResult = FileSize.fromMB(50);
      const mediumSize = AppResultTestUtils.expectOk(mediumResult);
      expect(mediumSize.isMedium).to.be.true;
      expect(mediumSize.isSmall).to.be.false;
      expect(mediumSize.isLarge).to.be.false;
      
      // Large file (100MB - 1GB)
      const largeResult = FileSize.fromMB(500);
      const largeSize = AppResultTestUtils.expectOk(largeResult);
      expect(largeSize.isLarge).to.be.true;
      expect(largeSize.isMedium).to.be.false;
      
      // Very large file (>= 1GB)
      const veryLargeResult = FileSize.fromGB(2);
      const veryLargeSize = AppResultTestUtils.expectOk(veryLargeResult);
      expect(veryLargeSize.isVeryLarge).to.be.true;
      expect(veryLargeSize.isLarge).to.be.false;
    });

    it('should check suitability for different purposes', () => {
      // Small file suitable for all purposes
      const smallResult = FileSize.fromKB(500);
      const smallSize = AppResultTestUtils.expectOk(smallResult);
      expect(smallSize.isReasonableForWeb).to.be.true;
      expect(smallSize.isReasonableForEmail).to.be.true;
      expect(smallSize.isReasonableForUpload).to.be.true;
      
      // Large file not suitable for web/email but ok for upload
      const largeResult = FileSize.fromMB(50);
      const largeSize = AppResultTestUtils.expectOk(largeResult);
      expect(largeSize.isReasonableForWeb).to.be.false;
      expect(largeSize.isReasonableForEmail).to.be.false;
      expect(largeSize.isReasonableForUpload).to.be.true;
    });
  });

  describe('Display and Formatting', () => {
    it('should provide appropriate display unit and value', () => {
      const testCases = [
        { bytes: 512, expectedUnit: 'B', expectedValue: 512 },
        { bytes: 1536, expectedUnit: 'KB', expectedValue: 1.5 },
        { bytes: 1572864, expectedUnit: 'MB', expectedValue: 1.5 },
        { bytes: 1610612736, expectedUnit: 'GB', expectedValue: 1.5 }
      ];

      testCases.forEach(({ bytes, expectedUnit, expectedValue }) => {
        const sizeResult = FileSize.fromBytes(bytes);
        const size = AppResultTestUtils.expectOk(sizeResult);
        expect(size.displayUnit).to.equal(expectedUnit);
        expect(size.displayValue).to.be.closeTo(expectedValue, 0.01);
      });
    });

    it('should provide human-readable string representation', () => {
      const testCases = [
        { bytes: 0, expected: '0 B' },
        { bytes: 512, expected: '512 B' },
        { bytes: 1024, expected: '1 KB' },
        { bytes: 1536, expected: '1.5 KB' },
        { bytes: 1048576, expected: '1 MB' },
        { bytes: 1073741824, expected: '1 GB' }
      ];

      testCases.forEach(({ bytes, expected }) => {
        const sizeResult = FileSize.fromBytes(bytes);
        const size = AppResultTestUtils.expectOk(sizeResult);
        expect(size.humanReadable).to.equal(expected);
      });
    });

    it('should provide compact string representation', () => {
      // Arrange
      const sizeResult = FileSize.fromBytes(1536); // 1.5 KB
      const size = AppResultTestUtils.expectOk(sizeResult);
      
      // Act & Assert
      expect(size.compact).to.equal('1.5KB');
    });
  });

  describe('Size Comparison Methods', () => {
    it('should compare sizes correctly', () => {
      // Arrange
      const size1Result = FileSize.fromBytes(1024);
      const size2Result = FileSize.fromBytes(2048);
      const size3Result = FileSize.fromBytes(1024);
      
      const size1 = AppResultTestUtils.expectOk(size1Result);
      const size2 = AppResultTestUtils.expectOk(size2Result);
      const size3 = AppResultTestUtils.expectOk(size3Result);
      
      // Act & Assert
      expect(size1.isLessThan(size2)).to.be.true;
      expect(size2.isGreaterThan(size1)).to.be.true;
      expect(size1.equals(size3)).to.be.true;
      
      expect(size1.isLessThanOrEqual(size2)).to.be.true;
      expect(size1.isLessThanOrEqual(size3)).to.be.true;
      expect(size2.isGreaterThanOrEqual(size1)).to.be.true;
    });

    it('should handle arithmetic operations', () => {
      // Arrange
      const size1Result = FileSize.fromBytes(1024);
      const size2Result = FileSize.fromBytes(512);
      
      const size1 = AppResultTestUtils.expectOk(size1Result);
      const size2 = AppResultTestUtils.expectOk(size2Result);
      
      // Act - Addition
      const sum = size1.add(size2);
      expect(sum.bytes).to.equal(1536);
      
      // Act - Subtraction (valid)
      const diffResult = size1.subtract(size2);
      const diff = AppResultTestUtils.expectOk(diffResult);
      expect(diff.bytes).to.equal(512);
      
      // Act - Subtraction (invalid - larger from smaller)
      const invalidDiffResult = size2.subtract(size1);
      AppResultTestUtils.expectErr(invalidDiffResult);
    });
  });

  describe('Serialization Patterns', () => {
    it('should serialize to number value', () => {
      // Arrange
      const sizeResult = FileSize.fromBytes(1024);
      const size = AppResultTestUtils.expectOk(sizeResult);
      
      // Act
      const serialized = size.serialize();
      
      // Assert
      expect(serialized).to.be.a('number');
      expect(serialized).to.equal(1024);
    });

    it('should provide consistent serialization across instances', () => {
      // Arrange
      const size1Result = FileSize.fromBytes(1024);
      const size2Result = FileSize.fromKB(1);
      
      const size1 = AppResultTestUtils.expectOk(size1Result);
      const size2 = AppResultTestUtils.expectOk(size2Result);
      
      // Act & Assert
      expect(size1.serialize()).to.equal(size2.serialize());
    });

    it('should provide string representation', () => {
      // Arrange
      const sizeResult = FileSize.fromBytes(1024);
      const size = AppResultTestUtils.expectOk(sizeResult);
      
      // Act & Assert
      expect(size.toString()).to.equal('1024');
      expect(String(size)).to.equal('1024');
    });
  });

  describe('Trusted Factory Method', () => {
    it('should create FileSize from trusted source without validation', () => {
      // Arrange & Act
      const size = FileSize.fromTrusted(1024);
      
      // Assert
      expect(size).to.be.instanceOf(FileSize);
      expect(size.bytes).to.equal(1024);
    });

    it('should bypass validation for performance', () => {
      // Note: This demonstrates unsafe usage - only use with validated input
      
      // Arrange & Act
      const size = FileSize.fromTrusted(-1); // Invalid but trusted
      
      // Assert
      expect(size.bytes).to.equal(-1); // No validation performed
    });
  });

  describe('Static Utility Methods', () => {
    it('should provide maximum file size information', () => {
      // Act & Assert
      const maxBytes = FileSize.getMaxFileSize();
      const maxHuman = FileSize.getMaxFileSizeHuman();
      
      expect(maxBytes).to.be.a('number');
      expect(maxBytes).to.equal(100 * 1024 * 1024 * 1024); // 100GB
      expect(maxHuman).to.include('100 GB');
    });

    it('should validate file sizes statically', () => {
      // Valid sizes
      expect(FileSize.isValid(0)).to.be.true;
      expect(FileSize.isValid(1024)).to.be.true;
      expect(FileSize.isValid(1048576)).to.be.true;
      
      // Invalid sizes
      expect(FileSize.isValid(-1)).to.be.false;
      expect(FileSize.isValid(NaN)).to.be.false;
      expect(FileSize.isValid(Infinity)).to.be.false;
    });
  });

  describe('Error Cases and Edge Conditions', () => {
    it('should provide descriptive error messages for validation failures', () => {
      // Test negative size
      const negativeResult = FileSize.fromBytes(-1);
      const negativeError = AppResultTestUtils.expectErr(negativeResult);
      expect(negativeError.message).to.include('cannot be negative');
      
      // Test invalid format
      const invalidResult = FileSize.fromBytes(NaN);
      const invalidError = AppResultTestUtils.expectErr(invalidResult);
      expect(invalidError.message).to.include('must be a valid number');
      
      // Test too large
      const tooLargeResult = FileSize.fromBytes(200 * 1024 * 1024 * 1024);
      const tooLargeError = AppResultTestUtils.expectErr(tooLargeResult);
      expect(tooLargeError.message).to.include('cannot exceed');
    });

    it('should handle boundary conditions for size validation', () => {
      // Test exactly at minimum (0 bytes)
      const minValidResult = FileSize.fromBytes(0);
      AppResultTestUtils.expectOk(minValidResult);
      
      // Test exactly at maximum (100GB)
      const maxValid = 100 * 1024 * 1024 * 1024;
      const maxValidResult = FileSize.fromBytes(maxValid);
      AppResultTestUtils.expectOk(maxValidResult);
      
      // Test one over maximum
      const tooLarge = 100 * 1024 * 1024 * 1024 + 1;
      const tooLargeResult = FileSize.fromBytes(tooLarge);
      AppResultTestUtils.expectErr(tooLargeResult);
    });

    it('should handle floating point precision correctly', () => {
      // Test fractional bytes (should be rounded)
      const fractionalResult = FileSize.fromBytes(1024.7);
      const size = AppResultTestUtils.expectOk(fractionalResult);
      expect(size.bytes).to.equal(1025); // Rounded to nearest integer
    });

    it('should handle comparison with null/undefined', () => {
      // Arrange
      const sizeResult = FileSize.fromBytes(1024);
      const size = AppResultTestUtils.expectOk(sizeResult);
      
      // Act & Assert - Should handle null gracefully
      expect(size.equals(null as any)).to.be.false;
      expect(size.isGreaterThan(null as any)).to.be.false;
      expect(size.isLessThan(null as any)).to.be.false;
      
      // Arithmetic with null should return original or handle gracefully
      expect(size.add(null as any)).to.equal(size);
    });

    it('should handle edge cases in display formatting', () => {
      // Test very small values
      const tinyResult = FileSize.fromBytes(1);
      const tinySize = AppResultTestUtils.expectOk(tinyResult);
      expect(tinySize.humanReadable).to.equal('1 B');
      expect(tinySize.compact).to.equal('1B');
      
      // Test exactly at unit boundaries
      const exactKbResult = FileSize.fromBytes(1024);
      const exactKb = AppResultTestUtils.expectOk(exactKbResult);
      expect(exactKb.humanReadable).to.equal('1 KB');
      expect(exactKb.displayUnit).to.equal('KB');
      expect(exactKb.displayValue).to.equal(1);
    });
  });
});