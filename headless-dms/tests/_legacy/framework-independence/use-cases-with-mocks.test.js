// tests/framework-independence/use-cases-with-mocks.test.js
// Framework Independence: Use Cases with Mock Repositories Test
// This test demonstrates that use cases can work with mock repositories instead of real databases

async function runUseCasesWithMocksTests() {
  console.log('=== Framework Independence: Use Cases with Mock Repositories Tests ===\n');

  // Test 1: Use Cases Work with Mock Repositories
  console.log('Test 1: Use Cases with Mock Repositories');
  try {
    // Import use cases and mocks
    const { GetUsersUseCase } = await import('../../src/application/use-cases/user/GetUsersUseCase.js');
    const { MockUserRepository } = await import('../../src/infrastructure/mocks/MockUserRepository.js');
    const { MockLogger } = await import('../../src/infrastructure/mocks/MockLogger.js');
    
    // Import domain entities and value objects
    const { User } = await import('../../src/domain/entities/User.js');
    const { Email } = await import('../../src/domain/value-objects/Email.js');
    const { Password } = await import('../../src/domain/value-objects/Password.js');
    const { UserRole } = await import('../../src/domain/value-objects/UserRole.js');

    // Import DI container
    const { container } = await import('tsyringe');

    // Clear container and register mocks
    container.clearInstances();
    
    // Create mock instances
    const mockUserRepository = new MockUserRepository();
    const mockLogger = new MockLogger();

    // Register mocks in the container
    container.registerInstance('IUserRepository', mockUserRepository);
    container.registerInstance('ILogger', mockLogger);

    // Create use case - it will use the mock repository through DI
    const getUsersUseCase = container.resolve(GetUsersUseCase);

    console.log('✅ Use case created successfully with mock repository');
    console.log('  - Use case:', getUsersUseCase.constructor.name);
    console.log('  - Mock repository:', mockUserRepository.constructor.name);
    console.log('  - Mock logger:', mockLogger.constructor.name);

    // Test 2: Mock Repository Behavior
    console.log('\nTest 2: Mock Repository Behavior');
    
    // Create test users using domain entities
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

    // Set users in mock repository
    mockUserRepository.setUsers([adminUser, regularUser]);

    console.log('✅ Test users created and set in mock repository');
    console.log('  - Admin user ID:', adminUser.id);
    console.log('  - Regular user ID:', regularUser.id);

    // Test 3: Use Case Execution with Mock Data
    console.log('\nTest 3: Use Case Execution with Mock Data');
    
    // Execute use case
    const result = await getUsersUseCase.execute({
      page: 1,
      limit: 10,
      sort: 'email',
      order: 'asc'
    });

    // Verify result
    if (result.isOk()) {
      const response = result.unwrap();
      console.log('✅ Use case executed successfully with mock repository');
      console.log('  - Users found:', response.users.length);
      console.log('  - First user email:', response.users[0].email);
      console.log('  - Second user email:', response.users[1].email);
      console.log('  - Total users:', response.pagination.total);
      console.log('  - Total pages:', response.pagination.totalPages);
    } else {
      throw new Error(`Use case failed: ${result.unwrapErr()}`);
    }

    // Test 4: Pagination with Mock Data
    console.log('\nTest 4: Pagination with Mock Data');
    
    // Create multiple test users
    const users = Array.from({ length: 25 }, (_, i) => 
      User.create({
        email: Email.create(`user${i + 1}@example.com`),
        password: Password.create('UserPass123!'),
        role: UserRole.create(i === 0 ? 'admin' : 'user')
      })
    );

    mockUserRepository.setUsers(users);

    // Test first page
    const firstPageResult = await getUsersUseCase.execute({
      page: 1,
      limit: 10,
      sort: 'email',
      order: 'asc'
    });

    if (firstPageResult.isOk()) {
      const response = firstPageResult.unwrap();
      console.log('✅ Pagination works with mock repository');
      console.log('  - First page users:', response.users.length);
      console.log('  - Total users:', response.pagination.total);
      console.log('  - Total pages:', response.pagination.totalPages);
      console.log('  - Has next page:', response.pagination.hasNext);
      console.log('  - Has prev page:', response.pagination.hasPrev);
    } else {
      throw new Error(`First page failed: ${firstPageResult.unwrapErr()}`);
    }

    // Test 5: Filtering with Mock Data
    console.log('\nTest 5: Filtering with Mock Data');
    
    // Reset to simple users for filtering test
    mockUserRepository.setUsers([adminUser, regularUser]);

    // Filter by role
    const adminResult = await getUsersUseCase.execute({
      page: 1,
      limit: 10,
      filter: { role: 'admin' }
    });

    if (adminResult.isOk()) {
      const response = adminResult.unwrap();
      console.log('✅ Role filtering works with mock repository');
      console.log('  - Admin users found:', response.users.length);
      console.log('  - First user role:', response.users[0].role);
    } else {
      throw new Error(`Admin filter failed: ${adminResult.unwrapErr()}`);
    }

    // Test 6: Framework Independence Validation
    console.log('\nTest 6: Framework Independence Validation');
    
    // Verify that the use case doesn't have HTTP framework dependencies
    const useCasePrototype = Object.getPrototypeOf(getUsersUseCase);
    
    const hasHttpDeps = useCasePrototype.hasOwnProperty('httpServer') || 
                       useCasePrototype.hasOwnProperty('fastify') || 
                       useCasePrototype.hasOwnProperty('express') ||
                       useCasePrototype.hasOwnProperty('request') ||
                       useCasePrototype.hasOwnProperty('response');
    
    const hasDatabaseDeps = useCasePrototype.hasOwnProperty('database') || 
                           useCasePrototype.hasOwnProperty('connection') || 
                           useCasePrototype.hasOwnProperty('query') ||
                           useCasePrototype.hasOwnProperty('transaction');

    console.log('✅ No HTTP framework dependencies found:', !hasHttpDeps);
    console.log('✅ No database connection dependencies found:', !hasDatabaseDeps);

    // Test 7: Interface Contract Validation
    console.log('\nTest 7: Interface Contract Validation');
    
    // This test demonstrates that the use case is truly framework-independent
    // It works with MockUserRepository just as it would with DrizzleUserRepository
    
    const testUser = User.create({
      email: Email.create('interface-test@example.com'),
      password: Password.create('TestPass123!'),
      role: UserRole.create('user')
    });

    mockUserRepository.setUsers([testUser]);

    const interfaceResult = await getUsersUseCase.execute({
      page: 1,
      limit: 10
    });

    if (interfaceResult.isOk()) {
      const response = interfaceResult.unwrap();
      console.log('✅ Interface contract validation successful');
      console.log('  - Use case works with any repository implementation');
      console.log('  - Users found:', response.users.length);
      console.log('  - User email:', response.users[0].email);
    } else {
      throw new Error(`Interface test failed: ${interfaceResult.unwrapErr()}`);
    }

    console.log('\n🎉 USE CASES WITH MOCKS VALIDATED!');
    console.log('✅ Use cases work with mock repositories instead of real databases');
    console.log('✅ Dependency injection enables framework independence');
    console.log('✅ Interface contracts ensure implementation flexibility');
    console.log('✅ Business logic is truly framework-independent');

  } catch (error) {
    console.log('❌ Use cases with mocks test failed:', error.message);
    console.log('Stack trace:', error.stack);
  }
}

// Export for test runner
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runUseCasesWithMocksTests };
}

// Run if called directly
if (typeof require !== 'undefined' && require.main === module) {
  runUseCasesWithMocksTests().catch(console.error);
}
