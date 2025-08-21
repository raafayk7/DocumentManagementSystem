import { User } from '../../domain/entities/User.js';
import { PaginationOutput, PaginationInput } from '../../shared/dto/common/pagination.dto.js';
import { BaseRepository, RepositoryResult, Paginated, PaginationOptions } from '@carbonteq/hexapp';

export interface UserFilterQuery {
  email?: string;
  role?: string;
}

export interface IUserRepository extends BaseRepository<User> {
  // Required abstract methods from BaseRepository (implemented by concrete classes)
  insert(user: User): Promise<RepositoryResult<User, any>>;
  update(user: User): Promise<RepositoryResult<User, any>>;

  // Existing custom methods (preserved for backward compatibility)
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  saveUser(user: User): Promise<User>;
  find(query?: UserFilterQuery, pagination?: PaginationInput): Promise<PaginationOutput<User>>;
  findOne(query: UserFilterQuery): Promise<User | null>;
  findByRole(role: 'user' | 'admin'): Promise<User[]>;
  exists(query: UserFilterQuery): Promise<boolean>;
  count(query?: UserFilterQuery): Promise<number>;
  delete(id: string): Promise<boolean>;

  // New hexapp standardized methods (optional implementations)
  fetchAll?(): Promise<RepositoryResult<User[]>>;
  fetchPaginated?(options: PaginationOptions): Promise<RepositoryResult<Paginated<User>>>;
  fetchById?(id: string): Promise<RepositoryResult<User, any>>;
  deleteById?(id: string): Promise<RepositoryResult<User, any>>;
  fetchBy?<U extends keyof User>(prop: U, val: User[U]): Promise<RepositoryResult<User, any>>;
  existsBy?<U extends keyof User>(prop: U, val: User[U]): Promise<RepositoryResult<boolean>>;
  deleteBy?<U extends keyof User>(prop: U, val: User[U]): Promise<RepositoryResult<User, any>>;
} 