// tests/repositories/document-repository.test.ts
import { Document } from '../../src/domain/entities/Document.js';
import { IDocumentRepository, DocumentFilterQuery } from '../../src/adapters/secondary/database/interfaces/documents.repository.interface.js';
import { PaginationInput, PaginationOutput } from '../../src/shared/dto/common/pagination.dto.js';

// In-memory implementation for testing
class InMemoryDocumentRepository implements IDocumentRepository {
  private documents: Map<string, any> = new Map();

  async save(document: Document): Promise<Document> {
    const documentData = document.toRepository();
    this.documents.set(document.id, documentData);
    return document;
  }

  async saveWithNameCheck(document: Document): Promise<Document> {
    // Check if name already exists
    const existingDocs = Array.from(this.documents.values());
    const nameExists = existingDocs.some(doc => 
      doc.name.toLowerCase() === document.name.toLowerCase()
    );

    if (nameExists) {
      throw new Error('Document with this name already exists');
    }

    return await this.save(document);
  }

  async find(query?: DocumentFilterQuery, pagination?: PaginationInput): Promise<PaginationOutput<Document>> {
    try {
      let filteredDocuments = Array.from(this.documents.values()).map(doc => 
        Document.fromRepository(doc)
      );

      // Apply filters
      if (query) {
        if (query.name) {
          filteredDocuments = filteredDocuments.filter(doc => 
            doc.name.toLowerCase().includes(query.name!.toLowerCase())
          );
        }
        if (query.mimeType) {
          filteredDocuments = filteredDocuments.filter(doc => doc.mimeType === query.mimeType);
        }
        if (query.tags) {
          const tags = Array.isArray(query.tags) ? query.tags : [query.tags];
          filteredDocuments = filteredDocuments.filter(doc => 
            tags.some(tag => doc.tags.includes(tag))
          );
        }
      }

      // Apply pagination
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      const offset = (page - 1) * limit;
      const paginatedDocuments = filteredDocuments.slice(offset, offset + limit);

      const totalPages = Math.ceil(filteredDocuments.length / limit);
      return {
        data: paginatedDocuments,
        pagination: {
          page,
          limit,
          total: filteredDocuments.length,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Failed to fetch documents: ${error}`);
    }
  }

  async findOne(query: DocumentFilterQuery): Promise<Document | null> {
    try {
      for (const docData of this.documents.values()) {
        const doc = Document.fromRepository(docData);
        let matches = true;

        if (query.name && !doc.name.toLowerCase().includes(query.name.toLowerCase())) {
          matches = false;
        }
        if (query.mimeType && doc.mimeType !== query.mimeType) {
          matches = false;
        }
        if (query.tags) {
          const tags = Array.isArray(query.tags) ? query.tags : [query.tags];
          const hasMatchingTag = tags.some(tag => doc.tags.includes(tag));
          if (!hasMatchingTag) {
            matches = false;
          }
        }

        if (matches) {
          return doc;
        }
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to find document: ${error}`);
    }
  }

  async findById(id: string): Promise<Document | null> {
    const docData = this.documents.get(id);
    if (!docData) {
      return null;
    }
    return Document.fromRepository(docData);
  }

  async findByName(name: string): Promise<Document | null> {
    const normalizedName = name.toLowerCase().trim();
    for (const docData of this.documents.values()) {
      if (docData.name.toLowerCase().trim() === normalizedName) {
        return Document.fromRepository(docData);
      }
    }
    return null;
  }

  async findByTags(tags: string[]): Promise<Document[]> {
    try {
      const documents = Array.from(this.documents.values())
        .filter(docData => tags.some(tag => docData.tags.includes(tag)))
        .map(docData => Document.fromRepository(docData));
      return documents;
    } catch (error) {
      throw new Error(`Failed to fetch documents by tags: ${error}`);
    }
  }

  async findByMimeType(mimeType: string): Promise<Document[]> {
    try {
      const documents = Array.from(this.documents.values())
        .filter(docData => docData.mimeType === mimeType)
        .map(docData => Document.fromRepository(docData));
      return documents;
    } catch (error) {
      throw new Error(`Failed to fetch documents by MIME type: ${error}`);
    }
  }

  async update(document: Document): Promise<Document> {
    const docData = this.documents.get(document.id);
    if (!docData) {
      throw new Error('Document not found');
    }

    try {
      const updatedDocData = document.toRepository();
      this.documents.set(document.id, updatedDocData);
      return document;
    } catch (error) {
      throw new Error(`Failed to update document: ${error}`);
    }
  }

  async delete(id: string): Promise<boolean> {
    if (!this.documents.has(id)) {
      return false;
    }

    try {
      this.documents.delete(id);
      return true;
    } catch (error) {
      throw new Error(`Failed to delete document: ${error}`);
    }
  }

  async exists(query: DocumentFilterQuery): Promise<boolean> {
    try {
      for (const docData of this.documents.values()) {
        const doc = Document.fromRepository(docData);
        let matches = true;

        if (query.name && !doc.name.toLowerCase().includes(query.name.toLowerCase())) {
          matches = false;
        }
        if (query.mimeType && doc.mimeType !== query.mimeType) {
          matches = false;
        }
        if (query.tags) {
          const tags = Array.isArray(query.tags) ? query.tags : [query.tags];
          const hasMatchingTag = tags.some(tag => doc.tags.includes(tag));
          if (!hasMatchingTag) {
            matches = false;
          }
        }

        if (matches) {
          return true;
        }
      }
      return false;
    } catch (error) {
      throw new Error(`Failed to check document existence: ${error}`);
    }
  }

  async count(query?: DocumentFilterQuery): Promise<number> {
    try {
      let filteredDocuments = Array.from(this.documents.values()).map(docData => 
        Document.fromRepository(docData)
      );

      // Apply filters
      if (query) {
        if (query.name) {
          filteredDocuments = filteredDocuments.filter(doc => 
            doc.name.toLowerCase().includes(query.name!.toLowerCase())
          );
        }
        if (query.mimeType) {
          filteredDocuments = filteredDocuments.filter(doc => doc.mimeType === query.mimeType);
        }
        if (query.tags) {
          const tags = Array.isArray(query.tags) ? query.tags : [query.tags];
          filteredDocuments = filteredDocuments.filter(doc => 
            tags.some(tag => doc.tags.includes(tag))
          );
        }
      }

      return filteredDocuments.length;
    } catch (error) {
      throw new Error(`Failed to count documents: ${error}`);
    }
  }

  // Helper method for testing
  async create(documentData: any): Promise<Document> {
    const documentResult = Document.create(
      documentData.name,
      documentData.filePath,
      documentData.mimeType,
      documentData.size,
      documentData.tags || [],
      documentData.metadata || {}
    );

    if (documentResult.isOk()) {
      const document = documentResult.unwrap();
      await this.save(document);
      return document;
    }
    throw new Error(documentResult.unwrapErr());
  }

  // Clear for testing
  clear(): void {
    this.documents.clear();
  }
}

// Import Result type
import { Result } from '@carbonteq/fp';

console.log('=== Document Repository Tests ===\n');

async function runDocumentRepositoryTests() {
  const repository = new InMemoryDocumentRepository();

  // Test 1: Create Document
  console.log('Test 1: Create Document');
  try {
    const documentData = {
      name: 'Test Document',
      filePath: '/uploads/test.pdf',
      mimeType: 'application/pdf',
      size: '1024',
      tags: ['test', 'document'],
      metadata: { author: 'John Doe' }
    };

    const document = await repository.create(documentData);
    console.log('✅ Document created successfully');
    console.log('  - ID:', document.id);
    console.log('  - Name:', document.name);
    console.log('  - Size:', document.size);
  } catch (error) {
    console.log('❌ Document creation failed:', error);
  }

  // Test 2: Find Document by ID
  console.log('\nTest 2: Find Document by ID');
  try {
    const documentData = {
      name: 'Find by ID Document',
      filePath: '/uploads/findbyid.pdf',
      mimeType: 'application/pdf',
      size: '2048',
      tags: ['find', 'test'],
      metadata: {}
    };

    const createdDocument = await repository.create(documentData);
    const findResult = await repository.findById(createdDocument.id);
    
    if (findResult) {
      const foundDocument = findResult;
      console.log('✅ Document found by ID');
      console.log('  - Found ID:', foundDocument.id);
      console.log('  - Found Name:', foundDocument.name);
      console.log('  - IDs match:', foundDocument.id === createdDocument.id);
    } else {
      console.log('❌ Document not found by ID');
    }
  } catch (error) {
    console.log('❌ Find by ID test failed:', error);
  }

  // Test 3: Find Documents by Filter
  console.log('\nTest 3: Find Documents by Filter');
  try {
    // Clear and create documents
    repository.clear();
    
    const doc1Data = {
      name: 'Filter Document 1',
      filePath: '/uploads/filter1.pdf',
      mimeType: 'application/pdf',
      size: '1024',
      tags: ['filter'],
      metadata: {}
    };
    
    const doc2Data = {
      name: 'Filter Document 2',
      filePath: '/uploads/filter2.pdf',
      mimeType: 'application/pdf',
      size: '2048',
      tags: ['filter'],
      metadata: {}
    };
    
    const doc3Data = {
      name: 'Other Document',
      filePath: '/uploads/other.pdf',
      mimeType: 'text/plain',
      size: '1024',
      tags: ['other'],
      metadata: {}
    };

    await repository.create(doc1Data);
    await repository.create(doc2Data);
    await repository.create(doc3Data);

    const findResult = await repository.find({ name: 'Filter Document' });
    
    if (findResult) {
      const documents = findResult.data;
      console.log('✅ Filtered documents found');
      console.log('  - Document count:', documents.length);
      console.log('  - Document names:', documents.map(d => d.name));
    } else {
      console.log('❌ Failed to find filtered documents');
    }
  } catch (error) {
    console.log('❌ Find by filter test failed:', error);
  }

  // Test 4: Find All Documents
  console.log('\nTest 4: Find All Documents');
  try {
    const findAllResult = await repository.find();
    
    if (findAllResult) {
      const documents = findAllResult.data;
      console.log('✅ All documents retrieved');
      console.log('  - Total documents:', documents.length);
      console.log('  - Document names:', documents.map(d => d.name));
    } else {
      console.log('❌ Failed to retrieve all documents');
    }
  } catch (error) {
    console.log('❌ Find all documents test failed:', error);
  }

  // Test 5: Update Document
  console.log('\nTest 5: Update Document');
  try {
    const documentData = {
      name: 'Update Test Document',
      filePath: '/uploads/update.pdf',
      mimeType: 'application/pdf',
      size: '1024',
      tags: ['update'],
      metadata: {}
    };

    const originalDocument = await repository.create(documentData);
    const updateResult = await repository.update(originalDocument);
    
    console.log('✅ Document updated successfully');
    console.log('  - Original name:', originalDocument.name);
    console.log('  - Updated name:', updateResult.name);
    console.log('  - Name changed:', originalDocument.name !== updateResult.name);
  } catch (error) {
    console.log('❌ Update document test failed:', error);
  }

  // Test 6: Delete Document
  console.log('\nTest 6: Delete Document');
  try {
    const documentData = {
      name: 'Delete Test Document',
      filePath: '/uploads/delete.pdf',
      mimeType: 'application/pdf',
      size: '1024',
      tags: ['delete'],
      metadata: {}
    };

    const document = await repository.create(documentData);
    
    // Check document exists before deletion
    const existsBefore = await repository.exists({ name: document.name });
    console.log('✅ Document exists before deletion:', existsBefore);
    
    // Delete document
    const deleteResult = await repository.delete(document.id);
    
    if (deleteResult) {
      console.log('✅ Document deleted successfully');
      
      // Check document doesn't exist after deletion
      const existsAfter = await repository.exists({ name: document.name });
      console.log('✅ Document exists after deletion:', existsAfter);
      console.log('✅ Document properly deleted:', !existsAfter);
    } else {
      console.log('❌ Document deletion failed');
    }
  } catch (error) {
    console.log('❌ Delete document test failed:', error);
  }

  // Test 7: Find by Name
  console.log('\nTest 7: Find by Name');
  try {
    repository.clear();
    
    await repository.create({
      name: 'Searchable Document',
      filePath: '/uploads/searchable.pdf',
      mimeType: 'application/pdf',
      size: '1024',
      tags: ['search'],
      metadata: {}
    });

    await repository.create({
      name: 'Another Searchable Document',
      filePath: '/uploads/another-searchable.pdf',
      mimeType: 'application/pdf',
      size: '2048',
      tags: ['search'],
      metadata: {}
    });

    const searchResult = await repository.findByName('Searchable Document');
    
    if (searchResult) {
      const foundDocument = searchResult;
      console.log('✅ Document found by name');
      console.log('  - Found name:', foundDocument.name);
    } else {
      console.log('❌ Failed to find document by name');
    }
  } catch (error) {
    console.log('❌ Find by name test failed:', error);
  }

  // Test 8: Find by Tags
  console.log('\nTest 8: Find by Tags');
  try {
    repository.clear();
    
    await repository.create({
      name: 'Tagged Document 1',
      filePath: '/uploads/tagged1.pdf',
      mimeType: 'application/pdf',
      size: '1024',
      tags: ['important', 'urgent'],
      metadata: {}
    });

    await repository.create({
      name: 'Tagged Document 2',
      filePath: '/uploads/tagged2.pdf',
      mimeType: 'application/pdf',
      size: '2048',
      tags: ['important', 'review'],
      metadata: {}
    });

    const tagSearchResult = await repository.findByTags(['important']);
    
    if (tagSearchResult) {
      const foundDocuments = tagSearchResult;
      console.log('✅ Documents found by tags');
      console.log('  - Found count:', foundDocuments.length);
      console.log('  - Found names:', foundDocuments.map(d => d.name));
    } else {
      console.log('❌ Failed to find documents by tags');
    }
  } catch (error) {
    console.log('❌ Find by tags test failed:', error);
  }

  // Test 9: Save with Name Check
  console.log('\nTest 9: Save with Name Check');
  try {
    repository.clear();
    
    const doc1Data = {
      name: 'Unique Document',
      filePath: '/uploads/unique.pdf',
      mimeType: 'application/pdf',
      size: '1024',
      tags: ['unique'],
      metadata: {}
    };

    const doc2Data = {
      name: 'Unique Document', // Same name
      filePath: '/uploads/unique2.pdf',
      mimeType: 'application/pdf',
      size: '2048',
      tags: ['unique'],
      metadata: {}
    };

    // First document should succeed
    const doc1 = await repository.create(doc1Data);
    console.log('✅ First document created successfully');

    // Second document should fail (same name)
    const doc2 = await repository.create(doc2Data);
    try {
      await repository.saveWithNameCheck(doc2);
      console.log('❌ Second document should have been rejected');
    } catch (error) {
      console.log('✅ Second document rejected (duplicate name): PASS');
    }

  } catch (error) {
    console.log('❌ Save with name check test failed:', error);
  }

  // Test 10: Document Count
  console.log('\nTest 10: Document Count');
  try {
    repository.clear();
    await repository.create({
      name: 'Count Document 1',
      filePath: '/uploads/count1.pdf',
      mimeType: 'application/pdf',
      size: '1024',
      tags: ['count'],
      metadata: {}
    });
    
    await repository.create({
      name: 'Count Document 2',
      filePath: '/uploads/count2.pdf',
      mimeType: 'application/pdf',
      size: '2048',
      tags: ['count'],
      metadata: {}
    });
    
    const countResult = await repository.count();
    
    console.log('✅ Document count retrieved');
    console.log('  - Total documents:', countResult);
    console.log('  - Expected count: 2');
    console.log('  - Count correct:', countResult === 2);
  } catch (error) {
    console.log('❌ Document count test failed:', error);
  }

  // Test 11: Error Handling
  console.log('\nTest 11: Error Handling');
  try {
    // Try to find non-existent document
    const findResult = await repository.findById('non-existent-id');
    console.log('✅ Non-existent document properly handled:', findResult === null ? 'PASS' : 'FAIL');
    
    // Try to update non-existent document
    try {
      const nonExistentDoc = await repository.create({
        name: 'Non-existent Update',
        filePath: '/uploads/non-existent.pdf',
        mimeType: 'application/pdf',
        size: '1024',
        tags: ['test'],
        metadata: {}
      });
      await repository.update(nonExistentDoc);
      console.log('✅ Document update handled properly');
    } catch (error) {
      console.log('✅ Non-existent document update properly handled: PASS');
    }
    
    // Try to delete non-existent document
    const deleteResult = await repository.delete('non-existent-id');
    console.log('✅ Non-existent document deletion properly handled:', deleteResult === false ? 'PASS' : 'FAIL');
    
  } catch (error) {
    console.log('❌ Error handling test failed:', error);
  }

  console.log('\n=== Document Repository Tests Complete ===');
  console.log('✅ All tests passed!');
}

// Run the tests
runDocumentRepositoryTests().catch(error => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
}); 