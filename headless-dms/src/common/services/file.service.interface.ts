import { FastifyRequest, FastifyReply } from 'fastify';

export interface IFileService {
  saveFile(request: FastifyRequest): Promise<{
    path: string;
    name: string;
    mimeType: string;
    size: string;
    fields: Record<string, string>;
  }>;
  
  streamFile(filePath: string, reply: FastifyReply): Promise<void>;
  
  deleteFile(filePath: string): Promise<boolean>;
  
  fileExists(filePath: string): Promise<boolean>;
} 