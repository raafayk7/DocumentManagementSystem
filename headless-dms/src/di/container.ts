import 'reflect-metadata';
import { container } from 'tsyringe';
import { IDocumentRepository } from '../documents/repositories/documents.repository.interface.js';
import { DrizzleDocumentRepository } from '../documents/repositories/drizzle-document.repository.js';
import { IUserRepository } from '../auth/repositories/user.repository.interface.js';
import { DrizzleUserRepository } from '../auth/repositories/drizzle-user.repository.js';
import { IFileService } from '../common/services/file.service.interface.js';
import { LocalFileService } from '../common/services/local-file.service.js';
import { DocumentService } from '../documents/documents.service.js';
import { ILogger } from '../common/services/logger.service.interface.js';
import { ConsoleLogger } from '../common/services/console-logger.service.js';
import { FileLogger } from '../common/services/file-logger.service.js';
import {UserValidator, DocumentValidator, EmailValidator} from '../domain/validators/index.js';
import { IAuthStrategy } from '../auth/interfaces/IAuthStrategy.js';
import { JwtAuthStrategy, LocalAuthStrategy } from '../auth/strategies/index.js';
import { IAuthHandler } from '../auth/interfaces/IAuthHandler.js';
import { AuthHandler } from '../auth/services/AuthHandler.js';

// Register repositories
container.registerSingleton<IDocumentRepository>('IDocumentRepository', DrizzleDocumentRepository);
container.registerSingleton<IUserRepository>('IUserRepository', DrizzleUserRepository);
container.registerSingleton<IFileService>('IFileService', LocalFileService);

// Register loggers
container.registerSingleton<ILogger>('ILogger', ConsoleLogger);
// Uncomment to use FileLogger instead:
// container.registerSingleton<ILogger>('ILogger', FileLogger);

// Register authentication strategies
// Use JWT strategy for production, Local strategy for testing
if (process.env.NODE_ENV === 'test') {
  container.registerSingleton<IAuthStrategy>('IAuthStrategy', LocalAuthStrategy);
} else {
  container.registerSingleton<IAuthStrategy>('IAuthStrategy', JwtAuthStrategy);
}

// Register authentication handler
container.registerSingleton<IAuthHandler>('IAuthHandler', AuthHandler);

// Register services
container.registerSingleton(DocumentService);

// Register validators
container.registerSingleton('UserValidator', UserValidator);
container.registerSingleton('DocumentValidator', DocumentValidator);
container.registerSingleton('EmailValidator', EmailValidator);

export { container }; 