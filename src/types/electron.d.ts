// Electron API type definitions

interface ElectronAPI {
  auth: {
    getCurrentUser(): Promise<{ success: boolean; user?: any; error?: string }>
    login(email: string, password: string): Promise<{ success: boolean; user?: any; error?: string }>
    register(email: string, password: string, firstName?: string, lastName?: string): Promise<{ success: boolean; user?: any; error?: string }>
    logout(): Promise<void>
    updateProfile(userId: string, data: any): Promise<{ success: boolean; user?: any; error?: string }>
  }
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}