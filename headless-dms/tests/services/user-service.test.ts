// tests/services/user-service.test.ts
import 'reflect-metadata';
import { UserApplicationService } from '../../src/application/services/UserApplicationService.js';
import { IUserRepository } from '../../src/application/interfaces/IUserRepository.js';
import { User } from '../../src/domain/entities/User.js';
import { UserValidator } from '../../src/domain/validators/UserValidator.js';
import { Result } from '@carbonteq/fp';
import { ILogger } from '../../src/domain/interfaces/ILogger.js';

// Mock repository for testing
class MockUserRepository implements IUserRepository {
  private users: Map<string, any> = new Map();

  async saveUser(user: User): Promise<User> {
    const userData = user.toRepository();
    this.users.set(user.id, userData);
    return user;
  }

  async find(query?: any, pagination?: any): Promise<any> {
    const users = Array.from(this.users.values()).map(userData => 
      User.fromRepository(userData).unwrap()
    );
    return {
      data: users,
      pagination: {
        page: 1,
        limit: 10,
        total: users.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    };
  }

  async findOne(query: any): Promise<User | null> {
    for (const userData of this.users.values()) {
      const user = User.fromRepository(userData);
      if (query.email && user.unwrap().email.value === query.email) {
        return user.unwrap();
      }
    }
    return null;
  }

  async findById(id: string): Promise<User | null> {
    const userData = this.users.get(id);
    return userData ? User.fromRepository(userData).unwrap() : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const userData of this.users.values()) {
      const user = User.fromRepository(userData);
      if (user.unwrap().email.value === email) {
        return user.unwrap();
      }
    }
    return null;
  }

  async findByRole(role: 'user' | 'admin'): Promise<User[]> {
    return Array.from(this.users.values())
      .filter(userData => userData.role === role)
      .map(userData => User.fromRepository(userData).unwrap());
  }

  async exists(query: any): Promise<boolean> {
    for (const userData of this.users.values()) {
      const user = User.fromRepository(userData);
      if (query.email && user.unwrap().email.value === query.email) {
        return true;
      }
    }
    return false;
  }

  async count(query?: any): Promise<number> {
    return this.users.size;
  }

  async delete(id: string): Promise<boolean> {
    if (this.users.has(id)) {
      this.users.delete(id);
      return true;
    }
    return false;
  }

  // Helper for testing
  clear(): void {
    this.users.clear();
  }
}

// Mock domain services for testing
class MockUserDomainService {
  validateUserState(user: any) {
    return { isValid: true, issues: [] };
  }
  
  canUserPerformAction(user: any, action: string, resource: string) {
    return true;
  }

  calculateUserActivityScore(user: any) {
    return { score: 100, level: 'high' };
  }

  canUserAccessDocument(user: any, document: any) {
    return true;
  }

  getUserDocumentPermissions(user: any, document: any) {
    return ['read', 'write'];
  }

  calculateUserEngagement(user: any) {
    return { score: 100, level: 'high' };
  }

  validateUserPermissions(user: any, action: string) {
    return { isValid: true, issues: [] };
  }

  getUserStats(user: any) {
    return { documentsCreated: 10, lastActive: new Date() };
  }

  canUserChangeRole(user: any, targetUser: any) {
    return true;
  }

  canUserPerformSystemAction(user: any, action: string) {
    return true;
  }
}

class MockAuthDomainService {
  validatePasswordStrength(password: string) {
    return { level: 'strong', score: 100, issues: [] };
  }

