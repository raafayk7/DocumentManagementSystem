import { db } from '../../db';
import { users } from '../../db/schema';
import { IUserRepository, UserFilterQuery } from './user.repository.interface';
import { RegisterDto } from '../dto/register.dto';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export class DrizzleUserRepository implements IUserRepository {
  async save(data: RegisterDto): Promise<{
    id: string;
    email: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  }> {
    // Check if email already exists
    const existing = await db.select().from(users).where(eq(users.email, data.email)).execute();
    if (existing.length > 0) {
      const err = new Error('Email already in use');
      (err as any).statusCode = 409;
      throw err;
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Insert the new user
    const newUsers = await db.insert(users).values({
      id: uuidv4(),
      email: data.email,
      passwordHash,
      role: data.role,
    })
    .returning()
    .execute();

    if (newUsers.length === 0) {
      throw new Error('Failed to create user');
    }

    // Return only safe fields (no password hash)
    const { id, email, role, createdAt, updatedAt } = newUsers[0];
    return { id, email, role, createdAt, updatedAt };
  }

  async find(query?: UserFilterQuery): Promise<{
    id: string;
    email: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  }[]> {
    const conditions: any[] = [];

    if (query?.email) {
      conditions.push(eq(users.email, query.email));
    }
    if (query?.role) {
      conditions.push(eq(users.role, query.role));
    }

    const dbQuery = db.select({
      id: users.id,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users);

    const baseQuery = conditions.length
      ? dbQuery.where(and(...conditions))
      : dbQuery;

    const results = await baseQuery.execute();
    return results;
  }

  async findOne(query: UserFilterQuery): Promise<{
    id: string;
    email: string;
    passwordHash: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    const conditions: any[] = [];

    if (query?.email) {
      conditions.push(eq(users.email, query.email));
    }
    if (query?.role) {
      conditions.push(eq(users.role, query.role));
    }

    if (conditions.length === 0) {
      return null;
    }

    const usersFound = await db.select().from(users).where(and(...conditions)).execute();
    if (usersFound.length === 0) {
      return null;
    }
    return usersFound[0];
  }

  async findById(id: string): Promise<{
    id: string;
    email: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    const result = await db.select({
      id: users.id,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users).where(eq(users.id, id)).execute();
    
    if (!result || result.length === 0) {
      return null;
    }
    
    return result[0];
  }

  async exists(query: UserFilterQuery): Promise<boolean> {
    const results = await this.find(query);
    return results.length > 0;
  }
} 