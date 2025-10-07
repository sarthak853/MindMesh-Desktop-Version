# ⚡ Quick Start Guide - MindMesh

Get up and running with MindMesh in 5 minutes!

## 🎯 What You'll Get

- AI-powered learning assistant
- Smart document analysis
- Interactive mindmaps
- Spaced repetition flashcards
- Knowledge graph visualization

---

## 🚀 Installation (2 minutes)

### Prerequisites

- Node.js 18+ installed
- Bytez API key (free at [bytez.com](https://bytez.com))

### Steps

1. **Clone or download the project**
   ```bash
   cd mindmesh
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API key**
   
   Create `.env.local` file:
   ```env
   BYTEZ_API_KEY=your_api_key_here
   AI_PROVIDER=bytez
   AI_API_BASE_URL=https://bytez.com/api
   AI_MODEL=amgadhasan/Meta-Llama-3.1-8B-Instruct
   ```

4. **Start the app**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

**That's it! 🎉**

---

## 🎮 First Steps (3 minutes)

### 1. Test AI Chat

1. Navigate to **AI Assistant** page
2. Select **Scholar Mode** or **Explorer Mode**
3. Ask a question: "What is machine learning?"
4. Get AI-powered response!

### 2. Upload a Document

1. Go to **Documents** page
2. Click **Upload Document**
3. Choose a file (PDF, TXT, MD)
4. Click **Analyze with AI**
5. See key topics, summary, and concepts!

### 3. Create a Mindmap

1. From analyzed document, click **Generate Mindmap**
2. AI creates nodes and connections
3. Drag nodes to organize
4. Add your own nodes
5. Save to project!

### 4. Generate Flashcards

1. Select document or text
2. Click **Generate Memory Cards**
3. Review AI-generated cards
4. Start studying with spaced repetition!

---

## 🧪 Test Everything

Run the test scripts:

```bash
# Test AI chat
node test-ai-chat.js

# Test document analysis
node test-document-analysis.js
```

---

## 📚 Sample Workflow

### Learning a New Topic

1. **Upload learning materials**
   - PDFs, articles, notes
   
2. **Let AI analyze**
   - Extract key concepts
   - Generate summary
   
3. **Create mindmap**
   - Visualize relationships
   - Add your insights
   
4. **Generate flashcards**
   - AI creates Q&A pairs
   - Study with spaced repetition
   
5. **Chat with AI**
   - Ask questions
   - Explore deeper
   - Get explanations

---

## 🎯 Key Features

### AI Chat Assistant
- **Scholar Mode**: Research-focused with citations
- **Explorer Mode**: Creative brainstorming

### Document Analysis
- Automatic topic extraction
- Smart summarization
- Concept identification
- Node generation

### Cognitive Maps
- Visual knowledge graphs
- Drag-and-drop interface
- Auto-generated connections
- Multiple node types

### Memory Cards
- AI-generated flashcards
- Spaced repetition algorithm
- Difficulty ratings
- Tag organization

---

## 🔧 Configuration

### Change AI Model

Edit `.env.local`:
```env
# Faster, smaller model
AI_MODEL=amgadhasan/Meta-Llama-3.1-8B-Instruct

# Larger, more capable model
AI_MODEL=meta-llama/Meta-Llama-3.1-70B-Instruct
```

### Adjust AI Behavior

Edit `src/lib/ai/ai-service.ts`:
```typescript
// More creative responses
temperature: 0.8

// More focused responses
temperature: 0.3

// Longer responses
maxTokens: 3000
```

---

## 📖 Documentation

- **[API Keys Guide](./API_KEYS_GUIDE.md)** - Get and configure API keys
- **[AI Features Guide](./AI_FEATURES_GUIDE.md)** - All AI capabilities
- **[Customization Guide](./CUSTOMIZATION_GUIDE.md)** - Customize everything
- **[Deployment Guide](./DEPLOYMENT_GUIDE.md)** - Deploy to production
- **[Bytez Setup](./BYTEZ_SETUP.md)** - Bytez-specific setup

---

## 🆘 Troubleshooting

### "AI provider not configured"
```bash
# Check your .env.local file exists
# Verify BYTEZ_API_KEY is set
# Restart the dev server
npm run dev
```

### "Failed to generate response"
```bash
# Check API key is valid
# Visit https://bytez.com to verify
# Check your internet connection
```

### Features not working
```bash
# Clear cache and reinstall
rm -rf .next node_modules
npm install
npm run dev
```

### Test the setup
```bash
# Check AI status
curl http://localhost:3000/api/ai/status

# Should show:
# {
#   "hasBytez": true,
#   "provider": "bytez",
#   "providerAvailable": true
# }
```

---

## 💡 Tips

1. **Start with Scholar Mode** for factual questions
2. **Use Explorer Mode** for creative ideas
3. **Upload relevant documents** for better AI responses
4. **Review AI-generated content** before using
5. **Customize prompts** for your specific needs

---

## 🎓 Learning Path

### Beginner
1. Upload a document
2. Generate mindmap
3. Create memory cards
4. Start reviewing

### Intermediate
1. Use AI chat for questions
2. Analyze multiple documents
3. Create custom connections
4. Organize with projects

### Advanced
1. Customize AI prompts
2. Integrate custom providers
3. Build learning workflows
4. Export and share

---

## 🚀 Next Steps

Now that you're set up:

1. **Explore the UI** - Click around and discover features
2. **Upload your content** - Add your learning materials
3. **Chat with AI** - Ask questions and explore
4. **Create mindmaps** - Visualize your knowledge
5. **Study with cards** - Use spaced repetition

---

## 📞 Need Help?

- Check the documentation files
- Review code comments
- Test with sample scripts
- Check browser console for errors

---

**Happy learning! 🧠✨**

Your AI-powered knowledge management system is ready to use!
