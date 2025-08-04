import { Result } from '@carbonteq/fp';
import type { IValidator } from './IValidator.js';

export class PasswordValidator implements IValidator<string> {
  /**
   * Technical validation: Password format requirements
   * This includes both technical and security requirements
   */
  validate(password: string): Result<string, string> {
    if (!password) {
      return Result.Err('Password is required');
    }
    
    if (password.length < 8) {
      return Result.Err('Password must be at least 8 characters');
    }
    
    // Future: Add complexity requirements
    // if (!/[A-Z]/.test(password)) {
    //   return Result.Err('Password must contain at least one uppercase letter');
    // }
    // if (!/[a-z]/.test(password)) {
    //   return Result.Err('Password must contain at least one lowercase letter');
    // }
    // if (!/\d/.test(password)) {
    //   return Result.Err('Password must contain at least one number');
    // }
    
    return Result.Ok(password);
  }
  
  getBusinessRule(): string {
    return 'Password must be at least 8 characters for security';
  }
}
