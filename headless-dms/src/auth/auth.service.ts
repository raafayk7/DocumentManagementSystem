import { IUserRepository } from './repositories/user.repository.interface';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export class AuthService {
  constructor(private userRepository: IUserRepository) {}

  async register(registerDto: RegisterDto) {
    const user = await this.userRepository.save(registerDto);
    return user;
  }

  async login(loginDto: LoginDto) {
    // Find user by email
    const user = await this.userRepository.findOne({ email: loginDto.email });
    if (!user) {
      const err = new Error('Invalid credentials');
      (err as any).statusCode = 401;
      throw err;
    }

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
}