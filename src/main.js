const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

// Import our services
const DatabaseManager = require('./services/database');
const DocumentProcessor = require('./services/documentProcessor');
const VideoProcessor = require('./services/videoProcessor');
const AIChatService = require('./services/aiChat');

let mainWindow;
let db;
let documentProcessor;
let videoProcessor;
let aiChat;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    // icon: path.join(__dirname, '../assets/icon.png'), // Icon disabled for now
    show: false // Don't show until ready
  });

  mainWindow.loadFile('src/renderer/index.html');
  
  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
  
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

async function initializeServices() {
  try {
    // Initialize database
    db = new DatabaseManager();
    await db.initialize();
    
    // Initialize processors
    documentProcessor = new DocumentProcessor();
    videoProcessor = new VideoProcessor();
    aiChat = new AIChatService();
    
    console.log('All services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize services:', error);
  }
}

app.whenReady().then(async () => {
  await initializeServices();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (db) {
    db.close();
  }
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers for frontend-backend communication

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Documents', extensions: ['txt', 'md', 'pdf'] },
      { name: 'Text Files', extensions: ['txt', 'md'] },
      { name: 'PDF Files', extensions: ['pdf'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('upload-document', async (event, filePath) => {
  try {
    const filename = path.basename(filePath);
    
    // Process the document with new algorithms
    const processed = await documentProcessor.processFile(filePath);
    
    // Store in database
    const docId = await db.storeDocument(filename, processed.content, filePath);
    await db.storeConcepts(docId, 'document', processed.concepts);
    await db.storeFlashcards(docId, processed.flashcards);
    
    // Store cognitive map (hierarchical graph)
    await db.storeCognitiveMap(docId, 'document', processed.cognitiveMap);
    
    // Store keywords and hierarchy in database (add to concepts table as metadata)
    await db.runQuery(
      'UPDATE documents SET keywords = ?, hierarchy = ? WHERE id = ?',
      [JSON.stringify(processed.keywords), JSON.stringify(processed.hierarchy), docId]
    );
    
    return {
      success: true,
      document_id: docId,
      filename: filename,
      concepts_count: processed.concepts.length,
      flashcards_count: processed.flashcards.length,
      keywords_count: processed.keywords.length
    };
  } catch (error) {
    console.error('Document upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('process-video', async (event, videoUrl) => {
  try {
    // Process the video
    const processed = await videoProcessor.processVideo(videoUrl);
    
    // Store in database
    const videoId = await db.storeVideo(videoUrl, processed.title, processed.transcript);
    await db.storeConcepts(videoId, 'video', processed.concepts);
    await db.storeFlashcards(videoId, processed.flashcards);
    
    // Generate and store cognitive map
    const cognitiveMap = videoProcessor.generateCognitiveMap(processed.concepts);
    await db.storeCognitiveMap(videoId, 'video', cognitiveMap);
    
    return {
      success: true,
      video_id: videoId,
      title: processed.title,
      concepts_count: processed.concepts.length,
      flashcards_count: processed.flashcards.length
    };
  } catch (error) {
    console.error('Video processing error:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('get-documents', async () => {
  try {
    const documents = await db.getAllDocuments();
    const videos = await db.getAllVideos();
    
    return {
      success: true,
      documents: documents.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        type: 'document',
        created_at: doc.created_at
      })),
      videos: videos.map(video => ({
        id: video.id,
        title: video.title,
        type: 'video',
        url: video.url,
        created_at: video.created_at
      }))
    };
  } catch (error) {
    console.error('Get documents error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-cognitive-map', async (event, contentId) => {
  try {
    const cognitiveMap = await db.getCognitiveMap(contentId);
    return {
      success: true,
      cognitive_map: cognitiveMap
    };
  } catch (error) {
    console.error('Get cognitive map error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-keywords', async (event, contentId) => {
  try {
    const doc = await db.getQuery('SELECT keywords, hierarchy FROM documents WHERE id = ?', [contentId]);
    
    if (doc && doc.keywords) {
      return {
        success: true,
        keywords: JSON.parse(doc.keywords),
        hierarchy: doc.hierarchy ? JSON.parse(doc.hierarchy) : null
      };
    }
    
    return {
      success: false,
      error: 'Keywords not found'
    };
  } catch (error) {
    console.error('Get keywords error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-hierarchical-graph', async (event, contentId) => {
  try {
    const cognitiveMap = await db.getCognitiveMap(contentId);
    const doc = await db.getQuery('SELECT filename FROM documents WHERE id = ?', [contentId]);
    
    if (!cognitiveMap || !cognitiveMap.nodes) {
      return { success: false, error: 'No graph data available' };
    }
    
    // Create new window for hierarchical graph
    const graphWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      parent: mainWindow,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      },
      title: `Hierarchical Graph - ${doc?.filename || 'Document'}`
    });
    
    graphWindow.loadFile('src/renderer/hierarchicalGraph.html');
    
    // Pass graph data when window is ready
    graphWindow.webContents.on('did-finish-load', () => {
      graphWindow.webContents.executeJavaScript(`
        window.graphData = ${JSON.stringify(cognitiveMap)};
        document.getElementById('documentName').textContent = '${doc?.filename || 'Document'}';
        loadGraphData();
      `);
    });
    
    return { success: true };
  } catch (error) {
    console.error('Open hierarchical graph error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-flashcards', async (event, contentId) => {
  try {
    const flashcards = await db.getFlashcards(contentId);
    return {
      success: true,
      flashcards: flashcards
    };
  } catch (error) {
    console.error('Get flashcards error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('chat-message', async (event, message, contentId = null) => {
  try {
    let context = null;
    
    if (contentId) {
      const concepts = await db.getConcepts(contentId);
      context = { concepts };
    }
    
    const response = await aiChat.generateResponse(message, context);
    
    return {
      success: true,
      response: response
    };
  } catch (error) {
    console.error('Chat error:', error);
    return {
      success: false,
      error: error.message,
      response: "I'm sorry, I encountered an error. Please try again."
    };
  }
});

ipcMain.handle('set-api-key', async (event, apiKey) => {
  try {
    aiChat.setApiKey(apiKey);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-settings', async () => {
  const settingsWindow = new BrowserWindow({
    width: 600,
    height: 400,
    parent: mainWindow,
    modal: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    resizable: false,
    minimizable: false,
    maximizable: false
  });
  
  settingsWindow.loadFile('src/renderer/settings.html');
  settingsWindow.setMenuBarVisibility(false);
});