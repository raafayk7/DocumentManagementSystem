import { writeFileSync, mkdirSync, statSync, createWriteStream, readdirSync, unlinkSync, rmdirSync } from 'fs';
import { join, dirname } from 'path';
import PDFDocument from 'pdfkit';
import { createCanvas } from 'canvas';

export class FileGenerator {
  private uploadsDir: string;

  constructor(uploadsDir: string = 'uploads') {
    this.uploadsDir = uploadsDir;
    this.ensureUploadsDir();
  }

  private ensureUploadsDir(): void {
    try {
      mkdirSync(this.uploadsDir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }
  }

  generateTextFile(fileName: string, content: string): { filePath: string; size: number } {
    const filePath = join(this.uploadsDir, fileName);
    const dir = dirname(filePath);
    
    try {
      mkdirSync(dir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }

    writeFileSync(filePath, content, 'utf8');
    const stats = statSync(filePath);
    
    return {
      filePath: fileName,
      size: stats.size
    };
  }

  generatePDFFile(fileName: string, title: string, content: string): { filePath: string; size: number } {
    const filePath = join(this.uploadsDir, fileName);
    const dir = dirname(filePath);
    
    try {
      mkdirSync(dir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }

    const doc = new PDFDocument();
    const stream = createWriteStream(filePath);
    
    doc.pipe(stream);
    doc.fontSize(20).text(title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(content);
    doc.end();

    return new Promise((resolve) => {
      stream.on('finish', () => {
        const stats = statSync(filePath);
        resolve({
          filePath: fileName,
          size: stats.size
        });
      });
    });
  }

  generateSimpleImage(fileName: string, width: number = 100, height: number = 100): { filePath: string; size: number } {
    const filePath = join(this.uploadsDir, fileName);
    const dir = dirname(filePath);
    
    try {
      mkdirSync(dir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }

    // Create a simple PNG image using canvas
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Fill with a gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#ff6b6b');
    gradient.addColorStop(1, '#4ecdc4');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add some text
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Seed Image', width / 2, height / 2);

    const buffer = canvas.toBuffer('image/png');
    writeFileSync(filePath, buffer);
    
    return {
      filePath: fileName,
      size: buffer.length
    };
  }

  cleanupFiles(): void {
    try {
      // Get all files in the uploads directory
      const files = readdirSync(this.uploadsDir);
      
      // Delete only the seed-generated files (those with our naming pattern)
      for (const file of files) {
        if (this.isSeedGeneratedFile(file)) {
          const filePath = join(this.uploadsDir, file);
          unlinkSync(filePath);
          console.log(`🗑️ Deleted seed file: ${file}`);
        }
      }
      
      console.log('✅ Seed files cleanup completed');
    } catch (error) {
      console.error('❌ Error during file cleanup:', error);
    }
  }

  private isSeedGeneratedFile(fileName: string): boolean {
    // Check if the file matches our seed naming pattern
    // Pattern: Name_Date_RandomSuffix.ext
    const seedPattern = /^[A-Za-z_]+_\d{4}-\d{2}-\d{2}_[A-Za-z0-9]{4}\.(txt|pdf|png|jpg|jpeg|docx)$/;
    return seedPattern.test(fileName);
  }
} 