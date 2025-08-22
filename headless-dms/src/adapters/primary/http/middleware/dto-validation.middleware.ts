/**
 * DTO-based validation middleware using hexapp patterns
 * This gradually replaces the custom validation pipeline with DTO-based validation
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AppResult } from '@carbonteq/hexapp';
import { ValidationBridge, LegacyBridge } from '../../../../shared/dto/validation/bridge-utils.js';
import { DtoValidationError } from '../../../../shared/dto/base/index.js';

// Import DTO classes
import { 
  CreateUserRequestDto,
  AuthenticateUserRequestDto,
  GetUserByIdRequestDto,
  ChangeUserPasswordRequestDto,
  ChangeUserRoleRequestDto,
  DeleteUserRequestDto,
  GetUsersRequestDto,
  ValidateUserCredentialsRequestDto
} from '../../../../shared/dto/user/index.js';

import {
  CreateDocumentRequestDto,
  GetDocumentByIdRequestDto,
  UploadDocumentRequestDto,
  UpdateDocumentNameRequestDto,
  DeleteDocumentRequestDto,
  GetDocumentsRequestDto,
  DownloadDocumentRequestDto,
  GenerateDownloadLinkRequestDto,
  AddTagsToDocumentRequestDto,
  RemoveTagsFromDocumentRequestDto,
  ReplaceTagsinDocumentRequestDto,
  UpdateDocumentMetadataRequestDto,
  DownloadDocumentByTokenRequestDto
} from '../../../../shared/dto/document/index.js';

import { PaginationInputDto } from '../../../../shared/dto/common/pagination.dto.js';

/**
 * DTO-based validation middleware class
 * Provides clean, type-safe validation using BaseDto patterns
 */
export class DtoValidationMiddleware {
  
  // ===== USER VALIDATION MIDDLEWARE =====
  
  /**
   * Validate user registration requests
   */
  static validateUserRegistration() {
    return ValidationBridge.createBodyValidationMiddleware(CreateUserRequestDto);
  }

  /**
   * Validate user authentication requests
   */
  static validateUserAuthentication() {
    return ValidationBridge.createBodyValidationMiddleware(AuthenticateUserRequestDto);
  }

  /**
   * Validate get user by ID requests
   */
  static validateGetUserById() {
    return ValidationBridge.createParamsValidationMiddleware(
      z.object({
        id: z.string().uuid('Invalid user ID')
      })
    );
  }

  /**
   * Validate change user password requests
   */
  static validateChangeUserPassword() {
    return ValidationBridge.createBodyValidationMiddleware(ChangeUserPasswordRequestDto);
  }

  /**
   * Validate change user role requests
   */
  static validateChangeUserRole() {
    return ValidationBridge.createBodyValidationMiddleware(ChangeUserRoleRequestDto);
  }

  /**
   * Validate delete user requests
   */
  static validateDeleteUser() {
    return ValidationBridge.createBodyValidationMiddleware(DeleteUserRequestDto);
  }

  /**
   * Validate get users requests with pagination
   */
  static validateGetUsers() {
    return ValidationBridge.createQueryValidationMiddleware(
      z.object({
        page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
        limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
        sort: z.string().optional(),
        order: z.enum(['asc', 'desc']).optional(),
        email: z.string().optional(),
        role: z.enum(['user', 'admin']).optional()
      })
    );
  }

  /**
   * Validate user credentials requests
   */
  static validateUserCredentials() {
    return ValidationBridge.createBodyValidationMiddleware(ValidateUserCredentialsRequestDto);
  }

  // ===== DOCUMENT VALIDATION MIDDLEWARE =====

  /**
   * Validate document creation requests
   */
  static validateCreateDocument() {
    return ValidationBridge.createBodyValidationMiddleware(CreateDocumentRequestDto);
  }

  /**
   * Validate get document by ID requests
   */
  static validateGetDocumentById() {
    return ValidationBridge.createParamsValidationMiddleware(
      z.object({
        id: z.string().uuid('Invalid document ID')
      })
    );
  }

  /**
   * Validate document upload requests
   */
  static validateUploadDocument() {
    return ValidationBridge.createBodyValidationMiddleware(UploadDocumentRequestDto);
  }

  /**
   * Validate update document name requests
   */
  static validateUpdateDocumentName() {
    return ValidationBridge.createBodyValidationMiddleware(UpdateDocumentNameRequestDto);
  }

  /**
   * Validate delete document requests
   */
  static validateDeleteDocument() {
    return ValidationBridge.createBodyValidationMiddleware(DeleteDocumentRequestDto);
  }

