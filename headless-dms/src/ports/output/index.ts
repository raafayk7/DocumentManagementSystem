// Export all output port interfaces (what your application depends on from external systems)

// Repository interfaces
export * from './IDocumentRepository.js';
export * from './IUserRepository.js';

// File handling interfaces
export * from './IFileStorage.js';
export * from './IFileService.js';

// Authentication interfaces
export * from './IAuthHandler.js';
export * from './IAuthStrategy.js';

// Logging interface
export * from './ILogger.js';
