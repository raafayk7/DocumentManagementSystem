// Application-level error for use cases
export class ApplicationError extends Error {
  constructor(
    public readonly operation: string,
    public readonly message: string,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
} 