import { db } from '../db';
import { users } from '../db/schema';
import { RegisterDto } from './dto/register.dto';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import jwt from 'jsonwebtoken';

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

export async function login(loginDto: LoginDto) {
    // Find user by email
    const usersFound = await db.select().from(users).where(eq(users.email, loginDto.email)).execute();
    if (usersFound.length === 0) {
      const err = new Error('Invalid credentials');
      (err as any).statusCode = 401;
      throw err;
    }
    const user = usersFound[0];
  
    // Compare password
    const isMatch = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isMatch) {
      const err = new Error('Invalid credentials');
      (err as any).statusCode = 401;
      throw err;
    }
  
    // Generate JWT
    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '1h' });
  
    return {
      access_token,
      user: { id: user.id, email: user.email, role: user.role }
    };
  }