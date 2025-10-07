import { app, BrowserWindow, Menu, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { isDev } from './utils'
import { setupDatabase } from './database'
import { setupAuth } from './auth'

class MindMeshApp {
  private mainWindow: BrowserWindow | null = null
  private isQuitting = false

  constructor() {
    this.setupApp()
  }

  private setupApp(): void {
    // Handle app events
    app.whenReady().then(() => {
      this.createMainWindow()
      this.setupMenu()
      this.setupIPC()
      this.setupDatabase()
      setupAuth()
    })

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit()
      }
    })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow()
      }
    })

    app.on('before-quit', () => {
      this.isQuitting = true
    })
  }

  private createMainWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1000,
      minHeight: 700,
      show: false,
      icon: join(__dirname, '../assets/icon.png'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, 'preload.js'),
        webSecurity: true,
        allowRunningInsecureContent: false,
        experimentalFeatures: false,
        sandbox: false // Keep false for IPC communication
      },
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
    })

    // Load the Next.js app
    const startUrl = isDev 
      ? 'http://localhost:3000' 
      : `file://${join(__dirname, '../out/index.html')}`
    
    // Set Content Security Policy
    this.mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            isDev 
              ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http://localhost:* ws://localhost:*; " +
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; " +
                "style-src 'self' 'unsafe-inline' http://localhost:*; " +
                "img-src 'self' data: blob: http://localhost:*; " +
                "connect-src 'self' http://localhost:* ws://localhost:*;"
              : "default-src 'self'; " +
                "script-src 'self' 'unsafe-inline'; " +
                "style-src 'self' 'unsafe-inline'; " +
                "img-src 'self' data: blob:; " +
                "connect-src 'self';"
          ]
        }
      })
    })
    
    this.mainWindow.loadURL(startUrl)

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show()
      
      if (isDev) {
        this.mainWindow?.webContents.openDevTools()
      }
    })

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null
    })

    // Handle external links
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url)
      return { action: 'deny' }
    })

    // Prevent navigation to external sites
    this.mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
      const parsedUrl = new URL(navigationUrl)
      
      if (parsedUrl.origin !== 'http://localhost:3000' && !navigationUrl.startsWith('file://')) {
        event.preventDefault()
      }
    })
  }

  private setupMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'New Project',
            accelerator: 'CmdOrCtrl+N',
            click: () => {
              this.mainWindow?.webContents.send('menu-action', 'new-project')
            }
          },
          {
            label: 'Open Project',
            accelerator: 'CmdOrCtrl+O',
            click: () => {
              this.mainWindow?.webContents.send('menu-open-project')
            }
          },
          { type: 'separator' },
          {
            label: 'Import Document',
            accelerator: 'CmdOrCtrl+I',
            click: async () => {
              const result = await dialog.showOpenDialog(this.mainWindow!, {
                properties: ['openFile', 'multiSelections'],
                filters: [
                  { name: 'Documents', extensions: ['pdf', 'txt', 'md', 'docx'] },
                  { name: 'All Files', extensions: ['*'] }
                ]
              })
              if (!result.canceled) {
                this.mainWindow?.webContents.send('import-documents', result.filePaths)
              }
            }
          },
          { type: 'separator' },
          {
            label: 'Quit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              app.quit()
            }
          }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Tools',
        submenu: [
          {
            label: 'AI Assistant',
            accelerator: 'CmdOrCtrl+Shift+A',
            click: () => {
              this.mainWindow?.webContents.send('menu-action', 'ai-assistant')
            }
          },
          {
            label: 'Memory Cards Review',
            accelerator: 'CmdOrCtrl+R',
            click: () => {
              this.mainWindow?.webContents.send('menu-memory-review')
            }
          },
          {
            label: 'Cognitive Map',
            accelerator: 'CmdOrCtrl+M',
            click: () => {
              this.mainWindow?.webContents.send('menu-cognitive-map')
            }
          }
        ]
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'close' }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About MindMesh',
            click: () => {
              this.showAboutDialog()
            }
          },
          {
            label: 'Learn More',
            click: () => {
              shell.openExternal('https://github.com/your-repo/mindmesh')
            }
          }
        ]
      }
    ]

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
  }

  private setupIPC(): void {
    // Handle file operations
    ipcMain.handle('show-save-dialog', async (event, options) => {
      const result = await dialog.showSaveDialog(this.mainWindow!, options)
      return result
    })

    ipcMain.handle('show-open-dialog', async (event, options) => {
      const result = await dialog.showOpenDialog(this.mainWindow!, options)
      return result
    })

    // Handle app info
    ipcMain.handle('get-app-version', () => {
      return app.getVersion()
    })

    ipcMain.handle('get-app-path', (event, name) => {
      return app.getPath(name as any)
    })

    // Handle window operations
    ipcMain.handle('minimize-window', () => {
      this.mainWindow?.minimize()
    })

    ipcMain.handle('maximize-window', () => {
      if (this.mainWindow?.isMaximized()) {
        this.mainWindow.unmaximize()
      } else {
        this.mainWindow?.maximize()
      }
    })

    ipcMain.handle('close-window', () => {
      this.mainWindow?.close()
    })
  }

  private async setupDatabase(): Promise<void> {
    try {
      await setupDatabase()
      console.log('Database initialized successfully')
    } catch (error) {
      console.error('Failed to initialize database:', error)
      dialog.showErrorBox('Database Error', 'Failed to initialize the database. The application may not work correctly.')
    }
  }

  private async handleImportDocument(): Promise<void> {
    const result = await dialog.showOpenDialog(this.mainWindow!, {
      title: 'Import Document',
      filters: [
        { name: 'Documents', extensions: ['pdf', 'docx', 'txt', 'md'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile', 'multiSelections']
    })

    if (!result.canceled && result.filePaths.length > 0) {
      this.mainWindow?.webContents.send('import-documents', result.filePaths)
    }
  }

  private showAboutDialog(): void {
    dialog.showMessageBox(this.mainWindow!, {
      type: 'info',
      title: 'About MindMesh',
      message: 'MindMesh',
      detail: `Version: ${app.getVersion()}\n\nAI-powered knowledge companion for learning and research.\n\nBuilt with Electron, Next.js, and TypeScript.`,
      buttons: ['OK']
    })
  }
}

// Initialize the app
new MindMeshApp()

// Handle certificate errors
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (isDev) {
    // In development, ignore certificate errors
    event.preventDefault()
    callback(true)
  } else {
    // In production, use default behavior
    callback(false)
  }
})

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
})