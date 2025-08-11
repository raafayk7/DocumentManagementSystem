import { z } from 'zod';

// Reusing existing CreateDocumentSchema from src/documents/dto/documents.dto.ts
export const CreateDocumentRequestSchema = z.object({
  name: z.string().min(1, 'Document name cannot be empty'),
  filePath: z.string().url('File path must be a valid URL'),
  mimeType: z.string().min(1, 'MIME type cannot be empty'),
  size: z.string().min(1, 'Size cannot be empty'),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  userId: z.string().uuid('Invalid user ID'),
});

export type CreateDocumentRequest = z.infer<typeof CreateDocumentRequestSchema>;
