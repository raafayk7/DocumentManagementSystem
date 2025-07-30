import { IFileService } from './file.service.interface';
import { FastifyRequest, FastifyReply } from 'fastify';
import { createReadStream } from 'fs';
import { join } from 'path';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { injectable } from 'tsyringe';

@injectable()
export class LocalFileService implements IFileService {
  private uploadDir = 'uploads';

  async saveFile(request: FastifyRequest): Promise<{
    path: string;
    name: string;
    mimeType: string;
    size: string;
    fields: Record<string, string>;
  }> {
    const parts = request.parts();
    let file: any = null;
    const fields: Record<string, string> = {};

    for await (const part of parts) {
      if (part.type === 'file') {
        // Generate unique filename
        const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(part.filename)}`;
        const uploadPath = path.join(this.uploadDir, uniqueName);
        
        // Ensure upload directory exists
        await fs.promises.mkdir(this.uploadDir, { recursive: true });
        
        // Write file to disk
        const writeStream = fs.createWriteStream(uploadPath);
        await part.file.pipe(writeStream);
        
        // Wait for file to finish writing
        await new Promise<void>((resolve) => writeStream.on('finish', resolve));
        
        // Get file size
        const fileSize = fs.statSync(uploadPath).size.toString();
        
        file = {
          path: uploadPath,
          name: part.filename,
          mimeType: part.mimetype,
          size: fileSize,
        };
      } else {
        // Collect form fields
        fields[part.fieldname] = String(part.value);
      }
    }

    if (!file) {
      throw new Error('No file found in request');
    }

    return {
      ...file,
      fields
    };
  }

  async streamFile(filePath: string, reply: FastifyReply): Promise<void> {
    // Check if file exists
    if (!await this.fileExists(filePath)) {
      throw new Error('File not found');
    }

    // Get file info for headers
    const fileName = path.basename(filePath);
    const stats = fs.statSync(filePath);
    
    // Set headers
    reply.header('Content-Type', this.getMimeType(fileName));
    reply.header('Content-Disposition', `attachment; filename="${fileName}"`);
    reply.header('Content-Length', stats.size.toString());

    // Stream the file
    const stream = createReadStream(join(process.cwd(), filePath));
    return reply.send(stream);
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      if (await this.fileExists(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to delete file at ${filePath}:`, error);
      return false;
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }

  private getMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }
} 