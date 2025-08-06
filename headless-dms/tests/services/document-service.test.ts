// tests/services/document-service.test.ts
import 'reflect-metadata';
import { DocumentService } from '../../src/documents/documents.service.js';
import { IDocumentRepository } from '../../src/documents/repositories/documents.repository.interface.js';
import { Document } from '../../src/domain/entities/Document.js';
import { DocumentValidator } from '../../src/domain/validators/DocumentValidator.js';
import { Result } from '@carbonteq/fp';
import { ILogger } from '../../src/common/services/logger.service.interface.js';
import { IFileService } from '../../src/common/services/file.service.interface.js';

// Mock repository for testing
class MockDocumentRepository implements IDocumentRepository {
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

  async find(query?: any, pagination?: any): Promise<any> {
    const documents = Array.from(this.documents.values()).map(doc => 
      Document.fromRepository(doc)
    );
    return {
      data: documents,
      pagination: {
        page: 1,
        limit: 10,
        total: documents.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    };
  }

  async findOne(query: any): Promise<Document | null> {
    for (const docData of this.documents.values()) {
      const doc = Document.fromRepository(docData);
      if (query.name && doc.name.includes(query.name)) {
        return doc;
      }
    }
    return null;
  }

  async findById(id: string): Promise<Document | null> {
    const docData = this.documents.get(id);
    return docData ? Document.fromRepository(docData) : null;
  }

  async findByName(name: string): Promise<Document | null> {
    for (const docData of this.documents.values()) {
      const doc = Document.fromRepository(docData);
      if (doc.name === name) {
        return doc;
      }
    }
    return null;
  }

  async findByTags(tags: string[]): Promise<Document[]> {
    return Array.from(this.documents.values())
      .filter(docData => tags.some(tag => docData.tags.includes(tag)))
      .map(docData => Document.fromRepository(docData));
  }

  async findByMimeType(mimeType: string): Promise<Document[]> {
    return Array.from(this.documents.values())
      .filter(docData => docData.mimeType === mimeType)
      .map(docData => Document.fromRepository(docData));
  }

  async update(document: Document): Promise<Document> {
    const docData = this.documents.get(document.id);
    if (!docData) {
      throw new Error('Document not found');
    }
    const updatedDocData = document.toRepository();
    this.documents.set(document.id, updatedDocData);
    return document;
  }

  async delete(id: string): Promise<boolean> {
    if (this.documents.has(id)) {
      this.documents.delete(id);
      return true;
    }
    return false;
  }

  async exists(query: any): Promise<boolean> {
    for (const docData of this.documents.values()) {
      const doc = Document.fromRepository(docData);
      if (query.name && doc.name.includes(query.name)) {
        return true;
      }
    }
    return false;
  }

  async count(query?: any): Promise<number> {
    return this.documents.size;
  }

  // Helper for testing
  clear(): void {
    this.documents.clear();
  }
}

// Mock logger for testing
class MockLogger implements ILogger {
  error(message: string, context?: any): void {}
  warn(message: string, context?: any): void {}
  info(message: string, context?: any): void {}
  debug(message: string, context?: any): void {}
  log(level: string, message: string, context?: any): void {}
  logError(error: Error, context?: any): void {}
  logRequest(request: any, context?: any): void {}
  logResponse(response: any, context?: any): void {}
  child(context: any): ILogger { return this; }
}

// Mock file service for testing
class MockFileService implements IFileService {
  async saveFile(request: any): Promise<Result<any, any>> {
    return Result.Ok({
      path: '/uploads/test.pdf',
      name: 'test.pdf',
      mimeType: 'application/pdf',
      size: '1024',
      fields: {}
    });
  }
  async streamFile(filePath: string, reply: any): Promise<Result<void, any>> {
    return Result.Ok(undefined);
  }
  async deleteFile(filePath: string): Promise<Result<boolean, any>> {
    return Result.Ok(true);
  }
  async fileExists(filePath: string): Promise<Result<boolean, any>> {
    return Result.Ok(true);
  }
}

console.log('=== Document Service Tests ===\n');

async function runDocumentServiceTests() {
  const repository = new MockDocumentRepository();
  const logger = new MockLogger();
  const fileService = new MockFileService();
  const service = new DocumentService(repository, fileService, logger);

  // Test 1: Create Document
  console.log('Test 1: Create Document');
  try {
    const createData = {
      name: 'Test Document.pdf',
      filePath: '/uploads/test.pdf',
      mimeType: 'application/pdf',
      size: '1024',
      tags: ['test', 'document'],
      metadata: { author: 'John Doe' }
    };

    const result = await service.createDocument(createData);
    
    if (result.isOk()) {
      const document = result.unwrap();
      console.log('✅ Document created successfully');
      console.log('  - ID:', document.id);
      console.log('  - Name:', document.name);
      console.log('  - Size:', document.size);
      console.log('  - Tags:', document.tags);
    } else {
      console.log('❌ Document creation failed:', result.unwrapErr());
    }
  } catch (error) {
    console.log('❌ Create document test failed:', error);
  }

  // Test 2: Create Duplicate Document
  console.log('\nTest 2: Create Duplicate Document');
  try {
    const createData = {
      name: 'Duplicate Document.pdf',
      filePath: '/uploads/duplicate.pdf',
      mimeType: 'application/pdf',
      size: '1024',
      tags: ['duplicate'],
      metadata: {}
    };

    const result1 = await service.createDocument(createData);
    const result2 = await service.createDocument(createData);
    
    if (result1.isOk() && result2.isErr()) {
      console.log('✅ Duplicate document properly rejected');
      console.log('  - First creation:', result1.isOk() ? 'SUCCESS' : 'FAIL');
      console.log('  - Second creation:', result2.isErr() ? 'REJECTED' : 'ALLOWED');
    } else {
      console.log('❌ Duplicate document handling failed');
    }
  } catch (error) {
    console.log('❌ Duplicate document test failed:', error);
  }

  // Test 3: Get Document by ID
  console.log('\nTest 3: Get Document by ID');
  try {
    const createData = {
      name: 'Get by ID Document.pdf',
      filePath: '/uploads/getbyid.pdf',
      mimeType: 'application/pdf',
      size: '2048',
      tags: ['get', 'test'],
      metadata: {}
    };

    const createResult = await service.createDocument(createData);
    
    if (createResult.isOk()) {
      const createdDoc = createResult.unwrap();
      const getResult = await service.findOneDocument(createdDoc.id);
      
      if (getResult.isOk()) {
        const document = getResult.unwrap();
        console.log('✅ Document retrieved by ID successfully');
        console.log('  - Found document:', document.name);
        console.log('  - IDs match:', document.id === createdDoc.id);
      } else {
        console.log('❌ Get document by ID failed:', getResult.unwrapErr());
      }
    } else {
      console.log('❌ Document creation for get by ID test failed');
    }
  } catch (error) {
    console.log('❌ Get document by ID test failed:', error);
  }

  // Test 4: Update Document Name
  console.log('\nTest 4: Update Document Name');
  try {
    const createData = {
      name: 'Update Test Document.pdf',
      filePath: '/uploads/update.pdf',
      mimeType: 'application/pdf',
      size: '1024',
      tags: ['update'],
      metadata: {}
    };

    const createResult = await service.createDocument(createData);
    
    if (createResult.isOk()) {
      const originalDoc = createResult.unwrap();
      const updateResult = await service.updateDocumentName(originalDoc.id, 'Updated Document Name.pdf');
      
      if (updateResult.isOk()) {
        const updatedDoc = updateResult.unwrap();
        console.log('✅ Document name updated successfully');
        console.log('  - Original name:', originalDoc.name);
        console.log('  - Updated name:', updatedDoc.name);
        console.log('  - Name changed:', originalDoc.name !== updatedDoc.name);
      } else {
        console.log('❌ Update document name failed:', updateResult.unwrapErr());
      }
    } else {
      console.log('❌ Document creation for update test failed');
    }
  } catch (error) {
    console.log('❌ Update document name test failed:', error);
  }

  // Test 5: Delete Document
  console.log('\nTest 5: Delete Document');
  try {
    const createData = {
      name: 'Delete Test Document.pdf',
      filePath: '/uploads/delete.pdf',
      mimeType: 'application/pdf',
      size: '1024',
      tags: ['delete'],
      metadata: {}
    };

    const createResult = await service.createDocument(createData);
    
    if (createResult.isOk()) {
      const document = createResult.unwrap();
      const deleteResult = await service.removeDocument(document.id);
      
      if (deleteResult.isOk()) {
        const result = deleteResult.unwrap();
        console.log('✅ Document deleted successfully');
        console.log('  - Deleted:', result.deleted);
        
        // Verify document is gone
        const getResult = await service.findOneDocument(document.id);
        if (getResult.isErr()) {
          console.log('✅ Document properly removed from system');
        } else {
          console.log('❌ Document still exists after deletion');
        }
      } else {
        console.log('❌ Delete document failed:', deleteResult.unwrapErr());
      }
    } else {
      console.log('❌ Document creation for delete test failed');
    }
  } catch (error) {
    console.log('❌ Delete document test failed:', error);
  }

  // Test 6: List Documents
  console.log('\nTest 6: List Documents');
  try {
    repository.clear();
    
    // Create multiple documents
    await service.createDocument({
      name: 'List Document 1.pdf',
      filePath: '/uploads/list1.pdf',
      mimeType: 'application/pdf',
      size: '1024',
      tags: ['list'],
      metadata: {}
    });

    await service.createDocument({
      name: 'List Document 2.pdf',
      filePath: '/uploads/list2.pdf',
      mimeType: 'application/pdf',
      size: '2048',
      tags: ['list'],
      metadata: {}
    });

    await service.createDocument({
      name: 'List Document 3.txt',
      filePath: '/uploads/list3.txt',
      mimeType: 'text/plain',
      size: '512',
      tags: ['list', 'text'],
      metadata: {}
    });
    
    const listResult = await service.findAllDocuments();
    
    if (listResult.isOk()) {
      const result = listResult.unwrap();
      console.log('✅ Documents listed successfully');
      console.log('  - Total documents:', result.data.length);
      console.log('  - Document names:', result.data.map(d => d.name));
    } else {
      console.log('❌ List documents failed:', listResult.unwrapErr());
    }
  } catch (error) {
    console.log('❌ List documents test failed:', error);
  }

  // Test 7: Search Documents by Tags
  console.log('\nTest 7: Search Documents by Tags');
  try {
    const searchResult = await service.findDocumentsByTags(['list']);
    
    if (searchResult.isOk()) {
      const documents = searchResult.unwrap();
      console.log('✅ Documents found by tags');
      console.log('  - Found count:', documents.length);
      console.log('  - Found names:', documents.map(d => d.name));
    } else {
      console.log('❌ Search documents by tags failed:', searchResult.unwrapErr());
    }
  } catch (error) {
    console.log('❌ Search documents by tags test failed:', error);
  }

  // Test 8: Search Documents by MIME Type
  console.log('\nTest 8: Search Documents by MIME Type');
  try {
    const searchResult = await service.findDocumentsByMimeType('application/pdf');
    
    if (searchResult.isOk()) {
      const documents = searchResult.unwrap();
      console.log('✅ Documents found by MIME type');
      console.log('  - Found count:', documents.length);
      console.log('  - Found names:', documents.map(d => d.name));
      console.log('  - All PDFs:', documents.every(d => d.mimeType === 'application/pdf'));
    } else {
      console.log('❌ Search documents by MIME type failed:', searchResult.unwrapErr());
    }
  } catch (error) {
    console.log('❌ Search documents by MIME type test failed:', error);
  }

  // Test 9: Validation Errors
  console.log('\nTest 9: Validation Errors');
  try {
    // Test invalid file name
    const invalidNameResult = await service.createDocument({
      name: '',
      filePath: '/uploads/invalid.pdf',
      mimeType: 'application/pdf',
      size: '1024',
      tags: ['invalid'],
      metadata: {}
    });
    if (invalidNameResult.isErr()) {
      console.log('✅ Invalid file name properly rejected');
    } else {
      console.log('❌ Invalid file name should have been rejected');
    }

    // Test invalid file size
    const invalidSizeResult = await service.createDocument({
      name: 'Invalid Size.pdf',
      filePath: '/uploads/invalid.pdf',
      mimeType: 'application/pdf',
      size: '-1024',
      tags: ['invalid'],
      metadata: {}
    });
    if (invalidSizeResult.isErr()) {
      console.log('✅ Invalid file size properly rejected');
    } else {
      console.log('❌ Invalid file size should have been rejected');
    }

    // Test invalid MIME type
    const invalidMimeResult = await service.createDocument({
      name: 'Invalid MIME.pdf',
      filePath: '/uploads/invalid.pdf',
      mimeType: 'invalid/mime',
      size: '1024',
      tags: ['invalid'],
      metadata: {}
    });
    if (invalidMimeResult.isErr()) {
      console.log('✅ Invalid MIME type properly rejected');
    } else {
      console.log('❌ Invalid MIME type should have been rejected');
    }

  } catch (error) {
    console.log('❌ Validation errors test failed:', error);
  }

  console.log('\n=== Document Service Tests Complete ===');
  console.log('✅ All tests completed!');
}

// Run the tests
runDocumentServiceTests().catch(console.error); 