// tests/services/user-service.test.ts
import 'reflect-metadata';
import { AuthService } from '../../src/auth/services/auth.service.js';
import { IUserRepository } from '../../src/infrastructure/database/interfaces/user.repository.interface.js';
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
      User.fromRepository(userData)
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
      if (query.email && user.email === query.email) {
        return user;
      }
    }
    return null;
  }

  async findById(id: string): Promise<User | null> {
    const userData = this.users.get(id);
    return userData ? User.fromRepository(userData) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const userData of this.users.values()) {
      const user = User.fromRepository(userData);
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  async findByRole(role: 'user' | 'admin'): Promise<User[]> {
    return Array.from(this.users.values())
      .filter(userData => userData.role === role)
      .map(userData => User.fromRepository(userData));
  }

  async exists(query: any): Promise<boolean> {
    for (const userData of this.users.values()) {
      const user = User.fromRepository(userData);
      if (query.email && user.email === query.email) {
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

// Mock email validator for testing
class MockEmailValidator {
  validate(email: string) {
    if (email.includes('@')) {
      return Result.Ok(email);
    }
    return Result.Err('Invalid email format');
  }

  validateWithDisposableCheck(email: string) {
    return this.validate(email);
  }
}

console.log('=== User Service Tests ===\n');

async function runUserServiceTests() {
  const repository = new MockUserRepository();
  const logger = new MockLogger();
  const emailValidator = new MockEmailValidator();
  const service = new AuthService(repository, logger, emailValidator);

  // Test 1: Register User
  console.log('Test 1: Register User');
  try {
    const result = await service.register({
      email: 'newuser@example.com',
      password: 'password123',
      role: 'user'
    });
    
    if (result.isOk()) {
      const user = result.unwrap();
      console.log('✅ User registered successfully');
      console.log('  - ID:', user.id);
      console.log('  - Email:', user.email);
      console.log('  - Role:', user.role);
    } else {
      console.log('❌ User registration failed:', result.unwrapErr());
    }
  } catch (error) {
    console.log('❌ Register user test failed:', error);
  }

  // Test 2: Register Duplicate User
  console.log('\nTest 2: Register Duplicate User');
  try {
    const result1 = await service.register({
      email: 'duplicate@example.com',
      password: 'password123',
      role: 'user'
    });
    const result2 = await service.register({
      email: 'duplicate@example.com',
      password: 'password456',
      role: 'admin'
    });
    
    if (result1.isOk() && result2.isErr()) {
      console.log('✅ Duplicate user properly rejected');
      console.log('  - First registration:', result1.isOk() ? 'SUCCESS' : 'FAIL');
      console.log('  - Second registration:', result2.isErr() ? 'REJECTED' : 'ALLOWED');
    } else {
      console.log('❌ Duplicate user handling failed');
    }
  } catch (error) {
    console.log('❌ Duplicate user test failed:', error);
  }

  // Test 3: Authenticate User
  console.log('\nTest 3: Authenticate User');
  try {
    // First register a user
    const registerResult = await service.register({
      email: 'auth@example.com',
      password: 'password123',
      role: 'user'
    });
    
    if (registerResult.isOk()) {
      const authResult = await service.login({
        email: 'auth@example.com',
        password: 'password123'
      });
      
      if (authResult.isOk()) {
        const loginResult = authResult.unwrap();
        console.log('✅ User authenticated successfully');
        console.log('  - Authenticated user:', loginResult.user.email);
        console.log('  - User role:', loginResult.user.role);
        console.log('  - Has access token:', !!loginResult.access_token);
      } else {
        console.log('❌ User authentication failed:', authResult.unwrapErr());
      }
    } else {
      console.log('❌ User registration for auth test failed');
    }
  } catch (error) {
    console.log('❌ Authenticate user test failed:', error);
  }

  // Test 4: Authenticate with Wrong Password
  console.log('\nTest 4: Authenticate with Wrong Password');
  try {
    const authResult = await service.login({
      email: 'auth@example.com',
      password: 'wrongpassword'
    });
    
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
    const registerResult = await service.register({
      email: 'getbyid@example.com',
      password: 'password123',
      role: 'admin'
    });
    
    if (registerResult.isOk()) {
      const user = registerResult.unwrap();
      const getResult = await service.getUserById(user.id);
      
      if (getResult.isOk()) {
        const foundUser = getResult.unwrap();
        console.log('✅ User retrieved by ID successfully');
        console.log('  - Found user:', foundUser.email);
        console.log('  - IDs match:', foundUser.id === user.id);
      } else {
        console.log('❌ Get user by ID failed:', getResult.unwrapErr());
      }
    } else {
      console.log('❌ User registration for get by ID test failed');
    }
  } catch (error) {
    console.log('❌ Get user by ID test failed:', error);
  }

  // Test 6: Get User by Email
  console.log('\nTest 6: Get User by Email');
  try {
    const email = 'getbyemail@example.com';
    const registerResult = await service.register({
      email,
      password: 'password123',
      role: 'user'
    });
    
    if (registerResult.isOk()) {
      const getResult = await service.findUserByEmail(email);
      
      if (getResult.isOk()) {
        const foundUser = getResult.unwrap();
        console.log('✅ User retrieved by email successfully');
        console.log('  - Found user:', foundUser.email);
        console.log('  - Emails match:', foundUser.email === email);
      } else {
        console.log('❌ Get user by email failed:', getResult.unwrapErr());
      }
    } else {
      console.log('❌ User registration for get by email test failed');
    }
  } catch (error) {
    console.log('❌ Get user by email test failed:', error);
  }

  // Test 7: Update User Role
  console.log('\nTest 7: Update User Role');
  try {
    const registerResult = await service.register({
      email: 'updaterole@example.com',
      password: 'password123',
      role: 'user'
    });
    
    if (registerResult.isOk()) {
      const user = registerResult.unwrap();
      const updateResult = await service.changeUserRole(user.id, 'admin');
      
      if (updateResult.isOk()) {
        const updatedUser = updateResult.unwrap();
        console.log('✅ User role updated successfully');
        console.log('  - Original role: user');
        console.log('  - Updated role:', updatedUser.role);
        console.log('  - Role changed:', updatedUser.role === 'admin');
      } else {
        console.log('❌ Update user role failed:', updateResult.unwrapErr());
      }
    } else {
      console.log('❌ User registration for role update test failed');
    }
  } catch (error) {
    console.log('❌ Update user role test failed:', error);
  }

  // Test 8: Delete User
  console.log('\nTest 8: Delete User');
  try {
    const registerResult = await service.register({
      email: 'delete@example.com',
      password: 'password123',
      role: 'user'
    });
    
    if (registerResult.isOk()) {
      const user = registerResult.unwrap();
      const deleteResult = await service.removeUser(user.id);
      
      if (deleteResult.isOk()) {
        const result = deleteResult.unwrap();
        console.log('✅ User deleted successfully');
        console.log('  - Deleted:', result.deleted);
        
        // Verify user is gone
        const getResult = await service.getUserById(user.id);
        if (getResult.isErr()) {
          console.log('✅ User properly removed from system');
        } else {
          console.log('❌ User still exists after deletion');
        }
      } else {
        console.log('❌ Delete user failed:', deleteResult.unwrapErr());
      }
    } else {
      console.log('❌ User registration for delete test failed');
    }
  } catch (error) {
    console.log('❌ Delete user test failed:', error);
  }

  // Test 9: List Users
  console.log('\nTest 9: List Users');
  try {
    repository.clear();
    
    // Create multiple users
    await service.register({
      email: 'list1@example.com',
      password: 'password123',
      role: 'user'
    });
    await service.register({
      email: 'list2@example.com',
      password: 'password123',
      role: 'admin'
    });
    await service.register({
      email: 'list3@example.com',
      password: 'password123',
      role: 'user'
    });
    
    const listResult = await service.findAllUsers();
    
    if (listResult.isOk()) {
      const result = listResult.unwrap();
      console.log('✅ Users listed successfully');
      console.log('  - Total users:', result.data.length);
      console.log('  - User emails:', result.data.map(u => u.email));
    } else {
      console.log('❌ List users failed:', listResult.unwrapErr());
    }
  } catch (error) {
    console.log('❌ List users test failed:', error);
  }

  // Test 10: Validation Errors
  console.log('\nTest 10: Validation Errors');
  try {
    // Test invalid email
    const invalidEmailResult = await service.register({
      email: 'invalid-email',
      password: 'password123',
      role: 'user'
    });
    if (invalidEmailResult.isErr()) {
      console.log('✅ Invalid email properly rejected');
    } else {
      console.log('❌ Invalid email should have been rejected');
    }

    // Test invalid role
    const invalidRoleResult = await service.register({
      email: 'valid@example.com',
      password: 'password123',
      role: 'invalid-role' as any
    });
    if (invalidRoleResult.isErr()) {
      console.log('✅ Invalid role properly rejected');
    } else {
      console.log('❌ Invalid role should have been rejected');
    }

    // Test weak password
    const weakPasswordResult = await service.register({
      email: 'weak@example.com',
      password: '123',
      role: 'user'
    });
    if (weakPasswordResult.isErr()) {
      console.log('✅ Weak password properly rejected');
    } else {
      console.log('❌ Weak password should have been rejected');
    }

  } catch (error) {
    console.log('❌ Validation errors test failed:', error);
  }

  console.log('\n=== User Service Tests Complete ===');
  console.log('✅ All tests completed!');
}

// Run the tests
runUserServiceTests().catch(console.error); 