# ⚡ Quick Reference Card - MindMesh

One-page reference for everything you need to know.

---

## 🚀 Essential Commands

```bash
# Verify setup
node verify-setup.js

# Start development
npm run dev

# Test AI chat
node test-ai-chat.js

# Test document analysis
node test-document-analysis.js

# Build for production
npm run build

# Start production
npm start
```

---

## 📁 Essential Files

```
.env.local                    # Your API keys (CREATE THIS!)
QUICK_START.md               # Start here
AI_FEATURES_GUIDE.md         # Learn features
DOCUMENTATION_INDEX.md       # Navigate docs
verify-setup.js              # Test setup
```

---

## 🔑 Configuration (.env.local)

```env
BYTEZ_API_KEY=your_api_key_here
AI_PROVIDER=bytez
AI_API_BASE_URL=https://bytez.com/api
AI_MODEL=amgadhasan/Meta-Llama-3.1-8B-Instruct
```

---

## 🌐 Essential URLs

```
http://localhost:3000                    # Main app
http://localhost:3000/ai-assistant       # AI chat
http://localhost:3000/documents          # Documents
http://localhost:3000/cognitive-maps     # Mindmaps
http://localhost:3000/memory-cards       # Flashcards
http://localhost:3000/api/ai/status      # AI status
```

---

## 🤖 AI Features

### Chat Modes
- **Scholar Mode**: Research with citations
- **Explorer Mode**: Creative brainstorming

### Capabilities
- Document analysis
- Mindmap generation
- Memory card creation
- Connection suggestions
- Citation extraction

---

## 📚 Documentation Quick Links

| Need | Read |
|------|------|
| Get started | [QUICK_START.md](./QUICK_START.md) |
| Setup API keys | [API_KEYS_GUIDE.md](./API_KEYS_GUIDE.md) |
| Learn AI features | [AI_FEATURES_GUIDE.md](./AI_FEATURES_GUIDE.md) |
| Customize | [CUSTOMIZATION_GUIDE.md](./CUSTOMIZATION_GUIDE.md) |
| Deploy | [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) |
| Navigate all docs | [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md) |

---

## 🆘 Troubleshooting

### "AI provider not configured"
```bash
# Check .env.local exists and has BYTEZ_API_KEY
cat .env.local
npm run dev
```

### "Failed to generate response"
```bash
# Verify setup
node verify-setup.js
# Test API
node test-ai-chat.js
```

### Features not working
```bash
# Clean and reinstall
rm -rf .next node_modules
npm install
npm run dev
```

---

## 🎯 First Steps

1. **Verify**: `node verify-setup.js`
2. **Start**: `npm run dev`
3. **Test**: `node test-ai-chat.js`
4. **Explore**: Open http://localhost:3000
5. **Learn**: Read [QUICK_START.md](./QUICK_START.md)

---

## 💡 Pro Tips

- Always run `node verify-setup.js` first
- Test with `sample-document.md`
- Bookmark [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)
- Check browser console for errors
- Read the guides before customizing

---

## 📊 Project Structure

```
mindmesh/
├── .env.local              # API keys
├── src/
│   ├── app/               # Pages & API routes
│   ├── components/        # UI components
│   ├── lib/              # Services & utilities
│   └── types/            # TypeScript types
├── Documentation/         # 13 guide files
└── Testing/              # 4 test scripts
```

---

## 🔧 Common Tasks

### Change AI Model
Edit `.env.local`:
```env
AI_MODEL=meta-llama/Meta-Llama-3.1-70B-Instruct
```

### Adjust AI Temperature
Edit `src/lib/ai/ai-service.ts`:
```typescript
temperature: 0.8  // 0.0 = focused, 1.0 = creative
```

### Test Everything
```bash
node verify-setup.js && \
node test-ai-chat.js && \
node test-document-analysis.js
```

---

## 📞 Get Help

1. Run `node verify-setup.js`
2. Check [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)
3. Review browser console
4. Read troubleshooting sections

---

**Print this page for quick reference! 📄**

**Happy learning! 🧠✨**
