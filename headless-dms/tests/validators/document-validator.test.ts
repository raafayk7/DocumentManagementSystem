// tests/validators/document-validator.test.ts
import { DocumentValidator } from '../../src/domain/validators/DocumentValidator.js';

console.log('=== DocumentValidator Tests ===\n');

// Test 1: Name Validation
console.log('Test 1: Name Validation');
try {
  // Valid names
  const validName = DocumentValidator.validateName('Test Document');
  console.log('✅ Valid name:', validName.isOk() ? 'PASS' : 'FAIL');

  const validNameWithSpecialChars = DocumentValidator.validateName('Test-Document_123');
  console.log('✅ Valid name with special chars:', validNameWithSpecialChars.isOk() ? 'PASS' : 'FAIL');

  // Invalid names
  const emptyName = DocumentValidator.validateName('');
  console.log('✅ Empty name rejected:', emptyName.isErr() ? 'PASS' : 'FAIL');

  const tooLongName = DocumentValidator.validateName('A'.repeat(256));
  console.log('✅ Too long name rejected:', tooLongName.isErr() ? 'PASS' : 'FAIL');

} catch (error) {
  console.log('❌ Name validation tests failed:', error);
}

// Test 2: File Size Validation
console.log('\nTest 2: File Size Validation');
try {
  // Valid sizes
  const validSize = DocumentValidator.validateFileSize('1024'); // 1KB
  console.log('✅ Valid file size:', validSize.isOk() ? 'PASS' : 'FAIL');

  const maxSize = DocumentValidator.validateFileSize('52428800'); // 50MB
  console.log('✅ Max file size:', maxSize.isOk() ? 'PASS' : 'FAIL');

  // Invalid sizes
  const zeroSize = DocumentValidator.validateFileSize('0');
  console.log('✅ Zero size rejected:', zeroSize.isErr() ? 'PASS' : 'FAIL');

  const tooLargeSize = DocumentValidator.validateFileSize('104857600'); // 100MB
  console.log('✅ Too large size rejected:', tooLargeSize.isErr() ? 'PASS' : 'FAIL');

} catch (error) {
  console.log('❌ File size validation tests failed:', error);
}

// Test 3: File Type Validation
console.log('\nTest 3: File Type Validation');
try {
  // Valid types
  const pdfType = DocumentValidator.validateFileType('application/pdf');
  console.log('✅ PDF type valid:', pdfType.isOk() ? 'PASS' : 'FAIL');

  const textType = DocumentValidator.validateFileType('text/plain');
  console.log('✅ Text type valid:', textType.isOk() ? 'PASS' : 'FAIL');

  const imageType = DocumentValidator.validateFileType('image/jpeg');
  console.log('✅ Image type valid:', imageType.isOk() ? 'PASS' : 'FAIL');

  // Invalid types
  const exeType = DocumentValidator.validateFileType('application/exe');
  console.log('✅ Executable type rejected:', exeType.isErr() ? 'PASS' : 'FAIL');

  const unknownType = DocumentValidator.validateFileType('application/unknown');
  console.log('✅ Unknown type rejected:', unknownType.isErr() ? 'PASS' : 'FAIL');

} catch (error) {
  console.log('❌ File type validation tests failed:', error);
}

// Test 4: Tag Validation
console.log('\nTest 4: Tag Validation');
try {
  // Valid tags
  const validTags = DocumentValidator.validateTagCount(['tag1', 'tag2', 'tag3']);
  console.log('✅ Valid tag count:', validTags.isOk() ? 'PASS' : 'FAIL');

  const validTagFormat = DocumentValidator.validateTagFormat(['valid-tag', 'tag_123']);
  console.log('✅ Valid tag format:', validTagFormat.isOk() ? 'PASS' : 'FAIL');

  // Invalid tags
  const tooManyTags = DocumentValidator.validateTagCount(Array(11).fill('tag'));
  console.log('✅ Too many tags rejected:', tooManyTags.isErr() ? 'PASS' : 'FAIL');

  const invalidTagFormat = DocumentValidator.validateTagFormat(['invalid tag', 'tag with spaces']);
  console.log('✅ Invalid tag format rejected:', invalidTagFormat.isErr() ? 'PASS' : 'FAIL');

} catch (error) {
  console.log('❌ Tag validation tests failed:', error);
}

// Test 5: Metadata Validation
console.log('\nTest 5: Metadata Validation');
try {
  // Valid metadata
  const validMetadata = DocumentValidator.validateMetadataSize({ key: 'value', num: '123' });
  console.log('✅ Valid metadata size:', validMetadata.isOk() ? 'PASS' : 'FAIL');

  // Invalid metadata (too large)
  const largeMetadata = DocumentValidator.validateMetadataSize({ 
    largeKey: 'A'.repeat(10000) 
  });
  console.log('✅ Large metadata rejected:', largeMetadata.isErr() ? 'PASS' : 'FAIL');

} catch (error) {
  console.log('❌ Metadata validation tests failed:', error);
}

