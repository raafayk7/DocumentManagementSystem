import { db } from '../db';
import { users } from '../db/schema';
import { RegisterDto } from './dto/register.dto';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export async function register(registerDto: RegisterDto) {
  // Check if email already exists
  const existing = await db.select().from(users).where(eq(users.email, registerDto.email)).execute();
  if (existing.length > 0) {
    const err = new Error('Email already in use');
    (err as any).statusCode = 409;
    throw err;
  }
  // Hash the password
  const passwordHash = await bcrypt.hash(registerDto.password, 10);
  // Insert the new user
  const newUsers = await db.insert(users).values({
    email: registerDto.email,
    passwordHash,
    role: registerDto.role,
    // createdAt and updatedAt are handled by .defaultNow()
  })
  .returning()
  .execute();

  if (newUsers.length === 0) {
    throw new Error('Failed to create user');
  }
  // Return only safe fields
  const { id, email, role, createdAt, updatedAt } = newUsers[0];
  return { id, email, role, createdAt, updatedAt };
}