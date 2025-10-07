# 🤖 AI Features Guide - MindMesh with Bytez

This guide covers all AI-powered features in MindMesh using Bytez API.

## 🎯 Overview

MindMesh uses **Bytez API** to power intelligent features that enhance your learning and knowledge management experience.

**Current Configuration:**
- Provider: Bytez
- Model: Meta-Llama-3.1-8B-Instruct
- API Base: https://bytez.com/api

---

## 🚀 Available AI Features

### 1. AI Chat Assistant 💬

Two modes available:

#### Scholar Mode 📚
- **Purpose**: Research-focused, citation-based responses
- **Best for**: Academic work, fact-checking, research
- **Features**:
  - Cites sources from your uploaded documents
  - Provides confidence scores
  - Suggests related concepts
  - Generates actionable next steps

**Example Use Cases:**
- "Summarize the key findings from my research papers"
- "What are the main arguments in this document?"
- "Compare concepts across multiple documents"

#### Explorer Mode 🔍
- **Purpose**: Creative, brainstorming-focused responses
- **Best for**: Ideation, learning new concepts, exploration
- **Features**:
  - More creative and expansive responses
  - Suggests related topics to explore
  - Helps with brainstorming
  - Encourages lateral thinking

**Example Use Cases:**
- "Give me creative ways to learn this topic"
- "What are some interesting applications of this concept?"
- "Help me brainstorm project ideas"

### 2. Document Analysis 📄

Automatically analyze uploaded documents to extract:

- **Key Topics**: Main themes and subjects
- **Summary**: Concise overview of content
- **Concepts**: Important ideas with relevance scores
- **Suggested Nodes**: Auto-generated mindmap nodes

**How to Use:**
1. Upload a document (PDF, TXT, MD)
2. Click "Analyze with AI"
3. Review extracted insights
4. Generate mindmap or memory cards

### 3. Smart Mindmap Generation 🧠

AI creates cognitive maps from your content:

**Features:**
- Automatically identifies key concepts
- Suggests relationships between ideas
- Determines node types (concept, person, method, theory)
- Calculates relevance scores

**Node Types:**
- 📘 Concept: General ideas and topics
- 👤 Person: Authors, researchers, historical figures
- 🔧 Method: Techniques, approaches, processes
- 💡 Theory: Models, frameworks, hypotheses

### 4. Memory Card Generation 🎴

AI generates flashcards from your documents:

**What You Get:**
- Question/Answer pairs
- Difficulty ratings (1-3)
- Relevant tags
- Spaced repetition ready

**Example:**
```
Front: "What is Machine Learning?"
Back: "A subset of AI that enables systems to learn from data without explicit programming"
Difficulty: 1
Tags: ["AI", "Machine Learning", "Basics"]
```

### 5. Connection Suggestions 🔗

AI suggests relationships between concepts:

**Provides:**
- Relationship type (relates_to, causes, enables, etc.)
- Connection strength (1-10)
- Descriptive label
- Explanation of the relationship

**Example:**
```
Node 1: "Machine Learning"
Node 2: "Neural Networks"
Relationship: "implements"
Strength: 9
Label: "uses as foundation"
Explanation: "Neural networks are a key implementation technique in machine learning"
```

### 6. Citation Extraction 📖

In Scholar mode, AI extracts and validates citations:

**Features:**
- Identifies source documents
- Extracts relevant excerpts
- Calculates confidence scores
- Validates citation quality

**Citation Quality Metrics:**
- Average confidence score
- Number of cited sources
- Coverage of available documents
- Relevance to query

---

## 🎮 How to Use AI Features

### Testing AI Chat

1. **Via Browser:**
   - Navigate to AI Assistant page
   - Select mode (Scholar/Explorer)
   - Type your question
   - Review response with citations

2. **Via Test Script:**
   ```bash
   node test-ai-chat.js
   ```

### Analyzing Documents

1. Go to Documents page
2. Upload a document
3. Click "Analyze with AI"
4. Review insights
5. Generate mindmap or cards

### Creating Mindmaps

1. Select a document
2. Click "Generate Mindmap"
3. AI creates nodes and connections
4. Edit and customize as needed
5. Save to your project

### Generating Memory Cards

1. Select content or document
2. Click "Generate Cards"
3. Review AI-generated cards
4. Edit if needed
5. Add to your deck

