import { AppResult } from '@carbonteq/hexapp';
import { FileInfo } from '../../shared/types/index.js';

export interface IFileService {
  saveFile(file: Buffer, name: string, mimeType: string): Promise<AppResult<FileInfo>>;
  saveFileFromRequest(request: any): Promise<AppResult<FileInfo>>;
  getFile(filePath: string): Promise<AppResult<Buffer>>;
  fileExists(filePath: string): Promise<AppResult<boolean>>;
  deleteFile(filePath: string): Promise<AppResult<boolean>>;
  streamFile(filePath: string, response: any): Promise<AppResult<void>>;
  generateDownloadLink(filePath: string, expiresIn?: number): Promise<AppResult<string>>;
  getFileInfo(filePath: string): Promise<AppResult<FileInfo>>;
} 