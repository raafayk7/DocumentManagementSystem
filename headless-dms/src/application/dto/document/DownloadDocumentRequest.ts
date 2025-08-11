import { z } from 'zod';

export const DownloadDocumentRequestSchema = z.object({
  documentId: z.string().uuid('Invalid document ID'),
  userId: z.string().uuid('Invalid user ID'),
});

export type DownloadDocumentRequest = z.infer<typeof DownloadDocumentRequestSchema>; 