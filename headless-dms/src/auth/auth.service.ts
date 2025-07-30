import { IUserRepository } from './repositories/user.repository.interface';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { injectable, inject } from 'tsyringe';
import { ILogger } from '../common/services/logger.service.interface';

@injectable()
export class AuthService {
  constructor(
    @inject('IUserRepository') private userRepository: IUserRepository,
    @inject('ILogger') private logger: ILogger
  ) {
    this.logger = this.logger.child({ service: 'AuthService' });
  }

  async register(registerDto: RegisterDto) {
    this.logger.info('User registration attempt', { email: registerDto.email, role: registerDto.role });
    
    try {
      const user = await this.userRepository.save(registerDto);
      this.logger.info('User registered successfully', { userId: user.id, email: user.email });
      return user;
    } catch (error) {
      this.logger.logError(error as Error, { email: registerDto.email });
      throw error;
    }
  }

  async login(loginDto: LoginDto) {
    this.logger.info('User login attempt', { email: loginDto.email });
    
    try {
      // Find user by email
      const user = await this.userRepository.findOne({ email: loginDto.email });
      if (!user) {
        this.logger.warn('Login failed - user not found', { email: loginDto.email });
        const err = new Error('Invalid credentials');
        (err as any).statusCode = 401;
        throw err;
      }

      // Compare password
      const isMatch = await bcrypt.compare(loginDto.password, user.passwordHash);
      if (!isMatch) {
        this.logger.warn('Login failed - invalid password', { email: loginDto.email });
        const err = new Error('Invalid credentials');
        (err as any).statusCode = 401;
        throw err;
      }

      // Generate JWT
      const payload = { sub: user.id, email: user.email, role: user.role };
      const access_token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '1h' });

      this.logger.info('User logged in successfully', { userId: user.id, email: user.email });
      return {
        access_token,
        user: { id: user.id, email: user.email, role: user.role }
      };
    } catch (error) {
      this.logger.logError(error as Error, { email: loginDto.email });
      throw error;
    }
  }
}