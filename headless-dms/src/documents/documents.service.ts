import { db } from '../db';
import { documents } from '../db/schema';
import { CreateDocumentDto, DocumentDto, DocumentSchema } from './dto/documents.dto';
import { v4 as uuidv4 } from 'uuid';

export async function createDocument(createDocumentDto: CreateDocumentDto): Promise<DocumentDto> {
  const newDocuments = await db.insert(documents).values({
    id: uuidv4(),
    name: createDocumentDto.name,
    filePath: createDocumentDto.filePath,
    mimeType: createDocumentDto.mimeType,
    size: createDocumentDto.size,
    tags: createDocumentDto.tags ?? [],
    metadata: createDocumentDto.metadata ?? {},
  })
  .returning()
  .execute();

  if (newDocuments.length === 0) {
    throw new Error('Failed to create document');
  }
  // Validate the output against our Zod schema before returning
  return DocumentSchema.parse(newDocuments[0]);
}
