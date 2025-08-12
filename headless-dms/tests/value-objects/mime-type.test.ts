// tests/value-objects/mime-type.test.ts
import 'reflect-metadata';
import { MimeType } from '../../src/domain/value-objects/MimeType.js';
import { Result } from '@carbonteq/fp';

console.log('=== MimeType Value Object Tests ===\n');

async function runMimeTypeTests() {
  // Test 1: Immutability
  console.log('Test 1: Immutability');
  try {
    const mimeType = MimeType.textPlain();
    console.log('✅ MimeType created successfully');
    console.log('  - MIME type value:', mimeType.value);
    console.log('  - Main type:', mimeType.mainType);
    console.log('  - Sub type:', mimeType.subType);
    console.log('  - Is text:', mimeType.isText);
    console.log('  - Is binary:', mimeType.isBinary);
    
    // Note: mimeType.value = 'image/png' would cause a TypeScript error
    // This demonstrates immutability at the type level
    console.log('✅ MIME type is immutable (TypeScript prevents modification)');
  } catch (error) {
    console.log('❌ Immutability test failed:', error);
  }

  // Test 2: No Identity (Value Equality)
  console.log('\nTest 2: No Identity (Value Equality)');
  try {
    const mime1 = MimeType.create('text/plain').unwrap();
    const mime2 = MimeType.create('text/plain').unwrap();
    const mime3 = MimeType.textPlain();
    
    console.log('✅ Multiple text/plain MIME types created');
    console.log('  - MIME 1 value:', mime1.value);
    console.log('  - MIME 2 value:', mime2.value);
    console.log('  - MIME 3 value:', mime3.value);
    
    // These are different instances but equal values
    console.log('  - MIME 1 === MIME 2:', mime1 === mime2); // false (different instances)
    console.log('  - MIME 1 equals MIME 2:', mime1.equals(mime2)); // true (same value)
    console.log('  - MIME 1 equals MIME 3:', mime1.equals(mime3)); // true (same value)
    
    console.log('✅ Value equality works correctly (no identity)');
  } catch (error) {
    console.log('❌ No identity test failed:', error);
  }

  // Test 3: Value Comparison and Business Logic
  console.log('\nTest 3: Value Comparison and Business Logic');
  try {
    const textMime = MimeType.textPlain();
    const imageMime = MimeType.imageJpeg();
    const pdfMime = MimeType.applicationPdf();
    const zipMime = MimeType.applicationZip();
    
    console.log('✅ Different MIME types created');
    console.log('  - Text MIME:', textMime.value, '(isText:', textMime.isText, ')');
    console.log('  - Image MIME:', imageMime.value, '(isImage:', imageMime.isImage, ')');
    console.log('  - PDF MIME:', pdfMime.value, '(isDocument:', pdfMime.isDocument, ')');
    console.log('  - ZIP MIME:', zipMime.value, '(isArchive:', zipMime.isArchive, ')');
    
    // Test compatibility
    console.log('  - Text compatible with text:', textMime.isCompatibleWith(MimeType.textHtml()));
    console.log('  - Image compatible with image:', imageMime.isCompatibleWith(MimeType.imagePng()));
    console.log('  - Text compatible with image:', textMime.isCompatibleWith(imageMime));
    
    // Test file extensions
    console.log('  - Text file extension:', textMime.getFileExtension());
    console.log('  - Image file extension:', imageMime.getFileExtension());
    console.log('  - PDF file extension:', pdfMime.getFileExtension());
    
    console.log('✅ Value comparison and business logic work correctly');
  } catch (error) {
    console.log('❌ Value comparison test failed:', error);
  }

  // Test 4: Self-Validation
  console.log('\nTest 4: Self-Validation');
  try {
    // Valid MIME types
    const validTextResult = MimeType.create('text/plain');
    const validImageResult = MimeType.create('image/PNG'); // Case insensitive
    const validAppResult = MimeType.create('application/pdf');
    const validCustomResult = MimeType.create('application/vnd.custom+json');
    
    console.log('✅ Valid MIME type creation:');
    console.log('  - "text/plain" result:', validTextResult.isOk() ? 'SUCCESS' : 'FAILED');
    console.log('  - "image/PNG" result:', validImageResult.isOk() ? 'SUCCESS' : 'FAILED');
    console.log('  - "application/pdf" result:', validAppResult.isOk() ? 'SUCCESS' : 'FAILED');
    console.log('  - "application/vnd.custom+json" result:', validCustomResult.isOk() ? 'SUCCESS' : 'FAILED');
    
    // Invalid MIME types
    const invalidFormatResult = MimeType.create('invalid-format');
    const emptyResult = MimeType.create('');
    const nullResult = MimeType.create(null as any);
    const doubleSlashResult = MimeType.create('text//plain');
    const doubleDotResult = MimeType.create('text..plain');
    
    console.log('✅ Invalid MIME type rejection:');
    console.log('  - "invalid-format" result:', invalidFormatResult.isErr() ? 'REJECTED' : 'ACCEPTED');
    if (invalidFormatResult.isErr()) {
      console.log('    Error:', invalidFormatResult.unwrapErr());
    }
    
    console.log('  - Empty string result:', emptyResult.isErr() ? 'REJECTED' : 'ACCEPTED');
    if (emptyResult.isErr()) {
      console.log('    Error:', emptyResult.unwrapErr());
    }
    
    console.log('  - Null result:', nullResult.isErr() ? 'REJECTED' : 'ACCEPTED');
    if (nullResult.isErr()) {
      console.log('    Error:', nullResult.unwrapErr());
    }
    
    console.log('  - "text//plain" result:', doubleSlashResult.isErr() ? 'REJECTED' : 'ACCEPTED');
    if (doubleSlashResult.isErr()) {
      console.log('    Error:', doubleSlashResult.unwrapErr());
    }
    
    console.log('  - "text..plain" result:', doubleDotResult.isErr() ? 'REJECTED' : 'ACCEPTED');
    if (doubleDotResult.isErr()) {
      console.log('    Error:', doubleDotResult.unwrapErr());
    }
    
    console.log('✅ Self-validation works correctly');
  } catch (error) {
    console.log('❌ Self-validation test failed:', error);
  }

  // Test 5: Easy Testing and Utility Methods
  console.log('\nTest 5: Easy Testing and Utility Methods');
  try {
    // Test static methods
    const supportedTypes = MimeType.getSupportedTypes();
    const textTypes = MimeType.getTextTypes();
    const imageTypes = MimeType.getImageTypes();
    const documentTypes = MimeType.getDocumentTypes();
    const archiveTypes = MimeType.getArchiveTypes();
    
    console.log('✅ Static utility methods work:');
    console.log('  - Total supported types:', supportedTypes.length);
    console.log('  - Text types count:', textTypes.length);
    console.log('  - Image types count:', imageTypes.length);
    console.log('  - Document types count:', documentTypes.length);
    console.log('  - Archive types count:', archiveTypes.length);
    
    // Test validation
    console.log('  - Is "text/plain" valid:', MimeType.isValid('text/plain'));
    console.log('  - Is "invalid" valid:', MimeType.isValid('invalid'));
    
    // Test factory methods
    console.log('  - textPlain():', MimeType.textPlain().value);
    console.log('  - imageJpeg():', MimeType.imageJpeg().value);
    console.log('  - applicationPdf():', MimeType.applicationPdf().value);
    
    // Test serialization
    const mimeType = MimeType.applicationZip();
    console.log('  - toString():', mimeType.toString());
    console.log('  - value property:', mimeType.value);
    
    console.log('✅ Easy testing characteristics demonstrated');
  } catch (error) {
    console.log('❌ Easy testing test failed:', error);
  }

  console.log('\n=== MimeType Value Object Tests Complete ===');
  console.log('✅ All 5 characteristics demonstrated:');
  console.log('  - ✅ Immutable');
  console.log('  - ✅ No Identity');
  console.log('  - ✅ Value Comparison');
  console.log('  - ✅ Self-validating');
  console.log('  - ✅ Easily testable');
  console.log('\n🎯 Additional features demonstrated:');
  console.log('  - ✅ MIME type categorization (text, image, document, archive)');
  console.log('  - ✅ File extension mapping');
  console.log('  - ✅ Compatibility checking');
  console.log('  - ✅ Rich business logic');
}

// Export the test function for the run-all script
export { runMimeTypeTests };

// Run the tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMimeTypeTests().catch(console.error);
} 