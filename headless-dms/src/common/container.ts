import 'reflect-metadata';
import { container } from 'tsyringe';
import { IDocumentRepository } from '../documents/repositories/documents.repository.interface.js';
import { DrizzleDocumentRepository } from '../documents/repositories/drizzle-document.repository.js';
import { IUserRepository } from '../auth/repositories/user.repository.interface.js';
import { DrizzleUserRepository } from '../auth/repositories/drizzle-user.repository.js';
import { IFileService } from './services/file.service.interface.js';
import { LocalFileService } from './services/local-file.service.js';
import { DocumentService } from '../documents/documents.service.js';
import { AuthService } from '../auth/auth.service.js';
import { ILogger } from './services/logger.service.interface.js';
import { ConsoleLogger } from './services/console-logger.service.js';
import { FileLogger } from './services/file-logger.service.js';
import { IValidator } from '../domain/validators/common/IValidator.js';
import {EmailValidator, PasswordValidator, UserValidator, DocumentValidator ,JsonValidator} from '../domain/validators/index.js';

// Register repositories
container.registerSingleton<IDocumentRepository>('IDocumentRepository', DrizzleDocumentRepository);
container.registerSingleton<IUserRepository>('IUserRepository', DrizzleUserRepository);
container.registerSingleton<IFileService>('IFileService', LocalFileService);

// Register loggers
container.registerSingleton<ILogger>('ILogger', ConsoleLogger);
// Uncomment to use FileLogger instead:
// container.registerSingleton<ILogger>('ILogger', FileLogger);

// Register services
container.registerSingleton(DocumentService);
container.registerSingleton(AuthService);

// Register validators
container.registerSingleton('EmailValidator', EmailValidator);
container.registerSingleton('PasswordValidator', PasswordValidator);
container.registerSingleton('UserValidator', UserValidator);
container.registerSingleton('DocumentValidator', DocumentValidator);
container.registerSingleton('JsonValidator', JsonValidator);

export { container }; 