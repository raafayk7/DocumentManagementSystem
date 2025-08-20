import { faker } from '@faker-js/faker';
import { SeedUser, SEED_CONFIG } from './seed-data.js';
import bcrypt from 'bcrypt';

export class UserSeeder {
  private users: SeedUser[] = [];

  async generateUsers(): Promise<SeedUser[]> {
    this.users = [];
    
    // Generate admin users
    for (let i = 0; i < SEED_CONFIG.users.adminCount; i++) {
      const user = await this.generateUser('admin');
      this.users.push(user);
    }

    // Generate regular users
    const regularUserCount = SEED_CONFIG.users.count - SEED_CONFIG.users.adminCount;
    for (let i = 0; i < regularUserCount; i++) {
      const user = await this.generateUser('user');
      this.users.push(user);
    }

    return this.users;
  }

  private async generateUser(role: 'admin' | 'user'): Promise<SeedUser> {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName });
    const password = await bcrypt.hash('password123', 10);

    return {
      id: faker.string.uuid(),
      email,
      password,
      role,
      firstName,
      lastName
    };
  }

  getUsers(): SeedUser[] {
    return this.users;
  }

  getUserById(id: string): SeedUser | undefined {
    return this.users.find(user => user.id === id);
  }

  getAdminUsers(): SeedUser[] {
    return this.users.filter(user => user.role === 'admin');
  }

  getRegularUsers(): SeedUser[] {
    return this.users.filter(user => user.role === 'user');
  }
} 