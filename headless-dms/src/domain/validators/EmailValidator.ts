import { AppResult } from '@carbonteq/hexapp';

export class EmailValidator {
  /**
   * Validates email format using a comprehensive regex pattern
   * Domain: Data integrity - email must be properly formatted
   */
  validate(email: string): AppResult<string> {
    if (!email) {
      return AppResult.Err(new Error('Email is required'));
    }

    if (typeof email !== 'string') {
      return AppResult.Err(new Error('Email must be a string'));
    }

    // Trim whitespace
    const trimmedEmail = email.trim();
    
    if (trimmedEmail.length === 0) {
      return AppResult.Err(new Error('Email cannot be empty'));
    }

    // Basic email format validation using regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(trimmedEmail)) {
      return AppResult.Err(new Error('Email format is invalid'));
    }

    // Additional checks for common email issues
    if (trimmedEmail.length > 254) {
      return AppResult.Err(new Error('Email is too long (maximum 254 characters)'));
    }

    if (trimmedEmail.includes('..')) {
      return AppResult.Err(new Error('Email cannot contain consecutive dots'));
    }

    if (trimmedEmail.startsWith('.') || trimmedEmail.endsWith('.')) {
      return AppResult.Err(new Error('Email cannot start or end with a dot'));
    }

    return AppResult.Ok(trimmedEmail.toLowerCase());
  }

  /**
   * Validates email format and checks for common disposable email domains
   * Domain: Business rule - prevent use of disposable email services
   */
  validateWithDisposableCheck(email: string): AppResult<string> {
    const basicValidation = this.validate(email);
    if (basicValidation.isErr()) {
      return basicValidation;
    }

    const validEmail = basicValidation.unwrap();
    const domain = validEmail.split('@')[1];

    // List of common disposable email domains
    const disposableDomains = [
      '10minutemail.com',
      'guerrillamail.com',
      'tempmail.org',
      'mailinator.com',
      'yopmail.com',
      'throwaway.email',
      'temp-mail.org',
      'fakeinbox.com',
      'sharklasers.com',
      'getairmail.com'
    ];

    if (disposableDomains.includes(domain.toLowerCase())) {
      return AppResult.Err(new Error('Disposable email addresses are not allowed'));
    }

    return AppResult.Ok(validEmail);
  }
} 