# 🎨 Customization Guide - MindMesh

This guide shows you how to customize MindMesh to fit your needs.

## 🤖 AI Model Customization

### Changing AI Models

Edit `.env.local` to use different models:

#### Bytez Models

```env
# Fast, efficient model (current)
AI_MODEL=amgadhasan/Meta-Llama-3.1-8B-Instruct

# Larger, more capable model
AI_MODEL=meta-llama/Meta-Llama-3.1-70B-Instruct

# Specialized models
AI_MODEL=mistralai/Mistral-7B-Instruct-v0.2
AI_MODEL=google/gemma-2-9b-it
```

### Adjusting AI Parameters

Edit `src/lib/ai/ai-service.ts`:

```typescript
// Temperature (0.0 = focused, 1.0 = creative)
temperature: 0.7  // Default

// Max tokens (response length)
maxTokens: 2000  // Default

// Top P (nucleus sampling)
top_p: 0.9  // Add this parameter
```

### Custom Prompts

Edit `src/lib/ai/prompt-templates.ts`:

```typescript
export const CUSTOM_PROMPT = `
Your custom system prompt here...
Be specific about:
- Tone and style
- Output format
- Special instructions
`
```

---

## 🎨 UI Customization

### Theme Colors

Edit `src/app/globals.css`:

```css
:root {
  /* Primary colors */
  --primary: 220 90% 56%;
  --primary-foreground: 0 0% 100%;
  
  /* Accent colors */
  --accent: 220 90% 56%;
  --accent-foreground: 0 0% 100%;
  
  /* Background */
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
}
```

### Dark Mode

Already configured! Toggle in UI or customize:

```css
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... other dark mode colors */
}
```

### Custom Fonts

Edit `src/app/layout.tsx`:

```typescript
import { Inter, Roboto } from 'next/font/google'

const customFont = Roboto({
  weight: ['400', '700'],
  subsets: ['latin'],
})
```

---

## 📊 Feature Customization

### Memory Card Settings

Edit `src/lib/spaced-repetition.ts`:

```typescript
// Spaced repetition intervals (days)
const INTERVALS = {
  again: 1,      // Review tomorrow
  hard: 3,       // Review in 3 days
  good: 7,       // Review in 1 week
  easy: 14,      // Review in 2 weeks
}

// Difficulty multipliers
const DIFFICULTY_MULTIPLIER = {
  1: 1.0,   // Easy cards
  2: 1.5,   // Medium cards
  3: 2.0,   // Hard cards
}
```

### Document Upload Limits

Edit `src/app/api/documents/upload/route.ts`:

```typescript
// Max file size (bytes)
const MAX_FILE_SIZE = 10 * 1024 * 1024  // 10MB

// Allowed file types
const ALLOWED_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
```

### Mindmap Node Types

Edit `src/types/index.ts`:

```typescript
export type NodeType = 
  | 'concept'
  | 'person'
  | 'method'
  | 'theory'
  | 'event'      // Add custom type
  | 'location'   // Add custom type
```

---

## 🔧 Advanced Customization

### Custom AI Provider

Create `src/lib/ai/custom-provider.ts`:

```typescript
export class CustomAIProvider {
  private apiKey: string
  private baseURL: string

  constructor() {
    this.apiKey = process.env.CUSTOM_API_KEY || ''
    this.baseURL = process.env.CUSTOM_API_URL || ''
  }

  async chat(messages: any[], options?: any) {
    // Your custom implementation
    const response = await fetch(`${this.baseURL}/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages, ...options })
    })
    
    return response.json()
  }

  isAvailable(): boolean {
    return !!this.apiKey
  }
}

export const customProvider = new CustomAIProvider()
```

Then update `src/lib/ai/ai-service.ts`:

```typescript
import { customProvider } from './custom-provider'

