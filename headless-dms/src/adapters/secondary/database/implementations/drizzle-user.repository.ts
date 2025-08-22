import { db } from '../index.js';
import { users } from '../schema.js';
import { IUserRepository } from '../../../../ports/output/IUserRepository.js';
import type { UserFilterQuery } from '../interfaces/user.repository.interface.js';
import { User } from '../../../../domain/entities/User.js';
import { eq, and } from 'drizzle-orm';
import { injectable } from 'tsyringe';
import { PaginationInput, PaginationOutput, calculatePaginationMetadata } from '../../../../shared/dto/common/pagination.dto.js';
import { sql } from 'drizzle-orm';
import { RepositoryResult } from '@carbonteq/hexapp';
import { Result } from '@carbonteq/fp';
import { extractId, toSerialized, filterMap } from '@carbonteq/hexapp';

@injectable()
export class DrizzleUserRepository implements IUserRepository {
  // Hexapp utility functions - field selection for queries
  private readonly userFields = {
    id: users.id,
    email: users.email,
    passwordHash: users.passwordHash,
    role: users.role,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
  };

  
  // Helper function for building query conditions
  private buildQueryConditions = (query?: UserFilterQuery) => {
    const queryFields = [
      { key: 'email', value: query?.email, condition: () => eq(users.email, query!.email!) },
      { key: 'role', value: query?.role, condition: () => eq(users.role, query!.role!) }
    ];
    
    return filterMap(
      queryFields,
      (field) => field.value !== undefined,
      (field) => field.condition()
    );
  };

  // Helper function for transforming database results to User entities
  private transformToUser = (dbUser: any): User => {
    return User.fromRepository({
      ...dbUser,
      role: dbUser.role as 'user' | 'admin'
    }).unwrap();
  };

  // Required abstract methods from BaseRepository<User>
  async insert(user: User): Promise<RepositoryResult<User, any>> {
    try {
      const userId = extractId(user);
      const userData = toSerialized(user);
      
      // Check if user already exists
      const existing = await db.select().from(users).where(eq(users.id, userId)).execute();
      if (existing.length > 0) {
        return Result.Err(new Error(`User with ID ${userId} already exists`));
      }

      const newUsers = await db.insert(users).values({
        id: userData.id,
        email: userData.email,
        passwordHash: userData.passwordHash,
        role: userData.role,
      })
      .returning()
      .execute();
      
      if (newUsers.length === 0) {
        return Result.Err(new Error('Failed to create user'));
      }
      
      const createdUser = this.transformToUser(newUsers[0]);
      
      return Result.Ok(createdUser);
    } catch (error) {
      return Result.Err(new Error(`Failed to insert user: ${error}`));
    }
  }

  async update(user: User): Promise<RepositoryResult<User, any>> {
    try {
      const userId = extractId(user);
      const userData = toSerialized(user);
      
      // Check if user exists
      const existing = await db.select().from(users).where(eq(users.id, userId)).execute();
      if (existing.length === 0) {
        return Result.Err(new Error(`User with ID ${userId} not found`));
      }

      const updatedUsers = await db.update(users)
        .set({
          email: userData.email,
          passwordHash: userData.passwordHash,
          role: userData.role,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning()
        .execute();
      
      if (updatedUsers.length === 0) {
        return Result.Err(new Error('Failed to update user'));
      }
      
      const updatedUser = this.transformToUser(updatedUsers[0]);
      
      return Result.Ok(updatedUser);
    } catch (error) {
      return Result.Err(new Error(`Failed to update user: ${error}`));
    }
  }

  // Existing custom methods (preserved for backward compatibility)
  async saveUser(user: User): Promise<User> {
    const userId = extractId(user);
    const userData = toSerialized(user);
    
    // Check if user exists to determine insert vs update
    const existing = await db.select().from(users).where(eq(users.id, userId)).execute();
    
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
      
      return this.transformToUser(newUsers[0]);
    } else {
      // Update existing user
      const updatedUsers = await db.update(users)
        .set({
          email: userData.email,
          passwordHash: userData.passwordHash,
          role: userData.role,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning()
        .execute();
      
      if (updatedUsers.length === 0) {
        throw new Error('Failed to update user');
      }
      
      return this.transformToUser(updatedUsers[0]);
    }
  }

  async find(query?: UserFilterQuery, pagination?: PaginationInput): Promise<PaginationOutput<User>> {
    const conditions = this.buildQueryConditions(query);
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
    const results = await db.select(this.userFields)
      .from(users)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(users.createdAt)
      .execute();

    const usersList = results.map(this.transformToUser);

    return {
      data: usersList,
      pagination: calculatePaginationMetadata(page, limit, total)
    };
  }

  async findOne(query: UserFilterQuery): Promise<User | null> {
    const conditions = this.buildQueryConditions(query);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db.select(this.userFields)
      .from(users)
      .where(whereClause)
      .limit(1)
      .execute();

    if (result.length === 0) {
      return null;
    }

    return this.transformToUser(result[0]);
  }

  async findById(id: string): Promise<User | null> {
    const result = await db.select(this.userFields)
      .from(users)
      .where(eq(users.id, id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    return this.transformToUser(result[0]);
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await db.select(this.userFields)
      .from(users)
      .where(eq(users.email, email))
      .execute();

    if (result.length === 0) {
      return null;
    }

    return this.transformToUser(result[0]);
  }

  async findByRole(role: 'user' | 'admin'): Promise<User[]> {
    const result = await db.select(this.userFields)
      .from(users)
      .where(eq(users.role, role))
      .execute();

    return result.map(this.transformToUser);
  }

  async exists(query: UserFilterQuery): Promise<boolean> {
    const conditions = this.buildQueryConditions(query);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereClause)
      .execute();

    return (result[0]?.count || 0) > 0;
  }

  async count(query?: UserFilterQuery): Promise<number> {
    const conditions = this.buildQueryConditions(query);
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