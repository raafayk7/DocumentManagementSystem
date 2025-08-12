import { FastifyRequest, FastifyReply } from 'fastify';
import { Result } from '@carbonteq/fp';
import { FileError } from '../common/errors/application.errors.js';

interface FileInfo {
  path: string;
  name: string;
  mimeType: string;
  size: string;
  fields: Record<string, string>;
}

export interface IFileService {
  saveFile(request: FastifyRequest): Promise<Result<FileInfo, FileError>>;
  streamFile(filePath: string, reply: FastifyReply): Promise<Result<void, FileError>>;
  deleteFile(filePath: string): Promise<Result<boolean, FileError>>;
  fileExists(filePath: string): Promise<Result<boolean, FileError>>;
} 