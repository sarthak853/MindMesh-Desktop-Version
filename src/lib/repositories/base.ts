// Base repository for Electron SQLite database
export abstract class BaseRepository<T> {
  protected isElectronAvailable(): boolean {
    return typeof window !== 'undefined' && window.electronAPI && window.electronAPI.database
  }

  protected async executeQuery(sql: string, params?: any[]): Promise<any> {
    if (this.isElectronAvailable()) {
      return await window.electronAPI.database.query(sql, params)
    }
    // Return empty result for server-side rendering
    return []
  }

  protected async executeCommand(sql: string, params?: any[]): Promise<any> {
    if (this.isElectronAvailable()) {
      return await window.electronAPI.database.execute(sql, params)
    }
    // Return success for server-side rendering
    return { success: true }
  }

  abstract create(data: Partial<T>): Promise<T>
  abstract findById(id: string): Promise<T | null>
  abstract findMany(where?: any): Promise<T[]>
  abstract update(id: string, data: Partial<T>): Promise<T>
  abstract delete(id: string): Promise<void>

  protected handleError(error: any, operation: string): never {
    console.error(`Database error in ${operation}:`, error)
    throw new Error(`Failed to ${operation}: ${error.message}`)
  }
}