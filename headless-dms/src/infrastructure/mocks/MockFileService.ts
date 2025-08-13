import { injectable } from 'tsyringe';
import { IFileService, FileInfo } from '../interfaces/IFileService.js';
import { Result } from '@carbonteq/fp';

export interface MockFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  content: Buffer;
  createdAt: Date;
  updatedAt: Date;
}

export enum FileError {
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

  async saveFile(file: Buffer, name: string, mimeType: string): Promise<Result<FileInfo, FileError>> {
    try {
      // Check if file already exists
      const existingFile = Array.from(this.files.values()).find(f => f.name === name);
      if (existingFile) {
        return Result.Err(FileError.FILE_ALREADY_EXISTS);
      }

      // Validate MIME type
      if (!this.isValidMimeType(mimeType)) {
        return Result.Err(FileError.INVALID_FILE_TYPE);
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
        size: file.length,
        path: `/mock/storage/${fileId}`,
        url: `/mock/files/${fileId}`
      };

      return Result.Ok(fileInfo);
    } catch (error) {
      return Result.Err(FileError.STORAGE_ERROR);
    }
  }

  async saveFileFromRequest(request: any): Promise<Result<FileInfo, FileError>> {
    try {
      // Mock implementation for request-based file saving
      const mockFile = request.file || Buffer.from('mock file content');
      const mockName = request.filename || `mock-file-${Date.now()}`;
      const mockMimeType = request.mimetype || 'text/plain';

      return await this.saveFile(mockFile, mockName, mockMimeType);
    } catch (error) {
      return Result.Err(FileError.STORAGE_ERROR);
    }
  }

  async getFile(filePath: string): Promise<Result<Buffer, FileError>> {
    try {
      // Extract file ID from path
      const fileId = this.extractFileIdFromPath(filePath);
      if (!fileId) {
        return Result.Err(FileError.FILE_NOT_FOUND);
      }

      const file = this.files.get(fileId);
      if (!file) {
        return Result.Err(FileError.FILE_NOT_FOUND);
      }

      return Result.Ok(file.content);
    } catch (error) {
      return Result.Err(FileError.STORAGE_ERROR);
    }
  }

  async fileExists(filePath: string): Promise<Result<boolean, FileError>> {
    try {
      const fileId = this.extractFileIdFromPath(filePath);
      if (!fileId) {
        return Result.Ok(false);
      }

      const exists = this.files.has(fileId);
      return Result.Ok(exists);
    } catch (error) {
      return Result.Err(FileError.STORAGE_ERROR);
    }
  }

  async deleteFile(filePath: string): Promise<Result<void, FileError>> {
    try {
      const fileId = this.extractFileIdFromPath(filePath);
      if (!fileId) {
        return Result.Err(FileError.FILE_NOT_FOUND);
      }

      if (!this.files.has(fileId)) {
        return Result.Err(FileError.FILE_NOT_FOUND);
      }

      this.files.delete(fileId);
      return Result.Ok(undefined);
    } catch (error) {
      return Result.Err(FileError.STORAGE_ERROR);
    }
  }

  async streamFile(filePath: string, response: any): Promise<Result<void, FileError>> {
    try {
      const fileResult = await this.getFile(filePath);
      if (fileResult.isErr()) {
        return fileResult;
      }

      const file = fileResult.unwrap();
      
      // Mock streaming by setting response headers and sending file content
      if (response.header) {
        response.header('Content-Type', 'application/octet-stream');
        response.header('Content-Disposition', 'attachment');
        response.header('Content-Length', file.length.toString());
      }
      
      if (response.send) {
        response.send(file);
      }

      return Result.Ok(undefined);
    } catch (error) {
      return Result.Err(FileError.STORAGE_ERROR);
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
}
