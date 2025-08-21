import { AppResult } from '@carbonteq/hexapp';
import { FileInfo } from '../../shared/types/index.js';
import { FileError } from '../../shared/errors/index.js';

export interface IFileStorage {
  saveFile(file: Buffer, name: string, mimeType: string): Promise<AppResult<FileInfo>>;
  getFile(filePath: string): Promise<AppResult<Buffer>>;
  deleteFile(filePath: string): Promise<AppResult<boolean>>;
  fileExists(filePath: string): Promise<AppResult<boolean>>;
  getFileInfo(filePath: string): Promise<AppResult<FileInfo>>;
} 