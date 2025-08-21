import { IFileService } from '../../../ports/output/IFileService.js';
import { FastifyRequest, FastifyReply } from 'fastify';
import { createReadStream } from 'fs';
import { join } from 'path';
import fs from 'fs';
import path from 'path';
import { injectable, inject } from 'tsyringe';
import type { ILogger } from '../../../ports/output/ILogger.js';
import { AppResult, AppError, UUID } from '@carbonteq/hexapp';
import { FileInfo } from '../../../shared/types/index.js';

@injectable()
export class LocalFileService implements IFileService {
  private uploadDir = 'uploads';

  constructor(@inject('ILogger') private logger: ILogger) {
    this.logger = this.logger.child({ service: 'LocalFileService' });
  }

  // New method for direct file saving (Buffer-based)
  async saveFile(file: Buffer, name: string, mimeType: string): Promise<AppResult<FileInfo>> {
    this.logger.info('Starting direct file upload', { name, mimeType, size: file.length });
    
    try {
      // Ensure upload directory exists
      await fs.promises.mkdir(this.uploadDir, { recursive: true });
      
      // Generate unique filename using hexapp's UUID
      const uniqueName = `${Date.now()}-${UUID.init()}${path.extname(name)}`;
      const uploadPath = path.join(this.uploadDir, uniqueName);
      
      // Write file to disk
      await fs.promises.writeFile(uploadPath, file);
      
      const fileInfo: FileInfo = {
        path: uploadPath,
        name: name,
        mimeType: mimeType,
        size: file.length.toString(),
        fields: {}
      };
      
      this.logger.info('File saved successfully via direct upload', { 
        fileName: name, 
        fileSize: fileInfo.size,
        uploadPath 
      });
      
      return AppResult.Ok(fileInfo);
    } catch (error) {
      this.logger.logError(error as Error, { uploadDir: this.uploadDir, name });
      return AppResult.Err(AppError.Generic(
        error instanceof Error ? error.message : 'Direct file upload failed'
      ));
    }
  }

  // Legacy method for FastifyRequest-based uploads (renamed for clarity)
  async saveFileFromRequest(request: FastifyRequest): Promise<AppResult<FileInfo>> {
    this.logger.info('Starting file upload from request');
    
    try {
      const parts = request.parts();
      let file: any = null;
      const fields: Record<string, string> = {};
      
      for await (const part of parts) {
        if (part.type === 'file') {
          // Handle file
          const uniqueName = `${Date.now()}-${UUID.init()}${path.extname(part.filename)}`;
          const uploadPath = path.join(this.uploadDir, uniqueName);
          await fs.promises.mkdir(this.uploadDir, { recursive: true });
          const writeStream = fs.createWriteStream(uploadPath);
          await part.file.pipe(writeStream);
          file = {
            path: uploadPath,
            name: part.filename,
            mimeType: part.mimetype,
            size: 0, // We'll get the size after writing
          };
          await new Promise<void>((resolve) => writeStream.on('finish', resolve));
          file.size = fs.statSync(uploadPath).size.toString();
          
          this.logger.info('File saved successfully from request', { 
            fileName: part.filename, 
            fileSize: file.size,
            uploadPath 
          });
        } else {
          // Handle fields (all are strings)
          fields[part.fieldname] = String(part.value);
        }
      }
      
      if (!file) { 
        this.logger.error('No file found in request');
        return AppResult.Err(AppError.NotFound(
          'No file found in request'
        ));
      }
      
      this.logger.debug('Upload completed from request', { 
        fileName: file.filename, 
        fileSize: file.size,
        fieldsCount: Object.keys(fields).length 
      });
      
      return AppResult.Ok({ ...file, fields });
    } catch (error) {
      this.logger.logError(error as Error, { uploadDir: this.uploadDir });
      return AppResult.Err(AppError.Generic(
        error instanceof Error ? error.message : 'File upload from request failed'
      ));
    }
  }

