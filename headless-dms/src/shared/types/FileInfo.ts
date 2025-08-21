export interface FileInfo {
  path: string;
  name: string;
  mimeType: string;
  size: string;
  fields?: Record<string, string>;
  id?: string;
}
