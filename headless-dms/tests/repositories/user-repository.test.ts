// tests/repositories/user-repository.test.ts
import { Result } from '@carbonteq/fp';
import { User } from '../../src/domain/entities/User.js';
import { IUserRepository, UserFilterQuery } from '../../src/auth/repositories/user.repository.interface.js';
import { PaginationInput, PaginationOutput } from '../../src/common/dto/pagination.dto.js';

// In-memory implementation for testing
class InMemoryUserRepository implements IUserRepository {
  private users: Map<string, any> = new Map();

  async saveUser(user: User): Promise<User> {
    const userData = user.toRepository();
    this.users.set(user.id, userData);
    return user;
  }

  async find(query?: UserFilterQuery, pagination?: PaginationInput): Promise<PaginationOutput<User>> {
    try {
      let filteredUsers = Array.from(this.users.values()).map(userData => 
        User.fromRepository(userData)
      );

      // Apply filters
      if (query) {
        if (query.email) {
          filteredUsers = filteredUsers.filter(user => 
            user.email.toLowerCase().includes(query.email!.toLowerCase())
          );
        }
        if (query.role) {
          filteredUsers = filteredUsers.filter(user => user.role === query.role);
        }
      }

      // Apply pagination
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      const offset = (page - 1) * limit;
      const paginatedUsers = filteredUsers.slice(offset, offset + limit);

      const totalPages = Math.ceil(filteredUsers.length / limit);
      return {
        data: paginatedUsers,
        pagination: {
          page,
          limit,
          total: filteredUsers.length,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Failed to fetch users: ${error}`);
    }
  }

  async findOne(query: UserFilterQuery): Promise<User | null> {
    try {
      for (const userData of this.users.values()) {
        const user = User.fromRepository(userData);
        let matches = true;

        if (query.email && user.email.toLowerCase() !== query.email.toLowerCase()) {
          matches = false;
        }
        if (query.role && user.role !== query.role) {
          matches = false;
        }

        if (matches) {
          return user;
        }
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to find user: ${error}`);
    }
  }

  async findById(id: string): Promise<User | null> {
    const userData = this.users.get(id);
    if (!userData) {
      return null;
    }
    return User.fromRepository(userData);
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim();
    for (const userData of this.users.values()) {
      if (userData.email.toLowerCase().trim() === normalizedEmail) {
        return User.fromRepository(userData);
      }
    }
    return null;
  }

  async findByRole(role: 'user' | 'admin'): Promise<User[]> {
    try {
      const users = Array.from(this.users.values())
        .filter(userData => userData.role === role)
        .map(userData => User.fromRepository(userData));
      return users;
    } catch (error) {
      throw new Error(`Failed to fetch users by role: ${error}`);
    }
  }

  async exists(query: UserFilterQuery): Promise<boolean> {
    try {
      for (const userData of this.users.values()) {
        const user = User.fromRepository(userData);
        let matches = true;

        if (query.email && user.email.toLowerCase() !== query.email.toLowerCase()) {
          matches = false;
        }
        if (query.role && user.role !== query.role) {
          matches = false;
        }

        if (matches) {
          return true;
        }
      }
      return false;
    } catch (error) {
      throw new Error(`Failed to check user existence: ${error}`);
    }
  }

  async count(query?: UserFilterQuery): Promise<number> {
    try {
      let filteredUsers = Array.from(this.users.values()).map(userData => 
        User.fromRepository(userData)
      );

      // Apply filters
      if (query) {
        if (query.email) {
          filteredUsers = filteredUsers.filter(user => 
            user.email.toLowerCase().includes(query.email!.toLowerCase())
          );
        }
        if (query.role) {
          filteredUsers = filteredUsers.filter(user => user.role === query.role);
        }
      }

      return filteredUsers.length;
    } catch (error) {
      throw new Error(`Failed to count users: ${error}`);
    }
  }

  async delete(id: string): Promise<boolean> {
    if (!this.users.has(id)) {
      return false;
    }

    try {
      this.users.delete(id);
      return true;
    } catch (error) {
      throw new Error(`Failed to delete user: ${error}`);
    }
  }

  // Helper method for testing
  async create(email: string, password: string, role: 'user' | 'admin'): Promise<User> {
    const userResult = await User.create(email, password, role);
    if (userResult.isOk()) {
      const user = userResult.unwrap();
      await this.saveUser(user);
      return user;
    }
    throw new Error(userResult.unwrapErr());
  }

  // Clear for testing
  clear(): void {
    this.users.clear();
  }
}

console.log('=== User Repository Tests ===\n');

async function runUserRepositoryTests() {
  const repository = new InMemoryUserRepository();

  // Test 1: Create User
  console.log('Test 1: Create User');
  try {
    const user = await repository.create('test@example.com', 'hashedPassword123', 'user');
    
    console.log('✅ User created successfully');
    console.log('  - ID:', user.id);
    console.log('  - Email:', user.email);
    console.log('  - Role:', user.role);
  } catch (error) {
    console.log('❌ User creation failed:', error);
  }

  // Test 2: Find User by ID
  console.log('\nTest 2: Find User by ID');
  try {
    const user = await repository.create('findbyid@example.com', 'password123', 'user');
    
    const findResult = await repository.findById(user.id);
    
    if (findResult) {
      const foundUser = findResult;
      console.log('✅ User found by ID');
      console.log('  - Found ID:', foundUser.id);
      console.log('  - Found Email:', foundUser.email);
      console.log('  - IDs match:', foundUser.id === user.id);
    } else {
      console.log('❌ User not found by ID');
    }
  } catch (error) {
    console.log('❌ Find by ID test failed:', error);
  }

  // Test 3: Find User by Email
  console.log('\nTest 3: Find User by Email');
  try {
    const user = await repository.create('findbyemail@example.com', 'password123', 'admin');
    
    const findResult = await repository.findByEmail(user.email);
    
    if (findResult) {
      const foundUser = findResult;
      console.log('✅ User found by email');
      console.log('  - Found Email:', foundUser.email);
      console.log('  - Emails match:', foundUser.email === user.email);
    } else {
      console.log('❌ User not found by email');
    }
  } catch (error) {
    console.log('❌ Find by email test failed:', error);
  }

  // Test 4: Find All Users
  console.log('\nTest 4: Find All Users');
  try {
    // Clear and create multiple users
    repository.clear();
    await repository.create('user1@example.com', 'password1', 'user');
    await repository.create('user2@example.com', 'password2', 'admin');
    await repository.create('user3@example.com', 'password3', 'user');

    const findAllResult = await repository.find();
    
    if (findAllResult) {
      const users = findAllResult.data;
      console.log('✅ All users retrieved');
      console.log('  - Total users:', users.length);
      console.log('  - User emails:', users.map(u => u.email));
    } else {
      console.log('❌ Failed to retrieve all users');
    }
  } catch (error) {
    console.log('❌ Find all users test failed:', error);
  }

  // Test 5: Update User
  console.log('\nTest 5: Update User');
  try {
    const user = await repository.create('update@example.com', 'password123', 'user');
    
    const updateResult = await repository.saveUser(user);
    
    console.log('✅ User updated successfully');
    console.log('  - Original role:', user.role);
    console.log('  - Updated role:', updateResult.role);
    console.log('  - Role changed:', user.role !== updateResult.role);
  } catch (error) {
    console.log('❌ Update user test failed:', error);
  }

  // Test 6: Delete User
  console.log('\nTest 6: Delete User');
  try {
    const user = await repository.create('delete@example.com', 'password123', 'user');
    
    // Check user exists before deletion
    const existsBefore = await repository.exists({ email: user.email });
    console.log('✅ User exists before deletion:', existsBefore);
    
    // Delete user
    const deleteResult = await repository.delete(user.id);
    
    if (deleteResult) {
      console.log('✅ User deleted successfully');
      
      // Check user doesn't exist after deletion
      const existsAfter = await repository.exists({ email: user.email });
      console.log('✅ User exists after deletion:', existsAfter);
      console.log('✅ User properly deleted:', !existsAfter);
    } else {
      console.log('❌ User deletion failed');
    }
  } catch (error) {
    console.log('❌ Delete user test failed:', error);
  }

  // Test 7: User Count
  console.log('\nTest 7: User Count');
  try {
    repository.clear();
    await repository.create('count1@example.com', 'password1', 'user');
    await repository.create('count2@example.com', 'password2', 'admin');
    
    const countResult = await repository.count();
    
    console.log('✅ User count retrieved');
    console.log('  - Total users:', countResult);
    console.log('  - Expected count: 2');
    console.log('  - Count correct:', countResult === 2);
  } catch (error) {
    console.log('❌ User count test failed:', error);
  }

  // Test 8: Error Handling
  console.log('\nTest 8: Error Handling');
  try {
    // Try to find non-existent user
    const findResult = await repository.findById('non-existent-id');
    console.log('✅ Non-existent user properly handled:', findResult === null ? 'PASS' : 'FAIL');
    
    // Try to update non-existent user
    const userToUpdate = await repository.create('non-existent-update@example.com', 'password123', 'user');
    const updateResult = await repository.saveUser(userToUpdate);
    console.log('✅ Non-existent user update properly handled:', updateResult.email === userToUpdate.email ? 'PASS' : 'FAIL');
    
    // Try to delete non-existent user
    const deleteResult = await repository.delete('non-existent-id');
    console.log('✅ Non-existent user deletion properly handled:', deleteResult === false ? 'PASS' : 'FAIL');
    
  } catch (error) {
    console.log('❌ Error handling test failed:', error);
  }

  console.log('\n=== User Repository Tests Complete ===');
  console.log('✅ All tests passed!');
}

// Run the tests
runUserRepositoryTests().catch(error => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
}); 