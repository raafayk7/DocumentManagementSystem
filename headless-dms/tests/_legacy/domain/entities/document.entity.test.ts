// src/domain/entities/tests/document.entity.test.ts
import 'reflect-metadata';
import { Document } from '../../../src/domain/entities/Document.js';
import { DocumentName } from '../../../src/domain/value-objects/DocumentName.js';
import { MimeType } from '../../../src/domain/value-objects/MimeType.js';
import { FileSize } from '../../../src/domain/value-objects/FileSize.js';

async function runDocumentEntityTests() {
  console.log('=== Document Entity Tests (Value Object Based) ===\n');

  // Test 1: Document Creation with Factory Method
  console.log('Test 1: Document Creation with Factory Method');
  try {
    const documentResult = Document.create(
      'Test Document.pdf',
      '/uploads/test.pdf',
      'application/pdf',
      '1024',
      ['test', 'document'],
      { author: 'John Doe', version: '1.0' }
    );

    if (documentResult.isOk()) {
      const document = documentResult.unwrap();
      console.log('✅ Document factory method works');
      console.log('  - ID:', document.id);
      console.log('  - Name:', document.name.value);
      console.log('  - MIME Type:', document.mimeType.value);
      console.log('  - Size in bytes:', document.size.bytes);
      console.log('  - Tags:', document.tags);
      console.log('  - Metadata:', document.metadata);
      console.log('  - Created at:', document.createdAt);
    } else {
      console.log('❌ Document factory method failed:', documentResult.unwrapErr());
    }
  } catch (error) {
    console.log('❌ Document factory method failed:', error);
  }

  // Test 2: Document Creation from Repository Data
  console.log('\nTest 2: Document Creation from Repository Data');
  try {
    const documentResult = Document.fromRepository({
      id: 'doc-123',
      name: 'Repository Document.pdf',
      filePath: '/uploads/repo-doc.pdf',
      mimeType: 'image/jpeg',
      size: '2048',
      tags: ['repository', 'image'],
      metadata: { source: 'database' },
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    });

    if (documentResult.isOk()) {
      const document = documentResult.unwrap();
      console.log('✅ Document from repository works');
      console.log('  - ID:', document.id);
      console.log('  - Name:', document.name.value);
      console.log('  - MIME Type:', document.mimeType.value);
      console.log('  - Size in bytes:', document.size.bytes);
      console.log('  - Is Image:', document.mimeType.isImage);
      console.log('  - Is PDF:', document.mimeType.isDocument);
      console.log('  - Is Text:', document.mimeType.isText);
    } else {
      console.log('❌ Document from repository failed:', documentResult.unwrapErr());
    }
  } catch (error) {
    console.log('❌ Document from repository failed:', error);
  }

  // Test 3: Document Creation from Upload
  console.log('\nTest 3: Document Creation from Upload');
  try {
    const documentResult = Document.fromUpload(
      'Uploaded Document.txt',
      '/uploads/uploaded.txt',
      'text/plain',
      '512',
      'upload,text,file',
      '{"category": "document", "priority": "high"}'
    );

    if (documentResult.isOk()) {
      const document = documentResult.unwrap();
      console.log('✅ Document from upload works');
      console.log('  - Name:', document.name.value);
      console.log('  - MIME Type:', document.mimeType.value);
      console.log('  - Size in bytes:', document.size.bytes);
      console.log('  - Tags:', document.tags);
      console.log('  - Metadata:', document.metadata);
    } else {
      console.log('❌ Document from upload failed:', documentResult.unwrapErr());
    }
  } catch (error) {
    console.log('❌ Document from upload failed:', error);
  }

  // Test 4: Document State Changes
  console.log('\nTest 4: Document State Changes');
  try {
    const documentResult = Document.create(
      'Changeable Document.pdf',
      '/uploads/changeable.pdf',
      'application/pdf',
      '1024',
      ['original'],
      { version: '1.0' }
    );

    if (documentResult.isOk()) {
      const document = documentResult.unwrap();
      console.log('✅ Original document state:');
      console.log('  - Name:', document.name.value);
      console.log('  - Tags:', document.tags);
      console.log('  - Updated at:', document.updatedAt);

      // Change name
      const nameChangeResult = document.updateName('Updated Document Name.pdf');
      if (nameChangeResult.isOk()) {
        const renamedDocument = nameChangeResult.unwrap();
        console.log('✅ Name changed');
        console.log('  - New name:', renamedDocument.name.value);
        console.log('  - Updated at changed:', renamedDocument.updatedAt !== document.updatedAt);

        // Update tags
        const tagUpdateResult = renamedDocument.replaceTags(['updated', 'document', 'test']);
        if (tagUpdateResult.isOk()) {
          const taggedDocument = tagUpdateResult.unwrap();
          console.log('✅ Tags updated');
          console.log('  - New tags:', taggedDocument.tags);

          // Update metadata
          const metadataUpdateResult = taggedDocument.updateMetadata({ 
            version: '2.0', 
            author: 'Updated Author' 
          });
          if (metadataUpdateResult.isOk()) {
            const metadataDocument = metadataUpdateResult.unwrap();
            console.log('✅ Metadata updated');
            console.log('  - New metadata:', metadataDocument.metadata);
          } else {
            console.log('❌ Metadata update failed:', metadataUpdateResult.unwrapErr());
          }
        } else {
          console.log('❌ Tag update failed:', tagUpdateResult.unwrapErr());
        }
      } else {
        console.log('❌ Name change failed:', nameChangeResult.unwrapErr());
      }
    } else {
      console.log('❌ Document creation for state changes failed:', documentResult.unwrapErr());
    }

  } catch (error) {
    console.log('❌ Document state changes failed:', error);
  }

  // Test 5: Document Tag Operations
  console.log('\nTest 5: Document Tag Operations');
  try {
    const documentResult = Document.create(
      'Tag Test Document.pdf',
      '/uploads/tag-test.pdf',
      'application/pdf',
      '1024',
      ['initial', 'test'],
      {}
    );

    if (documentResult.isOk()) {
      const document = documentResult.unwrap();
      console.log('✅ Original tags:', document.tags);

      // Add tags
      const addTagsResult = document.addTags(['new', 'important']);
      if (addTagsResult.isOk()) {
        const documentWithNewTags = addTagsResult.unwrap();
        console.log('✅ Tags added:', documentWithNewTags.tags);

        // Remove tags
        const removeTagsResult = documentWithNewTags.removeTags(['initial', 'new']);
        if (removeTagsResult.isOk()) {
          const documentWithRemovedTags = removeTagsResult.unwrap();
          console.log('✅ Tags removed:', documentWithRemovedTags.tags);
        } else {
          console.log('❌ Tag removal failed:', removeTagsResult.unwrapErr());
        }
      } else {
        console.log('❌ Tag addition failed:', addTagsResult.unwrapErr());
      }
    } else {
      console.log('❌ Document creation for tag operations failed:', documentResult.unwrapErr());
    }

  } catch (error) {
    console.log('❌ Document tag operations failed:', error);
  }

  // Test 6: Document File Info Updates
  console.log('\nTest 6: Document File Info Updates');
  try {
    const documentResult = Document.create(
      'File Info Test.pdf',
      '/uploads/file-info-test.pdf',
      'application/pdf',
      '1024',
      ['test'],
      {}
    );

    if (documentResult.isOk()) {
      const document = documentResult.unwrap();
      console.log('✅ Original file info:');
      console.log('  - Path:', document.filePath);
      console.log('  - MIME Type:', document.mimeType.value);
      console.log('  - Size:', document.size.bytes);

      // Update file info
      const fileInfoUpdateResult = document.updateFileInfo(
        '/uploads/updated-file.pdf',
        'image/png',
        '2048'
      );

      if (fileInfoUpdateResult.isOk()) {
        const updatedDocument = fileInfoUpdateResult.unwrap();
        console.log('✅ File info updated');
        console.log('  - New path:', updatedDocument.filePath);
        console.log('  - New MIME Type:', updatedDocument.mimeType.value);
        console.log('  - New size:', updatedDocument.size.bytes);
        console.log('  - Is Image now:', updatedDocument.mimeType.isImage);
        console.log('  - Is PDF now:', updatedDocument.mimeType.isDocument);
      } else {
        console.log('❌ File info update failed:', fileInfoUpdateResult.unwrapErr());
      }
    } else {
      console.log('❌ Document creation for file info updates failed:', documentResult.unwrapErr());
    }

  } catch (error) {
    console.log('❌ Document file info updates failed:', error);
  }

  // Test 7: Document Validation
  console.log('\nTest 7: Document Validation');
  try {
    // Test invalid name
    const invalidNameResult = Document.create(
      '',
      '/uploads/test.pdf',
      'application/pdf',
      '1024',
      ['test'],
      {}
    );
    if (invalidNameResult.isErr()) {
      console.log('✅ Correctly rejected empty name:', invalidNameResult.unwrapErr());
    } else {
      console.log('❌ Should have rejected empty name');
    }

    // Test invalid MIME type
    const invalidMimeTypeResult = Document.create(
      'Test Document',
      '/uploads/test.exe',
      'invalid/mime/type',
      '1024',
      ['test'],
      {}
    );
    if (invalidMimeTypeResult.isErr()) {
      console.log('✅ Correctly rejected invalid MIME type:', invalidMimeTypeResult.unwrapErr());
    } else {
      console.log('❌ Should have rejected invalid MIME type');
    }

    // Test invalid file size
    const invalidSizeResult = Document.create(
      'Test Document',
      '/uploads/test.pdf',
      'application/pdf',
      '-1024',
      ['test'],
      {}
    );
    if (invalidSizeResult.isErr()) {
      console.log('✅ Correctly rejected invalid file size:', invalidSizeResult.unwrapErr());
    } else {
      console.log('❌ Should have rejected invalid file size');
    }

  } catch (error) {
    console.log('❌ Document validation tests failed:', error);
  }

  // Test 8: Document Business Methods
  console.log('\nTest 8: Document Business Methods');
  try {
    const documentResult = Document.create(
      'Business Rules Test.pdf',
      '/uploads/business-test.pdf',
      'application/pdf',
      '1024',
      ['business', 'rules'],
      { category: 'test' }
    );

    if (documentResult.isOk()) {
      const document = documentResult.unwrap();

      // Test file type checks
      console.log('✅ Is PDF document:', document.isPDF());
      console.log('✅ Is image document:', document.isImage());
      console.log('✅ Is text document:', document.isTextFile());

      // Test file size methods
      console.log('✅ File size in bytes:', document.getFileSizeInBytes());
      console.log('✅ File size in MB:', document.getFileSizeInMB());

      // Test tag methods
      console.log('✅ Has tag "business":', document.hasTag('business'));
      console.log('✅ Has tag "nonexistent":', document.hasTag('nonexistent'));

      // Test metadata methods
      console.log('✅ Has metadata "category":', document.hasMetadata('category'));
      console.log('✅ Metadata value "category":', document.getMetadataValue('category'));

      // Test update time methods
      console.log('✅ Is recently updated (24h):', document.isRecentlyUpdated(24));
      console.log('✅ Is recently updated (1h):', document.isRecentlyUpdated(1));

      // Test value object properties
      console.log('✅ Document name length:', document.name.length);
      console.log('✅ Document name is short:', document.name.isShort);
      console.log('✅ MIME type main type:', document.mimeType.mainType);
      console.log('✅ MIME type sub type:', document.mimeType.subType);
      console.log('✅ File size in KB:', document.size.kilobytes);
      console.log('✅ File size is small:', document.size.isSmall);

    } else {
      console.log('❌ Document creation for business methods failed:', documentResult.unwrapErr());
    }

  } catch (error) {
    console.log('❌ Document business methods failed:', error);
  }

  // Test 9: Repository Conversion
  console.log('\nTest 9: Repository Conversion');
  try {
    const documentResult = Document.create(
      'Repo Test Document.pdf',
      '/uploads/repo-test.pdf',
      'application/pdf',
      '1024',
      ['repository', 'test'],
      { source: 'test' }
    );

    if (documentResult.isOk()) {
      const document = documentResult.unwrap();
      const repoData = document.toRepository();
      
      console.log('✅ Repository conversion works');
      console.log('  - ID type:', typeof repoData.id);
      console.log('  - Name type:', typeof repoData.name);
      console.log('  - MIME Type type:', typeof repoData.mimeType);
      console.log('  - Size type:', typeof repoData.size);
      console.log('  - Name value:', repoData.name);
      console.log('  - MIME Type value:', repoData.mimeType);
      console.log('  - Size value:', repoData.size);
      
      // Verify we can recreate from repository data
      const recreatedDocument = Document.fromRepository(repoData);
      if (recreatedDocument.isOk()) {
        console.log('✅ Recreation from repository data works');
        console.log('  - Recreated name:', recreatedDocument.unwrap().name.value);
        console.log('  - Recreated MIME type:', recreatedDocument.unwrap().mimeType.value);
        console.log('  - Recreated size:', recreatedDocument.unwrap().size.bytes);
      } else {
        console.log('❌ Recreation from repository data failed:', recreatedDocument.unwrapErr());
      }
    } else {
      console.log('❌ Document creation for repository conversion failed:', documentResult.unwrapErr());
    }

  } catch (error) {
    console.log('❌ Repository conversion failed:', error);
  }

  console.log('\n=== Document Entity Tests Complete ===');
}

export { runDocumentEntityTests }; 

// Run tests immediately
runDocumentEntityTests().catch(console.error);

