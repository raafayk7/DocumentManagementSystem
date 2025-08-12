import { faker } from '@faker-js/faker';
import { SeedDocument, SeedUser, SeedTag, SEED_CONFIG } from './seed-data.js';
import { FileGenerator } from './file-generator.js';

export class DocumentSeeder {
  private documents: SeedDocument[] = [];
  private fileGenerator: FileGenerator;

  constructor() {
    this.fileGenerator = new FileGenerator();
  }

  async generateDocuments(users: SeedUser[], tags: SeedTag[]): Promise<SeedDocument[]> {
    this.documents = [];
    
    for (let i = 0; i < SEED_CONFIG.documents.count; i++) {
      const document = await this.generateDocument(users, tags);
      this.documents.push(document);
    }

    return this.documents;
  }

  private async generateDocument(users: SeedUser[], tags: SeedTag[]): Promise<SeedDocument> {
    const user = faker.helpers.arrayElement(users);
    const documentType = faker.helpers.arrayElement(SEED_CONFIG.documents.fileTypes);
    const fileName = this.generateFileName(documentType);
    const tagsForDocument = faker.helpers.arrayElements(tags, faker.number.int({ min: 0, max: 3 }));
    
    let fileInfo: { filePath: string; size: number };
    
    switch (documentType) {
      case 'txt':
        const content = this.generateTextContent();
        fileInfo = this.fileGenerator.generateTextFile(fileName, content);
        break;
      case 'pdf':
        const title = faker.company.catchPhrase();
        const pdfContent = this.generatePDFContent();
        fileInfo = await this.fileGenerator.generatePDFFile(fileName, title, pdfContent);
        break;
      case 'jpg':
      case 'png':
        fileInfo = this.fileGenerator.generateSimpleImage(fileName);
        break;
      default:
        // For other file types, create a simple text file as placeholder
        const placeholderContent = `Placeholder for ${documentType} file`;
        fileInfo = this.fileGenerator.generateTextFile(fileName, placeholderContent);
    }

    return {
      id: faker.string.uuid(),
      name: fileName,
      mimeType: this.getMimeType(documentType),
      size: fileInfo.size,
      userId: user.id,
      tags: tagsForDocument.map(tag => tag.name),
      filePath: fileInfo.filePath
    };
  }

  private generateFileName(fileType: string): string {
    const prefixes = [
      'Q4_Report', 'Annual_Review', 'Project_Proposal', 'Meeting_Notes', 'Budget_Plan',
      'Vacation_Photo', 'Family_Picture', 'Work_Document', 'Personal_Note', 'Reference_Guide'
    ];
    
    const prefix = faker.helpers.arrayElement(prefixes);
    const date = faker.date.recent().toISOString().split('T')[0];
    const randomSuffix = faker.string.alphanumeric(4);
    
    return `${prefix}_${date}_${randomSuffix}.${fileType}`;
  }

  private getMimeType(fileType: string): string {
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'png': 'image/png',
      'txt': 'text/plain',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    
    return mimeTypes[fileType] || 'application/octet-stream';
  }

  private generateTextContent(): string {
    const paragraphs = faker.number.int({ min: 2, max: 5 });
    let content = '';
    
    for (let i = 0; i < paragraphs; i++) {
      content += faker.lorem.paragraph() + '\n\n';
    }
    
    return content.trim();
  }

  private generatePDFContent(): string {
    const sections = faker.number.int({ min: 3, max: 6 });
    let content = '';
    
    for (let i = 0; i < sections; i++) {
      content += faker.lorem.paragraph() + '\n\n';
      content += faker.lorem.sentences(2) + '\n\n';
    }
    
    return content.trim();
  }

  getDocuments(): SeedDocument[] {
    return this.documents;
  }

  getDocumentById(id: string): SeedDocument | undefined {
    return this.documents.find(doc => doc.id === id);
  }

  getDocumentsByUserId(userId: string): SeedDocument[] {
    return this.documents.filter(doc => doc.userId === userId);
  }

  getDocumentsByTag(tagName: string): SeedDocument[] {
    return this.documents.filter(doc => doc.tags.includes(tagName));
  }

  getDocumentsByType(mimeType: string): SeedDocument[] {
    return this.documents.filter(doc => doc.mimeType === mimeType);
  }
} 