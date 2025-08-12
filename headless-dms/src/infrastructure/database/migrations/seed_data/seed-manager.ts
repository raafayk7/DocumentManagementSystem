import { UserSeeder } from './user-seeder.js';
import { TagSeeder } from './tag-seeder.js';
import { DocumentSeeder } from './document-seeder.js';
import { FileGenerator } from './file-generator.js';
import { SeedUser, SeedDocument, SeedTag } from './seed-data.js';

export class SeedManager {
  private userSeeder: UserSeeder;
  private tagSeeder: TagSeeder;
  private documentSeeder: DocumentSeeder;
  private fileGenerator: FileGenerator;

  constructor() {
    this.userSeeder = new UserSeeder();
    this.tagSeeder = new TagSeeder();
    this.documentSeeder = new DocumentSeeder();
    this.fileGenerator = new FileGenerator();
  }

  async runSeeds(): Promise<{
    users: SeedUser[];
    tags: SeedTag[];
    documents: SeedDocument[];
  }> {
    console.log('🌱 Starting seed data generation...');

    try {
      // Generate users first
      console.log('👥 Generating users...');
      const users = await this.userSeeder.generateUsers();
      console.log(`✅ Generated ${users.length} users (${users.filter(u => u.role === 'admin').length} admin)`);

      // Generate tags
      console.log('🏷️ Generating tags...');
      const tags = this.tagSeeder.generateTags();
      console.log(`✅ Generated ${tags.length} tags`);

      // Generate documents (depends on users and tags)
      console.log('📄 Generating documents...');
      const documents = await this.documentSeeder.generateDocuments(users, tags);
      console.log(`✅ Generated ${documents.length} documents`);

      console.log('🎉 Seed data generation completed successfully!');
      
      return { users, tags, documents };
    } catch (error) {
      console.error('❌ Error during seed generation:', error);
      throw error;
    }
  }

  async resetSeeds(): Promise<void> {
    console.log('🧹 Starting seed data reset...');

    try {
      // Clean up generated files
      console.log('🗑️ Cleaning up generated files...');
      this.fileGenerator.cleanupFiles();

      // Reset seeders
      console.log('🔄 Resetting seeders...');
      this.userSeeder = new UserSeeder();
      this.tagSeeder = new TagSeeder();
      this.documentSeeder = new DocumentSeeder();

      console.log('✅ Seed data reset completed!');
    } catch (error) {
      console.error('❌ Error during seed reset:', error);
      throw error;
    }
  }

  async refreshSeeds(): Promise<{
    users: SeedUser[];
    tags: SeedTag[];
    documents: SeedDocument[];
  }> {
    console.log('🔄 Refreshing seed data...');
    
    await this.resetSeeds();
    return await this.runSeeds();
  }

  getSeedSummary(): {
    userCount: number;
    adminCount: number;
    tagCount: number;
    documentCount: number;
    fileTypes: string[];
  } {
    const users = this.userSeeder.getUsers();
    const tags = this.tagSeeder.getTags();
    const documents = this.documentSeeder.getDocuments();

    const fileTypes = [...new Set(documents.map(doc => doc.mimeType))];

    return {
      userCount: users.length,
      adminCount: users.filter(u => u.role === 'admin').length,
      tagCount: tags.length,
      documentCount: documents.length,
      fileTypes
    };
  }

  // Utility methods for accessing seed data
  getUsers(): SeedUser[] {
    return this.userSeeder.getUsers();
  }

  getTags(): SeedTag[] {
    return this.tagSeeder.getTags();
  }

  getDocuments(): SeedDocument[] {
    return this.documentSeeder.getDocuments();
  }

  getUserById(id: string): SeedUser | undefined {
    return this.userSeeder.getUserById(id);
  }

  getDocumentById(id: string): SeedDocument | undefined {
    return this.documentSeeder.getDocumentById(id);
  }

  getTagById(id: string): SeedTag | undefined {
    return this.tagSeeder.getTagById(id);
  }
} 