import { z } from 'zod';

// For file upload use cases
export const UploadDocumentRequestSchema = z.object({
  name: z.string().min(1, 'Document name cannot be empty'),
  file: z.instanceof(Buffer), // File data
  filename: z.string().min(1, 'Filename cannot be empty'),
  mimeType: z.string().min(1, 'MIME type cannot be empty'),
  size: z.number().positive('File size must be positive'),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

export type UploadDocumentRequest = z.infer<typeof UploadDocumentRequestSchema>;
