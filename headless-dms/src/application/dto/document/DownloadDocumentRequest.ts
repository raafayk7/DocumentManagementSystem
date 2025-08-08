import { z } from 'zod';

export const DownloadDocumentRequestSchema = z.object({
  documentId: z.string().uuid('Invalid document ID'),
});

export type DownloadDocumentRequest = z.infer<typeof DownloadDocumentRequestSchema>; 