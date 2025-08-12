import { db } from '../index.js';
import { documents } from '../schema.js';
import { IDocumentRepository } from '../../../application/interfaces/IDocumentRepository.js';
import type { DocumentFilterQuery } from '../interfaces/documents.repository.interface.js';
import { v4 as uuidv4 } from 'uuid';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { arrayOverlaps } from 'drizzle-orm';
import fs from 'fs';
import { injectable } from 'tsyringe';
import { PaginationInput, PaginationOutput, calculatePaginationMetadata } from '../../../common/dto/pagination.dto.js';
import { Document } from '../../../domain/entities/Document.js';

@injectable()
export class DrizzleDocumentRepository implements IDocumentRepository {
  async save(document: Document): Promise<Document> {
    const documentData = document.toRepository();
    
    const newDocuments = await db.insert(documents).values({
      id: documentData.id,
      name: documentData.name,
      filePath: documentData.filePath,
      mimeType: documentData.mimeType,
      size: documentData.size,
      tags: documentData.tags,
      metadata: documentData.metadata,
    })
    .returning()
    .execute();
    
    if (newDocuments.length === 0) {
      throw new Error('Failed to create document');
    }
    
    const savedData = newDocuments[0];
    return Document.fromRepository({
      ...savedData,
      tags: savedData.tags as string[],
      metadata: savedData.metadata as Record<string, string>,
    }).unwrap();
  }

  async saveWithNameCheck(document: Document): Promise<Document> {
    const documentData = document.toRepository();
    
    // Use database transaction for atomic operation (thread-safe)
    return await db.transaction(async (tx) => {
      // Check name uniqueness within transaction
      const existingDoc = await tx.select({ id: documents.id })
        .from(documents)
        .where(eq(documents.name, documentData.name))
        .execute();
      
      if (existingDoc.length > 0) {
        throw new Error('Document name already exists');
      }
      
      // Insert document within same transaction
      const newDocuments = await tx.insert(documents).values({
        id: documentData.id,
        name: documentData.name,
        filePath: documentData.filePath,
        mimeType: documentData.mimeType,
        size: documentData.size,
        tags: documentData.tags,
        metadata: documentData.metadata,
      })
      .returning()
      .execute();
      
      if (newDocuments.length === 0) {
        throw new Error('Failed to create document');
      }
      
      const savedData = newDocuments[0];
      return Document.fromRepository({
        ...savedData,
        tags: savedData.tags as string[],
        metadata: savedData.metadata as Record<string, string>,
      }).unwrap();
    });
  }

