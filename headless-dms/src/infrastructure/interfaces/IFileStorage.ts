export interface IFileStorage {
  saveFile(file: Buffer, filename: string): Promise<string>
  getFile(path: string): Promise<Buffer>
  deleteFile(path: string): Promise<boolean>
  fileExists(path: string): Promise<boolean>
  getFileSize(path: string): Promise<number>
  getFileMetadata(path: string): Promise<{
    size: number
    mimeType: string
    lastModified: Date
  }>
} 