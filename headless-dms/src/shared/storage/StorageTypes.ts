/**
 * StorageTypes - common types and interfaces for storage operations
 * FileInfo, StorageHealth, StorageStats, and other shared types
 */

/**
 * File information structure for storage operations
 */
export interface FileInfo {
  /** File name with extension */
  name: string;
  
  /** Full path/identifier in storage */
  path: string;
  
  /** File content as Buffer */
  content: Buffer;
  
  /** MIME type of the file */
  mimeType: string;
  
  /** File size in bytes */
  size: number;
  
  /** File metadata (tags, custom properties, etc.) */
  metadata?: Record<string, any>;
  
  /** File creation timestamp */
  createdAt?: Date;
  
  /** File last modified timestamp */
  modifiedAt?: Date;
  
  /** File checksum for integrity verification */
  checksum?: string;
  
  /** Whether the file is a directory */
  isDirectory?: boolean;
}

/**
 * Storage health status and metrics
 */
export interface StorageHealth {
  /** Overall health status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  
  /** Response time in milliseconds */
  responseTime: number;
  
  /** Success rate percentage (0-100) */
  successRate: number;
  
  /** Available storage capacity in bytes */
  availableCapacity: number;
  
  /** Total storage capacity in bytes */
  totalCapacity: number;
  
  /** Last health check timestamp */
  lastChecked: Date;
  
  /** Error message if unhealthy */
  error?: string;
  
  /** Additional health metrics */
  metrics?: Record<string, any>;
}

/**
 * Storage statistics and capacity information
 */
export interface StorageStats {
  /** Total storage capacity in bytes */
  totalCapacity: number;
  
  /** Used storage capacity in bytes */
  usedCapacity: number;
  
  /** Available storage capacity in bytes */
  availableCapacity: number;
  
  /** Total number of files stored */
  totalFiles: number;
  
  /** Total number of directories */
  totalDirectories: number;
  
  /** Storage utilization percentage (0-100) */
  utilizationPercentage: number;
  
  /** Average file size in bytes */
  averageFileSize: number;
  
  /** Largest file size in bytes */
  largestFileSize: number;
  
  /** Storage type/backend identifier */
  storageType: string;
  
  /** Last statistics update timestamp */
  lastUpdated: Date;
}

/**
 * Storage operation result with metadata
 */
export interface StorageOperationResult<T> {
  /** Operation success status */
  success: boolean;
  
  /** Operation result data */
  data?: T;
  
  /** Error message if operation failed */
  error?: string;
  
  /** Operation duration in milliseconds */
  duration: number;
  
  /** Operation timestamp */
  timestamp: Date;
  
  /** Additional operation metadata */
  metadata?: Record<string, any>;
}

/**
 * File upload options
 */
export interface UploadOptions {
  /** Whether to overwrite existing files */
  overwrite?: boolean;
  
  /** Whether to create parent directories */
  createDirectories?: boolean;
  
  /** Custom metadata to attach to the file */
  customMetadata?: Record<string, any>;
  
  /** Whether to generate checksum for integrity */
  generateChecksum?: boolean;
  
  /** Compression options */
  compression?: {
    enabled: boolean;
    algorithm?: 'gzip' | 'brotli' | 'lz4';
    level?: number;
  };
  
  /** Encryption options */
  encryption?: {
    enabled: boolean;
    algorithm?: string;
    key?: string;
  };
}

/**
 * File download options
 */
export interface DownloadOptions {
  /** Whether to verify file integrity */
  verifyIntegrity?: boolean;
  
  /** Expected file checksum for verification */
  expectedChecksum?: string;
  
  /** Whether to stream the download */
  stream?: boolean;
  
  /** Range request for partial downloads */
  range?: {
    start: number;
    end: number;
  };
  
  /** Custom headers for the download request */
  headers?: Record<string, string>;
}

/**
 * Storage strategy configuration
 */
export interface StorageStrategyConfig {
  /** Strategy identifier */
  id: string;
  
  /** Strategy display name */
  name: string;
  
  /** Strategy type */
  type: 'local' | 's3' | 'azure' | 'custom';
  
  /** Whether this strategy is enabled */
  enabled: boolean;
  
  /** Priority for strategy selection (lower number = higher priority) */
  priority: number;
  
  /** Whether to allow fallback to this strategy */
  allowFallback: boolean;
  
  /** Strategy-specific configuration */
  config: Record<string, any>;
  
  /** Health check configuration */
  healthCheck: {
    enabled: boolean;
    interval: number; // milliseconds
    timeout: number; // milliseconds
    failureThreshold: number;
  };
  
  /** Retry configuration */
  retry: {
    enabled: boolean;
    maxAttempts: number;
    backoffMultiplier: number;
    maxBackoff: number; // milliseconds
  };
}
