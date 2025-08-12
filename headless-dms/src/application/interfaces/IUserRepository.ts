import { User } from '../../domain/entities/User.js';
import { PaginationOutput, PaginationInput } from '../../common/dto/pagination.dto.js';

export interface UserFilterQuery {
  email?: string;
  role?: string;
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  saveUser(user: User): Promise<User>;
  find(query?: UserFilterQuery, pagination?: PaginationInput): Promise<PaginationOutput<User>>;
  findOne(query: UserFilterQuery): Promise<User | null>;
  findByRole(role: 'user' | 'admin'): Promise<User[]>;
  exists(query: UserFilterQuery): Promise<boolean>;
  count(query?: UserFilterQuery): Promise<number>;
  delete(id: string): Promise<boolean>;
} 