  /**
   * Validate get documents requests with advanced filtering
   */
  static validateGetDocuments() {
    return ValidationBridge.createQueryValidationMiddleware(
      z.object({
        page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
        limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
        sortBy: z.enum(['name', 'createdAt', 'updatedAt']).optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
        name: z.string().optional(),
        mimeType: z.string().optional(),
        tags: z.string().transform(val => val.split(',').map(tag => tag.trim())).optional(),
        metadata: z.string().transform(val => {
          try {
            return JSON.parse(val);
          } catch {
            throw new Error('Invalid metadata JSON format');
          }
        }).optional(),
        fromDate: z.string().optional(),
        toDate: z.string().optional()
      })
    );
  }

  /**
   * Validate download document requests
   */
  static validateDownloadDocument() {
    return ValidationBridge.createBodyValidationMiddleware(DownloadDocumentRequestDto);
  }

  /**
   * Validate generate download link requests
   */
  static validateGenerateDownloadLink() {
    return ValidationBridge.createBodyValidationMiddleware(GenerateDownloadLinkRequestDto);
  }

  /**
   * Validate add tags to document requests
   */
  static validateAddTagsToDocument() {
    return ValidationBridge.createBodyValidationMiddleware(AddTagsToDocumentRequestDto);
  }

  /**
   * Validate remove tags from document requests
   */
  static validateRemoveTagsFromDocument() {
    return ValidationBridge.createBodyValidationMiddleware(RemoveTagsFromDocumentRequestDto);
  }

  /**
   * Validate replace tags in document requests
   */
  static validateReplaceTagsInDocument() {
    return ValidationBridge.createBodyValidationMiddleware(ReplaceTagsinDocumentRequestDto);
  }

  /**
   * Validate update document metadata requests
   */
  static validateUpdateDocumentMetadata() {
    return ValidationBridge.createBodyValidationMiddleware(UpdateDocumentMetadataRequestDto);
  }

  /**
   * Validate download document by token requests
   */
  static validateDownloadDocumentByToken() {
    return ValidationBridge.createParamsValidationMiddleware(
      z.object({
        token: z.string().min(1, 'Token cannot be empty')
      })
    );
  }

  // ===== PAGINATION VALIDATION =====

  /**
   * Validate pagination parameters
   */
  static validatePagination() {
    return ValidationBridge.createQueryValidationMiddleware(
      z.object({
        page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
        limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
        sort: z.string().optional(),
        order: z.enum(['asc', 'desc']).optional()
      })
    );
  }

  // ===== LEGACY COMPATIBILITY METHODS =====

  /**
   * Create legacy-compatible validation middleware
   * This helps transition from old validation system to new DTO patterns
   */
  static createLegacyCompatible<T>(
    DtoClass: { create: (data: unknown) => AppResult<T> },
    fieldName: string = 'body'
  ) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const data = fieldName === 'body' ? request.body : 
                     fieldName === 'query' ? request.query :
                     fieldName === 'params' ? request.params : request.body;

        const result = LegacyBridge.wrapDtoValidation(DtoClass, data);
        
        if (result.success) {
          // Store validated data for the route handler (legacy format)
          (request as any).validatedData = result.data;
          return;
        }

        // Handle validation errors (legacy format)
        reply.code(400).send({
          success: false,
          message: result.message,
          errors: result.errors,
          technicalErrors: result.technicalErrors,
          businessErrors: result.businessErrors
        });
      } catch (error) {
        reply.code(500).send({
          success: false,
          message: 'Validation processing error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };
  }

  // ===== UTILITY METHODS =====

  /**
   * Create custom validation middleware with business logic separation
   */
  static createCustomValidation<T>(
    DtoClass: { create: (data: unknown) => AppResult<T> },
    businessValidator?: (data: T, context?: any) => AppResult<T>,
    contextProvider?: (request: FastifyRequest) => any
  ) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Step 1: Technical validation using DTO
        const technicalResult = DtoClass.create(request.body);
        
        if (technicalResult.isErr()) {
          const error = technicalResult.unwrapErr();
          const formattedError = ValidationBridge.formatValidationError(error);
          reply.code(400).send(formattedError);
          return;
        }

        let validatedData = technicalResult.unwrap();

        // Step 2: Business validation (if provided)
        if (businessValidator) {
          const context = contextProvider ? contextProvider(request) : {};
          const businessResult = businessValidator(validatedData, context);
          
          if (businessResult.isErr()) {
            const error = businessResult.unwrapErr();
            reply.code(400).send({
              success: false,
              message: 'Business validation failed',
              error: error.message
            });
            return;
          }

          validatedData = businessResult.unwrap();
        }

        // Store validated data for the route handler
        (request as any).validatedBody = validatedData;
      } catch (error) {
        reply.code(500).send({
          success: false,
          message: 'Validation processing error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };
  }
}
