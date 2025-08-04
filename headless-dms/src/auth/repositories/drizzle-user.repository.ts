import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';
import { IUserRepository, UserFilterQuery } from './user.repository.interface.js';
import { User } from '../../domain/entities/User.js';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { injectable } from 'tsyringe';
import { PaginationInput, PaginationOutput, calculatePaginationMetadata } from '../../common/dto/pagination.dto.js';
import { sql } from 'drizzle-orm';

@injectable()
export class DrizzleUserRepository implements IUserRepository {
  async saveUser(user: User): Promise<User> {
    const userData = user.toRepository();
    
    // Check if user exists to determine insert vs update
    const existing = await db.select().from(users).where(eq(users.id, userData.id)).execute();
    
    if (existing.length === 0) {
      // Create new user
      const newUsers = await db.insert(users).values({
        id: userData.id,
        email: userData.email,
        passwordHash: userData.passwordHash,
        role: userData.role,
      })
      .returning()
      .execute();
      
      if (newUsers.length === 0) {
        throw new Error('Failed to create user');
      }
      
      return User.fromRepository({
        ...newUsers[0],
        role: newUsers[0].role as 'user' | 'admin'
      });
    } else {
      // Update existing user
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
      passwordHash: users.passwordHash,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
      .from(users)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(users.createdAt)
      .execute();

    const usersList = results.map(user => User.fromRepository({
      ...user,
      role: user.role as 'user' | 'admin'
    }));

    return {
      data: usersList,
      pagination: calculatePaginationMetadata(total, page, limit)
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

    const result = await db.select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
      .from(users)
      .where(whereClause)
      .limit(1)
      .execute();

    if (result.length === 0) {
      return null;
    }

    const user = result[0];
    return User.fromRepository({
      ...user,
      role: user.role as 'user' | 'admin'
    });
  }

  async findById(id: string): Promise<User | null> {
    const result = await db.select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
      .from(users)
      .where(eq(users.id, id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    const user = result[0];
    return User.fromRepository({
      ...user,
      role: user.role as 'user' | 'admin'
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await db.select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
      .from(users)
      .where(eq(users.email, email))
      .execute();

    if (result.length === 0) {
      return null;
    }

    const user = result[0];
    return User.fromRepository({
      ...user,
      role: user.role as 'user' | 'admin'
    });
  }

  async findByRole(role: 'user' | 'admin'): Promise<User[]> {
    const result = await db.select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
      .from(users)
      .where(eq(users.role, role))
      .execute();

    return result.map(user => User.fromRepository({
      ...user,
      role: user.role as 'user' | 'admin'
    }));
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

    const result = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereClause)
      .execute();

    return (result[0]?.count || 0) > 0;
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

    const result = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereClause)
      .execute();

    return result[0]?.count || 0;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).execute();
    return (result.rowCount ?? 0) > 0;
  }
} 