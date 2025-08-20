import { faker } from '@faker-js/faker';
import { SeedUser, SeedDocument } from './seed-data.js';
import { FileGenerator } from './file-generator.js';

export class DocumentSeeder {
  private fileGenerator: FileGenerator;

  constructor() {
    this.fileGenerator = new FileGenerator();
  }

  async generateDocuments(users: SeedUser[], count: number = 20): Promise<SeedDocument[]> {
    const documents: SeedDocument[] = [];
    const documentTypes = ['txt', 'pdf', 'docx', 'jpg', 'png'];

    for (let i = 0; i < count; i++) {
      const user = faker.helpers.arrayElement(users);
      const documentType = faker.helpers.arrayElement(documentTypes);
      const fileName = this.generateFileName(documentType);
      
      // Generate tags for this document
      const tagsForDocument = this.generateTagsForDocument();
      
      let fileInfo: { filePath: string; size: number };

      // Generate different types of files
      switch (documentType) {
        case 'txt':
          const textContent = this.generateTextContent();
          fileInfo = this.fileGenerator.generateTextFile(fileName, textContent);
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

      documents.push({
        id: faker.string.uuid(),
        name: fileName,
        mimeType: this.getMimeType(documentType),
        size: fileInfo.size,
        userId: user.id,
        tags: tagsForDocument.map(tag => tag.name),
        filePath: fileInfo.filePath,
        metadata: this.generateMetadata(user, documentType)
      });
    }

    return documents;
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

  private generateTagsForDocument(): Array<{ name: string }> {
    const allTags = [
      'personal', 'work', 'finance', 'health', 'education', 'travel', 'family',
      'business', 'legal', 'medical', 'academic', 'creative', 'technical',
      'confidential', 'draft', 'final', 'archived', 'urgent', 'review'
    ];
    
    const tagCount = faker.number.int({ min: 1, max: 4 });
    const selectedTags = faker.helpers.arrayElements(allTags, tagCount);
    
    return selectedTags.map(tag => ({ name: tag }));
  }

  private generateMetadata(user: SeedUser, documentType: string): Record<string, string> {
    const metadata: Record<string, string> = {
      author: `${user.firstName} ${user.lastName}`,
      department: faker.commerce.department(),
      project: faker.company.catchPhrase(),
      version: faker.string.alphanumeric(3),
      status: faker.helpers.arrayElement(['draft', 'review', 'approved', 'final']),
      priority: faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent']),
      createdAt: faker.date.recent().toISOString(),
      updatedAt: faker.date.recent().toISOString()
    };

    // Add type-specific metadata
    switch (documentType) {
      case 'pdf':
        metadata.title = faker.company.catchPhrase();
        metadata.author = faker.person.fullName();
        metadata.pages = faker.number.int({ min: 1, max: 50 }).toString();
        metadata.keywords = faker.helpers.arrayElements(['business', 'strategy', 'analysis', 'report', 'planning'], 3).join(', ');
        break;
      case 'docx':
        metadata.title = faker.company.catchPhrase();
        metadata.template = faker.helpers.arrayElement(['standard', 'executive', 'technical', 'creative']);
        metadata.wordCount = faker.number.int({ min: 100, max: 5000 }).toString();
        break;
      case 'jpg':
      case 'png':
        metadata.camera = faker.helpers.arrayElement(['iPhone 15', 'Canon EOS R5', 'Sony A7III', 'Nikon Z6']);
        metadata.location = faker.location.city();
        metadata.event = faker.helpers.arrayElement(['vacation', 'work', 'family', 'travel', 'celebration']);
        break;
      case 'txt':
        metadata.category = faker.helpers.arrayElement(['note', 'journal', 'idea', 'reminder', 'draft']);
        metadata.lines = faker.number.int({ min: 10, max: 100 }).toString();
        break;
    }

    return metadata;
  }
}
