import { Result } from '@carbonteq/fp';
import { FileError } from '../../common/errors/application.errors.js';
import type { FileInfo } from './IFileService.js';

export interface IFileStorage {
  saveFile(file: Buffer, filename: string): Promise<Result<string, FileError>>;
  getFile(path: string): Promise<Result<Buffer, FileError>>;
  deleteFile(path: string): Promise<Result<boolean, FileError>>;
  fileExists(path: string): Promise<Result<boolean, FileError>>;
  getFileSize(path: string): Promise<Result<number, FileError>>;
  getFileMetadata(path: string): Promise<Result<{
    size: number;
    mimeType: string;
    lastModified: Date;
  }, FileError>>;
} 