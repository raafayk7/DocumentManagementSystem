import { PaginationInput, PaginationOutput } from '../../common/dto/pagination.dto.js';
import { User } from '../../domain/entities/User.js';

export interface UserFilterQuery {
  email?: string;
  role?: string;
}

export interface IUserRepository {
  // Save a user entity
  saveUser(user: User): Promise<User>;
  
  // Find users with pagination
  find(query?: UserFilterQuery, pagination?: PaginationInput): Promise<PaginationOutput<User>>;
  
  // Find one user (includes password hash for auth)
  findOne(query: UserFilterQuery): Promise<User | null>;
  
  // Find user by ID (public data only)
  findById(id: string): Promise<User | null>;
  
  // Find user by email
  findByEmail(email: string): Promise<User | null>;
  
  // Find users by role
  findByRole(role: 'user' | 'admin'): Promise<User[]>;
  
  // Check if user exists
  exists(query: UserFilterQuery): Promise<boolean>;
  
  // Count users
  count(query?: UserFilterQuery): Promise<number>;
  
  // Delete user
  delete(id: string): Promise<boolean>;
} 