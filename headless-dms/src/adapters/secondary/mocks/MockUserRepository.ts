import { injectable } from 'tsyringe';
import { IUserRepository } from '../../../ports/output/IUserRepository.js';
import { User } from '../../../domain/entities/User.js';
import { UserFilterQuery, PaginationInput, PaginationOutput } from '../../application/dto/common/index.js';

@injectable()
export class MockUserRepository implements IUserRepository {
  private users: Map<string, User> = new Map();
  private nextId = 1;

  constructor() {
    // Initialize with some test data
    this.seedMockData();
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email.value === email) {
        return user;
      }
    }
    return null;
  }

  async find(query: UserFilterQuery, pagination: PaginationInput): Promise<PaginationOutput<User>> {
    let filteredUsers = Array.from(this.users.values());

    // Apply filters
    if (query.email) {
      filteredUsers = filteredUsers.filter(user => 
        user.email.value.toLowerCase().includes(query.email!.toLowerCase())
      );
    }

    if (query.role) {
      filteredUsers = filteredUsers.filter(user => 
        user.role.value === query.role
      );
    }

    // Apply sorting
    if (pagination.sort) {
      filteredUsers.sort((a, b) => {
        const aValue = this.getSortValue(a, pagination.sort!);
        const bValue = this.getSortValue(b, pagination.sort!);
        
        if (pagination.order === 'desc') {
          return bValue > aValue ? 1 : -1;
        }
        return aValue > bValue ? 1 : -1;
      });
    }

    // Apply pagination
    const total = filteredUsers.length;
    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit;
    const data = filteredUsers.slice(start, end);

    return {
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
        hasNext: end < total,
        hasPrev: pagination.page > 1
      }
    };
  }

  async findOne(query: UserFilterQuery): Promise<User | null> {
    const result = await this.find(query, { page: 1, limit: 1 });
    return result.data[0] || null;
  }

  async exists(query: UserFilterQuery): Promise<boolean> {
    const result = await this.find(query, { page: 1, limit: 1 });
    return result.data.length > 0;
  }

  async count(query: UserFilterQuery): Promise<number> {
    const result = await this.find(query, { page: 1, limit: Number.MAX_SAFE_INTEGER });
    return result.data.length;
  }

  async save(user: User): Promise<User> {
    if (!user.id) {
      user.id = `mock-user-${this.nextId++}`;
    }
    this.users.set(user.id, user);
    return user;
  }

  async update(user: User): Promise<User> {
    if (!user.id || !this.users.has(user.id)) {
      throw new Error('User not found for update');
    }
    this.users.set(user.id, user);
    return user;
  }

  async delete(id: string): Promise<void> {
    if (!this.users.has(id)) {
      throw new Error('User not found for deletion');
    }
    this.users.delete(id);
  }

  // Mock-specific methods for testing
  clear(): void {
    this.users.clear();
    this.nextId = 1;
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  setUsers(users: User[]): void {
    this.clear();
    users.forEach(user => this.users.set(user.id, user));
  }

  // Helper method for sorting
  private getSortValue(user: User, sortField: string): any {
    switch (sortField) {
      case 'email':
        return user.email.value;
      case 'role':
        return user.role.value;
      case 'createdAt':
        return user.createdAt;
      case 'updatedAt':
        return user.updatedAt;
      default:
        return user.id;
    }
  }

  // Seed with some initial test data
  private seedMockData(): void {
    // This will be populated by tests as needed
  }
}
