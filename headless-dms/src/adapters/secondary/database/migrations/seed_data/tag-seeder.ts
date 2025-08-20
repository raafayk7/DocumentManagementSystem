import { faker } from '@faker-js/faker';
import { SeedTag, SEED_CONFIG } from './seed-data.js';

export class TagSeeder {
  private tags: SeedTag[] = [];

  generateTags(): SeedTag[] {
    this.tags = [];
    
    // Generate predefined tags
    const predefinedTags = [
      { name: 'work', color: '#3b82f6' },
      { name: 'personal', color: '#10b981' },
      { name: 'important', color: '#ef4444' },
      { name: 'draft', color: '#6b7280' },
      { name: 'archived', color: '#8b5cf6' },
      { name: 'active', color: '#f59e0b' },
      { name: 'pdf', color: '#dc2626' },
      { name: 'image', color: '#7c3aed' }
    ];

    predefinedTags.forEach(tag => {
      this.tags.push({
        id: faker.string.uuid(),
        name: tag.name,
        color: tag.color
      });
    });

    // Generate additional random tags if needed
    const additionalTagsNeeded = SEED_CONFIG.tags.length - predefinedTags.length;
    for (let i = 0; i < additionalTagsNeeded; i++) {
      const tag = this.generateRandomTag();
      this.tags.push(tag);
    }

    return this.tags;
  }

  private generateRandomTag(): SeedTag {
    const tagNames = [
      'urgent', 'review', 'final', 'template', 'reference', 'backup', 'shared', 'private'
    ];
    
    const colors = [
      '#3b82f6', '#10b981', '#ef4444', '#6b7280', '#8b5cf6', '#f59e0b', '#dc2626', '#7c3aed'
    ];

    return {
      id: faker.string.uuid(),
      name: faker.helpers.arrayElement(tagNames),
      color: faker.helpers.arrayElement(colors)
    };
  }

  getTags(): SeedTag[] {
    return this.tags;
  }

  getTagById(id: string): SeedTag | undefined {
    return this.tags.find(tag => tag.id === id);
  }

  getTagByName(name: string): SeedTag | undefined {
    return this.tags.find(tag => tag.name === name);
  }

  getRandomTags(count: number): SeedTag[] {
    return faker.helpers.arrayElements(this.tags, count);
  }
} 