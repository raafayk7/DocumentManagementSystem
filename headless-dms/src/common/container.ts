import 'reflect-metadata';
import { container } from 'tsyringe';
import { IDocumentRepository } from '../documents/repositories/documents.repository.interface';
import { DrizzleDocumentRepository } from '../documents/repositories/drizzle-document.repository';
import { IUserRepository } from '../auth/repositories/user.repository.interface';
import { DrizzleUserRepository } from '../auth/repositories/drizzle-user.repository';
import { IFileService } from './services/file.service.interface';
import { LocalFileService } from './services/local-file.service';
import { DocumentService } from '../documents/documents.service';
import { AuthService } from '../auth/auth.service';
import { ILogger } from './services/logger.service.interface';
import { ConsoleLogger } from './services/console-logger.service';
import { FileLogger } from './services/file-logger.service';

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

export { container }; 