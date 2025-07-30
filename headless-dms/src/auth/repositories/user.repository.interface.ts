import { RegisterDto } from '../dto/register.dto';

export interface IUserRepository {
  create(data: RegisterDto): Promise<{
    id: string;
    email: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  findByEmail(email: string): Promise<{
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
} 