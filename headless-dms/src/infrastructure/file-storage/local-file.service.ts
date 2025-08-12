import { IFileService } from '../../application/interfaces/IFileService.js';
import { FastifyRequest, FastifyReply } from 'fastify';
import { createReadStream } from 'fs';
import { join } from 'path';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { injectable, inject } from 'tsyringe';
import type { ILogger } from '../../../domain/interfaces/ILogger.js';
import { Result } from '@carbonteq/fp';
import { FileError } from '../../common/errors/application.errors.js';

interface FileInfo {
  path: string;
  name: string;
  mimeType: string;
  size: string;
  fields: Record<string, string>;
}

@injectable()
export class LocalFileService implements IFileService {
  private uploadDir = 'uploads';

  constructor(@inject('ILogger') private logger: ILogger) {
    this.logger = this.logger.child({ service: 'LocalFileService' });
  }

  async saveFile(request: FastifyRequest): Promise<Result<FileInfo, FileError>> {
    this.logger.info('Starting file upload');
    
    try {
      const parts = request.parts();
      let file: any = null;
      const fields: Record<string, string> = {};
      
      for await (const part of parts) {
        if (part.type === 'file') {
          // Handle file
          const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(part.filename)}`;
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
          
          this.logger.info('File saved successfully', { 
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
        return Result.Err(new FileError(
          'LocalFileService.saveFile',
          'No file found in request'
        ));
      }
      
      this.logger.debug('Upload completed', { 
        fileName: file.filename, 
        fileSize: file.size,
        fieldsCount: Object.keys(fields).length 
      });
      
      return Result.Ok({ ...file, fields });
    } catch (error) {
      this.logger.logError(error as Error, { uploadDir: this.uploadDir });
      return Result.Err(new FileError(
        'LocalFileService.saveFile',
        error instanceof Error ? error.message : 'File upload failed',
        { uploadDir: this.uploadDir }
      ));
    }
  }

  async streamFile(filePath: string, reply: FastifyReply): Promise<Result<void, FileError>> {
    this.logger.info('Starting file stream', { filePath });
    
    try {
      if (!fs.existsSync(filePath)) {
        this.logger.error('File not found for streaming', { filePath });
        return Result.Err(new FileError(
          'LocalFileService.streamFile',
          'File not found',
          { filePath }
        ));
      }

      const stat = fs.statSync(filePath);
      const readStream = createReadStream(filePath);
      
      reply.header('Content-Length', stat.size);
      reply.header('Content-Type', 'application/octet-stream');
      
      await reply.send(readStream);
      this.logger.info('File stream completed', { filePath, fileSize: stat.size });
      return Result.Ok(undefined);
    } catch (error) {
      this.logger.logError(error as Error, { filePath });
      return Result.Err(new FileError(
        'LocalFileService.streamFile',
        error instanceof Error ? error.message : 'File streaming failed',
        { filePath }
      ));
    }
  }

  async deleteFile(filePath: string): Promise<Result<boolean, FileError>> {
    this.logger.info('Attempting to delete file', { filePath });
    
    try {
      if (!fs.existsSync(filePath)) {
        this.logger.warn('File not found for deletion', { filePath });
        return Result.Ok(false);
      }

      fs.unlinkSync(filePath);
      this.logger.info('File deleted successfully', { filePath });
      return Result.Ok(true);
    } catch (error) {
      this.logger.logError(error as Error, { filePath });
      return Result.Err(new FileError(
        'LocalFileService.deleteFile',
        error instanceof Error ? error.message : 'File deletion failed',
        { filePath }
      ));
    }
  }

  async fileExists(filePath: string): Promise<Result<boolean, FileError>> {
    try {
      const exists = fs.existsSync(filePath);
      this.logger.debug('File existence check', { filePath, exists });
      return Result.Ok(exists);
    } catch (error) {
      this.logger.logError(error as Error, { filePath });
      return Result.Err(new FileError(
        'LocalFileService.fileExists',
        error instanceof Error ? error.message : 'File existence check failed',
        { filePath }
      ));
    }
  }

  async getFile(filePath: string): Promise<Result<Buffer, FileError>> {
    this.logger.info('Reading file', { filePath });
    
    try {
      if (!fs.existsSync(filePath)) {
        this.logger.error('File not found for reading', { filePath });
        return Result.Err(new FileError(
          'LocalFileService.getFile',
          'File not found',
          { filePath }
        ));
      }

      const fileBuffer = await fs.promises.readFile(filePath);
      this.logger.info('File read successfully', { filePath, size: fileBuffer.length });
      return Result.Ok(fileBuffer);
    } catch (error) {
      this.logger.logError(error as Error, { filePath });
      return Result.Err(new FileError(
        'LocalFileService.getFile',
        error instanceof Error ? error.message : 'File reading failed',
        { filePath }
      ));
    }
  }
} 