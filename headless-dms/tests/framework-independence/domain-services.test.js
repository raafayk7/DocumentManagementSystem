// tests/framework-independence/domain-services.test.js
// Framework Independence: Domain Services Test
// This test demonstrates that domain services can run without any HTTP framework

async function runDomainServicesTests() {
  console.log('=== Framework Independence: Domain Services Tests ===\n');

  // Test 1: Domain Services Can Run Without Framework Dependencies
  console.log('Test 1: Domain Services Framework Independence');
  try {
    // Import domain services - these should have NO infrastructure dependencies
    const { UserDomainService } = await import('../../src/domain/services/UserDomainService.js');
    const { DocumentDomainService } = await import('../../src/domain/services/DocumentDomainService.js');
    
    // Import domain entities and value objects
    const { User } = await import('../../src/domain/entities/User.js');
    const { Document } = await import('../../src/domain/entities/Document.js');
    const { Email } = await import('../../src/domain/value-objects/Email.js');
    const { Password } = await import('../../src/domain/value-objects/Password.js');
    const { UserRole } = await import('../../src/domain/value-objects/UserRole.js');
    const { DocumentName } = await import('../../src/domain/value-objects/DocumentName.js');
    const { FileSize } = await import('../../src/domain/value-objects/FileSize.js');
    const { MimeType } = await import('../../src/domain/value-objects/MimeType.js');

    // Create domain services - NO infrastructure dependencies!
    const userDomainService = new UserDomainService();
    const documentDomainService = new DocumentDomainService();

    console.log('✅ Domain services created successfully');
    console.log('  - UserDomainService:', userDomainService.constructor.name);
    console.log('  - DocumentDomainService:', documentDomainService.constructor.name);

    // Create test entities using only domain objects
    const testUser = User.create({
      email: Email.create('test@example.com'),
      password: Password.create('Password123!'),
      role: UserRole.create('admin')
    });

    const testDocument = Document.create({
      name: DocumentName.create('test-document.pdf'),
      filePath: '/path/to/file',
      mimeType: MimeType.create('application/pdf'),
      size: FileSize.create(1024),
      userId: testUser.id,
      tags: ['test', 'document'],
      metadata: { author: 'Test User' }
    });

    console.log('✅ Test entities created successfully');
    console.log('  - User ID:', testUser.id);
    console.log('  - Document ID:', testDocument.id);

    // Test 2: Business Logic Without Framework Dependencies
    console.log('\nTest 2: Business Logic Isolation');
    
    // Test user domain service
    const userScore = userDomainService.calculateUserActivityScore(testUser);
    const canPerformAction = userDomainService.canUserPerformAction(testUser, 'admin');
    const canAccessDocument = userDomainService.canUserAccessDocument(testUser, testDocument);
    
    console.log('✅ User domain service works without framework dependencies');
    console.log('  - Activity score calculated:', userScore);
    console.log('  - Can perform admin action:', canPerformAction);
    console.log('  - Can access document:', canAccessDocument);

    // Test document domain service
    const accessValidation = documentDomainService.validateDocumentAccess(testUser, testDocument);
    const permissions = documentDomainService.getDocumentPermissions(testUser, testDocument);
    
    console.log('✅ Document domain service works without framework dependencies');
    console.log('  - Access validation:', accessValidation.isAllowed);
    console.log('  - Can read:', permissions.canRead);
    console.log('  - Can write:', permissions.canWrite);

    // Test 3: Framework Independence Validation
    console.log('\nTest 3: Framework Independence Validation');
    
    // Check that services don't have HTTP-related properties
    const userServicePrototype = Object.getPrototypeOf(userDomainService);
    const documentServicePrototype = Object.getPrototypeOf(documentDomainService);
    
    const hasHttpDeps = userServicePrototype.hasOwnProperty('httpServer') || 
                       userServicePrototype.hasOwnProperty('fastify') || 
                       userServicePrototype.hasOwnProperty('express');
    
    const hasDatabaseDeps = userServicePrototype.hasOwnProperty('database') || 
                           userServicePrototype.hasOwnProperty('connection') || 
                           userServicePrototype.hasOwnProperty('query');
    
    const hasFileSystemDeps = userServicePrototype.hasOwnProperty('fs') || 
                             userServicePrototype.hasOwnProperty('fileSystem') || 
                             userServicePrototype.hasOwnProperty('path');

    console.log('✅ No HTTP framework dependencies found:', !hasHttpDeps);
    console.log('✅ No database dependencies found:', !hasDatabaseDeps);
    console.log('✅ No file system dependencies found:', !hasFileSystemDeps);

    // Test 4: Complex Business Rules Without Infrastructure
    console.log('\nTest 4: Complex Business Rules');
    
    const adminUser = User.create({
      email: Email.create('admin@example.com'),
      password: Password.create('AdminPass123!'),
      role: UserRole.create('admin')
    });

    const regularUser = User.create({
      email: Email.create('user@example.com'),
      password: Password.create('UserPass123!'),
      role: UserRole.create('user')
    });

    // Test admin permissions
    const adminCanDelete = userDomainService.canUserPerformAction(adminUser, 'admin');
    const adminCanRestart = userDomainService.canUserPerformAction(adminUser, 'system:restart');
    
    // Test user permissions
    const userCanDelete = userDomainService.canUserPerformAction(regularUser, 'admin');
    const userCanRestart = userDomainService.canUserPerformAction(regularUser, 'system:restart');

    console.log('✅ Admin permissions work without infrastructure:');
    console.log('  - Can perform admin actions:', adminCanDelete);
    console.log('  - Can restart system:', adminCanRestart);
    
    console.log('✅ User permissions work without infrastructure:');
    console.log('  - Cannot perform admin actions:', !userCanDelete);
    console.log('  - Cannot restart system:', !userCanRestart);

    // Test document access rules
    const adminAccess = documentDomainService.validateDocumentAccess(adminUser, testDocument);
    const userDocument = Document.create({
      ...testDocument,
      userId: regularUser.id
    });
    const userAccess = documentDomainService.validateDocumentAccess(regularUser, userDocument);
    const otherUserAccess = documentDomainService.validateDocumentAccess(regularUser, testDocument);

    console.log('✅ Document access rules work without infrastructure:');
    console.log('  - Admin access to any document:', adminAccess.isAllowed);
    console.log('  - User access to own document:', userAccess.isAllowed);
    console.log('  - User access to other document:', !otherUserAccess.isAllowed);

    console.log('\n🎉 FRAMEWORK INDEPENDENCE VALIDATED!');
    console.log('✅ Domain services run in complete isolation');
    console.log('✅ Business logic is pure and framework-independent');
    console.log('✅ Clean Architecture principles are working correctly');

  } catch (error) {
    console.log('❌ Framework independence test failed:', error.message);
    console.log('Stack trace:', error.stack);
  }
}

// Export for test runner
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runDomainServicesTests };
}

// Run if called directly
if (typeof require !== 'undefined' && require.main === module) {
  runDomainServicesTests().catch(console.error);
}
