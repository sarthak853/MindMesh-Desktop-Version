# 🧠 MindMesh

> **A next-generation AI-powered knowledge and learning platform that serves as an intelligent companion for students, researchers, and lifelong learners.**

[![Next.js](https://img.shields.io/badge/Next.js-14.2.5-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4.5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![Electron](https://img.shields.io/badge/Electron-37.3.1-47848F?style=flat-square&logo=electron)](https://www.electronjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.15.0-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.1-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

## ✨ Features

### 🗺️ **Cognitive Mapping**
- Interactive visual mind maps to represent knowledge networks
- Drag-and-drop node positioning with relationship connections
- Document integration with automatic node generation
- Export capabilities for sharing and presentation

### 🤖 **AI Assistant**
- **Scholar Mode**: Research-focused with citation tracking and source verification
- **Explorer Mode**: Creative synthesis and ideation support
- Multiple AI provider support (Bytez, OpenAI, Hugging Face)
- Context-aware conversations with document integration
- Powered by Meta-Llama-3.1-8B-Instruct via Bytez API

### 🧠 **Memory Augmentation**
- Spaced repetition system with smart flashcards
- Performance tracking and adaptive scheduling
- Bulk card creation from documents
- Progress analytics and retention metrics

### 👥 **Collaborative Workspaces**
- Real-time collaborative editing with operational transformation
- Project management with user permissions
- Shared document libraries with version control
- Peer annotation and discussion threads

### 🎨 **Media Synthesis**
- AI-powered infographic generation
- Text-to-speech for podcast creation
- Video explainer generation with narration
- Multilingual and accessibility support

### 💪 **Wellness Dashboard**
- Pomodoro timer and focus session management
- Activity tracking and productivity analytics
- Micro-meditation and wellness prompts
- Stress and fatigue detection algorithms

## 🚀 Tech Stack

### **Frontend & Desktop**
- **Next.js 14.2.5** - React framework with App Router
- **React 18.2.0** - UI library with TypeScript
- **Electron 37.3.1** - Cross-platform desktop application
- **Tailwind CSS 3.4.1** - Utility-first styling
- **Radix UI** - Headless component library
- **ReactFlow 11.11.4** - Interactive node-based diagrams

### **Backend & Database**
- **Prisma 5.15.0** - Type-safe database ORM
- **SQLite** - Local database for desktop app
- **Redis** - Caching and session management
- **Next.js API Routes** - Serverless backend functions

### **AI & Machine Learning**
- **Bytez API** - Primary AI provider with Meta-Llama models
- **OpenAI API** - Alternative GPT models for AI assistance
- **Hugging Face** - Additional AI provider option
- **Vector Embeddings** - Semantic search and document analysis
- **Citation System** - Source tracking and verification

### **Real-time & Communication**
- **Socket.io** - Real-time collaborative features
- **WebSocket** - Live cursor tracking and updates
- **Operational Transformation** - Conflict resolution

### **Development & Build**
- **TypeScript 5.4.5** - Type safety and developer experience
- **ESLint** - Code quality and consistency
- **Electron Builder** - Desktop app packaging
- **Concurrently** - Development workflow automation

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+** - JavaScript runtime
- **npm** or **yarn** - Package manager
- **Git** - Version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/mindmesh.git
   cd mindmesh
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure your environment variables:
   ```env
   # AI Configuration (Bytez - Recommended)
   BYTEZ_API_KEY=your_bytez_api_key
   AI_PROVIDER=bytez
   AI_API_BASE_URL=https://bytez.com/api
   AI_MODEL=amgadhasan/Meta-Llama-3.1-8B-Instruct
   
   # Database
   DATABASE_URL="file:./dev.db"
   
   # Optional: Alternative AI providers
   OPENAI_API_KEY=your_openai_key
   HUGGINGFACE_API_KEY=your_huggingface_token
   ```
   
   **Get your Bytez API key**: Visit [bytez.com](https://bytez.com) to sign up and get your free API key.
   
   See [API_KEYS_GUIDE.md](./API_KEYS_GUIDE.md) for detailed setup instructions.

4. **Set up the database**
   ```bash
   npm run db:generate
   npm run db:push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open the application**
   - Web: [http://localhost:3000](http://localhost:3000)
   - Desktop: `npm run electron:dev`

## 📁 Project Structure

```
mindmesh/
├── 📁 src/
│   ├── 📁 app/                    # Next.js App Router pages
│   │   ├── 📁 ai-assistant/       # AI chat interface
│   │   ├── 📁 cognitive-maps/     # Mind mapping interface
│   │   ├── 📁 documents/          # Document management
│   │   ├── 📁 memory-cards/       # Spaced repetition system
│   │   └── 📁 api/                # Backend API routes
│   ├── 📁 components/             # Reusable UI components
│   │   ├── 📁 ai/                 # AI-related components
│   │   ├── 📁 cognitive-map/      # Mind mapping components
│   │   ├── 📁 memory-cards/       # Flashcard components
│   │   └── 📁 ui/                 # Base UI components
│   ├── 📁 lib/                    # Utility functions & services
│   │   ├── 📁 ai/                 # AI service integrations
│   │   ├── 📁 repositories/       # Data access layer
│   │   └── 📁 document-processing/ # Document analysis
│   └── 📁 types/                  # TypeScript definitions
├── 📁 electron/                   # Desktop app configuration
├── 📁 prisma/                     # Database schema & migrations
├── 📁 .kiro/specs/               # Project specifications
└── 📄 Configuration files
```

## 🛠️ Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint code analysis |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Prisma Studio |
| `npm run electron:dev` | Start desktop app in development |
| `npm run electron:build` | Build desktop app for distribution |

## 🎯 Key Features Demo

### Cognitive Mapping
Create interactive knowledge networks with drag-and-drop nodes and connections.

### AI Assistant Modes
- **Scholar Mode**: Research assistance with citations
- **Explorer Mode**: Creative brainstorming and ideation

### Memory Cards
Spaced repetition learning with adaptive scheduling based on performance.

### Real-time Collaboration
Multiple users can edit documents and maps simultaneously.

## 🤝 Contributing

This project follows **spec-driven development**. See the `.kiro/specs/mindmesh/` directory for:
- 📋 **Requirements** - Feature specifications
- 🎨 **Design** - Architecture and UI/UX decisions  
- ✅ **Tasks** - Implementation checklist

### Development Workflow
1. Review specifications in `.kiro/specs/`
2. Pick a task from `tasks.md`
3. Implement following the design patterns
4. Test thoroughly before submitting PR

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern web technologies and AI APIs
- Inspired by tools like Obsidian, Notion, and Anki
- Designed for the future of learning and knowledge work

---

**Made with ❤️ for learners, researchers, and knowledge workers everywhere.**