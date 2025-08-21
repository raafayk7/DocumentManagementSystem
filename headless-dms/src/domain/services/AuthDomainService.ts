import { injectable } from 'tsyringe';
import { User } from '../entities/User.js';
import { AppResult } from '@carbonteq/hexapp';

export interface SecurityValidation {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface TokenValidation {
  isValid: boolean;
  reason: string;
  expiresAt?: Date;
  issuedAt?: Date;
}

export interface PasswordStrength {
  score: number;
  level: 'weak' | 'medium' | 'strong' | 'very-strong';
  issues: string[];
  recommendations: string[];
}

export interface SessionValidation {
  isValid: boolean;
  reason: string;
  lastActivity?: Date;
  sessionAge?: number; // in minutes
}

@injectable()
export class AuthDomainService {
  /**
   * Validate password strength according to business rules
   */
  validatePasswordStrength(password: string): PasswordStrength {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 0;

    // Length check
    if (password.length < 8) {
      issues.push('Password too short (minimum 8 characters)');
      recommendations.push('Increase password length');
    } else {
      score += 20;
    }

    // Uppercase check
    if (!/[A-Z]/.test(password)) {
      issues.push('Missing uppercase letters');
      recommendations.push('Add uppercase letters');
    } else {
      score += 20;
    }

    // Lowercase check
    if (!/[a-z]/.test(password)) {
      issues.push('Missing lowercase letters');
      recommendations.push('Add lowercase letters');
    } else {
      score += 20;
    }

    // Numbers check
    if (!/\d/.test(password)) {
      issues.push('Missing numbers');
      recommendations.push('Add numbers');
    } else {
      score += 20;
    }

    // Special characters check
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      issues.push('Missing special characters');
      recommendations.push('Add special characters');
    } else {
      score += 20;
    }

    // Determine level
    let level: 'weak' | 'medium' | 'strong' | 'very-strong';
    if (score < 40) {
      level = 'weak';
    } else if (score < 60) {
      level = 'medium';
    } else if (score < 80) {
      level = 'strong';
    } else {
      level = 'very-strong';
    }

    return {
      score,
      level,
      issues,
      recommendations,
    };
  }

  /**
   * Validate user security posture
   */
  validateUserSecurity(user: User): SecurityValidation {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    // Check account age
    const daysSinceCreation = Math.floor(
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceCreation < 1) {
      issues.push('New account - requires additional verification');
      recommendations.push('Complete account setup and verification');
      riskLevel = 'medium';
    }

    // Check last activity
    const daysSinceUpdate = Math.floor(
      (Date.now() - user.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceUpdate > 90) {
      issues.push('Account inactive for extended period');
      recommendations.push('Consider account reactivation or deletion');
      riskLevel = 'high';
    } else if (daysSinceUpdate > 30) {
      issues.push('Account inactive');
      recommendations.push('Consider account reactivation');
      riskLevel = 'medium';
    }

    // Role-based security checks
    if (user.role.value === 'admin') {
      issues.push('Admin account - requires enhanced security');
      recommendations.push('Enable two-factor authentication');
      recommendations.push('Regular security audits');
      riskLevel = 'high';
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations,
      riskLevel,
    };
  }

  /**
   * Validate authentication attempt patterns
   */
  validateAuthAttempt(
    email: string,
    attemptCount: number,
    lastAttemptTime?: Date
  ): { shouldAllow: boolean; reason: string; cooldownMinutes?: number } {
    // Simple rate limiting logic
    const maxAttempts = 5;
    const cooldownMinutes = 15;

    if (attemptCount >= maxAttempts) {
      if (lastAttemptTime) {
        const minutesSinceLastAttempt = Math.floor(
          (Date.now() - lastAttemptTime.getTime()) / (1000 * 60)
        );

        if (minutesSinceLastAttempt < cooldownMinutes) {
          return {
            shouldAllow: false,
            reason: 'Too many failed attempts',
            cooldownMinutes: cooldownMinutes - minutesSinceLastAttempt,
          };
        }
      }
    }

    return {
      shouldAllow: true,
      reason: 'Authentication attempt allowed',
    };
  }

  /**
   * Validate session security
   */
  validateSession(
    lastActivity: Date,
    sessionDuration: number = 30 // minutes
  ): SessionValidation {
    const minutesSinceActivity = Math.floor(
      (Date.now() - lastActivity.getTime()) / (1000 * 60)
    );

    const isValid = minutesSinceActivity < sessionDuration;

    return {
      isValid,
      reason: isValid ? 'Session active' : 'Session expired',
      lastActivity,
      sessionAge: minutesSinceActivity,
    };
  }

  /**
   * Calculate token expiration based on user role and security level
   */
  calculateTokenExpiration(user: User, securityLevel: 'low' | 'medium' | 'high'): number {
    // Base expiration in minutes
    let baseExpiration = 60; // 1 hour

    // Adjust based on role
    if (user.role.value === 'admin') {
      baseExpiration = 30; // Shorter for admins
    }

    // Adjust based on security level
    switch (securityLevel) {
      case 'high':
        baseExpiration = Math.floor(baseExpiration * 0.5); // 50% shorter
        break;
      case 'medium':
        baseExpiration = Math.floor(baseExpiration * 0.75); // 75% of base
        break;
      case 'low':
        baseExpiration = Math.floor(baseExpiration * 1.5); // 50% longer
        break;
    }

    return baseExpiration;
  }

  /**
   * Validate if user can perform sensitive operations
   */
  canPerformSensitiveOperation(
    user: User,
    operation: 'password_change' | 'role_change' | 'account_deletion' | 'system_config'
  ): boolean {
    // Admin can perform all operations
    if (user.role.value === 'admin') {
      return true;
    }

    // User permissions
    switch (operation) {
      case 'password_change':
        return true; // Users can change their own password
      case 'role_change':
        return false; // Only admins can change roles
      case 'account_deletion':
        return false; // Only admins can delete accounts
      case 'system_config':
        return false; // Only admins can configure system
      default:
        return false;
    }
  }

  /**
   * Calculate security risk score for a user
   */
  calculateSecurityRiskScore(user: User): number {
    let score = 0;

    // Account age factor
    const daysSinceCreation = Math.floor(
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceCreation < 1) score += 30; // New account
    else if (daysSinceCreation < 7) score += 20; // Recent account
    else if (daysSinceCreation > 365) score += 10; // Old account

    // Role factor
    if (user.role.value === 'admin') score += 50; // Admin accounts are high risk

    // Activity factor (would need repository to calculate)
    // For now, we'll use a simple heuristic
    const daysSinceUpdate = Math.floor(
      (Date.now() - user.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceUpdate > 30) score += 25; // Inactive account

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Determine if additional authentication is required
   */
  requiresAdditionalAuth(
    user: User,
    operation: 'login' | 'sensitive_operation' | 'admin_action'
  ): boolean {
    const riskScore = this.calculateSecurityRiskScore(user);

    switch (operation) {
      case 'login':
        return riskScore > 70;
      case 'sensitive_operation':
        return riskScore > 50;
      case 'admin_action':
        return true; // Always require additional auth for admin actions
      default:
        return false;
    }
  }
} 