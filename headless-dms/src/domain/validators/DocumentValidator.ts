import { Result } from '@carbonteq/fp';

export interface DocumentValidationContext {
  existingDocuments?: { name: string; id: string }[];
  currentDocumentId?: string;
  operation?: 'create' | 'update' | 'upload';
  userRole?: 'user' | 'admin';
}

export interface Document {
  id: string;
  name: string;
  userId: string;
  filePath: string;
  mimeType: string;
  size: number;
  tags: string[];
  metadata: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
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

  // Invariant checking methods

  /**
   * Invariant: Document must have valid ID
   * Domain: Data integrity - ID must be non-empty string
   */
  static validateDocumentIdInvariant(document: Document): Result<Document, string> {
    if (!document.id || typeof document.id !== 'string' || document.id.trim() === '') {
      return Result.Err('Document must have a valid ID');
    }
    
    return Result.Ok(document);
  }

  /**
   * Invariant: Document must have valid name
   * Domain: Data integrity - name must be non-empty string
   */
  static validateDocumentNameInvariant(document: Document): Result<Document, string> {
    if (!document.name || typeof document.name !== 'string' || document.name.trim() === '') {
      return Result.Err('Document must have a valid name');
    }
    
    return Result.Ok(document);
  }

  /**
   * Invariant: Document must have valid user ID
   * Domain: Data integrity - user ID must be non-empty string
   */
  static validateDocumentUserIdInvariant(document: Document): Result<Document, string> {
    if (!document.userId || typeof document.userId !== 'string' || document.userId.trim() === '') {
      return Result.Err('Document must have a valid user ID');
    }
    
    return Result.Ok(document);
  }

  /**
   * Invariant: Document must have valid file path
   * Domain: Data integrity - file path must be non-empty string
   */
  static validateDocumentFilePathInvariant(document: Document): Result<Document, string> {
    if (!document.filePath || typeof document.filePath !== 'string' || document.filePath.trim() === '') {
      return Result.Err('Document must have a valid file path');
    }
    
    return Result.Ok(document);
  }

  /**
   * Invariant: Document must have valid MIME type
   * Domain: Data integrity - MIME type must be non-empty string
   */
  static validateDocumentMimeTypeInvariant(document: Document): Result<Document, string> {
    if (!document.mimeType || typeof document.mimeType !== 'string' || document.mimeType.trim() === '') {
      return Result.Err('Document must have a valid MIME type');
    }
    
    return Result.Ok(document);
  }

  /**
   * Invariant: Document must have valid file size
   * Domain: Data integrity - file size must be positive number
   */
  static validateDocumentSizeInvariant(document: Document): Result<Document, string> {
    if (typeof document.size !== 'number' || document.size <= 0) {
      return Result.Err('Document must have a valid positive file size');
    }
    
    return Result.Ok(document);
  }

  /**
   * Invariant: Document must have valid tags array
   * Domain: Data integrity - tags must be array of strings
   */
  static validateDocumentTagsInvariant(document: Document): Result<Document, string> {
    if (!Array.isArray(document.tags)) {
      return Result.Err('Document tags must be an array');
    }
    
    for (const tag of document.tags) {
      if (typeof tag !== 'string') {
        return Result.Err('Document tags must be strings');
      }
    }
    
    return Result.Ok(document);
  }

  /**
   * Invariant: Document must have valid metadata object
   * Domain: Data integrity - metadata must be object with string values
   */
  static validateDocumentMetadataInvariant(document: Document): Result<Document, string> {
    if (typeof document.metadata !== 'object' || document.metadata === null) {
      return Result.Err('Document metadata must be an object');
    }
    
    for (const [key, value] of Object.entries(document.metadata)) {
      if (typeof key !== 'string' || typeof value !== 'string') {
        return Result.Err('Document metadata must have string keys and values');
      }
    }
    
    return Result.Ok(document);
  }

  /**
   * Invariant: Document must have valid timestamps
   * Domain: Data integrity - timestamps must be valid dates
   */
  static validateDocumentTimestampsInvariant(document: Document): Result<Document, string> {
    if (!(document.createdAt instanceof Date) || isNaN(document.createdAt.getTime())) {
      return Result.Err('Document must have a valid creation timestamp');
    }
    
    if (!(document.updatedAt instanceof Date) || isNaN(document.updatedAt.getTime())) {
      return Result.Err('Document must have a valid update timestamp');
    }
    
    if (document.updatedAt < document.createdAt) {
      return Result.Err('Document update timestamp cannot be before creation timestamp');
    }
    
    return Result.Ok(document);
  }

  /**
   * Comprehensive document invariant checking
   * Domain: Data integrity - all document invariants must be satisfied
   */
  static validateDocumentInvariants(document: Document): Result<Document, string> {
    // Check all invariants in sequence
    const idResult = this.validateDocumentIdInvariant(document);
    if (idResult.isErr()) return idResult;
    
    const nameResult = this.validateDocumentNameInvariant(document);
    if (nameResult.isErr()) return nameResult;
    
    const userIdResult = this.validateDocumentUserIdInvariant(document);
    if (userIdResult.isErr()) return userIdResult;
    
    const filePathResult = this.validateDocumentFilePathInvariant(document);
    if (filePathResult.isErr()) return filePathResult;
    
    const mimeTypeResult = this.validateDocumentMimeTypeInvariant(document);
    if (mimeTypeResult.isErr()) return mimeTypeResult;
    
    const sizeResult = this.validateDocumentSizeInvariant(document);
    if (sizeResult.isErr()) return sizeResult;
    
    const tagsResult = this.validateDocumentTagsInvariant(document);
    if (tagsResult.isErr()) return tagsResult;
    
    const metadataResult = this.validateDocumentMetadataInvariant(document);
    if (metadataResult.isErr()) return metadataResult;
    
    const timestampsResult = this.validateDocumentTimestampsInvariant(document);
    if (timestampsResult.isErr()) return timestampsResult;
    
    return Result.Ok(document);
  }

  /**
   * Business Rule: Document cannot be accessed if file doesn't exist
   * Domain: Data integrity - ensure file exists before access
   */
  static validateDocumentFileExistsInvariant(
    document: Document,
    fileExists: boolean
  ): Result<boolean, string> {
    if (!fileExists) {
      return Result.Err('Document file no longer exists on disk');
    }
    
    return Result.Ok(true);
  }

  /**
   * Business Rule: Document cannot be modified if it's being accessed
   * Domain: Concurrency control - prevent modification during access
   */
  static validateDocumentAccessInvariant(
    document: Document,
    isBeingAccessed: boolean
  ): Result<boolean, string> {
    if (isBeingAccessed) {
      return Result.Err('Document is currently being accessed and cannot be modified');
    }
    
    return Result.Ok(true);
  }
}
