import { Result } from '@carbonteq/fp';
import { IValidator } from './IValidator.js';

export class EmailValidator implements IValidator<string> {
  /**
   * Technical validation: Email format must be valid
   * This is a technical constraint, not a business rule
   */
  validate(email: string): Result<string, string> {
    if (!email) {
      return Result.Err('Email is required');
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Result.Err('Email must be in valid format (user@domain.com)');
    }
    
    return Result.Ok(email.toLowerCase().trim());
  }
  
  getBusinessRule(): string {
    return 'Email must be in valid format (user@domain.com)';
  }
}
