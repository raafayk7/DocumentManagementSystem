import { injectable } from 'tsyringe';
import { Document } from '../entities/Document.js';
import { User } from '../entities/User.js';
import { Result } from '@carbonteq/fp';

export interface DocumentImportanceScore {
  score: number;
  factors: {
    sizeWeight: number;
    tagWeight: number;
    metadataWeight: number;
    ageWeight: number;
  };
}

export interface DocumentAccessValidation {
  canAccess: boolean;
  reason: string;
  permissions: {
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
    canShare: boolean;
  };
}

export interface DocumentMetadataValidation {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
}

export interface DocumentRetentionPolicy {
  shouldRetain: boolean;
  retentionReason: string;
  retentionPeriod: number; // days
}

@injectable()
export class DocumentDomainService {
  /**
   * Calculate document importance score based on various factors
   */
  calculateDocumentImportance(document: Document): DocumentImportanceScore {
    const sizeInMB = parseInt(document.size.bytes.toString()) / (1024 * 1024);
    const sizeWeight = Math.min(sizeInMB / 10, 1.0); // Normalize to 0-1
    
    const tagWeight = document.tags.length / 10; // Normalize to 0-1
    const metadataWeight = Object.keys(document.metadata).length / 5; // Normalize to 0-1
    
    const daysSinceCreation = Math.floor(
      (Date.now() - document.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const ageWeight = Math.max(0, 1 - (daysSinceCreation / 365)); // Newer documents get higher weight
    
    const totalScore = (sizeWeight + tagWeight + metadataWeight + ageWeight) * 25; // Scale to 0-100
    
    return {
      score: Math.round(totalScore),
      factors: {
        sizeWeight,
        tagWeight,
        metadataWeight,
        ageWeight,
      },
    };
  }

  /**
   * Validate document access for a specific user
   */
  validateDocumentAccess(user: User, document: Document): DocumentAccessValidation {
    const isAdmin = user.role.value === 'admin';
    
    // For now, we'll use simple rules
    // In a real system, this would check ownership, sharing permissions, etc.
    const canAccess = isAdmin || true; // Users can access documents for now
    
    return {
      canAccess,
      reason: isAdmin ? 'Admin privileges' : 'User access granted',
      permissions: {
        canRead: canAccess,
        canWrite: canAccess,
        canDelete: isAdmin, // Only admins can delete
        canShare: canAccess,
      },
    };
  }

  /**
   * Validate document metadata for business rules
   */
  validateDocumentMetadata(document: Document): DocumentMetadataValidation {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check metadata size
    const metadataSize = JSON.stringify(document.metadata).length;
    if (metadataSize > 1000) {
      issues.push('Metadata too large');
      recommendations.push('Consider reducing metadata size');
    }

    // Check for required metadata fields
    const requiredFields = ['author', 'category'];
    const missingFields = requiredFields.filter(field => !document.metadata[field]);
    
    if (missingFields.length > 0) {
      issues.push(`Missing required metadata: ${missingFields.join(', ')}`);
      recommendations.push('Add missing metadata fields');
    }

    // Check metadata key naming conventions
    const invalidKeys = Object.keys(document.metadata).filter(key => 
      key.includes(' ') || key.length > 50
    );
    
    if (invalidKeys.length > 0) {
      issues.push(`Invalid metadata keys: ${invalidKeys.join(', ')}`);
      recommendations.push('Use valid key names (no spaces, max 50 chars)');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Determine document retention policy
   */
  calculateRetentionPolicy(document: Document): DocumentRetentionPolicy {
    const importanceScore = this.calculateDocumentImportance(document);
    const daysSinceCreation = Math.floor(
      (Date.now() - document.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Simple retention logic
    const shouldRetain = importanceScore.score > 50 || daysSinceCreation < 30;
    const retentionPeriod = shouldRetain ? 365 : 30; // 1 year or 30 days

    return {
      shouldRetain,
      retentionReason: shouldRetain ? 'High importance or recent document' : 'Low importance document',
      retentionPeriod,
    };
  }

  /**
   * Calculate document storage cost (theoretical)
   */
  calculateStorageCost(document: Document): number {
    const sizeInMB = parseInt(document.size.bytes.toString()) / (1024 * 1024);
    const costPerMB = 0.01; // $0.01 per MB
    return sizeInMB * costPerMB;
  }

  /**
   * Determine if document should be compressed
   */
  shouldCompressDocument(document: Document): boolean {
    const sizeInMB = parseInt(document.size.bytes.toString()) / (1024 * 1024);
    const importanceScore = this.calculateDocumentImportance(document);
    
    // Compress if large and not very important
    return sizeInMB > 10 && importanceScore.score < 70;
  }

  /**
   * Validate document naming conventions
   */
  validateDocumentName(document: Document): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for special characters
    if (/[<>:"/\\|?*]/.test(document.name.value)) {
      issues.push('Document name contains invalid characters');
    }

    // Check length
    if (document.name.value.length > 255) {
      issues.push('Document name too long (max 255 characters)');
    }

    // Check for reserved names
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'LPT1', 'LPT2'];
    if (reservedNames.includes(document.name.value.toUpperCase())) {
      issues.push('Document name is reserved');
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * Calculate document security level
   */
  calculateSecurityLevel(document: Document): 'low' | 'medium' | 'high' {
    const importanceScore = this.calculateDocumentImportance(document);
    const sizeInMB = parseInt(document.size.bytes.toString()) / (1024 * 1024);
    
    if (importanceScore.score > 80 || sizeInMB > 100) {
      return 'high';
    } else if (importanceScore.score > 50 || sizeInMB > 10) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Determine if document should be backed up
   */
  shouldBackupDocument(document: Document): boolean {
    const importanceScore = this.calculateDocumentImportance(document);
    const securityLevel = this.calculateSecurityLevel(document);
    
    return importanceScore.score > 60 || securityLevel === 'high';
  }
} 