import { Result } from '@carbonteq/fp';
import type { IValidator } from './IValidator.js';

export class JsonValidator implements IValidator<string> {
  /**
   * Technical validation: JSON string must be valid
   * This is a technical constraint, not a business rule
   */
  validate(jsonString: string): Result<string, string> {
    if (!jsonString) {
      return Result.Err('JSON string is required');
    }
    
    try {
      JSON.parse(jsonString);
      return Result.Ok(jsonString);
    } catch (error) {
      return Result.Err('Invalid JSON format');
    }
  }
  
  getBusinessRule(): string {
    return 'JSON must be in valid format';
  }
}

export class JsonArrayValidator implements IValidator<string> {
  /**
   * Technical validation: JSON string must be a valid array
   * This is a technical constraint, not a business rule
   */
  validate(jsonString: string): Result<string, string> {
    if (!jsonString) {
      return Result.Err('JSON string is required');
    }
    
    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) {
        return Result.Err('JSON must be a valid array');
      }
      return Result.Ok(jsonString);
    } catch (error) {
      return Result.Err('Invalid JSON array format');
    }
  }
  
  getBusinessRule(): string {
    return 'JSON must be a valid array format';
  }
}

export class JsonObjectValidator implements IValidator<string> {
  /**
   * Technical validation: JSON string must be a valid object
   * This is a technical constraint, not a business rule
   */
  validate(jsonString: string): Result<string, string> {
    if (!jsonString) {
      return Result.Err('JSON string is required');
    }
    
    try {
      const parsed = JSON.parse(jsonString);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return Result.Err('JSON must be a valid object');
      }
      return Result.Ok(jsonString);
    } catch (error) {
      return Result.Err('Invalid JSON object format');
    }
  }
  
  getBusinessRule(): string {
    return 'JSON must be a valid object format';
  }
}
