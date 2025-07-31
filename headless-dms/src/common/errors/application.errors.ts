// Base application error class
export class ApplicationError extends Error {
  constructor(
    public operation: string,
    public cause: Error | string,
    public context?: Record<string, any>
  ) {
    super(`[${operation}] ${cause}`);
    this.name = this.constructor.name;
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