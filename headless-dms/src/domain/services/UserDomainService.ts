import { injectable } from 'tsyringe';
import { User } from '../entities/User.js';
import { Document } from '../entities/Document.js';
import { Result } from '@carbonteq/fp';

export interface UserActivityScore {
  score: number;
  factors: {
    documentCount: number;
    lastActivity: Date;
    roleWeight: number;
  };
}

export interface UserPermission {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canShare: boolean;
  reason?: string;
}

export interface UserStateValidation {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
}

@injectable()
export class UserDomainService {
  /**
   * Calculate user activity score based on their actions and role
   */
  calculateUserActivityScore(user: User): UserActivityScore {
    const roleWeight = user.role.value === 'admin' ? 2.0 : 1.0;
    const daysSinceCreation = Math.floor(
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Simple scoring algorithm - can be enhanced
    const baseScore = 100;
    const activityScore = baseScore * roleWeight;
    
    return {
      score: Math.round(activityScore),
      factors: {
        documentCount: 0, // Would be calculated from repository
        lastActivity: user.updatedAt,
        roleWeight,
      },
    };
  }

  /**
   * Determine if a user can access a specific document
   */
  canUserAccessDocument(user: User, document: Document): boolean {
    // Admins can access all documents
    if (user.role.value === 'admin') {
      return true;
    }

    // Users can access documents they own (assuming ownership is tracked)
    // For now, we'll use a simple rule - users can access documents
    // This would be enhanced with actual ownership tracking
    return true;
  }

  /**
   * Get detailed permissions for a user on a specific document
   */
  getUserDocumentPermissions(user: User, document: Document): UserPermission {
    const isAdmin = user.role.value === 'admin';
    const isOwner = this.canUserAccessDocument(user, document);

    return {
      canRead: isAdmin || isOwner,
      canWrite: isAdmin || isOwner,
      canDelete: isAdmin, // Only admins can delete documents
      canShare: isAdmin || isOwner,
      reason: isAdmin ? 'Admin privileges' : isOwner ? 'Document owner' : 'Insufficient permissions',
    };
  }

  /**
   * Validate if a user can perform a specific action
   */
  canUserPerformAction(
    user: User, 
    action: 'create' | 'read' | 'update' | 'delete' | 'share',
    resource: 'document' | 'user' | 'system'
  ): boolean {
    // Admin can do everything
    if (user.role.value === 'admin') {
      return true;
    }

    // User permissions
    switch (action) {
      case 'create':
        return resource === 'document'; // Users can create documents
      case 'read':
        return resource === 'document'; // Users can read documents
      case 'update':
        return resource === 'document'; // Users can update documents
      case 'delete':
        return false; // Only admins can delete
      case 'share':
        return resource === 'document'; // Users can share documents
      default:
        return false;
    }
  }

  /**
   * Validate user state and provide recommendations
   */
  validateUserState(user: User): UserStateValidation {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check if user is recently created
    const daysSinceCreation = Math.floor(
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceCreation < 1) {
      issues.push('New user account');
      recommendations.push('Complete profile setup');
    }

    // Check if user has been inactive
    const daysSinceUpdate = Math.floor(
      (Date.now() - user.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceUpdate > 30) {
      issues.push('User account inactive');
      recommendations.push('Consider account reactivation');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Calculate user engagement level
   */
  calculateUserEngagement(user: User): 'high' | 'medium' | 'low' {
    const activityScore = this.calculateUserActivityScore(user);
    
    if (activityScore.score >= 150) {
      return 'high';
    } else if (activityScore.score >= 100) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Determine if user can change their role
   */
  canUserChangeRole(currentUser: User, targetUser: User, newRole: string): boolean {
    // Only admins can change roles
    if (currentUser.role.value !== 'admin') {
      return false;
    }

    // Admins cannot change their own role (safety rule)
    if (currentUser.id === targetUser.id) {
      return false;
    }

    // Validate new role
    return newRole === 'user' || newRole === 'admin';
  }

  /**
   * Validate user permissions for system-wide actions
   */
  canUserPerformSystemAction(user: User, action: string): boolean {
    // Only admins can perform system actions
    return user.role.value === 'admin';
  }
} 