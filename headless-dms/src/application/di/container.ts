import 'reflect-metadata';
import { container } from 'tsyringe';
import { IDocumentRepository } from '../interfaces/IDocumentRepository.js';
import { DrizzleDocumentRepository } from '../../infrastructure/database/implementations/drizzle-document.repository.js';
import { IUserRepository } from '../interfaces/IUserRepository.js';
import { DrizzleUserRepository } from '../../infrastructure/database/implementations/drizzle-user.repository.js';
import { IFileService } from '../interfaces/IFileService.js';
import { LocalFileService } from '../../infrastructure/file-storage/local-file.service.js';
import { DocumentService } from '../../documents/documents.service.js';
import { AuthApplicationService } from '../services/AuthApplicationService.js';
import { UserApplicationService } from '../services/UserApplicationService.js';
import { DocumentApplicationService } from '../services/DocumentApplicationService.js';
import { ILogger } from '../../domain/interfaces/ILogger.js';
import { ConsoleLogger } from '../../infrastructure/logging/console-logger.service.js';
import { FileLogger } from '../../infrastructure/logging/file-logger.service.js';
import {UserValidator, DocumentValidator, EmailValidator} from '../../domain/validators/index.js';
import { AuthDomainService, UserDomainService, DocumentDomainService } from '../../domain/services/index.js';
import { IAuthStrategy } from '../interfaces/IAuthStrategy.js';
import { JwtAuthStrategy, LocalAuthStrategy } from '../../infrastructure/auth/index.js';
import { IAuthHandler } from '../interfaces/IAuthHandler.js';
import { AuthHandler } from '../../infrastructure/auth/implementations/AuthHandler.js';

// Import all use cases
import { 
  AuthenticateUserUseCase,
  CreateUserUseCase,
  GetUsersUseCase,
  GetUserByIdUseCase,
  ChangeUserRoleUseCase,
  DeleteUserUseCase,
  ChangeUserPasswordUseCase,
  ValidateUserCredentialsUseCase
} from '../use-cases/user/index.js';

import {
  GetDocumentsUseCase,
  GetDocumentByIdUseCase,
  UpdateDocumentNameUseCase,
  UpdateDocumentMetadataUseCase,
  DeleteDocumentUseCase,
  UploadDocumentUseCase,
  GenerateDownloadLinkUseCase,
  DownloadDocumentByTokenUseCase,
  ReplaceTagsInDocumentUseCase
} from '../use-cases/document/index.js';

// Register repositories
container.registerSingleton<IDocumentRepository>('IDocumentRepository', DrizzleDocumentRepository);
container.registerSingleton<IUserRepository>('IUserRepository', DrizzleUserRepository);
container.registerSingleton<IFileService>('IFileService', LocalFileService);
container.registerSingleton<IFileService>('IFileStorage', LocalFileService); // Alias for compatibility

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
container.registerSingleton('AuthApplicationService', AuthApplicationService);
container.registerSingleton('UserApplicationService', UserApplicationService);
container.registerSingleton('DocumentApplicationService', DocumentApplicationService);

// Register validators
container.registerSingleton('UserValidator', UserValidator);
container.registerSingleton('DocumentValidator', DocumentValidator);
container.registerSingleton('EmailValidator', EmailValidator);

// Register domain services
container.registerSingleton('AuthDomainService', AuthDomainService);
container.registerSingleton('UserDomainService', UserDomainService);
container.registerSingleton('DocumentDomainService', DocumentDomainService);

// Register all use cases
container.registerSingleton(AuthenticateUserUseCase);
container.registerSingleton(CreateUserUseCase);
container.registerSingleton(GetUsersUseCase);
container.registerSingleton(GetUserByIdUseCase);
container.registerSingleton(ChangeUserRoleUseCase);
container.registerSingleton(DeleteUserUseCase);
container.registerSingleton(ChangeUserPasswordUseCase);
container.registerSingleton(ValidateUserCredentialsUseCase);

container.registerSingleton(GetDocumentsUseCase);
container.registerSingleton(GetDocumentByIdUseCase);
container.registerSingleton(UpdateDocumentNameUseCase);
container.registerSingleton(UpdateDocumentMetadataUseCase);
container.registerSingleton(DeleteDocumentUseCase);
container.registerSingleton(UploadDocumentUseCase);
container.registerSingleton(GenerateDownloadLinkUseCase);
container.registerSingleton(DownloadDocumentByTokenUseCase);
container.registerSingleton(ReplaceTagsInDocumentUseCase);

export { container }; 