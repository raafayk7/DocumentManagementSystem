import { RegisterDto } from '../dto/register.dto';

export interface UserFilterQuery {
  email?: string;
  role?: string;
}

export interface IUserRepository {
  save(data: RegisterDto): Promise<{
    id: string;
    email: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  find(query?: UserFilterQuery): Promise<{
    id: string;
    email: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  }[]>;
  findOne(query: UserFilterQuery): Promise<{
    id: string;
    email: string;
    passwordHash: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  } | null>;
  findById(id: string): Promise<{
    id: string;
    email: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  } | null>;
  exists(query: UserFilterQuery): Promise<boolean>;
} 