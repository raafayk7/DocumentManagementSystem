import { IFileService } from './file.service.interface';
import { FastifyRequest, FastifyReply } from 'fastify';
import { createReadStream } from 'fs';
import { join } from 'path';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { injectable, inject } from 'tsyringe';
import { ILogger } from './logger.service.interface';

@injectable()
export class LocalFileService implements IFileService {
  private uploadDir = 'uploads';

  constructor(@inject('ILogger') private logger: ILogger) {
    this.logger = this.logger.child({ service: 'LocalFileService' });
  }

  async saveFile(request: FastifyRequest): Promise<{
    path: string; name: string; mimeType: string; size: string; fields: Record<string, string>;
  }> {
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
            filename: part.filename,
            mimetype: part.mimetype,
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
        throw new Error('No file found in request'); 
      }
      
      this.logger.debug('Upload completed', { 
        fileName: file.filename, 
        fileSize: file.size,
        fieldsCount: Object.keys(fields).length 
      });
      
      return { ...file, fields };
    } catch (error) {
      this.logger.logError(error as Error, { uploadDir: this.uploadDir });
      throw error;
    }
  }

  async streamFile(filePath: string, reply: FastifyReply): Promise<void> {
    this.logger.info('Starting file stream', { filePath });
    
    try {
      if (!fs.existsSync(filePath)) {
        this.logger.error('File not found for streaming', { filePath });
        throw new Error('File not found');
      }

      const stat = fs.statSync(filePath);
      const readStream = createReadStream(filePath);
      
      reply.header('Content-Length', stat.size);
      reply.header('Content-Type', 'application/octet-stream');
      
      await reply.send(readStream);
      this.logger.info('File stream completed', { filePath, fileSize: stat.size });
    } catch (error) {
      this.logger.logError(error as Error, { filePath });
      throw error;
    }
  }

  async deleteFile(filePath: string): Promise<boolean> {
    this.logger.info('Attempting to delete file', { filePath });
    
    try {
      if (!fs.existsSync(filePath)) {
        this.logger.warn('File not found for deletion', { filePath });
        return false;
      }

      fs.unlinkSync(filePath);
      this.logger.info('File deleted successfully', { filePath });
      return true;
    } catch (error) {
      this.logger.logError(error as Error, { filePath });
      return false;
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    const exists = fs.existsSync(filePath);
    this.logger.debug('File existence check', { filePath, exists });
    return exists;
  }
} 