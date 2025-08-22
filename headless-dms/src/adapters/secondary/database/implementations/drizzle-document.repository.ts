import { db } from '../index.js';
import { documents } from '../schema.js';
import { IDocumentRepository } from '../../../../ports/output/IDocumentRepository.js';
import type { DocumentFilterQuery } from '../interfaces/documents.repository.interface.js';
import { and, eq, gte, lte, sql, asc, desc } from 'drizzle-orm';
import { arrayOverlaps } from 'drizzle-orm';
import fs from 'fs';
import { injectable } from 'tsyringe';
import { PaginationInput, PaginationOutput, calculatePaginationMetadata } from '../../../../shared/dto/common/pagination.dto.js';
import { Document } from '../../../../domain/entities/Document.js';
import { RepositoryResult } from '@carbonteq/hexapp';
import { Result } from '@carbonteq/fp';
import { extractId, toSerialized, filterMap } from '@carbonteq/hexapp';

@injectable()
export class DrizzleDocumentRepository implements IDocumentRepository {
  // Hexapp utility functions - field selection for queries
  private readonly documentFields = {
    id: documents.id,
    name: documents.name,
    filePath: documents.filePath,
    mimeType: documents.mimeType,
    size: documents.size,
    tags: documents.tags,
    metadata: documents.metadata,
    createdAt: documents.createdAt,
    updatedAt: documents.updatedAt,
  };
  
  // Helper function for building query conditions
  private buildQueryConditions = (query?: DocumentFilterQuery) => {
    const queryFields = [
      { key: 'name', value: query?.name, condition: () => query?.name ? sql`${documents.name} ILIKE ${`%${query.name}%`}` : null },
      { key: 'mimeType', value: query?.mimeType, condition: () => eq(documents.mimeType, query!.mimeType!) },
      { key: 'from', value: query?.from, condition: () => gte(documents.createdAt, new Date(query!.from!)) },
      { key: 'to', value: query?.to, condition: () => lte(documents.createdAt, new Date(query!.to!)) },
      { key: 'tags', value: query?.tags, condition: () => {
        if (!query?.tags || query.tags.length === 0) return null;
        const tagsArray = Array.isArray(query.tags) ? query.tags : [query.tags];
        return arrayOverlaps(documents.tags, tagsArray);
      }}
    ];
    
    const conditions = filterMap(
      queryFields,
      (field) => field.value !== undefined && field.value !== null && (Array.isArray(field.value) ? field.value.length > 0 : true),
      (field) => field.condition()
    ).filter(condition => condition !== null);

    // Handle metadata separately as it's more complex
    if (query?.metadata && Object.keys(query.metadata).length > 0) {
      for (const [key, value] of Object.entries(query.metadata)) {
        conditions.push(sql`${documents.metadata}->>${key} = ${value}`);
      }
    }

    return conditions;
  };

  // Helper function for transforming database results to Document entities
  private transformToDocument = (dbDoc: any): Document => {
    return Document.fromRepository({
      ...dbDoc,
      tags: dbDoc.tags as string[],
      metadata: dbDoc.metadata as Record<string, string>,
    }).unwrap();
  };

