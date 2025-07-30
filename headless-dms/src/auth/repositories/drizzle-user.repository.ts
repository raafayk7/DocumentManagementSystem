import { db } from '../../db';
import { users } from '../../db/schema';
import { IUserRepository } from './user.repository.interface';
import { RegisterDto } from '../dto/register.dto';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export class DrizzleUserRepository implements IUserRepository {
  async create(data: RegisterDto): Promise<{
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

  async findByEmail(email: string): Promise<{
    id: string;
    email: string;
    passwordHash: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    const usersFound = await db.select().from(users).where(eq(users.email, email)).execute();
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
    const result = await db.select().from(users).where(eq(users.id, id)).execute();
    if (!result || result.length === 0) {
      return null;
    }
    
    // Return only safe fields (no password hash)
    const { id: userId, email, role, createdAt, updatedAt } = result[0];
    return { id: userId, email, role, createdAt, updatedAt };
  }
} 