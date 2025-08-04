import { Result } from '@carbonteq/fp';

export interface DocumentProps {
  id: string;
  name: string;
  filePath: string;
  mimeType: string;
  size: string;
  tags: string[];
  metadata: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export class Document {
  private readonly _id: string;
  private readonly _name: string;
  private readonly _filePath: string;
  private readonly _mimeType: string;
  private readonly _size: string;
  private readonly _tags: string[];
  private readonly _metadata: Record<string, string>;
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;

  private constructor(props: DocumentProps) {
    this._id = props.id;
    this._name = props.name;
    this._filePath = props.filePath;
    this._mimeType = props.mimeType;
    this._size = props.size;
    this._tags = props.tags;
    this._metadata = props.metadata;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  // Getters (read-only access)
  get id(): string { return this._id; }
  get name(): string { return this._name; }
  get filePath(): string { return this._filePath; }
  get mimeType(): string { return this._mimeType; }
  get size(): string { return this._size; }
  get tags(): string[] { return [...this._tags]; } // Return copy to prevent mutation
  get metadata(): Record<string, string> { return { ...this._metadata }; } // Return copy
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  // Factory method for creating new documents
  static create(
    name: string, 
    filePath: string, 
    mimeType: string, 
    size: string, 
    tags: string[] = [], 
    metadata: Record<string, string> = {}
  ): Result<Document, string> {
    // Basic validation
    if (!Document.validateName(name)) {
      return Result.Err('Document name cannot be empty');
    }

    if (!Document.validateFilePath(filePath)) {
      return Result.Err('Invalid file path');
    }

    if (!Document.validateMimeType(mimeType)) {
      return Result.Err('Invalid MIME type');
    }

    if (!Document.validateSize(size)) {
      return Result.Err('Invalid file size');
    }

    // Validate and clean tags
    const cleanTags = Document.validateAndCleanTags(tags);
    if (cleanTags.isErr()) {
      return Result.Err(cleanTags.unwrapErr());
    }

    // Validate metadata
    const cleanMetadata = Document.validateMetadata(metadata);
    if (cleanMetadata.isErr()) {
      return Result.Err(cleanMetadata.unwrapErr());
    }

    const documentProps: DocumentProps = {
      id: crypto.randomUUID(),
      name: name.trim(),
      filePath,
      mimeType,
      size,
      tags: cleanTags.unwrap(),
      metadata: cleanMetadata.unwrap(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return Result.Ok(new Document(documentProps));
  }

  // Factory method for creating from repository data
  static fromRepository(props: DocumentProps): Document {
    return new Document(props);
  }

  // Factory method for creating from file upload
  static fromUpload(
    name: string,
    filePath: string,
    mimeType: string,
    size: string,
    tagsInput?: string | string[],
    metadataInput?: string | Record<string, string>
  ): Result<Document, string> {
    // Parse tags
    const tags = Document.parseTags(tagsInput);
    if (tags.isErr()) {
      return Result.Err(tags.unwrapErr());
    }

    // Parse metadata
    const metadata = Document.parseMetadata(metadataInput);
    if (metadata.isErr()) {
      return Result.Err(metadata.unwrapErr());
    }

    return Document.create(name, filePath, mimeType, size, tags.unwrap(), metadata.unwrap());
  }

  // Validation methods
  static validateName(name: string): boolean {
    return name.trim().length > 0;
  }

  static validateFilePath(filePath: string): boolean {
    return filePath.trim().length > 0;
  }

  static validateMimeType(mimeType: string): boolean {
    return mimeType.trim().length > 0;
  }

  static validateSize(size: string): boolean {
    const sizeNum = parseInt(size);
    return !isNaN(sizeNum) && sizeNum > 0;
  }

  static validateAndCleanTags(tags: string[]): Result<string[], string> {
    const cleanTags = tags
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    if (cleanTags.length !== tags.length) {
      return Result.Err('Tags cannot be empty strings');
    }

    return Result.Ok(cleanTags);
  }

  static validateMetadata(metadata: Record<string, string>): Result<Record<string, string>, string> {
    // Basic validation - ensure all values are strings
    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value !== 'string') {
        return Result.Err(`Metadata value for key "${key}" must be a string`);
      }
    }
    return Result.Ok(metadata);
  }

  // Parsing methods for upload data
  static parseTags(tagsInput?: string | string[]): Result<string[], string> {
    if (!tagsInput) {
      return Result.Ok([]);
    }

    if (typeof tagsInput === 'string') {
      try {
        const parsed = JSON.parse(tagsInput);
        if (Array.isArray(parsed)) {
          return Document.validateAndCleanTags(parsed.map(String));
        } else if (typeof parsed === 'string') {
          return Document.validateAndCleanTags([parsed]);
        } else {
          return Result.Ok([]);
        }
      } catch {
        // Fallback: comma-separated string
        const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0);
        return Result.Ok(tags);
      }
    }

    if (Array.isArray(tagsInput)) {
      return Document.validateAndCleanTags(tagsInput.map(String));
    }

    return Result.Ok([]);
  }

  static parseMetadata(metadataInput?: string | Record<string, string>): Result<Record<string, string>, string> {
    if (!metadataInput) {
      return Result.Ok({});
    }

    if (typeof metadataInput === 'string') {
      try {
        const parsed = JSON.parse(metadataInput);
        if (typeof parsed === 'object' && parsed !== null) {
          return Document.validateMetadata(parsed);
        }
      } catch {
        return Result.Err('Invalid metadata JSON format');
      }
    }

    if (typeof metadataInput === 'object' && metadataInput !== null) {
      return Document.validateMetadata(metadataInput);
    }

    return Result.Ok({});
  }

  // State-changing operations
  updateName(newName: string): Result<Document, string> {
    if (!Document.validateName(newName)) {
      return Result.Err('Document name cannot be empty');
    }

    const updatedProps: DocumentProps = {
      ...this.toRepository(),
      name: newName.trim(),
      updatedAt: new Date()
    };

    return Result.Ok(new Document(updatedProps));
  }

  addTags(newTags: string[]): Result<Document, string> {
    const cleanTags = Document.validateAndCleanTags(newTags);
    if (cleanTags.isErr()) {
      return Result.Err(cleanTags.unwrapErr());
    }

    const allTags = [...this._tags, ...cleanTags.unwrap()];
    const uniqueTags = [...new Set(allTags)]; // Remove duplicates

    const updatedProps: DocumentProps = {
      ...this.toRepository(),
      tags: uniqueTags,
      updatedAt: new Date()
    };

    return Result.Ok(new Document(updatedProps));
  }

  removeTags(tagsToRemove: string[]): Result<Document, string> {
    const tagsToRemoveSet = new Set(tagsToRemove);
    const remainingTags = this._tags.filter(tag => !tagsToRemoveSet.has(tag));

    const updatedProps: DocumentProps = {
      ...this.toRepository(),
      tags: remainingTags,
      updatedAt: new Date()
    };

    return Result.Ok(new Document(updatedProps));
  }

  replaceTags(newTags: string[]): Result<Document, string> {
    const cleanTags = Document.validateAndCleanTags(newTags);
    if (cleanTags.isErr()) {
      return Result.Err(cleanTags.unwrapErr());
    }

    const updatedProps: DocumentProps = {
      ...this.toRepository(),
      tags: cleanTags.unwrap(),
      updatedAt: new Date()
    };

    return Result.Ok(new Document(updatedProps));
  }

  updateMetadata(newMetadata: Record<string, string>): Result<Document, string> {
    const cleanMetadata = Document.validateMetadata(newMetadata);
    if (cleanMetadata.isErr()) {
      return Result.Err(cleanMetadata.unwrapErr());
    }

    const updatedProps: DocumentProps = {
      ...this.toRepository(),
      metadata: cleanMetadata.unwrap(),
      updatedAt: new Date()
    };

    return Result.Ok(new Document(updatedProps));
  }

  updateFileInfo(newFilePath: string, newMimeType: string, newSize: string): Result<Document, string> {
    if (!Document.validateFilePath(newFilePath)) {
      return Result.Err('Invalid file path');
    }

    if (!Document.validateMimeType(newMimeType)) {
      return Result.Err('Invalid MIME type');
    }

    if (!Document.validateSize(newSize)) {
      return Result.Err('Invalid file size');
    }

    const updatedProps: DocumentProps = {
      ...this.toRepository(),
      filePath: newFilePath,
      mimeType: newMimeType,
      size: newSize,
      updatedAt: new Date()
    };

    return Result.Ok(new Document(updatedProps));
  }

  // Business rules
  isImage(): boolean {
    return this._mimeType.startsWith('image/');
  }

  isPDF(): boolean {
    return this._mimeType === 'application/pdf';
  }

  isTextFile(): boolean {
    return this._mimeType.startsWith('text/');
  }

  getFileSizeInBytes(): number {
    return parseInt(this._size);
  }

  getFileSizeInMB(): number {
    return this.getFileSizeInBytes() / (1024 * 1024);
  }

  hasTag(tag: string): boolean {
    return this._tags.includes(tag);
  }

  hasMetadata(key: string): boolean {
    return key in this._metadata;
  }

  getMetadataValue(key: string): string | undefined {
    return this._metadata[key];
  }

  isRecentlyUpdated(hours: number = 24): boolean {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);
    return this._updatedAt > cutoffTime;
  }

  // Convert to plain object for repository
  toRepository(): DocumentProps {
    return {
      id: this._id,
      name: this._name,
      filePath: this._filePath,
      mimeType: this._mimeType,
      size: this._size,
      tags: this._tags,
      metadata: this._metadata,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }
} 