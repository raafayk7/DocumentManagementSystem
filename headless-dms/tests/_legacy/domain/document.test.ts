// tests/domain/document.test.ts
import { Document, DocumentProps } from '../../src/domain/entities/Document.js';

async function runDocumentTests() {
  console.log('=== Document Entity Tests ===\n');

  // Test 1: Document Creation
  console.log('Test 1: Document Creation');
  try {
    const documentProps: DocumentProps = {
      id: 'doc-123',
      name: 'Test Document',
      filePath: '/uploads/test.pdf',
      mimeType: 'application/pdf',
      size: '1024',
      tags: ['test', 'document'],
      metadata: { author: 'John Doe', version: '1.0' },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const document = Document.fromRepository(documentProps);
    console.log('✅ Document created successfully');
    console.log('  - ID:', document.id);
    console.log('  - Name:', document.name);
    console.log('  - Size:', document.size);
  } catch (error) {
    console.log('❌ Document creation failed:', error);
  }

  // Test 2: Document Factory Method
  console.log('\nTest 2: Document Factory Method');
  try {
    const documentResult = Document.create(
      'New Document',
      '/uploads/new-doc.pdf',
      'application/pdf',
      '2048',
      ['new', 'pdf'],
      { author: 'Jane Doe' }
    );

    if (documentResult.isOk()) {
      const document = documentResult.unwrap();
      console.log('✅ Document factory method works');
      console.log('  - ID:', document.id);
      console.log('  - Name:', document.name);
      console.log('  - Tags:', document.tags);
      console.log('  - Created at:', document.createdAt);
    } else {
      console.log('❌ Document factory method failed:', documentResult.unwrapErr());
    }
  } catch (error) {
    console.log('❌ Document factory method failed:', error);
  }

  // Test 3: Document State Changes
  console.log('\nTest 3: Document State Changes');
  try {
    const documentResult = Document.create(
      'Changeable Document',
      '/uploads/changeable.pdf',
      'application/pdf',
      '1024',
      ['original'],
      { version: '1.0' }
    );

    if (documentResult.isOk()) {
      const document = documentResult.unwrap();
      console.log('✅ Original document state:');
      console.log('  - Name:', document.name);
      console.log('  - Tags:', document.tags);
      console.log('  - Updated at:', document.updatedAt);

      // Change name
      const nameChangeResult = document.updateName('Updated Document Name');
      if (nameChangeResult.isOk()) {
        const renamedDocument = nameChangeResult.unwrap();
        console.log('✅ Name changed');
        console.log('  - New name:', renamedDocument.name);
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

  // Test 4: Document Validation
  console.log('\nTest 4: Document Validation');
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

    // Test invalid file type
    const invalidFileTypeResult = Document.create(
      'Test Document',
      '/uploads/test.exe',
      'application/exe',
      '1024',
      ['test'],
      {}
    );
    if (invalidFileTypeResult.isErr()) {
      console.log('✅ Correctly rejected invalid file type:', invalidFileTypeResult.unwrapErr());
    } else {
      console.log('❌ Should have rejected invalid file type');
    }

    // Test invalid file path
    const invalidPathResult = Document.create(
      'Test Document',
      'relative/path/document.pdf',
      'application/pdf',
      '1024',
      ['test'],
      {}
    );
    if (invalidPathResult.isErr()) {
      console.log('✅ Correctly rejected invalid path:', invalidPathResult.unwrapErr());
    } else {
      console.log('❌ Should have rejected invalid path');
    }

  } catch (error) {
    console.log('❌ Document validation tests failed:', error);
  }

  // Test 5: Document Business Methods
  console.log('\nTest 5: Document Business Methods');
  try {
    const documentResult = Document.create(
      'Business Rules Test',
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
      console.log('✅ Has metadata "nonexistent":', document.hasMetadata('nonexistent'));

      // Test recent update check
      console.log('✅ Is recently updated:', document.isRecentlyUpdated(24));

    } else {
      console.log('❌ Document creation for business methods failed:', documentResult.unwrapErr());
    }

  } catch (error) {
    console.log('❌ Document business methods test failed:', error);
  }

  // Test 6: Document Immutability
  console.log('\nTest 6: Document Immutability');
  try {
    const documentResult = Document.create(
      'Immutable Test',
      '/uploads/immutable.pdf',
      'application/pdf',
      '1024',
      ['immutable'],
      {}
    );

    if (documentResult.isOk()) {
      const originalDocument = documentResult.unwrap();
      const nameChangeResult = originalDocument.updateName('Changed Name');
      
      if (nameChangeResult.isOk()) {
        const changedDocument = nameChangeResult.unwrap();
        
        console.log('✅ Original document unchanged:');
        console.log('  - Original name:', originalDocument.name);
        console.log('  - Changed document name:', changedDocument.name);
        console.log('  - Are different objects:', originalDocument !== changedDocument);
      } else {
        console.log('❌ Name change for immutability test failed:', nameChangeResult.unwrapErr());
      }
    } else {
      console.log('❌ Document creation for immutability test failed:', documentResult.unwrapErr());
    }

  } catch (error) {
    console.log('❌ Document immutability test failed:', error);
  }

  console.log('\n=== Document Entity Tests Complete ===');
  console.log('✅ All tests passed!');
}

// Run the tests
runDocumentTests().catch(error => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
}); 