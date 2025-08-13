import { UserSeeder } from './user-seeder.js';
import { TagSeeder } from './tag-seeder.js';
import { DocumentSeeder } from './document-seeder.js';
import { FileGenerator } from './file-generator.js';
import { SeedUser, SeedDocument, SeedTag } from './seed-data.js';
import { db } from '../../index.js';
import { users, documents } from '../../schema.js';
import { eq } from 'drizzle-orm';

export class SeedManager {
  private userSeeder: UserSeeder;
  private tagSeeder: TagSeeder;
  private documentSeeder: DocumentSeeder;
  private fileGenerator: FileGenerator;
  
  // Store generated data in memory for access
  private generatedUsers: SeedUser[] = [];
  private generatedTags: SeedTag[] = [];
  private generatedDocuments: SeedDocument[] = [];

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
      this.generatedUsers = await this.userSeeder.generateUsers();
      console.log(`✅ Generated ${this.generatedUsers.length} users (${this.generatedUsers.filter(u => u.role === 'admin').length} admin)`);

      // Generate tags
      console.log('🏷️ Generating tags...');
      this.generatedTags = this.tagSeeder.generateTags();
      console.log(`✅ Generated ${this.generatedTags.length} tags`);

      // Generate documents (depends on users and tags)
      console.log('📄 Generating documents...');
      this.generatedDocuments = await this.documentSeeder.generateDocuments(this.generatedUsers);
      console.log(`✅ Generated ${this.generatedDocuments.length} documents`);

      // Save to database
      console.log('💾 Saving seed data to database...');
      await this.saveToDatabase(this.generatedUsers, this.generatedTags, this.generatedDocuments);
      console.log('✅ Seed data saved to database successfully!');

      console.log('🎉 Seed data generation completed successfully!');
      
