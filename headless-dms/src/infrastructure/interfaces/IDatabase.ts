export interface IDatabase {
  connect(): Promise<void>
  disconnect(): Promise<void>
  transaction<T>(fn: () => Promise<T>): Promise<T>
  getConnection(): any // Returns the underlying connection
}

export interface IUnitOfWork {
  beginTransaction(): Promise<void>
  commit(): Promise<void>
  rollback(): Promise<void>
  isInTransaction(): boolean
} 