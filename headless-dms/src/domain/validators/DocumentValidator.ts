import { Result } from '@carbonteq/fp';

export interface DocumentValidationContext {
  existingDocuments?: { name: string; id: string }[];
  currentDocumentId?: string;
  operation?: 'create' | 'update' | 'upload';
  userRole?: 'user' | 'admin';
}

export class DocumentValidator {
  // Domain-specific business rules

  /**
   * Business Rule: Document name must be unique in the system
   * Domain: Business constraint - no duplicate document names allowed
   */
  static validateNameUniqueness(
    name: string, 
    existingDocuments: { name: string; id: string }[],
    currentDocumentId?: string
  ): Result<string, string> {
    const normalizedName = name.trim();
    const existingDoc = existingDocuments.find(doc => 
      doc.name.trim().toLowerCase() === normalizedName.toLowerCase() &&
      doc.id !== currentDocumentId
    );
    
    if (existingDoc) {
      return Result.Err('Document name already exists in the system');
    }
    
    return Result.Ok(normalizedName);
  }

  /**
   * Business Rule: Document name must be meaningful
   * Domain: Organization policy - documents must have descriptive names
   */
  static validateName(name: string): Result<string, string> {
    if (!name || name.trim().length === 0) {
      return Result.Err('Document name is required');
    }
    
    if (name.trim().length < 2) {
      return Result.Err('Document name must be at least 2 characters');
    }
    
    if (name.length > 255) {
      return Result.Err('Document name cannot exceed 255 characters');
    }
    
    return Result.Ok(name.trim());
  }

  /**
   * Business Rule: File size must be within acceptable limits
   * Domain: Storage policy - maximum file size constraints
   */
  static validateFileSize(size: string, maxSizeMB: number = 10): Result<string, string> {
    const sizeNum = parseInt(size);
    
    if (isNaN(sizeNum) || sizeNum <= 0) {
      return Result.Err('File size must be a positive number');
    }
    
    const sizeMB = sizeNum / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      return Result.Err(`File size cannot exceed ${maxSizeMB}MB`);
    }
    
    return Result.Ok(size);
  }

  /**
   * Business Rule: Only certain file types are allowed
   * Domain: Security policy - restrict file types for security
   */
  static validateFileType(mimeType: string): Result<string, string> {
    const allowedTypes = [
      'text/plain',
      'text/html',
      'text/css',
      'text/javascript',
      'application/json',
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    
    if (!allowedTypes.includes(mimeType)) {
      return Result.Err(`File type ${mimeType} is not allowed for security reasons`);
    }
    
    return Result.Ok(mimeType);
  }

  /**
   * Business Rule: Maximum number of tags per document
   * Domain: Organization policy - limit tags for organization
   */
  static validateTagCount(tags: string[], maxTags: number = 10): Result<string[], string> {
    if (tags.length > maxTags) {
      return Result.Err(`Maximum ${maxTags} tags allowed per document`);
    }
    
    return Result.Ok(tags);
  }

  /**
   * Business Rule: Tags must follow naming conventions
   * Domain: Organization policy - consistent tag naming
   */
  static validateTagFormat(tags: string[]): Result<string[], string> {
    const tagRegex = /^[a-zA-Z0-9_-]+$/;
    
    for (const tag of tags) {
      if (!tagRegex.test(tag)) {
        return Result.Err(`Tag "${tag}" must contain only letters, numbers, hyphens, and underscores`);
      }
      
      if (tag.length < 1 || tag.length > 50) {
        return Result.Err(`Tag "${tag}" must be between 1 and 50 characters`);
      }
    }
    
    return Result.Ok(tags);
  }

  /**
   * Business Rule: Metadata size limits
   * Domain: Storage policy - limit metadata size
   */
  static validateMetadataSize(metadata: Record<string, string>, maxKeys: number = 20): Result<Record<string, string>, string> {
    if (Object.keys(metadata).length > maxKeys) {
      return Result.Err(`Maximum ${maxKeys} metadata keys allowed per document`);
    }
    
    // Check individual key/value sizes
    for (const [key, value] of Object.entries(metadata)) {
      if (key.length > 50) {
        return Result.Err(`Metadata key "${key}" cannot exceed 50 characters`);
      }
      
      if (value.length > 500) {
        return Result.Err(`Metadata value for "${key}" cannot exceed 500 characters`);
      }
    }
    
    return Result.Ok(metadata);
  }

  /**
   * Business Rule: Only admins can upload documents
   * Domain: Security policy - restrict upload permissions
   */
  static validateUploadPermission(userRole: 'user' | 'admin'): Result<boolean, string> {
    if (userRole !== 'admin') {
      return Result.Err('Only administrators can upload documents');
    }
    
    return Result.Ok(true);
  }

  /**
   * Business Rule: Document must have valid file path
   * Domain: File system policy - ensure file exists and is accessible
   */
  static validateFilePath(filePath: string): Result<string, string> {
    if (!filePath || filePath.trim().length === 0) {
      return Result.Err('File path is required');
    }
    
    // Basic path validation (can be enhanced with file system checks)
    if (filePath.includes('..') || filePath.includes('//')) {
      return Result.Err('Invalid file path format');
    }
    
    return Result.Ok(filePath.trim());
  }
}
