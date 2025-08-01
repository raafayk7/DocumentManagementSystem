import { RegisterDto} from '../dto/register.dto.js';
import { PaginationInput, PaginationOutput } from '../../common/dto/pagination.dto.js';
import { User } from '../../domain/entities/User.js';

export interface UserFilterQuery {
  email?: string;
  role?: string;
}

export interface IUserRepository {
  // Save a new user (from DTO)
  save(data: RegisterDto): Promise<User>;
  
  // Save an existing user entity (for updates)
  saveUser(user: User): Promise<User>;
  
  // Find users with pagination
  find(query?: UserFilterQuery, pagination?: PaginationInput): Promise<PaginationOutput<User>>;
  
  // Find one user (includes password hash for auth)
  findOne(query: UserFilterQuery): Promise<User | null>;
  
  // Find user by ID (public data only)
  findById(id: string): Promise<User | null>;
  
  // Check if user exists
  exists(query: UserFilterQuery): Promise<boolean>;
  
  // Count users
  count(query?: UserFilterQuery): Promise<number>;
  
  // Delete user
  delete(id: string): Promise<boolean>;
} 