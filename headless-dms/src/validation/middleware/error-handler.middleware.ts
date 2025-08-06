// src/validation/middleware/error-handler.middleware.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { ErrorFormatter } from '../pipeline/error-formatter.js';

export interface ErrorHandlerOptions {
  includeStackTrace?: boolean;
  logErrors?: boolean;
  customErrorMessages?: Record<string, string>;
}

export class ErrorHandlerMiddleware {
  /**
   * Create error handler middleware
   */
  static create(options: ErrorHandlerOptions = {}) {
    return async (error: any, request: FastifyRequest, reply: FastifyReply) => {
      const { includeStackTrace = false, logErrors = true, customErrorMessages = {} } = options;

      // Log error if enabled
      if (logErrors) {
        console.error('Request error:', {
          method: request.method,
          url: request.url,
          error: error.message,
          stack: error.stack
        });
      }

      // Handle validation errors
      if (error.validation) {
        const formattedErrors = ErrorFormatter.formatForHttpResponse([
          {
            field: 'input',
            message: error.message,
            code: 'VALIDATION_ERROR',
            type: 'technical',
            severity: 'error'
          }
        ]);

        return reply.code(400).send(formattedErrors);
      }

      // Handle authentication errors
      if (error.statusCode === 401) {
        return reply.code(401).send({
          success: false,
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
          type: 'business',
          severity: 'error'
        });
      }

      // Handle authorization errors
      if (error.statusCode === 403) {
        return reply.code(403).send({
          success: false,
          message: 'Insufficient permissions',
          code: 'FORBIDDEN',
          type: 'business',
          severity: 'error'
        });
      }

      // Handle not found errors
      if (error.statusCode === 404) {
        return reply.code(404).send({
          success: false,
          message: 'Resource not found',
          code: 'NOT_FOUND',
          type: 'business',
          severity: 'error'
        });
      }

      // Handle rate limiting errors
      if (error.statusCode === 429) {
        return reply.code(429).send({
          success: false,
          message: 'Too many requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          type: 'technical',
          severity: 'error'
        });
      }

      // Handle server errors
      if (error.statusCode >= 500) {
        const response: any = {
          success: false,
          message: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
          type: 'technical',
          severity: 'error'
        };

        if (includeStackTrace) {
          response.stack = error.stack;
        }

        return reply.code(500).send(response);
      }

      // Handle other errors
      const statusCode = error.statusCode || 500;
      const response: any = {
        success: false,
        message: customErrorMessages[error.code] || error.message || 'An error occurred',
        code: error.code || 'UNKNOWN_ERROR',
        type: error.type || 'technical',
        severity: 'error'
      };

      if (includeStackTrace) {
        response.stack = error.stack;
      }

      return reply.code(statusCode).send(response);
    };
  }

  /**
   * Create validation error handler specifically for validation pipeline errors
   */
  static validationErrorHandler() {
    return async (error: any, request: FastifyRequest, reply: FastifyReply) => {
      // Check if it's a validation pipeline error
      if (error.validationPipeline) {
        const formattedErrors = ErrorFormatter.formatForHttpResponse(error.errors || []);
        return reply.code(400).send(formattedErrors);
      }

      // Handle other validation errors
      if (error.validation) {
        const formattedErrors = ErrorFormatter.formatForHttpResponse([
          {
            field: error.field || 'input',
            message: error.message,
            code: error.code || 'VALIDATION_ERROR',
            type: error.type || 'technical',
            severity: 'error'
          }
        ]);

        return reply.code(400).send(formattedErrors);
      }

      // Pass to next error handler
      throw error;
    };
  }

  /**
   * Create business rule error handler
   */
  static businessRuleErrorHandler() {
    return async (error: any, request: FastifyRequest, reply: FastifyReply) => {
      // Check if it's a business rule error
      if (error.businessRule) {
        return reply.code(400).send({
          success: false,
          message: error.message,
          code: error.code || 'BUSINESS_RULE_VIOLATION',
          type: 'business',
          severity: 'error',
          actionableMessage: error.actionableMessage || 'Please review the business rules and try again'
        });
      }

      // Pass to next error handler
      throw error;
    };
  }

  /**
   * Create authentication error handler
   */
  static authenticationErrorHandler() {
    return async (error: any, request: FastifyRequest, reply: FastifyReply) => {
      // Check if it's an authentication error
      if (error.authentication) {
        return reply.code(401).send({
          success: false,
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
          type: 'business',
          severity: 'error',
          actionableMessage: 'Please log in to access this resource'
        });
      }

      // Pass to next error handler
      throw error;
    };
  }

  /**
   * Create authorization error handler
   */
  static authorizationErrorHandler() {
    return async (error: any, request: FastifyRequest, reply: FastifyReply) => {
      // Check if it's an authorization error
      if (error.authorization) {
        return reply.code(403).send({
          success: false,
          message: 'Insufficient permissions',
          code: 'FORBIDDEN',
          type: 'business',
          severity: 'error',
          actionableMessage: 'Contact an administrator to grant you the required permissions'
        });
      }

      // Pass to next error handler
      throw error;
    };
  }

  /**
   * Create comprehensive error handler that includes all specialized handlers
   */
  static comprehensive(options: ErrorHandlerOptions = {}) {
    return async (error: any, request: FastifyRequest, reply: FastifyReply) => {
      // Try specialized handlers first
      try {
        // Validation error handler
        const validationHandler = this.validationErrorHandler();
        await validationHandler(error, request, reply);
        return;
      } catch (e) {
        // Continue to next handler
      }

      try {
        // Business rule error handler
        const businessHandler = this.businessRuleErrorHandler();
        await businessHandler(error, request, reply);
        return;
      } catch (e) {
        // Continue to next handler
      }

      try {
        // Authentication error handler
        const authHandler = this.authenticationErrorHandler();
        await authHandler(error, request, reply);
        return;
      } catch (e) {
        // Continue to next handler
      }

      try {
        // Authorization error handler
        const authzHandler = this.authorizationErrorHandler();
        await authzHandler(error, request, reply);
        return;
      } catch (e) {
        // Continue to next handler
      }

      // Fall back to general error handler
      const generalHandler = this.create(options);
      await generalHandler(error, request, reply);
    };
  }
} 