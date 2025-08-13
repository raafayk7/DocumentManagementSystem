export * from './IUserRepository.js';
export * from './IDocumentRepository.js';
export * from './IFileStorage.js';
export * from './IFileService.js'; 

// Export all authentication interfaces
export type {
    IAuthHandler,
    LoginCredentials,
    RegisterData,
    DecodedToken,
    AuthResult
  } from './IAuthHandler.js';
  
  export type { IAuthStrategy } from './IAuthStrategy.js'; 