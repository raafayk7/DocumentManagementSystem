// src/validation/middleware/validation.middleware.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { ValidationOrchestrator, ValidationContext } from '../pipeline/orchestrator.js';
import { ErrorFormatter } from '../pipeline/error-formatter.js';

export interface ValidationMiddlewareOptions {
  technicalValidators?: ((input: any) => any)[];
  businessValidators?: ((input: any) => any)[];
  contextProvider?: (request: FastifyRequest) => ValidationContext;
  successHandler?: (data: any, request: FastifyRequest, reply: FastifyReply) => void;
  errorHandler?: (errors: any, request: FastifyRequest, reply: FastifyReply) => void;
}

export class ValidationMiddleware {
  /**
   * Create validation middleware for user registration
   */
  static userRegistration() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const context: ValidationContext = {
          userRole: (request.user as any)?.role,
          operation: 'create',
          existingData: {
            users: await this.getExistingUsers(request)
          }
        };

        const result = await ValidationOrchestrator.validateUserRegistration(
          request.body as any,
          context
        );

        if (result.success) {
          // Store validated data for the route handler
          (request as any).validatedData = result.data;
          return;
        }

        // Handle validation errors
        const formattedErrors = ErrorFormatter.formatForHttpResponse(result.errors);
        reply.code(400).send(formattedErrors);
      } catch (error) {
        reply.code(500).send({
          success: false,
          message: 'Validation processing error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };
  }

  /**
   * Create validation middleware for document upload
   */
  static documentUpload() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const context: ValidationContext = {
          userRole: (request.user as any)?.role,
          currentUserId: (request.user as any)?.id,
          operation: 'create',
          existingData: {
            documents: await this.getExistingDocuments(request)
          }
        };

        const result = await ValidationOrchestrator.validateDocumentUpload(
          request.body as any,
          context
        );

        if (result.success) {
          // Store validated data for the route handler
          (request as any).validatedData = result.data;
          return;
        }

        // Handle validation errors
        const formattedErrors = ErrorFormatter.formatForHttpResponse(result.errors);
        reply.code(400).send(formattedErrors);
      } catch (error) {
        reply.code(500).send({
          success: false,
          message: 'Validation processing error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };
  }

  /**
   * Create generic validation middleware
   */
  static generic(options: ValidationMiddlewareOptions) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const context = options.contextProvider ? options.contextProvider(request) : {};
        
        const result = await ValidationOrchestrator.validate(
          request.body,
          options.technicalValidators || [],
          options.businessValidators || [],
          context
        );

        if (result.success) {
          // Store validated data for the route handler
          (request as any).validatedData = result.data;
          return;
        }

        // Handle validation errors
        const formattedErrors = ErrorFormatter.formatForHttpResponse(result.errors);
        reply.code(400).send(formattedErrors);
      } catch (error) {
        reply.code(500).send({
          success: false,
          message: 'Validation processing error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };
  }

  /**
   * Create query parameter validation middleware
   */
  static queryParameters(schema: any) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = schema.safeParse(request.query);
        
        if (result.success) {
          // Store validated query parameters
          (request as any).validatedQuery = result.data;
          return;
        }

        // Handle validation errors
        reply.code(400).send({
          success: false,
          message: 'Invalid query parameters',
          errors: result.error.errors.map((err: any) => ({
            field: err.path.join('.'),
            message: err.message,
            code: 'INVALID_QUERY_PARAMETER',
            type: 'technical' as const,
            severity: 'error' as const
          }))
        });
      } catch (error) {
        reply.code(500).send({
          success: false,
          message: 'Query parameter validation error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };
  }

  /**
   * Create path parameter validation middleware
   */
  static pathParameters(schema: any) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = schema.safeParse(request.params);
        
        if (result.success) {
          // Store validated path parameters
          (request as any).validatedParams = result.data;
          return;
        }

        // Handle validation errors
        reply.code(400).send({
          success: false,
          message: 'Invalid path parameters',
          errors: result.error.errors.map((err: any) => ({
            field: err.path.join('.'),
            message: err.message,
            code: 'INVALID_PATH_PARAMETER',
            type: 'technical' as const,
            severity: 'error' as const
          }))
        });
      } catch (error) {
        reply.code(500).send({
          success: false,
          message: 'Path parameter validation error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };
  }

  /**
   * Helper method to get existing users for validation context
   */
  private static async getExistingUsers(request: FastifyRequest) {
    try {
      // This would typically come from your user repository
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Error fetching existing users:', error);
      return [];
    }
  }

  /**
   * Helper method to get existing documents for validation context
   */
  private static async getExistingDocuments(request: FastifyRequest) {
    try {
      // This would typically come from your document repository
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Error fetching existing documents:', error);
      return [];
    }
  }
} 