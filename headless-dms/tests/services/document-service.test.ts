// tests/services/document-service.test.ts
import 'reflect-metadata';
import { DocumentApplicationService } from '../../src/application/services/DocumentApplicationService.js';
import { IDocumentRepository } from '../../src/application/interfaces/IDocumentRepository.js';
import { Document } from '../../src/domain/entities/Document.js';
import { DocumentValidator } from '../../src/domain/validators/DocumentValidator.js';
import { Result } from '@carbonteq/fp';
import { ILogger } from '../../src/domain/interfaces/ILogger.js';
import { IFileService } from '../../src/application/interfaces/IFileService.js';
import { IUserRepository } from '../../src/application/interfaces/IUserRepository.js';
import { FileError } from '../../src/application/errors/index.js';

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
      doc.name.toLowerCase() === document.name.value.toLowerCase()
    );

    if (nameExists) {
      throw new Error('Document with this name already exists');
    }

    return await this.save(document);
  }

  async find(query?: any, pagination?: any): Promise<any> {
    const documents = Array.from(this.documents.values()).map(doc => 
      Document.fromRepository(doc).unwrap()
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
      if (query.name && doc.unwrap().name.value.includes(query.name)) {
        return doc.unwrap();
      }
    }
    return null;
  }

  async findById(id: string): Promise<Document | null> {
    const docData = this.documents.get(id);
    return docData ? Document.fromRepository(docData).unwrap() : null;
  }

  async findByName(name: string): Promise<Document | null> {
    for (const docData of this.documents.values()) {
      const doc = Document.fromRepository(docData);
      if (doc.unwrap().name.value === name) {
        return doc.unwrap();
      }
    }
    return null;
  }

  async findByTags(tags: string[]): Promise<Document[]> {
    return Array.from(this.documents.values())
      .filter(docData => tags.some(tag => docData.tags.includes(tag)))
      .map(docData => Document.fromRepository(docData).unwrap());
  }

  async findByMimeType(mimeType: string): Promise<Document[]> {
    return Array.from(this.documents.values())
      .filter(docData => docData.mimeType === mimeType)
      .map(docData => Document.fromRepository(docData).unwrap());
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
      if (query.name && doc.unwrap().name.value.toLowerCase() === query.name.toLowerCase()) {
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

// Mock user repository for testing
class MockUserRepository implements IUserRepository {
  private users: Map<string, any> = new Map();

  async saveUser(user: any): Promise<any> {
    this.users.set(user.id, user);
    return user;
  }

  async findById(id: string): Promise<any> {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<any> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  // Add other required methods with minimal implementations
  async find(query?: any, pagination?: any): Promise<any> { return { data: [], pagination: {} }; }
  async findOne(query: any): Promise<any> { return null; }
  async findByRole(role: string): Promise<any[]> { return []; }
  async exists(query: any): Promise<boolean> { return false; }
  async count(query?: any): Promise<number> { return 0; }
  async delete(id: string): Promise<boolean> { return false; }
}

// Mock file service for testing
class MockFileService implements IFileService {
  async uploadFile(file: any, metadata: any): Promise<Result<string, Error>> {
    return Result.Ok('mock-file-path');
  }

  async saveFile(file: Buffer, name: string, mimeType: string): Promise<Result<any, any>> {
    return Result.Ok({ path: '/uploads/test.pdf', name, mimeType, size: file.length.toString() });
  }

  async saveFileFromRequest(request: any): Promise<Result<any, any>> {
    return Result.Ok({ path: '/uploads/test.pdf', name: 'test.pdf', mimeType: 'application/pdf', size: '1024' });
  }

  async streamFile(filePath: string, reply: any): Promise<Result<void, any>> {
    return Result.Ok(undefined);
  }

  async fileExists(filePath: string): Promise<Result<boolean, any>> {
    return Result.Ok(true);
  }

  async getFile(filePath: string): Promise<Result<Buffer, any>> {
    return Result.Ok(Buffer.from('test file content'));
  }

  async deleteFile(filePath: string): Promise<Result<boolean, FileError>> {
    return Result.Ok(true);
  }

  async getFileInfo(filePath: string): Promise<Result<any, Error>> {
    return Result.Ok({ size: 1024, mimeType: 'application/pdf' });
  }

  async generateDownloadLink(filePath: string, expiresIn?: number): Promise<Result<string, Error>> {
    return Result.Ok('mock-download-link');
  }
}

// Mock domain services for testing
class MockDocumentDomainService {
  validateDocumentName(document: any) {
    return { isValid: true, issues: [] };
  }

  validateDocumentMetadata(document: any) {
    return { isValid: true, issues: [] };
  }

  calculateDocumentImportance(document: any) {
    return { score: 100, level: 'high' };
  }

  validateDocumentAccess(user: any, document: any) {
    return { 
      isValid: true, 
      issues: [],
      permissions: {
        canRead: true,
        canWrite: true,
        canDelete: true,
        canShare: true,
        canDownload: true
      }
    };
  }

  validateDocumentRetention(document: any) {
    return { isValid: true, issues: [] };
  }

  calculateRetentionPolicy(document: any) {
    return { days: 365, policy: 'standard' };
  }

  calculateStorageCost(document: any) {
    return { cost: 0.01, currency: 'USD' };
  }

  shouldCompressDocument(document: any) {
    return false;
  }

  calculateSecurityLevel(document: any) {
    return { level: 'medium', encryption: 'AES-256' };
  }

  shouldBackupDocument(document: any) {
    return true;
  }
}

class MockUserDomainService {
  canUserPerformAction(user: any, action: string, resource: string) {
    return true;
  }
}

// Mock logger for testing
class MockLogger implements ILogger {
  error(message: string, context?: any): void {}
  warn(message: string, context?: any): void {}
  info(message: string, context?: any): void {}
  debug(message: string, context?: any): void {}
  log(level: any, message: string, context?: any): void {}
  logError(error: Error, context?: any): void {}
  logRequest(request: any, context?: any): void {}
  logResponse(response: any, context?: any): void {}
  child(context: any): ILogger { return this; }
}

async function runDocumentServiceTests() {
  console.log('=== Document Application Service Tests ===\n');

  const repository = new MockDocumentRepository();
  const userRepository = new MockUserRepository();
  const fileService = new MockFileService();
  const documentDomainService = new MockDocumentDomainService();
  const userDomainService = new MockUserDomainService();
  const logger = new MockLogger();
  
  // Add test user to mock repository
  const testUser = { id: 'user-123', email: 'test@example.com', role: 'user' };
  userRepository.saveUser(testUser);
  
  const service = new DocumentApplicationService(
    repository, 
    userRepository, 
    fileService, 
    documentDomainService as any, 
    userDomainService as any, 
    logger
  );

  // Test 1: Create Document
  console.log('Test 1: Create Document');
  try {
    const result = await service.createDocument(
      'Test Document',
      'test.pdf',
      'application/pdf',
      '1024',
      ['test', 'pdf'],
      { category: 'test' },
      'user-123'
    );
    
    if (result.isOk()) {
      const document = result.unwrap();
      console.log('✅ Document created successfully');
      console.log('  - ID:', document.id);
      console.log('  - Name:', document.name.value);
      console.log('  - Size:', document.size.toString());
    } else {
      console.log('❌ Document creation failed:', result.unwrapErr());
    }
  } catch (error) {
    console.log('❌ Create document test failed:', error);
  }

  // Test 2: Create Document with Duplicate Name
  console.log('\nTest 2: Create Document with Duplicate Name');
  try {
    const result1 = await service.createDocument(
      'Duplicate Document',
      'duplicate.pdf',
      'application/pdf',
      '1024',
      ['duplicate'],
      {},
      'user-123'
    );
    
    const result2 = await service.createDocument(
      'Duplicate Document',
      'duplicate2.pdf',
      'application/pdf',
      '2048',
      ['duplicate2'],
      {},
      'user-123'
    );
    
    if (result1.isOk() && result2.isErr()) {
      console.log('✅ Duplicate name properly rejected');
      console.log('  - First creation:', result1.isOk() ? 'SUCCESS' : 'FAIL');
      console.log('  - Second creation:', result2.isErr() ? 'REJECTED' : 'ALLOWED');
    } else {
      console.log('❌ Duplicate name handling failed');
    }
  } catch (error) {
    console.log('❌ Duplicate name test failed:', error);
  }

  // Test 3: Get Document by ID
  console.log('\nTest 3: Get Document by ID');
  try {
    const createResult = await service.createDocument(
      'Get By ID Test',
      'getbyid.pdf',
      'application/pdf',
      '1024',
      ['getbyid'],
      {},
      'user-123'
    );
    
    if (createResult.isOk()) {
      const document = createResult.unwrap();
      const getResult = await service.getDocumentById(document.id);
      
      if (getResult.isOk()) {
        const foundDocument = getResult.unwrap();
        console.log('✅ Document retrieved by ID successfully');
        console.log('  - Found document ID:', foundDocument.id);
        console.log('  - Found document name:', foundDocument.name.value);
        console.log('  - IDs match:', foundDocument.id === document.id);
      } else {
        console.log('❌ Get document by ID failed:', getResult.unwrapErr());
      }
    } else {
      console.log('❌ Document creation for get by ID test failed');
    }
  } catch (error) {
    console.log('❌ Get document by ID test failed:', error);
  }

  // Test 4: Update Document
  console.log('\nTest 4: Update Document');
  try {
    const createResult = await service.createDocument(
      'Update Test Document',
      'update.pdf',
      'application/pdf',
      '1024',
      ['update'],
      { version: '1.0' },
      'user-123'
    );
    
    if (createResult.isOk()) {
      const document = createResult.unwrap();
      const updateResult = await service.updateDocumentName(
        document.id,
        'Updated Document Name',
        'user-123'
      );
      
      if (updateResult.isOk()) {
        const updatedDocument = updateResult.unwrap();
        console.log('✅ Document updated successfully');
        console.log('  - Original name:', document.name.value);
        console.log('  - Updated name:', updatedDocument.name.value);
        console.log('  - Name changed:', document.name.value !== updatedDocument.name.value);
      } else {
        console.log('❌ Document update failed:', updateResult.unwrapErr());
      }
    } else {
      console.log('❌ Document creation for update test failed');
    }
  } catch (error) {
    console.log('❌ Update document test failed:', error);
  }

  // Test 5: Delete Document
  console.log('\nTest 5: Delete Document');
  try {
    const createResult = await service.createDocument(
      'Delete Test Document',
      'delete.pdf',
      'application/pdf',
      '1024',
      ['delete'],
      {},
      'user-123'
    );
    
    if (createResult.isOk()) {
      const document = createResult.unwrap();
      const deleteResult = await service.deleteDocument(document.id, 'user-123');
      
      if (deleteResult.isOk()) {
        console.log('✅ Document deleted successfully');
        console.log('  - Deleted document ID:', document.id);
      } else {
        console.log('❌ Document deletion failed:', deleteResult.unwrapErr());
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
    // Create some test documents
    await service.createDocument('List Test 1', 'list1.pdf', 'application/pdf', '1024', ['list'], {}, 'user-123');
    await service.createDocument('List Test 2', 'list2.pdf', 'application/pdf', '2048', ['list'], {}, 'user-123');
    await service.createDocument('List Test 3', 'list3.pdf', 'application/pdf', '3072', ['list'], {}, 'user-123');
    
    const listResult = await service.getDocuments(1, 10);
    
    if (listResult.isOk()) {
      const documents = listResult.unwrap();
      console.log('✅ Documents listed successfully');
      console.log('  - Total documents:', documents.length);
      console.log('  - Document names:', documents.map((d: any) => d.name?.value || 'No name'));
    } else {
      console.log('❌ List documents failed:', listResult.unwrapErr());
    }
  } catch (error) {
    console.log('❌ List documents test failed:', error);
  }

  // Test 7: Find Documents by Tags
  console.log('\nTest 7: Find Documents by Tags');
  try {
    const searchResult = await service.getDocumentsByTags(['list']);
    
    if (searchResult.isOk()) {
      const documents = searchResult.unwrap();
      console.log('✅ Document search by tags successful');
      console.log('  - Found documents:', documents.length);
      console.log('  - Document names:', documents.map((d: any) => d.name.value));
    } else {
      console.log('❌ Document search failed:', searchResult.unwrapErr());
    }
  } catch (error) {
    console.log('❌ Search documents test failed:', error);
  }

  // Test 8: Input Validation
  console.log('\nTest 8: Input Validation');
  
  // Test invalid name
  try {
    const invalidNameResult = await service.createDocument(
      '',
      'invalid.pdf',
      'application/pdf',
      '1024',
      [],
      {},
      'user-123'
    );
    
    if (invalidNameResult.isErr()) {
      console.log('✅ Invalid name properly rejected');
      console.log('  - Error:', invalidNameResult.unwrapErr());
    } else {
      console.log('❌ Invalid name should have been rejected');
    }
  } catch (error) {
    console.log('❌ Invalid name test failed:', error);
  }

  // Test invalid file size
  try {
    const invalidSizeResult = await service.createDocument(
      'Invalid Size Test',
      'invalid.pdf',
      'application/pdf',
      '-1024',
      [],
      {},
      'user-123'
    );
    
    if (invalidSizeResult.isErr()) {
      console.log('✅ Invalid file size properly rejected');
      console.log('  - Error:', invalidSizeResult.unwrapErr());
    } else {
      console.log('❌ Invalid file size should have been rejected');
    }
  } catch (error) {
    console.log('❌ Invalid file size test failed:', error);
  }

  console.log('\n=== Document Application Service Tests Complete ===');
  console.log('✅ All tests completed!');
}

// Run the tests
runDocumentServiceTests().catch(console.error); 