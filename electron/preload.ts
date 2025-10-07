// Set up global polyfills before any other code runs in Electron renderer
if (typeof (global as any) === 'undefined') {
  (window as any).global = window;
}
if (typeof (process as any) === 'undefined') {
  (window as any).process = { env: { NODE_ENV: 'development' } };
}

import { contextBridge, ipcRenderer } from 'electron'

// Define the API that will be exposed to the renderer process
const electronAPI = {
  // File operations
  showSaveDialog: (options: Electron.SaveDialogOptions) => 
    ipcRenderer.invoke('show-save-dialog', options),
  
  showOpenDialog: (options: Electron.OpenDialogOptions) => 
    ipcRenderer.invoke('show-open-dialog', options),

  // App information
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppPath: (name: string) => ipcRenderer.invoke('get-app-path', name),

  // Window operations
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),

  // Menu events listeners
  onMenuNewProject: (callback: () => void) => {
    ipcRenderer.on('menu-new-project', callback)
    return () => ipcRenderer.removeListener('menu-new-project', callback)
  },

  onMenuOpenProject: (callback: () => void) => {
    ipcRenderer.on('menu-open-project', callback)
    return () => ipcRenderer.removeListener('menu-open-project', callback)
  },

  onMenuAIAssistant: (callback: () => void) => {
    ipcRenderer.on('menu-ai-assistant', callback)
    return () => ipcRenderer.removeListener('menu-ai-assistant', callback)
  },

  onMenuMemoryReview: (callback: () => void) => {
    ipcRenderer.on('menu-memory-review', callback)
    return () => ipcRenderer.removeListener('menu-memory-review', callback)
  },

  onMenuCognitiveMap: (callback: () => void) => {
    ipcRenderer.on('menu-cognitive-map', callback)
    return () => ipcRenderer.removeListener('menu-cognitive-map', callback)
  },

  onImportDocuments: (callback: (filePaths: string[]) => void) => {
    const handler = (_event: any, filePaths: string[]) => callback(filePaths)
    ipcRenderer.on('import-documents', handler)
    return () => ipcRenderer.removeListener('import-documents', handler)
  },

  // Database operations
  database: {
    query: (sql: string, params?: any[]) => 
      ipcRenderer.invoke('db-query', sql, params),
    
    execute: (sql: string, params?: any[]) => 
      ipcRenderer.invoke('db-execute', sql, params),
    
    transaction: (queries: Array<{ sql: string; params?: any[] }>) => 
      ipcRenderer.invoke('db-transaction', queries),
  },

  // Authentication
  auth: {
    login: (email: string, password: string) => 
      ipcRenderer.invoke('auth-login', { username: email, password }),
    
    register: (email: string, password: string, firstName?: string, lastName?: string) => 
      ipcRenderer.invoke('auth-register', { 
        username: email, 
        password, 
        email, 
        name: `${firstName || ''} ${lastName || ''}`.trim() || email 
      }),
    
    logout: () => ipcRenderer.invoke('auth-logout'),
    
    getCurrentUser: () => ipcRenderer.invoke('auth-get-current-user'),
    
    updateProfile: (userId: string, userData: any) => 
      ipcRenderer.invoke('auth-update-profile', userData),
    
    changePassword: (userId: string, oldPassword: string, newPassword: string) => 
      ipcRenderer.invoke('auth-change-password', { currentPassword: oldPassword, newPassword }),
  },

  // Document processing
  documents: {
    import: (filePath: string) => 
      ipcRenderer.invoke('document-import', filePath),
    
    process: (documentId: string) => 
      ipcRenderer.invoke('document-process', documentId),
    
    generateEmbeddings: (text: string) => 
      ipcRenderer.invoke('document-generate-embeddings', text),
    
    search: (query: string, options?: { limit?: number; threshold?: number }) => 
      ipcRenderer.invoke('document-search', query, options),
  },

  // AI services
  ai: {
    chat: (message: string, context?: any) => 
      ipcRenderer.invoke('ai-chat', message, context),
    
    generateSummary: (text: string) => 
      ipcRenderer.invoke('ai-generate-summary', text),
    
    generateQuestions: (text: string) => 
      ipcRenderer.invoke('ai-generate-questions', text),
    
    analyzeContent: (content: string) => 
      ipcRenderer.invoke('ai-analyze-content', content),
  },

  // Memory cards
  memoryCards: {
    create: (cardData: { front: string; back: string; tags?: string[] }) => 
      ipcRenderer.invoke('memory-card-create', cardData),
    
    update: (cardId: string, updates: Partial<{ front: string; back: string; tags: string[] }>) => 
      ipcRenderer.invoke('memory-card-update', cardId, updates),
    
    delete: (cardId: string) => 
      ipcRenderer.invoke('memory-card-delete', cardId),
    
    review: (cardId: string, success: boolean) => 
      ipcRenderer.invoke('memory-card-review', cardId, success),
    
    getDue: () => 
      ipcRenderer.invoke('memory-cards-get-due'),
    
    getAll: (filters?: { tags?: string[]; difficulty?: number }) => 
      ipcRenderer.invoke('memory-cards-get-all', filters),
  },

  // Cognitive maps
  cognitiveMaps: {
    create: (mapData: { title: string; description?: string }) => 
      ipcRenderer.invoke('cognitive-map-create', mapData),
    
    update: (mapId: string, updates: Partial<{ title: string; description: string }>) => 
      ipcRenderer.invoke('cognitive-map-update', mapId, updates),
    
    delete: (mapId: string) => 
      ipcRenderer.invoke('cognitive-map-delete', mapId),
    
    addNode: (mapId: string, nodeData: any) => 
      ipcRenderer.invoke('cognitive-map-add-node', mapId, nodeData),
    
    updateNode: (nodeId: string, updates: any) => 
      ipcRenderer.invoke('cognitive-map-update-node', nodeId, updates),
    
    deleteNode: (nodeId: string) => 
      ipcRenderer.invoke('cognitive-map-delete-node', nodeId),
    
    addConnection: (connectionData: any) => 
      ipcRenderer.invoke('cognitive-map-add-connection', connectionData),
    
    deleteConnection: (connectionId: string) => 
      ipcRenderer.invoke('cognitive-map-delete-connection', connectionId),
  },

  // Notifications
  notifications: {
    create: (notification: { title: string; message: string; type?: string }) => 
      ipcRenderer.invoke('notification-create', notification),
    
    markAsRead: (notificationId: string) => 
      ipcRenderer.invoke('notification-mark-read', notificationId),
    
    getAll: (filters?: { unreadOnly?: boolean }) => 
      ipcRenderer.invoke('notifications-get-all', filters),
  },

  // System
  system: {
    getSystemInfo: () => ipcRenderer.invoke('system-get-info'),
    
    exportData: (options: { includeDocuments?: boolean; includeCards?: boolean }) => 
      ipcRenderer.invoke('system-export-data', options),
    
    importData: (filePath: string) => 
      ipcRenderer.invoke('system-import-data', filePath),
    
    clearCache: () => 
      ipcRenderer.invoke('system-clear-cache'),
  }
}

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// Type definitions for TypeScript
declare global {
  interface Window {
    electronAPI: typeof electronAPI
  }
}