private getClient() {
  const provider = process.env.AI_PROVIDER
  
  if (provider === 'custom' && customProvider.isAvailable()) {
    return customProvider
  }
  // ... existing code
}
```

### Custom Storage Backend

Create `src/lib/storage/custom-storage.ts`:

```typescript
export class CustomStorage {
  async save(key: string, data: any): Promise<void> {
    // Your storage implementation
    // Could be: PostgreSQL, MongoDB, S3, etc.
  }

  async load(key: string): Promise<any> {
    // Your retrieval implementation
  }

  async delete(key: string): Promise<void> {
    // Your deletion implementation
  }
}
```

### Custom Authentication

Edit `src/lib/auth.ts`:

```typescript
export async function customAuth(request: Request) {
  // Integrate with:
  // - Auth0
  // - Firebase Auth
  // - Supabase Auth
  // - Custom JWT
  
  const token = request.headers.get('Authorization')
  // Validate token
  // Return user object
}
```

---

## 📱 Mobile Responsiveness

### Breakpoints

Edit `tailwind.config.ts`:

```typescript
theme: {
  screens: {
    'xs': '475px',
    'sm': '640px',
    'md': '768px',
    'lg': '1024px',
    'xl': '1280px',
    '2xl': '1536px',
  }
}
```

### Mobile-Specific Styles

```css
@media (max-width: 768px) {
  .mindmap-container {
    height: 60vh;
  }
  
  .sidebar {
    display: none;
  }
}
```

---

## 🌐 Internationalization (i18n)

### Setup

Install dependencies:

```bash
npm install next-intl
```

Create `src/i18n/locales/en.json`:

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete"
  },
  "ai": {
    "chat": "AI Chat",
    "analyzing": "Analyzing document...",
    "generating": "Generating response..."
  }
}
```

Create `src/i18n/locales/es.json`:

```json
{
  "common": {
    "save": "Guardar",
    "cancel": "Cancelar",
    "delete": "Eliminar"
  },
  "ai": {
    "chat": "Chat IA",
    "analyzing": "Analizando documento...",
    "generating": "Generando respuesta..."
  }
}
```

---

## 🔌 Plugin System

### Creating a Plugin

Create `src/plugins/my-plugin.ts`:

```typescript
export interface Plugin {
  name: string
  version: string
  init: () => void
  onDocumentUpload?: (doc: Document) => void
  onAIResponse?: (response: AIResponse) => void
}

export const myPlugin: Plugin = {
  name: 'My Custom Plugin',
  version: '1.0.0',
  
  init() {
    console.log('Plugin initialized')
  },
  
  onDocumentUpload(doc) {
    // Custom logic when document is uploaded
    console.log('Document uploaded:', doc.title)
  },
  
  onAIResponse(response) {
    // Custom logic when AI responds
    console.log('AI responded:', response.content.length, 'chars')
  }
}
```

Register in `src/lib/plugin-manager.ts`:

```typescript
import { myPlugin } from '@/plugins/my-plugin'

export class PluginManager {
  private plugins: Plugin[] = []

  register(plugin: Plugin) {
    this.plugins.push(plugin)
    plugin.init()
  }

  trigger(event: string, data: any) {
    this.plugins.forEach(plugin => {
      const handler = plugin[`on${event}`]
      if (handler) handler(data)
    })
  }
}

export const pluginManager = new PluginManager()
pluginManager.register(myPlugin)
```

---

## 📊 Analytics Integration

### Google Analytics

Create `src/lib/analytics.ts`:

```typescript
export const trackEvent = (
  action: string,
  category: string,
  label?: string,
  value?: number
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    })
  }
}

// Usage
trackEvent('ai_chat', 'AI', 'scholar_mode')
trackEvent('document_upload', 'Documents', 'pdf')
```

### Custom Analytics

```typescript
export const customAnalytics = {
  async track(event: string, properties: any) {
    await fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({ event, properties })
    })
  }
}
```

---

## 🎯 Performance Optimization

### Caching Strategy

Edit `src/lib/cache.ts`:

