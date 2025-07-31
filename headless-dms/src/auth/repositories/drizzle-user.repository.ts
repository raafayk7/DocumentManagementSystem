import { db } from '../../db';
import { users } from '../../db/schema';
import { IUserRepository, UserFilterQuery } from './user.repository.interface';
import { RegisterDto } from '../dto/register.dto';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { injectable } from 'tsyringe';
import { PaginationInput, PaginationOutput, calculatePaginationMetadata } from '../../common/dto/pagination.dto';
import { sql } from 'drizzle-orm';

@injectable()
export class DrizzleUserRepository implements IUserRepository {
  async save(data: RegisterDto): Promise<{
    id: string; email: string; role: string; createdAt: Date; updatedAt: Date;
  }> {
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
    const { id, email, role, createdAt, updatedAt } = newUsers[0];
    return { id, email, role, createdAt, updatedAt };
  }

  async find(query?: UserFilterQuery, pagination?: PaginationInput): Promise<PaginationOutput<{
    id: string; email: string; role: string; createdAt: Date; updatedAt: Date;
  }>> {
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
      data: results,
      pagination: paginationMetadata
    };
  }

  async findOne(query: UserFilterQuery): Promise<{
    id: string; email: string; passwordHash: string; role: string; createdAt: Date; updatedAt: Date;
  } | null> {
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

    return results[0];
  }

  async findById(id: string): Promise<{
    id: string; email: string; role: string; createdAt: Date; updatedAt: Date;
  } | null> {
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

    return results[0];
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
} 