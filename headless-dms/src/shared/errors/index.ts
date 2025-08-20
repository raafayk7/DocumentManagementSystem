// Consolidated application errors
// Base application error class
export class ApplicationError extends Error {
  constructor(
    public readonly operation: string,
    public readonly cause: Error | string,
    public readonly context?: Record<string, any>
  ) {
    super(`[${operation}] ${cause}`);
    this.name = 'ApplicationError';
  }
}

// Authentication errors
export class AuthError extends ApplicationError {
  constructor(
    operation: string,
    cause: Error | string,
    context?: Record<string, any>
  ) {
    super(operation, cause, context);
  }
}

// Document errors
export class DocumentError extends ApplicationError {
  constructor(
    operation: string,
    cause: Error | string,
    context?: Record<string, any>
  ) {
    super(operation, cause, context);
  }
}

// File operation errors
export class FileError extends ApplicationError {
  constructor(
    operation: string,
    cause: Error | string,
    context?: Record<string, any>
  ) {
    super(operation, cause, context);
  }
}

// Repository errors
export class RepositoryError extends ApplicationError {
  constructor(
    operation: string,
    cause: Error | string,
    context?: Record<string, any>
  ) {
    super(operation, cause, context);
  }
}

// Validation errors
export class ValidationError extends ApplicationError {
  constructor(
    operation: string,
    cause: Error | string,
    context?: Record<string, any>
  ) {
    super(operation, cause, context);
  }
}

// Re-export the base class for backward compatibility
export { ApplicationError as default };