  async find(query?: DocumentFilterQuery, pagination?: PaginationInput): Promise<PaginationOutput<Document>> {
    const conditions = [];
    
    if (query?.name) {
      conditions.push(sql`${documents.name} ILIKE ${`%${query.name}%`}`);
    }
    if (query?.mimeType) {
      conditions.push(eq(documents.mimeType, query.mimeType));
    }
    if (query?.from) {
      conditions.push(gte(documents.createdAt, new Date(query.from)));
    }
    if (query?.to) {
      conditions.push(lte(documents.createdAt, new Date(query.to)));
    }
    if (query?.tags && query.tags.length > 0) {
      const tagsArray = Array.isArray(query.tags) ? query.tags : [query.tags];
      conditions.push(arrayOverlaps(documents.tags, tagsArray));
    }
    if (query?.metadata && Object.keys(query.metadata).length > 0) {
      // For metadata, we'll do a simple contains check
      for (const [key, value] of Object.entries(query.metadata)) {
        conditions.push(sql`${documents.metadata}->>${key} = ${value}`);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(whereClause)
      .execute();
    const total = countResult[0]?.count || 0;

    // Apply pagination
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const offset = (page - 1) * limit;

    // Get paginated results
    const results = await db.select({
      id: documents.id,
      name: documents.name,
      filePath: documents.filePath,
      mimeType: documents.mimeType,
      size: documents.size,
      tags: documents.tags,
      metadata: documents.metadata,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
      .from(documents)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(documents.createdAt)
      .execute();

    const documentsList = results.map(doc => Document.fromRepository({
      ...doc,
      tags: doc.tags as string[],
      metadata: doc.metadata as Record<string, string>,
    }).unwrap());

    return {
      data: documentsList,
      pagination: calculatePaginationMetadata(page, limit, total)
    };
  }

  async findOne(query: DocumentFilterQuery): Promise<Document | null> {
    const conditions = [];
    
    if (query?.name) {
      conditions.push(eq(documents.name, query.name));
    }
    if (query?.mimeType) {
      conditions.push(eq(documents.mimeType, query.mimeType));
    }
    if (query?.from) {
      conditions.push(gte(documents.createdAt, new Date(query.from)));
    }
    if (query?.to) {
      conditions.push(lte(documents.createdAt, new Date(query.to)));
    }
    if (query?.tags && query.tags.length > 0) {
      const tagsArray = Array.isArray(query.tags) ? query.tags : [query.tags];
      conditions.push(arrayOverlaps(documents.tags, tagsArray));
    }
    if (query?.metadata && Object.keys(query.metadata).length > 0) {
      for (const [key, value] of Object.entries(query.metadata)) {
        conditions.push(sql`${documents.metadata}->>${key} = ${value}`);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db.select({
      id: documents.id,
      name: documents.name,
      filePath: documents.filePath,
      mimeType: documents.mimeType,
      size: documents.size,
      tags: documents.tags,
      metadata: documents.metadata,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
      .from(documents)
      .where(whereClause)
      .limit(1)
      .execute();

    if (result.length === 0) {
      return null;
    }

    const doc = result[0];
    return Document.fromRepository({
      ...doc,
      tags: doc.tags as string[],
      metadata: doc.metadata as Record<string, string>,
    }).unwrap();
  }

  async findById(id: string): Promise<Document | null> {
    const result = await db.select({
      id: documents.id,
      name: documents.name,
      filePath: documents.filePath,
      mimeType: documents.mimeType,
      size: documents.size,
      tags: documents.tags,
      metadata: documents.metadata,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
      .from(documents)
      .where(eq(documents.id, id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    const doc = result[0];
    return Document.fromRepository({
      ...doc,
      tags: doc.tags as string[],
      metadata: doc.metadata as Record<string, string>,
    }).unwrap();
  }

  async findByName(name: string): Promise<Document | null> {
    const result = await db.select({
      id: documents.id,
      name: documents.name,
      filePath: documents.filePath,
      mimeType: documents.mimeType,
      size: documents.size,
      tags: documents.tags,
      metadata: documents.metadata,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
      .from(documents)
      .where(eq(documents.name, name))
      .execute();

    if (result.length === 0) {
      return null;
    }

    const doc = result[0];
    return Document.fromRepository({
      ...doc,
      tags: doc.tags as string[],
      metadata: doc.metadata as Record<string, string>,
    }).unwrap();
  }

  async findByTags(tags: string[]): Promise<Document[]> {
    const result = await db.select({
      id: documents.id,
      name: documents.name,
      filePath: documents.filePath,
      mimeType: documents.mimeType,
      size: documents.size,
      tags: documents.tags,
      metadata: documents.metadata,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
      .from(documents)
      .where(arrayOverlaps(documents.tags, tags))
      .execute();

    return result.map(doc => Document.fromRepository({
      ...doc,
      tags: doc.tags as string[],
      metadata: doc.metadata as Record<string, string>,
    }).unwrap());
  }

  async findByMimeType(mimeType: string): Promise<Document[]> {
    const result = await db.select({
      id: documents.id,
      name: documents.name,
      filePath: documents.filePath,
      mimeType: documents.mimeType,
      size: documents.size,
      tags: documents.tags,
      metadata: documents.metadata,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
      .from(documents)
      .where(eq(documents.mimeType, mimeType))
      .execute();

    return result.map(doc => Document.fromRepository({
      ...doc,
      tags: doc.tags as string[],
      metadata: doc.metadata as Record<string, string>,
    }).unwrap());
  }

  async update(document: Document): Promise<Document> {
    const documentData = document.toRepository();
    
    const updatedDocuments = await db.update(documents)
      .set({
        name: documentData.name,
        filePath: documentData.filePath,
        mimeType: documentData.mimeType,
        size: documentData.size,
        tags: documentData.tags,
        metadata: documentData.metadata,
        updatedAt: new Date()
      })
      .where(eq(documents.id, documentData.id))
      .returning()
      .execute();

    if (updatedDocuments.length === 0) {
      throw new Error('Failed to update document');
    }

    const updatedData = updatedDocuments[0];
    
    return Document.fromRepository({
      ...updatedData,
      tags: updatedData.tags as string[],
      metadata: updatedData.metadata as Record<string, string>,
    }).unwrap();
  }

  async delete(id: string): Promise<boolean> {
    // First get the document to delete the file
    const document = await this.findById(id);
    if (!document) {
      return false;
    }

    // Delete the file from filesystem
    try {
      if (fs.existsSync(document.filePath)) {
        fs.unlinkSync(document.filePath);
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
    }

    // Delete from database
    const result = await db.delete(documents).where(eq(documents.id, id)).execute();
    return (result.rowCount ?? 0) > 0;
  }

  async exists(query: DocumentFilterQuery): Promise<boolean> {
    const conditions = [];
    
    if (query?.name) {
      conditions.push(eq(documents.name, query.name));
    }
    if (query?.mimeType) {
      conditions.push(eq(documents.mimeType, query.mimeType));
    }
    if (query?.from) {
      conditions.push(gte(documents.createdAt, new Date(query.from)));
    }
    if (query?.to) {
      conditions.push(lte(documents.createdAt, new Date(query.to)));
    }
    if (query?.tags && query.tags.length > 0) {
      const tagsArray = Array.isArray(query.tags) ? query.tags : [query.tags];
      conditions.push(arrayOverlaps(documents.tags, tagsArray));
    }
    if (query?.metadata && Object.keys(query.metadata).length > 0) {
      for (const [key, value] of Object.entries(query.metadata)) {
        conditions.push(sql`${documents.metadata}->>${key} = ${value}`);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db.select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(whereClause)
      .execute();

    return (result[0]?.count || 0) > 0;
  }

  async count(query?: DocumentFilterQuery): Promise<number> {
    const conditions = [];
    
    if (query?.name) {
      conditions.push(sql`${documents.name} ILIKE ${`%${query.name}%`}`);
    }
    if (query?.mimeType) {
      conditions.push(eq(documents.mimeType, query.mimeType));
    }
    if (query?.from) {
      conditions.push(gte(documents.createdAt, new Date(query.from)));
    }
    if (query?.to) {
      conditions.push(lte(documents.createdAt, new Date(query.to)));
    }
    if (query?.tags && query.tags.length > 0) {
      const tagsArray = Array.isArray(query.tags) ? query.tags : [query.tags];
      conditions.push(arrayOverlaps(documents.tags, tagsArray));
    }
    if (query?.metadata && Object.keys(query.metadata).length > 0) {
      for (const [key, value] of Object.entries(query.metadata)) {
        conditions.push(sql`${documents.metadata}->>${key} = ${value}`);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db.select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(whereClause)
      .execute();

    return result[0]?.count || 0;
  }
} 