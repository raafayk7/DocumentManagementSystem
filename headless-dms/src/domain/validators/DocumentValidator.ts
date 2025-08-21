import { AppResult } from '@carbonteq/hexapp';

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
  ): AppResult<string> {
    const normalizedName = name.trim();
    const existingDoc = existingDocuments.find(doc => 
      doc.name.trim().toLowerCase() === normalizedName.toLowerCase() &&
      doc.id !== currentDocumentId
    );
    
    if (existingDoc) {
      return AppResult.Err(new Error('Document name already exists in the system'));
    }
    
    return AppResult.Ok(normalizedName);
  }

  /**
   * Business Rule: Document name must be meaningful
   * Domain: Organization policy - documents must have descriptive names
   */
  static validateName(name: string): AppResult<string> {
    if (!name || name.trim().length === 0) {
      return AppResult.Err(new Error('Document name is required'));
    }
    
    if (name.trim().length < 2) {
      return AppResult.Err(new Error('Document name must be at least 2 characters'));
    }
    
    if (name.length > 255) {
      return AppResult.Err(new Error('Document name cannot exceed 255 characters'));
    }
    
    return AppResult.Ok(name.trim());
  }

  /**
   * Business Rule: File size must be within acceptable limits
   * Domain: Storage policy - maximum file size constraints
   */
  static validateFileSize(size: string, maxSizeMB: number = 10): AppResult<string> {
    const sizeNum = parseInt(size);
    
    if (isNaN(sizeNum) || sizeNum <= 0) {
      return AppResult.Err(new Error('File size must be a positive number'));
    }
    
    const sizeMB = sizeNum / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      return AppResult.Err(new Error(`File size cannot exceed ${maxSizeMB}MB`));
    }
    
    return AppResult.Ok(size);
  }

  /**
   * Business Rule: Only certain file types are allowed
   * Domain: Security policy - restrict file types for security
   */
  static validateFileType(mimeType: string): AppResult<string> {
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
      return AppResult.Err(new Error(`File type ${mimeType} is not allowed for security reasons`));
    }
    
    return AppResult.Ok(mimeType);
  }

  /**
   * Business Rule: Maximum number of tags per document
   * Domain: Organization policy - limit tags for organization
   */
  static validateTagCount(tags: string[], maxTags: number = 10): AppResult<string[]> {
    if (tags.length > maxTags) {
      return AppResult.Err(new Error(`Maximum ${maxTags} tags allowed per document`));
    }
    
    return AppResult.Ok(tags);
  }

  /**
   * Business Rule: Tags must follow naming conventions
   * Domain: Organization policy - consistent tag naming
   */
  static validateTagFormat(tags: string[]): AppResult<string[]> {
    const tagRegex = /^[a-zA-Z0-9_-]+$/;
    
    for (const tag of tags) {
      if (!tagRegex.test(tag)) {
        return AppResult.Err(new Error(`Tag "${tag}" must contain only letters, numbers, hyphens, and underscores`));
      }
      
      if (tag.length < 1 || tag.length > 50) {
        return AppResult.Err(new Error(`Tag "${tag}" must be between 1 and 50 characters`));
      }
    }
    
    return AppResult.Ok(tags);
  }

  /**
   * Business Rule: Metadata size limits
   * Domain: Storage policy - limit metadata size
   */
  static validateMetadataSize(metadata: Record<string, string>, maxKeys: number = 20): AppResult<Record<string, string>> {
    if (Object.keys(metadata).length > maxKeys) {
      return AppResult.Err(new Error(`Maximum ${maxKeys} metadata keys allowed per document`));
    }
    
    // Check individual key/value sizes
    for (const [key, value] of Object.entries(metadata)) {
      if (key.length > 50) {
        return AppResult.Err(new Error(`Metadata key "${key}" cannot exceed 50 characters`));
      }
      
      if (value.length > 500) {
        return AppResult.Err(new Error(`Metadata value for "${key}" cannot exceed 500 characters`));
      }
    }
    
    return AppResult.Ok(metadata);
  }

  /**
   * Business Rule: Only admins can upload documents
   * Domain: Security policy - restrict upload permissions
   */
  static validateUploadPermission(userRole: 'user' | 'admin'): AppResult<boolean> {
    if (userRole !== 'admin') {
      return AppResult.Err(new Error('Only administrators can upload documents'));
    }
    
    return AppResult.Ok(true);
  }

  /**
   * Business Rule: Document must have valid file path
   * Domain: File system policy - ensure file exists and is accessible
   */
  static validateFilePath(filePath: string): AppResult<string> {
    if (!filePath || filePath.trim().length === 0) {
      return AppResult.Err(new Error('File path is required'));
    }
    
    // Basic path validation (can be enhanced with file system checks)
    if (filePath.includes('..') || filePath.includes('//')) {
      return AppResult.Err(new Error('Invalid file path format'));
    }
    
    return AppResult.Ok(filePath.trim());
  }

  // Invariant checking methods

  /**
   * Invariant: Document must have valid ID
   * Domain: Data integrity - ID must be non-empty string
   */
  static validateDocumentIdInvariant(document: Document): AppResult<Document> {
    if (!document.id || typeof document.id !== 'string' || document.id.trim() === '') {
      return AppResult.Err(new Error('Document must have a valid ID'));
    }
    
    return AppResult.Ok(document);
  }

  /**
   * Invariant: Document must have valid name
   * Domain: Data integrity - name must be non-empty string
   */
  static validateDocumentNameInvariant(document: Document): AppResult<Document> {
    if (!document.name || typeof document.name !== 'string' || document.name.trim() === '') {
      return AppResult.Err(new Error('Document must have a valid name'));
    }
    
    return AppResult.Ok(document);
  }

  /**
   * Invariant: Document must have valid user ID
   * Domain: Data integrity - user ID must be non-empty string
   */
  static validateDocumentUserIdInvariant(document: Document): AppResult<Document> {
    if (!document.userId || typeof document.userId !== 'string' || document.userId.trim() === '') {
      return AppResult.Err(new Error('Document must have a valid user ID'));
    }
    
    return AppResult.Ok(document);
  }

  /**
   * Invariant: Document must have valid file path
   * Domain: Data integrity - file path must be non-empty string
   */
  static validateDocumentFilePathInvariant(document: Document): AppResult<Document> {
    if (!document.filePath || typeof document.filePath !== 'string' || document.filePath.trim() === '') {
      return AppResult.Err(new Error('Document must have a valid file path'));
    }
    
    return AppResult.Ok(document);
  }

  /**
   * Invariant: Document must have valid MIME type
   * Domain: Data integrity - MIME type must be non-empty string
   */
  static validateDocumentMimeTypeInvariant(document: Document): AppResult<Document> {
    if (!document.mimeType || typeof document.mimeType !== 'string' || document.mimeType.trim() === '') {
      return AppResult.Err(new Error('Document must have a valid MIME type'));
    }
    
    return AppResult.Ok(document);
  }

  /**
   * Invariant: Document must have valid file size
   * Domain: Data integrity - file size must be positive number
   */
  static validateDocumentSizeInvariant(document: Document): AppResult<Document> {
    if (typeof document.size !== 'number' || document.size <= 0) {
      return AppResult.Err(new Error('Document must have a valid positive file size'));
    }
    
    return AppResult.Ok(document);
  }

  /**
   * Invariant: Document must have valid tags array
   * Domain: Data integrity - tags must be array of strings
   */
  static validateDocumentTagsInvariant(document: Document): AppResult<Document> {
    if (!Array.isArray(document.tags)) {
      return AppResult.Err(new Error('Document tags must be an array'));
    }
    
    for (const tag of document.tags) {
      if (typeof tag !== 'string') {
        return AppResult.Err(new Error('Document tags must be strings'));
      }
    }
    
    return AppResult.Ok(document);
  }

  /**
   * Invariant: Document must have valid metadata object
   * Domain: Data integrity - metadata must be object with string values
   */
  static validateDocumentMetadataInvariant(document: Document): AppResult<Document> {
    if (typeof document.metadata !== 'object' || document.metadata === null) {
      return AppResult.Err(new Error('Document metadata must be an object'));
    }
    
    for (const [key, value] of Object.entries(document.metadata)) {
      if (typeof key !== 'string' || typeof value !== 'string') {
        return AppResult.Err(new Error('Document metadata must have string keys and values'));
      }
    }
    
    return AppResult.Ok(document);
  }

  /**
   * Invariant: Document must have valid timestamps
   * Domain: Data integrity - timestamps must be valid dates
   */
  static validateDocumentTimestampsInvariant(document: Document): AppResult<Document> {
    if (!(document.createdAt instanceof Date) || isNaN(document.createdAt.getTime())) {
      return AppResult.Err(new Error('Document must have a valid creation timestamp'));
    }
    
    if (!(document.updatedAt instanceof Date) || isNaN(document.updatedAt.getTime())) {
      return AppResult.Err(new Error('Document must have a valid update timestamp'));
    }
    
    if (document.updatedAt < document.createdAt) {
      return AppResult.Err(new Error('Document update timestamp cannot be before creation timestamp'));
    }
    
    return AppResult.Ok(document);
  }

  /**
   * Comprehensive document invariant checking
   * Domain: Data integrity - all document invariants must be satisfied
   */
  static validateDocumentInvariants(document: Document): AppResult<Document> {
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
    
    return AppResult.Ok(document);
  }

  /**
   * Business Rule: Document cannot be accessed if file doesn't exist
   * Domain: Data integrity - ensure file exists before access
   */
  static validateDocumentFileExistsInvariant(
    document: Document,
    fileExists: boolean
  ): AppResult<boolean> {
    if (!fileExists) {
      return AppResult.Err(new Error('Document file no longer exists on disk'));
    }
    
    return AppResult.Ok(true);
  }

  /**
   * Business Rule: Document cannot be modified if it's being accessed
   * Domain: Concurrency control - prevent modification during access
   */
  static validateDocumentAccessInvariant(
    document: Document,
    isBeingAccessed: boolean
  ): AppResult<boolean> {
         if (isBeingAccessed) {
       return AppResult.Err(new Error('Document is currently being accessed and cannot be modified'));
     }
     
     return AppResult.Ok(true);
  }
}