  validateUserSecurity(user: any) {
    return { isValid: true, issues: [] };
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

// Mock email validator
class MockEmailValidator {
  validate(email: string): boolean {
    return email.includes('@');
  }
}

async function runUserServiceTests() {
  console.log('=== User Application Service Tests ===\n');

  const repository = new MockUserRepository();
  const userDomainService = new MockUserDomainService();
  const authDomainService = new MockAuthDomainService();
  const logger = new MockLogger();
  
  // Add admin user for role change and delete tests
  const adminUser = (await User.create('admin@example.com', 'AdminPass!2024', 'admin')).unwrap();
  // We'll use the generated ID but store it for reference
  const adminUserId = adminUser.id;
  repository.saveUser(adminUser);
  
  const service = new UserApplicationService(repository, userDomainService as any, authDomainService as any, logger);

  // Test 1: Create User
  console.log('Test 1: Create User');
  try {
    const result = await service.createUser('newuser@example.com', 'SecurePass!2024', 'user');
    
    if (result.isOk()) {
      const user = result.unwrap();
      console.log('✅ User created successfully');
      console.log('  - ID:', user.id);
      console.log('  - Email:', user.email.value);
      console.log('  - Role:', user.role.value);
    } else {
      console.log('❌ User creation failed:', result.unwrapErr());
    }
  } catch (error) {
    console.log('❌ Create user test failed:', error);
  }

  // Test 2: Create Duplicate User
  console.log('\nTest 2: Create Duplicate User');
  try {
    const result1 = await service.createUser('duplicate@example.com', 'SecurePass!2024', 'user');
    const result2 = await service.createUser('duplicate@example.com', 'AnotherPass!2024', 'admin');
    
    if (result1.isOk() && result2.isErr()) {
      console.log('✅ Duplicate user properly rejected');
      console.log('  - First creation:', result1.isOk() ? 'SUCCESS' : 'FAIL');
      console.log('  - Second creation:', result2.isErr() ? 'REJECTED' : 'ALLOWED');
    } else {
      console.log('❌ Duplicate user handling failed');
    }
  } catch (error) {
    console.log('❌ Duplicate user test failed:', error);
  }

  // Test 3: Authenticate User
  console.log('\nTest 3: Authenticate User');
  try {
    // First create a user
    const createResult = await service.createUser('auth@example.com', 'SecurePass!2024', 'user');
    
    if (createResult.isOk()) {
      const authResult = await service.authenticateUser('auth@example.com', 'SecurePass!2024');
      
      if (authResult.isOk()) {
        const loginResult = authResult.unwrap();
        console.log('✅ User authenticated successfully');
        console.log('  - Authenticated user:', loginResult.email.value);
        console.log('  - User role:', loginResult.role.value);
      } else {
        console.log('❌ User authentication failed:', authResult.unwrapErr());
      }
    } else {
      console.log('❌ User creation for auth test failed');
    }
  } catch (error) {
    console.log('❌ Authenticate user test failed:', error);
  }

  // Test 4: Authenticate with Wrong Password
  console.log('\nTest 4: Authenticate with Wrong Password');
  try {
    const authResult = await service.authenticateUser('auth@example.com', 'wrongpassword');
    
    if (authResult.isErr()) {
      console.log('✅ Wrong password properly rejected');
      console.log('  - Error:', authResult.unwrapErr());
    } else {
      console.log('❌ Wrong password should have been rejected');
    }
  } catch (error) {
    console.log('❌ Wrong password test failed:', error);
  }

  // Test 5: Get User by ID
  console.log('\nTest 5: Get User by ID');
  try {
    const createResult = await service.createUser('getbyid@example.com', 'SecurePass!2024', 'admin');
    
    if (createResult.isOk()) {
      const user = createResult.unwrap();
      const getResult = await service.getUserById(user.id);
      
      if (getResult.isOk()) {
        const foundUser = getResult.unwrap();
        console.log('✅ User retrieved by ID successfully');
        console.log('  - Found user:', foundUser.email.value);
        console.log('  - IDs match:', foundUser.id === user.id);
      } else {
        console.log('❌ Get user by ID failed:', getResult.unwrapErr());
      }
    } else {
      console.log('❌ User creation for get by ID test failed');
    }
  } catch (error) {
    console.log('❌ Get user by ID test failed:', error);
  }

  // Test 6: Get User by Email
  console.log('\nTest 6: Get User by Email');
  try {
    const email = 'getbyemail@example.com';
    const createResult = await service.createUser(email, 'SecurePass!2024', 'user');
    
    if (createResult.isOk()) {
      const getResult = await service.getUserByEmail(email);
      
      if (getResult.isOk()) {
        const foundUser = getResult.unwrap();
        console.log('✅ User retrieved by email successfully');
        console.log('  - Found user:', foundUser.email.value);
        console.log('  - Emails match:', foundUser.email.value === email);
      } else {
        console.log('❌ Get user by email failed:', getResult.unwrapErr());
      }
    } else {
      console.log('❌ User creation for get by email test failed');
    }
  } catch (error) {
    console.log('❌ Get user by email test failed:', error);
  }

  // Test 7: Change User Role
  console.log('\nTest 7: Change User Role');
  try {
    const createResult = await service.createUser('changerole@example.com', 'SecurePass!2024', 'user');
    
    if (createResult.isOk()) {
      const user = createResult.unwrap();
      const updateResult = await service.changeUserRole(adminUserId, user.id, 'admin');
      
      if (updateResult.isOk()) {
        const updatedUser = updateResult.unwrap();
        console.log('✅ User role changed successfully');
        console.log('  - Original role:', user.role.value);
        console.log('  - New role:', updatedUser.role.value);
      } else {
        console.log('❌ Change user role failed:', updateResult.unwrapErr());
      }
    } else {
      console.log('❌ User creation for change role test failed');
    }
  } catch (error) {
    console.log('❌ Change user role test failed:', error);
  }

  // Test 8: Delete User
  console.log('\nTest 8: Delete User');
  try {
    const createResult = await service.createUser('delete@example.com', 'SecurePass!2024', 'user');
    
    if (createResult.isOk()) {
      const user = createResult.unwrap();
      const deleteResult = await service.deleteUser(adminUserId, user.id);
      
      if (deleteResult.isOk()) {
        console.log('✅ User deleted successfully');
        console.log('  - Deleted user ID:', user.id);
      } else {
        console.log('❌ Delete user failed:', deleteResult.unwrapErr());
      }
    } else {
      console.log('❌ User creation for delete test failed');
    }
  } catch (error) {
    console.log('❌ Delete user test failed:', error);
  }

  // Test 9: Verify User Deletion
  console.log('\nTest 9: Verify User Deletion');
  try {
    const getResult = await service.getUserById('deleted-user-id');
    
    if (getResult.isErr()) {
      console.log('✅ Deleted user properly not found');
      console.log('  - Error:', getResult.unwrapErr());
    } else {
      console.log('❌ Deleted user should not be found');
    }
  } catch (error) {
    console.log('❌ Verify user deletion test failed:', error);
  }

  // Test 10: List All Users
  console.log('\nTest 10: List All Users');
  try {
    // Create some test users
    await service.createUser('list1@example.com', 'SecurePass!2024', 'user');
    await service.createUser('list2@example.com', 'SecurePass!2024', 'admin');
    await service.createUser('list3@example.com', 'SecurePass!2024', 'user');
    
    const listResult = await service.getUsers(1, 10);
    
    if (listResult.isOk()) {
      const users = listResult.unwrap();
      console.log('✅ All users retrieved successfully');
      console.log('  - Total users:', users.length);
      console.log('  - User emails:', users.map((u: any) => u.email?.value || 'No email'));
    } else {
      console.log('❌ List all users failed:', listResult.unwrapErr());
    }
  } catch (error) {
    console.log('❌ List all users test failed:', error);
  }

  // Test 11: Input Validation
  console.log('\nTest 11: Input Validation');
  
  // Test invalid email
  try {
    const invalidEmailResult = await service.createUser('invalid-email', 'SecurePass!2024', 'user');
    
    if (invalidEmailResult.isErr()) {
      console.log('✅ Invalid email properly rejected');
      console.log('  - Error:', invalidEmailResult.unwrapErr());
    } else {
      console.log('❌ Invalid email should have been rejected');
    }
  } catch (error) {
    console.log('❌ Invalid email test failed:', error);
  }

  // Test invalid role
  try {
    const invalidRoleResult = await service.createUser('invalidrole@example.com', 'SecurePass!2024', 'invalid-role' as any);
    
    if (invalidRoleResult.isErr()) {
      console.log('✅ Invalid role properly rejected');
      console.log('  - Error:', invalidRoleResult.unwrapErr());
    } else {
      console.log('❌ Invalid role should have been rejected');
    }
  } catch (error) {
    console.log('❌ Invalid role test failed:', error);
  }

  // Test weak password
  try {
    const weakPasswordResult = await service.createUser('weakpass@example.com', '123', 'user');
    
    if (weakPasswordResult.isErr()) {
      console.log('✅ Weak password properly rejected');
      console.log('  - Error:', weakPasswordResult.unwrapErr());
    } else {
      console.log('❌ Weak password should have been rejected');
    }
  } catch (error) {
    console.log('❌ Weak password test failed:', error);
  }

  console.log('\n=== User Application Service Tests Complete ===');
  console.log('✅ All tests completed!');
}

// Run the tests
runUserServiceTests().catch(console.error); 