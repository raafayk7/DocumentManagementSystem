import { Result } from '@carbonteq/fp';
import { FileError } from '../errors/ApplicationError.js';

export interface FileInfo {
  path: string;
  name: string;
  mimeType: string;
  size: string;
  fields: Record<string, string>;
}

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