  async streamFile(filePath: string, reply: FastifyReply): Promise<AppResult<void>> {
    this.logger.info('Starting file stream', { filePath });
    
    try {
      if (!fs.existsSync(filePath)) {
        this.logger.error('File not found for streaming', { filePath });
        return AppResult.Err(AppError.NotFound(
          'File not found'
        ));
      }

      const stat = fs.statSync(filePath);
      const readStream = createReadStream(filePath);
      
      reply.header('Content-Length', stat.size);
      reply.header('Content-Type', 'application/octet-stream');
      
      await reply.send(readStream);
      this.logger.info('File stream completed', { filePath, fileSize: stat.size });
      return AppResult.Ok(undefined);
    } catch (error) {
      this.logger.logError(error as Error, { filePath });
      return AppResult.Err(AppError.Generic(
        error instanceof Error ? error.message : 'File streaming failed'
      ));
    }
  }

  async deleteFile(filePath: string): Promise<AppResult<boolean>> {
    this.logger.info('Attempting to delete file', { filePath });
    
    try {
      if (!fs.existsSync(filePath)) {
        this.logger.warn('File not found for deletion', { filePath });
        return AppResult.Ok(false);
      }

      fs.unlinkSync(filePath);
      this.logger.info('File deleted successfully', { filePath });
      return AppResult.Ok(true);
    } catch (error) {
      this.logger.logError(error as Error, { filePath });
      return AppResult.Err(AppError.Generic(
        error instanceof Error ? error.message : 'File deletion failed'
      ));
    }
  }

  async fileExists(filePath: string): Promise<AppResult<boolean>> {
    try {
      const exists = fs.existsSync(filePath);
      this.logger.debug('File existence check', { filePath, exists });
      return AppResult.Ok(exists);
    } catch (error) {
      this.logger.logError(error as Error, { filePath });
      return AppResult.Err(AppError.Generic(
        error instanceof Error ? error.message : 'File existence check failed'
      ));
    }
  }

  async getFile(filePath: string): Promise<AppResult<Buffer>> {
    this.logger.info('Reading file', { filePath });
    
    try {
      if (!fs.existsSync(filePath)) {
        this.logger.error('File not found for reading', { filePath });
        return AppResult.Err(AppError.NotFound(
          'File not found'
        ));
      }

      const fileBuffer = await fs.promises.readFile(filePath);
      this.logger.info('File read successfully', { filePath, size: fileBuffer.length });
      return AppResult.Ok(fileBuffer);
    } catch (error) {
      this.logger.logError(error as Error, { filePath });
      return AppResult.Err(AppError.Generic(
        error instanceof Error ? error.message : 'File reading failed'
      ));
    }
  }

  async generateDownloadLink(filePath: string, expiresIn: number = 60): Promise<AppResult<string>> {
    this.logger.info('Generating download link', { filePath, expiresIn });
    
    try {
      if (!fs.existsSync(filePath)) {
        this.logger.error('File not found for download link generation', { filePath });
        return AppResult.Err(new Error('File not found'));
      }

      // Generate a simple token-based link (in production, this would be more secure)
      const token = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const downloadUrl = `/download/${token}?file=${encodeURIComponent(filePath)}&expires=${Date.now() + (expiresIn * 60 * 1000)}`;
      
      this.logger.info('Download link generated successfully', { filePath, downloadUrl });
      return AppResult.Ok(downloadUrl);
    } catch (error) {
      this.logger.logError(error as Error, { filePath });
      return AppResult.Err(new Error('Failed to generate download link'));
    }
  }

  async getFileInfo(filePath: string): Promise<AppResult<FileInfo>> {
    this.logger.info('Getting file info', { filePath });
    
    try {
      if (!fs.existsSync(filePath)) {
        this.logger.error('File not found for info retrieval', { filePath });
        return AppResult.Err(new Error('File not found'));
      }

      const stat = fs.statSync(filePath);
      const fileInfo: FileInfo = {
        path: filePath,
        name: path.basename(filePath),
        mimeType: 'application/octet-stream', // Default MIME type
        size: stat.size.toString(),
        fields: {}
      };
      
      this.logger.info('File info retrieved successfully', { filePath, fileInfo });
      return AppResult.Ok(fileInfo);
    } catch (error) {
      this.logger.logError(error as Error, { filePath });
      return AppResult.Err(new Error('Failed to get file info'));
    }
  }
} 