```typescript
// In-memory cache
const cache = new Map<string, { data: any; expires: number }>()

export const cacheService = {
  set(key: string, data: any, ttl: number = 3600) {
    cache.set(key, {
      data,
      expires: Date.now() + ttl * 1000
    })
  },

  get(key: string) {
    const item = cache.get(key)
    if (!item) return null
    if (Date.now() > item.expires) {
      cache.delete(key)
      return null
    }
    return item.data
  }
}
```

### Redis Caching

```typescript
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN!,
})

export const redisCache = {
  async set(key: string, data: any, ttl: number = 3600) {
    await redis.setex(key, ttl, JSON.stringify(data))
  },

  async get(key: string) {
    const data = await redis.get(key)
    return data ? JSON.parse(data as string) : null
  }
}
```

---

## 🔒 Security Customization

### Rate Limiting

Create `src/lib/rate-limit.ts`:

```typescript
const rateLimits = new Map<string, number[]>()

export function rateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now()
  const requests = rateLimits.get(identifier) || []
  
  // Remove old requests
  const validRequests = requests.filter(time => now - time < windowMs)
  
  if (validRequests.length >= maxRequests) {
    return false // Rate limit exceeded
  }
  
  validRequests.push(now)
  rateLimits.set(identifier, validRequests)
  return true
}
```

### API Key Validation

```typescript
export function validateApiKey(key: string): boolean {
  // Custom validation logic
  return key.startsWith('sk-') && key.length === 48
}
```

---

## 📦 Export/Import Customization

### Custom Export Formats

Create `src/lib/exporters/custom-exporter.ts`:

```typescript
export class CustomExporter {
  exportToJSON(data: any): string {
    return JSON.stringify(data, null, 2)
  }

  exportToCSV(cards: MemoryCard[]): string {
    const headers = 'Front,Back,Difficulty,Tags\n'
    const rows = cards.map(card => 
      `"${card.front}","${card.back}",${card.difficulty},"${card.tags.join(';')}"`
    ).join('\n')
    return headers + rows
  }

  exportToAnki(cards: MemoryCard[]): string {
    // Anki format
    return cards.map(card => 
      `${card.front}\t${card.back}\t${card.tags.join(' ')}`
    ).join('\n')
  }
}
```

---

## 🎓 Learning Path Customization

### Custom Learning Algorithms

```typescript
export class CustomLearningPath {
  calculateNextReview(
    lastReview: Date,
    performance: number,
    difficulty: number
  ): Date {
    // Your custom algorithm
    const baseInterval = difficulty * 24 * 60 * 60 * 1000
    const performanceMultiplier = performance / 5
    const nextInterval = baseInterval * performanceMultiplier
    
    return new Date(lastReview.getTime() + nextInterval)
  }

  suggestNextCard(cards: MemoryCard[]): MemoryCard | null {
    // Your custom selection logic
    return cards
      .filter(card => card.nextReview <= new Date())
      .sort((a, b) => a.difficulty - b.difficulty)[0] || null
  }
}
```

---

## 🚀 Deployment Customization

### Environment-Specific Configs

Create `.env.production`:

```env
# Production settings
AI_PROVIDER=bytez
BYTEZ_API_KEY=prod_key_here
REDIS_URL=prod_redis_url
NODE_ENV=production

# Performance
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_CACHE_TTL=7200
```

### Build Optimization

Edit `next.config.js`:

```javascript
module.exports = {
  // Optimize images
  images: {
    domains: ['your-cdn.com'],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Compression
  compress: true,
  
  // Custom webpack config
  webpack: (config) => {
    config.optimization.minimize = true
    return config
  }
}
```

---

## 📝 Documentation

After customizing, update your docs:

1. Document new features in `FEATURES.md`
2. Update API docs in `API_DOCS.md`
3. Add examples to `EXAMPLES.md`
4. Update changelog in `CHANGELOG.md`

---

**Need help with customization?** Check the code comments or create an issue on GitHub!
