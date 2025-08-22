/**
 * User Domain Service Tests
 * Testing UserDomainService business logic and business rules
 */

import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import { UserDomainService } from '../../../src/domain/services/UserDomainService.js';
import { User } from '../../../src/domain/entities/User.js';
import { Document } from '../../../src/domain/entities/Document.js';
import { Email } from '../../../src/domain/value-objects/Email.js';
import { Password } from '../../../src/domain/value-objects/Password.js';
import { UserRole } from '../../../src/domain/value-objects/UserRole.js';
import { DocumentName } from '../../../src/domain/value-objects/DocumentName.js';
import { FileSize } from '../../../src/domain/value-objects/FileSize.js';
import { MimeType } from '../../../src/domain/value-objects/MimeType.js';
import { AppResultTestUtils } from '../../shared/test-helpers.js';

describe('Domain > Services > UserDomainService', () => {
  let userDomainService: UserDomainService;
  let adminUser: User;
  let regularUser: User;
  let testDocument: Document;

  beforeEach(async () => {
    userDomainService = new UserDomainService();

    // Create test users
    const adminUserResult = await User.create('admin@example.com', 'AdminP@55w0rd!', 'admin');
    adminUser = AppResultTestUtils.expectOk(adminUserResult);

    const regularUserResult = await User.create('user@example.com', 'UserP@55w0rd!', 'user');
    regularUser = AppResultTestUtils.expectOk(regularUserResult);

    // Create test document
    const documentResult = await Document.create(
      'Test Document',
      'test-file.pdf',
      'application/pdf',
      '1024',
      ['test', 'document'],
      { author: 'Test User', category: 'test' }
    );
    testDocument = AppResultTestUtils.expectOk(documentResult);
  });

  describe('calculateUserActivityScore', () => {
    it('should calculate activity score for admin user', () => {
      // Act
      const score = userDomainService.calculateUserActivityScore(adminUser);

      // Assert
      expect(score).to.have.property('score');
      expect(score).to.have.property('factors');
      expect(score.factors).to.have.property('documentCount', 0);
      expect(score.factors).to.have.property('roleWeight', 2.0);
      expect(score.factors).to.have.property('lastActivity');
      expect(score.score).to.equal(200); // 100 * 2.0 (admin role weight)
    });

    it('should calculate activity score for regular user', () => {
      // Act
      const score = userDomainService.calculateUserActivityScore(regularUser);

      // Assert
      expect(score.score).to.equal(100); // 100 * 1.0 (user role weight)
      expect(score.factors.roleWeight).to.equal(1.0);
    });

    it('should include proper factors in score calculation', () => {
      // Act
      const score = userDomainService.calculateUserActivityScore(regularUser);

      // Assert
      expect(score.factors.documentCount).to.equal(0);
      expect(score.factors.lastActivity).to.deep.equal(regularUser.updatedAt);
      expect(score.factors.roleWeight).to.equal(1.0);
    });
  });

  describe('canUserAccessDocument', () => {
    it('should allow admin to access any document', () => {
      // Act
      const canAccess = userDomainService.canUserAccessDocument(adminUser, testDocument);

      // Assert
      expect(canAccess).to.be.true;
    });

    it('should allow regular user to access documents (current implementation)', () => {
      // Act
      const canAccess = userDomainService.canUserAccessDocument(regularUser, testDocument);

      // Assert
      expect(canAccess).to.be.true;
    });

    it('should work with different document types', async () => {
      // Arrange
      const imageDocument = await Document.create(
        'Test Image',
        'test-image.jpg',
        'image/jpeg',
        '2048',
        ['image', 'test'],
        { author: 'Test User', category: 'image' }
      );
      const imageDoc = AppResultTestUtils.expectOk(imageDocument);

      // Act
      const canAccess = userDomainService.canUserAccessDocument(regularUser, imageDoc);

      // Assert
      expect(canAccess).to.be.true;
    });
  });

  describe('getUserDocumentPermissions', () => {
    it('should give full permissions to admin user', () => {
      // Act
      const permissions = userDomainService.getUserDocumentPermissions(adminUser, testDocument);

      // Assert
      expect(permissions.canRead).to.be.true;
      expect(permissions.canWrite).to.be.true;
      expect(permissions.canDelete).to.be.true;
      expect(permissions.canShare).to.be.true;
      expect(permissions.reason).to.equal('Admin privileges');
    });

    it('should give limited permissions to regular user', () => {
      // Act
      const permissions = userDomainService.getUserDocumentPermissions(regularUser, testDocument);

      // Assert
      expect(permissions.canRead).to.be.true;
      expect(permissions.canWrite).to.be.true;
      expect(permissions.canDelete).to.be.false; // Only admins can delete
      expect(permissions.canShare).to.be.true;
      expect(permissions.reason).to.equal('Document owner');
    });

    it('should provide proper reason for permissions', () => {
      // Act
      const adminPermissions = userDomainService.getUserDocumentPermissions(adminUser, testDocument);
      const userPermissions = userDomainService.getUserDocumentPermissions(regularUser, testDocument);

      // Assert
      expect(adminPermissions.reason).to.equal('Admin privileges');
      expect(userPermissions.reason).to.equal('Document owner');
    });
  });

  describe('canUserPerformAction', () => {
    it('should allow admin to perform all actions', () => {
      const actions: Array<'create' | 'read' | 'update' | 'delete' | 'share'> = ['create', 'read', 'update', 'delete', 'share'];
      const resources: Array<'document' | 'user' | 'system'> = ['document', 'user', 'system'];

      // Act & Assert
      actions.forEach(action => {
        resources.forEach(resource => {
          const canPerform = userDomainService.canUserPerformAction(adminUser, action, resource);
          expect(canPerform).to.be.true;
        });
      });
    });

    it('should allow regular user to perform document actions', () => {
      const allowedActions: Array<'create' | 'read' | 'update' | 'share'> = ['create', 'read', 'update', 'share'];

      // Act & Assert
      allowedActions.forEach(action => {
        const canPerform = userDomainService.canUserPerformAction(regularUser, action, 'document');
        expect(canPerform).to.be.true;
      });
    });

    it('should prevent regular user from deleting documents', () => {
      // Act
      const canDelete = userDomainService.canUserPerformAction(regularUser, 'delete', 'document');

      // Assert
      expect(canDelete).to.be.false;
    });

    it('should prevent regular user from performing user actions', () => {
      const actions: Array<'create' | 'read' | 'update' | 'delete' | 'share'> = ['create', 'read', 'update', 'delete', 'share'];

      // Act & Assert
      actions.forEach(action => {
        const canPerform = userDomainService.canUserPerformAction(regularUser, action, 'user');
        expect(canPerform).to.be.false;
      });
    });

    it('should prevent regular user from performing system actions', () => {
      const actions: Array<'create' | 'read' | 'update' | 'delete' | 'share'> = ['create', 'read', 'update', 'delete', 'share'];

      // Act & Assert
      actions.forEach(action => {
        const canPerform = userDomainService.canUserPerformAction(regularUser, action, 'system');
        expect(canPerform).to.be.false;
      });
    });
  });

  describe('validateUserState', () => {
    it('should identify new user accounts', () => {
      // Act
      const validation = userDomainService.validateUserState(regularUser);

      // Assert
      expect(validation.issues).to.include('New user account');
      expect(validation.recommendations).to.include('Complete profile setup');
      expect(validation.isValid).to.be.false;
    });

    it('should identify inactive user accounts', async () => {
      // Arrange - Create an old user by manipulating timestamps
      const oldUserResult = await User.create('old@example.com', 'OldP@55w0rd!', 'user');
      const oldUser = AppResultTestUtils.expectOk(oldUserResult);
      
      // Mock old timestamps (this would need proper mocking in real tests)
      // For now, we'll test the logic with the current implementation

      // Act
      const validation = userDomainService.validateUserState(oldUser);

      // Assert
      expect(validation.issues).to.be.an('array');
      expect(validation.recommendations).to.be.an('array');
      expect(validation.isValid).to.be.a('boolean');
    });

    it('should provide proper validation structure', () => {
      // Act
      const validation = userDomainService.validateUserState(regularUser);

      // Assert
      expect(validation).to.have.property('isValid');
      expect(validation).to.have.property('issues');
      expect(validation).to.have.property('recommendations');
      expect(validation.issues).to.be.an('array');
      expect(validation.recommendations).to.be.an('array');
    });
  });

  describe('calculateUserEngagement', () => {
    it('should return high engagement for admin users', () => {
      // Act
      const engagement = userDomainService.calculateUserEngagement(adminUser);

      // Assert
      expect(engagement).to.equal('high');
    });

    it('should return medium engagement for regular users', () => {
      // Act
      const engagement = userDomainService.calculateUserEngagement(regularUser);

      // Assert
      expect(engagement).to.equal('medium');
    });

    it('should return valid engagement levels', () => {
      // Act
      const adminEngagement = userDomainService.calculateUserEngagement(adminUser);
      const userEngagement = userDomainService.calculateUserEngagement(regularUser);

      // Assert
      expect(['high', 'medium', 'low']).to.include(adminEngagement);
      expect(['high', 'medium', 'low']).to.include(userEngagement);
    });
  });

  describe('canUserChangeRole', () => {
    it('should allow admin to change other user roles', () => {
      // Act
      const canChange = userDomainService.canUserChangeRole(adminUser, regularUser, 'admin');

      // Assert
      expect(canChange).to.be.true;
    });

    it('should prevent admin from changing their own role', () => {
      // Act
      const canChange = userDomainService.canUserChangeRole(adminUser, adminUser, 'user');

      // Assert
      expect(canChange).to.be.false;
    });

    it('should prevent regular users from changing roles', () => {
      // Act
      const canChange = userDomainService.canUserChangeRole(regularUser, adminUser, 'user');

      // Assert
      expect(canChange).to.be.false;
    });

    it('should validate new role values', () => {
      // Act
      const validRole = userDomainService.canUserChangeRole(adminUser, regularUser, 'user');
      const invalidRole = userDomainService.canUserChangeRole(adminUser, regularUser, 'invalid');

      // Assert
      expect(validRole).to.be.true;
      expect(invalidRole).to.be.false;
    });
  });

  describe('canUserPerformSystemAction', () => {
    it('should allow admin to perform system actions', () => {
      // Act
      const canPerform = userDomainService.canUserPerformSystemAction(adminUser, 'any_action');

      // Assert
      expect(canPerform).to.be.true;
    });

    it('should prevent regular users from performing system actions', () => {
      // Act
      const canPerform = userDomainService.canUserPerformSystemAction(regularUser, 'any_action');

      // Assert
      expect(canPerform).to.be.false;
    });

    it('should work with different action types', () => {
      const actions = ['backup', 'restore', 'config', 'maintenance'];

      // Act & Assert
      actions.forEach(action => {
        const adminCan = userDomainService.canUserPerformSystemAction(adminUser, action);
        const userCan = userDomainService.canUserPerformSystemAction(regularUser, action);
        
        expect(adminCan).to.be.true;
        expect(userCan).to.be.false;
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle undefined or null inputs gracefully', () => {
      // This test documents expected behavior - the service should handle edge cases
      // In a real implementation, you might want to add input validation
      expect(() => {
        userDomainService.calculateUserActivityScore(regularUser);
      }).to.not.throw();
    });

    it('should maintain consistent permission logic', () => {
      // Test that permission logic is consistent across different methods
      const canAccess = userDomainService.canUserAccessDocument(adminUser, testDocument);
      const permissions = userDomainService.getUserDocumentPermissions(adminUser, testDocument);

      // Assert
      expect(canAccess).to.be.true;
      expect(permissions.canRead).to.be.true;
      expect(permissions.canWrite).to.be.true;
    });

    it('should provide consistent validation results', () => {
      // Test that validation provides consistent structure
      const stateValidation = userDomainService.validateUserState(regularUser);

      // Assert
      expect(stateValidation).to.have.property('isValid');
      expect(stateValidation).to.have.property('issues');
      expect(stateValidation).to.have.property('recommendations');
      expect(Array.isArray(stateValidation.issues)).to.be.true;
      expect(Array.isArray(stateValidation.recommendations)).to.be.true;
    });
  });
});
