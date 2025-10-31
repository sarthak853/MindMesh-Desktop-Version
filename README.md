# MindMesh Desktop App

A fully integrated desktop AI learning platform for document processing, cognitive mapping, flashcards, and AI chat.

## Features

- **📄 Document Processing**: Upload and process text files, markdown, and PDFs with advanced text extraction
- **🔍 Smart Keyword Extraction**: TF-IDF-based algorithm with automatic categorization and relationship detection
- **🌳 Hierarchical Graphs**: Multi-level concept visualization with category grouping and related terms
- **🎥 Video Integration**: Process YouTube videos (mock implementation)
- **🗺️ Cognitive Mapping**: Interactive concept visualization with vis-network
- **🃏 Advanced Flashcards**: Multiple question types (definition, fill-in-blank, relationships, recall) with spaced repetition
- **💬 AI Chat**: Context-aware chat assistant (Gemini AI integration)
- **💾 Local Database**: SQLite storage with full offline capability
- **🖥️ Desktop Native**: Cross-platform Electron app

## Installation

### Prerequisites
- Node.js 16+

### Setup

1. Install dependencies:
```bash
npm install
```

2. Run the app:
```bash
npm run dev
```

3. Configure AI (optional):
   - Click Settings in the app
   - Add your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

## Building

Create distributable packages:

```bash
# Build for current platform
npm run build

# Create distribution packages
npm run dist
```

## Features Overview

### Document Processing
- Drag & drop or click to upload files
- PDF text extraction with pdf-parse
- Automatic text extraction and concept identification
- Advanced keyword extraction with TF-IDF scoring
- Automatic categorization (definitions, processes, concepts, etc.)

### Hierarchical Keyword Graphs
- Multi-level hierarchy: Root → Categories → Keywords → Related Terms
- TF-IDF-based importance scoring
- Automatic relationship detection between concepts
- Color-coded by category (definitions, processes, important concepts)
- Interactive visualization with zoom, pan, and node details
- Export graph as PNG image

### Cognitive Mapping
- Interactive network visualization
- Node-based concept relationships
- Force-directed and hierarchical layouts with vis-network
- Visual representation of keyword importance (node size)

### Advanced Flashcards
- **Definition Cards**: "What is X?" with context-extracted answers
- **Fill-in-Blank**: Test recall with sentence completion
- **Relationship Cards**: Explore connections between concepts
- **Category Recall**: List multiple terms from a category
- Difficulty-based categorization (easy, medium, hard)
- Spaced repetition scheduling
- Integrated with keyword extraction

### AI Chat Assistant
- Context-aware responses using uploaded content
- Mock responses when API key not configured
- Conversation history management

### Database
- SQLite database stored in user data directory
- Automatic initialization on first run
- Full CRUD operations for all content types

## Project Structure

```
├── src/
│   ├── main.js              # Electron main process
│   ├── services/            # Core processing services
│   │   ├── database.js      # SQLite database manager
│   │   ├── documentProcessor.js  # Document processing
│   │   ├── videoProcessor.js     # Video processing
│   │   └── aiChat.js        # AI chat service
│   └── renderer/            # Frontend UI
│       ├── index.html       # Main interface
│       ├── settings.html    # Settings dialog
│       └── styles.css       # Application styles
└── package.json
```

## Technologies

- **Desktop Framework**: Electron
- **Database**: SQLite3 with Node.js bindings
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **NLP & Text Processing**: 
  - pdf-parse for PDF text extraction
  - natural for tokenization and TF-IDF
- **Visualization**: vis-network for cognitive maps and hierarchical graphs
- **AI Integration**: Google Gemini API (optional)
- **Build System**: electron-builder

## New Algorithm Features

### 📚 Documentation
- **[Quick Start Guide](./QUICK_START_GUIDE.md)**: Get started with keyword extraction and hierarchical graphs
- **[Algorithm Documentation](./ALGORITHM_DOCUMENTATION.md)**: Detailed technical documentation of all algorithms

### 🧪 Testing
Run the demo to see the algorithms in action:
```bash
node src/services/algorithmDemo.js
```

### 🎯 Key Algorithms
1. **Keyword Extraction**: TF-IDF-based scoring with automatic categorization
2. **Hierarchical Structure**: Multi-level concept organization
3. **Relationship Detection**: Find co-occurring terms and connections
4. **Smart Flashcards**: Context-aware question generation with multiple types
5. **Graph Visualization**: Interactive hierarchical concept maps

## Data Storage

All data is stored locally in your system's user data directory:
- **Windows**: `%APPDATA%/mindmesh-ai-learning-platform/`
- **macOS**: `~/Library/Application Support/mindmesh-ai-learning-platform/`
- **Linux**: `~/.config/mindmesh-ai-learning-platform/`

## Development

```bash
# Development mode with DevTools
npm run dev

# Production mode
npm start
```

## License

MIT License