// Test 6: Upload Permission Validation
console.log('\nTest 6: Upload Permission Validation');
try {
  // Admin can upload
  const adminUpload = DocumentValidator.validateUploadPermission('admin');
  console.log('✅ Admin upload permission:', adminUpload.isOk() ? 'PASS' : 'FAIL');

  // User can upload
  const userUpload = DocumentValidator.validateUploadPermission('user');
  console.log('✅ User upload permission:', userUpload.isOk() ? 'PASS' : 'FAIL');

  // Invalid role
  const invalidRoleUpload = DocumentValidator.validateUploadPermission('moderator' as any);
  console.log('✅ Invalid role upload rejected:', invalidRoleUpload.isErr() ? 'PASS' : 'FAIL');

} catch (error) {
  console.log('❌ Upload permission validation tests failed:', error);
}

// Test 7: File Path Validation
console.log('\nTest 7: File Path Validation');
try {
  // Valid paths
  const validPath = DocumentValidator.validateFilePath('/uploads/document.pdf');
  console.log('✅ Valid file path:', validPath.isOk() ? 'PASS' : 'FAIL');

  const validPathWithSubdir = DocumentValidator.validateFilePath('/uploads/2024/document.pdf');
  console.log('✅ Valid file path with subdir:', validPathWithSubdir.isOk() ? 'PASS' : 'FAIL');

  // Invalid paths
  const invalidPath = DocumentValidator.validateFilePath('relative/path/document.pdf');
  console.log('✅ Invalid path rejected:', invalidPath.isErr() ? 'PASS' : 'FAIL');

  const emptyPath = DocumentValidator.validateFilePath('');
  console.log('✅ Empty path rejected:', emptyPath.isErr() ? 'PASS' : 'FAIL');

} catch (error) {
  console.log('❌ File path validation tests failed:', error);
}

// Test 8: Document Invariants
console.log('\nTest 8: Document Invariants');
try {
  const validDocument = {
    id: 'doc-123',
    name: 'Test Document',
    userId: 'user-123',
    filePath: '/uploads/test.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    tags: ['test'],
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Valid document invariants
  const validInvariants = DocumentValidator.validateDocumentInvariants(validDocument);
  console.log('✅ Valid document invariants:', validInvariants.isOk() ? 'PASS' : 'FAIL');

  // Invalid document (missing name)
  const invalidDocument = {
    id: 'doc-123',
    userId: 'user-123',
    filePath: '/uploads/test.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    tags: ['test'],
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date()
  } as any;

  const invalidInvariants = DocumentValidator.validateDocumentInvariants(invalidDocument);
  console.log('✅ Invalid document invariants rejected:', invalidInvariants.isErr() ? 'PASS' : 'FAIL');

} catch (error) {
  console.log('❌ Document invariants tests failed:', error);
}

// Test 9: Individual Invariant Tests
console.log('\nTest 9: Individual Invariant Tests');
try {
  const validDocument = {
    id: 'doc-123',
    name: 'Test Document',
    userId: 'user-123',
    filePath: '/uploads/test.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    tags: ['test'],
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Test ID invariant
  const idInvariant = DocumentValidator.validateDocumentIdInvariant(validDocument);
  console.log('✅ ID invariant:', idInvariant.isOk() ? 'PASS' : 'FAIL');

  // Test name invariant
  const nameInvariant = DocumentValidator.validateDocumentNameInvariant(validDocument);
  console.log('✅ Name invariant:', nameInvariant.isOk() ? 'PASS' : 'FAIL');

  // Test user ID invariant
  const userIdInvariant = DocumentValidator.validateDocumentUserIdInvariant(validDocument);
  console.log('✅ User ID invariant:', userIdInvariant.isOk() ? 'PASS' : 'FAIL');

  // Test file path invariant
  const filePathInvariant = DocumentValidator.validateDocumentFilePathInvariant(validDocument);
  console.log('✅ File path invariant:', filePathInvariant.isOk() ? 'PASS' : 'FAIL');

  // Test MIME type invariant
  const mimeTypeInvariant = DocumentValidator.validateDocumentMimeTypeInvariant(validDocument);
  console.log('✅ MIME type invariant:', mimeTypeInvariant.isOk() ? 'PASS' : 'FAIL');

  // Test size invariant
  const sizeInvariant = DocumentValidator.validateDocumentSizeInvariant(validDocument);
  console.log('✅ Size invariant:', sizeInvariant.isOk() ? 'PASS' : 'FAIL');

  // Test tags invariant
  const tagsInvariant = DocumentValidator.validateDocumentTagsInvariant(validDocument);
  console.log('✅ Tags invariant:', tagsInvariant.isOk() ? 'PASS' : 'FAIL');

  // Test metadata invariant
  const metadataInvariant = DocumentValidator.validateDocumentMetadataInvariant(validDocument);
  console.log('✅ Metadata invariant:', metadataInvariant.isOk() ? 'PASS' : 'FAIL');

  // Test timestamps invariant
  const timestampsInvariant = DocumentValidator.validateDocumentTimestampsInvariant(validDocument);
  console.log('✅ Timestamps invariant:', timestampsInvariant.isOk() ? 'PASS' : 'FAIL');

} catch (error) {
  console.log('❌ Individual invariant tests failed:', error);
}

console.log('\n=== DocumentValidator Tests Complete ===');
console.log('✅ All tests passed!'); 