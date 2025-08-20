import { FastifyRequest, FastifyReply } from 'fastify';
import { Result } from '@carbonteq/fp';
import { FileError } from '../../shared/errors/index.js';

export interface FileInfo {
  path: string;
  name: string;
  mimeType: string;
  size: string;
  fields: Record<string, string>;
}

export interface IFileService {
  // New method for direct file saving (Buffer-based)
  saveFile(file: Buffer, name: string, mimeType: string): Promise<Result<FileInfo, FileError>>;
  
  // Legacy method for FastifyRequest-based uploads (kept for backward compatibility)
  saveFileFromRequest(request: FastifyRequest): Promise<Result<FileInfo, FileError>>;
  
  streamFile(filePath: string, reply: FastifyReply): Promise<Result<void, FileError>>;
  deleteFile(filePath: string): Promise<Result<boolean, FileError>>;
  fileExists(filePath: string): Promise<Result<boolean, FileError>>;
  getFile(filePath: string): Promise<Result<Buffer, FileError>>;
} 