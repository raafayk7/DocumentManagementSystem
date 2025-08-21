import { injectable } from 'tsyringe';
import { IFileService } from '../../../ports/output/IFileService.js';
import { FileInfo } from '../../../shared/types/index.js';
import { AppResult } from '@carbonteq/hexapp';

export interface MockFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  content: Buffer;
  createdAt: Date;
  updatedAt: Date;
}

export enum FileErrorCode {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_ALREADY_EXISTS = 'FILE_ALREADY_EXISTS',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  STORAGE_ERROR = 'STORAGE_ERROR'
}

@injectable()
export class MockFileService implements IFileService {
  private files: Map<string, MockFile> = new Map();
  private fileCounter = 1;

  constructor() {
    this.seedMockFiles();
  }

  async saveFile(file: Buffer, name: string, mimeType: string): Promise<AppResult<FileInfo>> {
    try {
      // Check if file already exists
      const existingFile = Array.from(this.files.values()).find(f => f.name === name);
      if (existingFile) {
        return AppResult.Err(new Error(FileErrorCode.FILE_ALREADY_EXISTS));
      }

      // Validate MIME type
      if (!this.isValidMimeType(mimeType)) {
        return AppResult.Err(new Error(FileErrorCode.INVALID_FILE_TYPE));
      }

      const fileId = `mock-file-${this.fileCounter++}`;
      const mockFile: MockFile = {
        id: fileId,
        name,
        mimeType,
        size: file.length,
        content: file,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.files.set(fileId, mockFile);

      const fileInfo: FileInfo = {
        id: fileId,
        name,
        mimeType,
        size: file.length.toString(),
        path: `/mock/storage/${fileId}`,
        //url: `/mock/files/${fileId}`
      };

      return AppResult.Ok(fileInfo);
    } catch (error) {
      return AppResult.Err(new Error(FileErrorCode.STORAGE_ERROR));
    }
  }

  async saveFileFromRequest(request: any): Promise<AppResult<FileInfo>> {
    try {
      // Mock implementation for request-based file saving
      const mockFile = request.file || Buffer.from('mock file content');
      const mockName = request.filename || `mock-file-${Date.now()}`;
      const mockMimeType = request.mimetype || 'text/plain';

      return await this.saveFile(mockFile, mockName, mockMimeType);
    } catch (error) {
      return AppResult.Err(new Error(FileErrorCode.STORAGE_ERROR));
    }
  }

  async getFile(filePath: string): Promise<AppResult<Buffer>> {
    try {
      // Extract file ID from path
      const fileId = this.extractFileIdFromPath(filePath);
      if (!fileId) {
        return AppResult.Err(new Error(FileErrorCode.FILE_NOT_FOUND));
      }

      const file = this.files.get(fileId);
      if (!file) {
        return AppResult.Err(new Error(FileErrorCode.FILE_NOT_FOUND));
      }

      return AppResult.Ok(file.content);
    } catch (error) {
      return AppResult.Err(new Error(FileErrorCode.STORAGE_ERROR));
    }
  }

  async fileExists(filePath: string): Promise<AppResult<boolean>> {
    try {
      const fileId = this.extractFileIdFromPath(filePath);
      if (!fileId) {
        return AppResult.Ok(false);
      }

      const exists = this.files.has(fileId);
      return AppResult.Ok(exists);
    } catch (error) {
      return AppResult.Err(new Error(FileErrorCode.STORAGE_ERROR));
    }
  }

  async deleteFile(filePath: string): Promise<AppResult<boolean>> {
    try {
      const fileId = this.extractFileIdFromPath(filePath);
      if (!fileId) {
        return AppResult.Err(new Error(FileErrorCode.FILE_NOT_FOUND));
      }

      if (!this.files.has(fileId)) {
        return AppResult.Err(new Error(FileErrorCode.FILE_NOT_FOUND));
      }

      this.files.delete(fileId);
      return AppResult.Ok(true);
    } catch (error) {
      return AppResult.Err(new Error(FileErrorCode.STORAGE_ERROR));
    }
  }

  async streamFile(filePath: string, response: any): Promise<AppResult<void>> {
    try {
      const fileAppResult = await this.getFile(filePath);
      if (fileAppResult.isErr()) {
        return fileAppResult;
      }

      const file = fileAppResult.unwrap();
      
      // Mock streaming by setting response headers and sending file content
      if (response.header) {
        response.header('Content-Type', 'application/octet-stream');
        response.header('Content-Disposition', 'attachment');
        response.header('Content-Length', file.length.toString());
      }
      
      if (response.send) {
        response.send(file);
      }

      return AppResult.Ok(undefined);
    } catch (error) {
      return AppResult.Err(new Error(FileErrorCode.STORAGE_ERROR));
    }
  }

  // Mock-specific methods for testing
  clearFiles(): void {
    this.files.clear();
    this.fileCounter = 1;
  }

  getAllFiles(): MockFile[] {
    return Array.from(this.files.values());
  }

  getFileById(fileId: string): MockFile | undefined {
    return this.files.get(fileId);
  }

  setFiles(files: MockFile[]): void {
    this.files.clear();
    files.forEach(file => this.files.set(file.id, file));
  }

  addMockFile(file: MockFile): void {
    this.files.set(file.id, file);
  }

  removeMockFile(fileId: string): void {
    this.files.delete(fileId);
  }

  // Helper methods
  private extractFileIdFromPath(filePath: string): string | null {
    // Extract file ID from mock path format: /mock/storage/mock-file-1
    const match = filePath.match(/\/mock\/(?:storage|files)\/(mock-file-\d+)/);
    return match ? match[1] : null;
  }

  private isValidMimeType(mimeType: string): boolean {
    // Simple MIME type validation
    const validPattern = /^[a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9!#$&\-\^_\.+]*$/;
    return validPattern.test(mimeType);
  }

  // Seed with some initial test files
  private seedMockFiles(): void {
    // This will be populated by tests as needed
  }

  // Helper method to create a mock file for testing
  createMockFile(name: string, mimeType: string, content: string = 'mock content'): MockFile {
    const fileId = `mock-file-${this.fileCounter++}`;
    const mockFile: MockFile = {
      id: fileId,
      name,
      mimeType,
      size: content.length,
      content: Buffer.from(content),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.files.set(fileId, mockFile);
    return mockFile;
  }

  async generateDownloadLink(filePath: string, expiresIn: number = 60): Promise<AppResult<string>> {
    return AppResult.Ok(`/mock/download/${filePath}?expires=${Date.now() + (expiresIn * 60 * 1000)}`);
  }

  async getFileInfo(filePath: string): Promise<AppResult<FileInfo>> {
    return AppResult.Ok({
      id: this.extractFileIdFromPath(filePath) || '',
      name: filePath.split('/').pop() || '',
      mimeType: 'application/octet-stream',
      size: '0',
      path: filePath,
      url: `/mock/files/${this.extractFileIdFromPath(filePath)}`
    });
  }
}