---

## ⚙️ Configuration Options

### Environment Variables

```env
# Required
BYTEZ_API_KEY=your_api_key_here
AI_PROVIDER=bytez
AI_API_BASE_URL=https://bytez.com/api
AI_MODEL=amgadhasan/Meta-Llama-3.1-8B-Instruct

# Optional
REDIS_URL=your_redis_url  # For caching
```

### Customizing AI Behavior

You can adjust AI parameters in the code:

**Temperature** (Creativity):
- Scholar mode: 0.3 (more focused)
- Explorer mode: 0.8 (more creative)

**Max Tokens** (Response length):
- Default: 1500-2000 tokens
- Adjust in `ai-service.ts`

**Context Window**:
- Conversation history: Last 10 messages
- Document limit: 5 most recent

---

## 🔧 Advanced Features

### Conversation Context

AI maintains context across conversations:

```javascript
{
  userId: "user123",
  mode: "scholar",
  uploadedDocuments: [...],
  conversationHistory: [...],
  currentProject: "My Research"
}
```

### Streaming Responses

For real-time AI responses:

```javascript
const stream = await aiService.generateStreamingResponse(context, query)
// Receive chunks as they're generated
```

### Embeddings & Similarity

Find similar documents using AI embeddings:

```javascript
const embedding = await aiService.generateEmbedding(text)
const similar = await aiService.findSimilarDocuments(embedding, documents)
```

---

## 📊 Performance Tips

### Optimize API Usage

1. **Cache Results**: Enable Redis for caching
2. **Batch Requests**: Process multiple items together
3. **Limit Context**: Only include relevant documents
4. **Adjust Tokens**: Use fewer tokens for simple queries

### Best Practices

- **Scholar Mode**: Include specific documents for better citations
- **Explorer Mode**: Keep queries open-ended
- **Document Analysis**: Use clean, well-formatted documents
- **Memory Cards**: Provide focused content (not entire books)

---

## 🐛 Troubleshooting

### "AI provider not configured"
- Check `.env.local` has `BYTEZ_API_KEY`
- Verify API key is valid
- Restart development server

### "Rate limit exceeded"
- Wait for rate limit to reset
- Check Bytez dashboard for limits
- Consider upgrading plan

### Poor quality responses
- Provide more context in your query
- Include relevant documents
- Try different phrasing
- Switch between Scholar/Explorer modes

### Citations not appearing
- Ensure you're in Scholar mode
- Upload relevant documents first
- Check document content is accessible

---

## 🎯 Use Case Examples

### Research Paper Analysis

```javascript
// Upload research papers
// Use Scholar mode
Query: "What are the main methodologies used across these papers?"
Result: Detailed analysis with citations from each paper
```

### Learning New Topic

```javascript
// Upload learning materials
// Use Explorer mode
Query: "Explain quantum computing like I'm a beginner"
Result: Creative, accessible explanation with analogies
```

### Creating Study Materials

```javascript
// Upload textbook chapter
// Generate memory cards
Result: 10-15 flashcards covering key concepts
```

### Building Knowledge Graph

```javascript
// Upload multiple documents
// Generate mindmap
Result: Interconnected concept map with relationships
```

---

## 🔐 Privacy & Security

- API keys stored in `.env.local` (not committed to git)
- User data never shared with third parties
- Documents processed securely
- Conversation history stored locally
- Citations validated for accuracy

---

## 📈 Future Enhancements

Planned AI features:

- [ ] Multi-language support
- [ ] Voice input/output
- [ ] Image analysis
- [ ] Collaborative AI sessions
- [ ] Custom AI training on your documents
- [ ] Advanced citation formatting
- [ ] Export to research tools (Zotero, Mendeley)

---

## 🆘 Getting Help

**Check Status:**
```bash
curl http://localhost:3000/api/ai/status
```

**Test Chat:**
```bash
node test-ai-chat.js
```

**View Logs:**
Check browser console or terminal for detailed error messages

**Documentation:**
- [Bytez API Docs](https://bytez.com/docs)
- [MindMesh GitHub](your-repo-url)
- [API Keys Guide](./API_KEYS_GUIDE.md)

---

**Remember**: AI is a tool to enhance your learning, not replace critical thinking. Always verify important information and use AI suggestions as a starting point for deeper exploration.
