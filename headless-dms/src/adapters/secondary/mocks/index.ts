// Mock Infrastructure for Testing
// These mocks implement the same interfaces as real infrastructure but use in-memory storage

export { MockUserRepository } from './MockUserRepository.js';
export { MockDocumentRepository } from './MockDocumentRepository.js';
export { MockHttpServer } from './MockHttpServer.js';
export { MockAuthService } from './MockAuthService.js';
export { MockFileService } from './MockFileService.js';
export { MockLogger } from './MockLogger.js';

// Export mock-specific types and interfaces
export type { MockRoute, MockRequest, MockResponse } from './MockHttpServer.js';
// export type { MockAuthResult } from './MockAuthService.js';
export type { MockFile } from './MockFileService.js';
export type { LogEntry } from './MockLogger.js';
export { FileErrorCode } from './MockFileService.js';
