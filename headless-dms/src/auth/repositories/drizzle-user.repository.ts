import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';
import { IUserRepository, UserFilterQuery } from './user.repository.interface.js';
import { RegisterDto } from '../dto/register.dto.js';
import { User } from '../../domain/entities/User.js';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { injectable } from 'tsyringe';
import { PaginationInput, PaginationOutput, calculatePaginationMetadata } from '../../common/dto/pagination.dto.js';
import { sql } from 'drizzle-orm';

@injectable()
export class DrizzleUserRepository implements IUserRepository {
  async save(data: RegisterDto): Promise<User> {
    const existing = await db.select().from(users).where(eq(users.email, data.email)).execute();
    if (existing.length > 0) {
      const err = new Error('Email already in use');
      (err as any).statusCode = 409;
      throw err;
    }
    const passwordHash = await bcrypt.hash(data.password, 10);
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
    const userData = newUsers[0];
    return User.fromRepository({
      ...userData,
      role: userData.role as 'user' | 'admin'
    });
  }

  async saveUser(user: User): Promise<User> {
    const userData = user.toRepository();
    const updatedUsers = await db.update(users)
      .set({
        email: userData.email,
        passwordHash: userData.passwordHash,
        role: userData.role,
        updatedAt: new Date()
      })
      .where(eq(users.id, userData.id))
      .returning()
      .execute();
    
    if (updatedUsers.length === 0) {
      throw new Error('Failed to update user');
    }
    
    return User.fromRepository({
      ...updatedUsers[0],
      role: updatedUsers[0].role as 'user' | 'admin'
    });
  }

  async find(query?: UserFilterQuery, pagination?: PaginationInput): Promise<PaginationOutput<User>> {
    const conditions = [];
    
    if (query?.email) {
      conditions.push(eq(users.email, query.email));
    }
    if (query?.role) {
      conditions.push(eq(users.role, query.role));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereClause)
      .execute();
    const total = countResult[0]?.count || 0;

    // Apply pagination
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const offset = (page - 1) * limit;

    // Get paginated results
    const results = await db.select({
      id: users.id,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    })
    .from(users)
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(users.createdAt)
    .execute();

    const paginationMetadata = calculatePaginationMetadata(page, limit, total);

    return {
      data: results.map(user => User.fromRepository({
        ...user,
        role: user.role as 'user' | 'admin',
        passwordHash: '' // Public data doesn't include password hash
      })),
      pagination: paginationMetadata
    };
  }

  async findOne(query: UserFilterQuery): Promise<User | null> {
    const conditions = [];
    
    if (query?.email) {
      conditions.push(eq(users.email, query.email));
    }
    if (query?.role) {
      conditions.push(eq(users.role, query.role));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const results = await db.select()
      .from(users)
      .where(whereClause)
      .limit(1)
      .execute();

    if (results.length === 0) {
      return null;
    }

    return User.fromRepository({
      ...results[0],
      role: results[0].role as 'user' | 'admin'
    });
  }

  async findById(id: string): Promise<User | null> {
    const results = await db.select({
      id: users.id,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    })
    .from(users)
    .where(eq(users.id, id))
    .execute();

    if (results.length === 0) {
      return null;
    }

    return User.fromRepository({
      ...results[0],
      role: results[0].role as 'user' | 'admin',
      passwordHash: '' // Public data doesn't include password hash
    });
  }

  async exists(query: UserFilterQuery): Promise<boolean> {
    const conditions = [];
    
    if (query?.email) {
      conditions.push(eq(users.email, query.email));
    }
    if (query?.role) {
      conditions.push(eq(users.role, query.role));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const results = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereClause)
      .execute();

    return (results[0]?.count || 0) > 0;
  }

  async count(query?: UserFilterQuery): Promise<number> {
    const conditions = [];
    
    if (query?.email) {
      conditions.push(eq(users.email, query.email));
    }
    if (query?.role) {
      conditions.push(eq(users.role, query.role));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const results = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereClause)
      .execute();

    return results[0]?.count || 0;
  }

  async delete(id: string): Promise<boolean> {
    const results = await db.delete(users)
      .where(eq(users.id, id))
      .returning()
      .execute();

    return results.length > 0;
  }
} 