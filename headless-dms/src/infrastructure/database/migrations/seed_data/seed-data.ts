export interface SeedConfig {
  users: {
    count: number;
    adminCount: number;
  };
  documents: {
    count: number;
    fileTypes: string[];
    tagCount: number;
  };
  tags: string[];
}

export const SEED_CONFIG: SeedConfig = {
  users: {
    count: 5,
    adminCount: 1
  },
  documents: {
    count: 10,
    fileTypes: ['pdf', 'jpg', 'png', 'txt', 'docx'],
    tagCount: 8
  },
  tags: [
    'work', 'personal', 'important', 'draft', 'archived', 'active', 'pdf', 'image'
  ]
};

export interface SeedUser {
  id: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  firstName: string;
  lastName: string;
}

export interface SeedDocument {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  userId: string;
  tags: string[];
  filePath: string;
}

export interface SeedTag {
  id: string;
  name: string;
  color?: string;
} 