      return { users: this.generatedUsers, tags: this.generatedTags, documents: this.generatedDocuments };
    } catch (error) {
      console.error('❌ Error during seed generation:', error);
      throw error;
    }
  }

  private async saveToDatabase(usersData: SeedUser[], tagsData: SeedTag[], documentsData: SeedDocument[]): Promise<void> {
    try {
      // Save users to database
      console.log('👥 Saving users to database...');
      for (const user of usersData) {
        await db.insert(users).values({
          id: user.id,
          email: user.email,
          passwordHash: user.password,
          role: user.role,
          createdAt: new Date(),
          updatedAt: new Date()
        }).onConflictDoNothing();
      }

      // Note: Tags are stored as arrays in the documents table, not as separate entities
      console.log('🏷️ Tags will be stored with documents...');

      // Save documents to database (including their tags)
      console.log('📄 Saving documents to database...');
      for (const doc of documentsData) {
        await db.insert(documents).values({
          id: doc.id,
          name: doc.name,
          filePath: doc.filePath,
          mimeType: doc.mimeType,
          size: doc.size.toString(),
          tags: doc.tags,
          metadata: doc.metadata, // Use actual metadata from seed data
          createdAt: new Date(),
          updatedAt: new Date()
        }).onConflictDoNothing();
      }
    } catch (error) {
      console.error('❌ Error saving to database:', error);
      throw error;
    }
  }

  async resetSeeds(): Promise<void> {
    console.log('🧹 Starting seed data reset...');

    try {
      // Clean up generated files
      console.log('🗑️ Cleaning up generated files...');
      this.fileGenerator.cleanupFiles();

      // Clear only seed-generated database data (preserve manually created data)
      console.log('🗑️ Clearing seed-generated database data...');
      
      // Delete only documents that match seed naming pattern
      const seedDocuments = await db.select().from(documents);
      for (const doc of seedDocuments) {
        if (this.isSeedGeneratedDocument(doc.name)) {
          await db.delete(documents).where(eq(documents.id, doc.id));
          console.log(`🗑️ Deleted seed document: ${doc.name}`);
        }
      }
      
      // Delete only users that match seed naming pattern (email patterns)
      const seedUsers = await db.select().from(users);
      for (const user of seedUsers) {
        if (this.isSeedGeneratedUser(user.email)) {
          await db.delete(users).where(eq(users.id, user.id));
          console.log(`🗑️ Deleted seed user: ${user.email}`);
        }
      }

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

  // Helper methods to identify seed-generated data
  private isSeedGeneratedDocument(name: string): boolean {
    // Pattern: Name_Date_RandomSuffix.ext (e.g., Q4_Report_2025-08-13_y9G8.docx)
    const seedPattern = /^[A-Za-z_]+_\d{4}-\d{2}-\d{2}_[A-Za-z0-9]{4}\.(txt|pdf|png|jpg|jpeg|docx)$/;
    return seedPattern.test(name);
  }

  private isSeedGeneratedUser(email: string): boolean {
    // Pattern: testadmin1@postman.com, testuser2@postman.com, etc.
    const seedPattern = /^test(admin|user)\d+@postman\.com$/;
    return seedPattern.test(email);
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

  // Method to completely clear all data (use with caution!)
  async clearAllData(): Promise<void> {
    console.log('⚠️ Clearing ALL data from database (use with caution!)...');
    
    try {
      // Clean up generated files
      console.log('🗑️ Cleaning up generated files...');
      this.fileGenerator.cleanupFiles();

      // Clear ALL database data
      console.log('🗑️ Clearing ALL database data...');
      await db.delete(documents);
      await db.delete(users);

      // Reset seeders
      console.log('🔄 Resetting seeders...');
      this.userSeeder = new UserSeeder();
      this.tagSeeder = new TagSeeder();
      this.documentSeeder = new DocumentSeeder();

      console.log('✅ All data cleared successfully!');
    } catch (error) {
      console.error('❌ Error during data clear:', error);
      throw error;
    }
  }

  async getSeedSummary(): Promise<{
    userCount: number;
    adminCount: number;
    tagCount: number;
    documentCount: number;
    fileTypes: string[];
  }> {
    try {
      // Query actual database instead of in-memory data
      const userCount = await db.select({ count: users.id }).from(users);
      const adminCount = await db.select({ count: users.id }).from(users).where(eq(users.role, 'admin'));
      const documentCount = await db.select({ count: documents.id }).from(documents);
      
      // Get unique file types
      const allDocs = await db.select({ mimeType: documents.mimeType }).from(documents);
      const fileTypes = [...new Set(allDocs.map(doc => doc.mimeType))];

      // Count unique tags from all documents
      const allDocTags = await db.select({ tags: documents.tags }).from(documents);
      const uniqueTags = new Set<string>();
      allDocTags.forEach(doc => {
        if (doc.tags) {
          doc.tags.forEach(tag => uniqueTags.add(tag));
        }
      });

      return {
        userCount: userCount.length,
        adminCount: adminCount.length,
        tagCount: uniqueTags.size,
        documentCount: documentCount.length,
        fileTypes
      };
    } catch (error) {
      console.error('❌ Error getting seed summary from database:', error);
      // Fallback to in-memory data if database query fails
      const users = this.generatedUsers;
      const tags = this.generatedTags;
      const documents = this.generatedDocuments;

      const fileTypes = [...new Set(documents.map(doc => doc.mimeType))];

      return {
        userCount: users.length,
        adminCount: users.filter(u => u.role === 'admin').length,
        tagCount: tags.length,
        documentCount: documents.length,
        fileTypes
      };
    }
  }

  // Utility methods for accessing seed data
  getUsers(): SeedUser[] {
    return this.generatedUsers;
  }

  getTags(): SeedTag[] {
    return this.generatedTags;
  }

  getDocuments(): SeedDocument[] {
    return this.generatedDocuments;
  }

  getUserById(id: string): SeedUser | undefined {
    return this.generatedUsers.find(user => user.id === id);
  }

  getDocumentById(id: string): SeedDocument | undefined {
    return this.generatedDocuments.find(doc => doc.id === id);
  }

  getTagById(id: string): SeedTag | undefined {
    return this.generatedTags.find(tag => tag.id === id);
  }
} 