  // Required abstract methods from BaseRepository<Document>
  async insert(document: Document): Promise<RepositoryResult<Document, any>> {
    try {
      const documentId = extractId(document);
      const documentData = toSerialized(document);
      
      // Check if document already exists
      const existing = await db.select().from(documents).where(eq(documents.id, documentId)).execute();
      if (existing.length > 0) {
        return Result.Err(new Error(`Document with ID ${documentId} already exists`));
      }
      
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
        return Result.Err(new Error('Failed to create document'));
      }
      
      const createdDocument = this.transformToDocument(newDocuments[0]);
      
      return Result.Ok(createdDocument);
    } catch (error) {
      return Result.Err(new Error(`Failed to insert document: ${error}`));
    }
  }

  async update(document: Document): Promise<RepositoryResult<Document, any>> {
    try {
      const documentId = extractId(document);
      const documentData = toSerialized(document);
      
      // Check if document exists
      const existing = await db.select().from(documents).where(eq(documents.id, documentId)).execute();
            if (existing.length === 0) {
        return Result.Err(new Error(`Document with ID ${documentId} not found`));
      }

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
        .where(eq(documents.id, documentId))
        .returning()
        .execute();

      if (updatedDocuments.length === 0) {
        return Result.Err(new Error('Failed to update document'));
      }

      const updatedDocument = this.transformToDocument(updatedDocuments[0]);
      
      return Result.Ok(updatedDocument);
    } catch (error) {
      return Result.Err(new Error(`Failed to update document: ${error}`));
    }
  }

  // Existing custom methods (preserved for backward compatibility)
  async save(document: Document): Promise<Document> {
    const documentData = toSerialized(document);
    
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
    
    return this.transformToDocument(newDocuments[0]);
  }

  async saveWithNameCheck(document: Document): Promise<Document> {
    const documentData = toSerialized(document);
    
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
      
      return this.transformToDocument(newDocuments[0]);
    });
  }

  async find(query?: DocumentFilterQuery, pagination?: PaginationInput): Promise<PaginationOutput<Document>> {
    const conditions = this.buildQueryConditions(query);
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

    // Handle sorting
    let orderByClause;
    const sortField = pagination?.sort || 'createdAt';
    const sortOrder = pagination?.order || 'desc';
    
    switch (sortField) {
      case 'name':
        orderByClause = sortOrder === 'asc' ? asc(documents.name) : desc(documents.name);
        break;
      case 'mimeType':
        orderByClause = sortOrder === 'asc' ? asc(documents.mimeType) : desc(documents.mimeType);
        break;
      case 'size':
        orderByClause = sortOrder === 'asc' ? asc(documents.size) : desc(documents.size);
        break;
      case 'updatedAt':
        orderByClause = sortOrder === 'asc' ? asc(documents.updatedAt) : desc(documents.updatedAt);
        break;
      case 'createdAt':
      default:
        orderByClause = sortOrder === 'asc' ? asc(documents.createdAt) : desc(documents.createdAt);
        break;
    }

    // Get paginated results
    const results = await db.select(this.documentFields)
      .from(documents)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(orderByClause)
      .execute();

    const documentsList = results.map(this.transformToDocument);

    return {
      data: documentsList,
      pagination: calculatePaginationMetadata(page, limit, total)
    };
  }

  async findOne(query: DocumentFilterQuery): Promise<Document | null> {
    const conditions = this.buildQueryConditions(query);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db.select(this.documentFields)
      .from(documents)
      .where(whereClause)
      .limit(1)
      .execute();

    if (result.length === 0) {
      return null;
    }

    return this.transformToDocument(result[0]);
  }

  async findById(id: string): Promise<Document | null> {
    const result = await db.select(this.documentFields)
      .from(documents)
      .where(eq(documents.id, id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    return this.transformToDocument(result[0]);
  }

  async findByName(name: string): Promise<Document | null> {
    const result = await db.select(this.documentFields)
      .from(documents)
      .where(eq(documents.name, name))
      .execute();

    if (result.length === 0) {
      return null;
    }

    return this.transformToDocument(result[0]);
  }

  async findByTags(tags: string[]): Promise<Document[]> {
    const result = await db.select(this.documentFields)
      .from(documents)
      .where(arrayOverlaps(documents.tags, tags))
      .execute();

    return result.map(this.transformToDocument);
  }

  async findByMimeType(mimeType: string): Promise<Document[]> {
    const result = await db.select(this.documentFields)
      .from(documents)
      .where(eq(documents.mimeType, mimeType))
      .execute();

    return result.map(this.transformToDocument);
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
    const conditions = this.buildQueryConditions(query);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db.select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(whereClause)
      .execute();

    return (result[0]?.count || 0) > 0;
  }

  async count(query?: DocumentFilterQuery): Promise<number> {
    const conditions = this.buildQueryConditions(query);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db.select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(whereClause)
      .execute();

    return result[0]?.count || 0;
  }
} 