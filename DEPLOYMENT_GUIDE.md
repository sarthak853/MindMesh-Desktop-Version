# 🚀 Deployment Guide - MindMesh

Complete guide for deploying MindMesh to production.

## 📋 Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] API keys secured
- [ ] Database migrations ready
- [ ] Build succeeds locally
- [ ] Performance optimized
- [ ] Security reviewed

---

## 🌐 Deployment Options

### Option 1: Vercel (Recommended)

**Pros:**
- Zero configuration
- Automatic HTTPS
- Global CDN
- Serverless functions
- Free tier available

**Steps:**

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```

4. **Set Environment Variables:**
   ```bash
   vercel env add BYTEZ_API_KEY
   vercel env add AI_PROVIDER
   vercel env add AI_API_BASE_URL
   vercel env add AI_MODEL
   ```

5. **Deploy to Production:**
   ```bash
   vercel --prod
   ```

**Configuration (`vercel.json`):**
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "BYTEZ_API_KEY": "@bytez-api-key",
    "AI_PROVIDER": "bytez",
    "AI_API_BASE_URL": "https://bytez.com/api",
    "AI_MODEL": "amgadhasan/Meta-Llama-3.1-8B-Instruct"
  }
}
```

---

### Option 2: Netlify

**Steps:**

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login:**
   ```bash
   netlify login
   ```

3. **Initialize:**
   ```bash
   netlify init
   ```

4. **Deploy:**
   ```bash
   netlify deploy --prod
   ```

**Configuration (`netlify.toml`):**
```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

---

### Option 3: Docker

**Dockerfile:**
```dockerfile
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - BYTEZ_API_KEY=${BYTEZ_API_KEY}
      - AI_PROVIDER=bytez
      - AI_API_BASE_URL=https://bytez.com/api
      - AI_MODEL=amgadhasan/Meta-Llama-3.1-8B-Instruct
      - REDIS_URL=${REDIS_URL}
    restart: unless-stopped

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped

volumes:
  redis-data:
```

**Deploy:**
```bash
docker-compose up -d
```

---

### Option 4: AWS (EC2 + RDS)

**Steps:**

1. **Launch EC2 Instance:**
   - Ubuntu 22.04 LTS
   - t3.medium or larger
   - Security group: Allow 80, 443, 22

2. **SSH into instance:**
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-ip
   ```

3. **Install dependencies:**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs

   # Install PM2
   sudo npm install -g pm2

   # Install Nginx
   sudo apt install -y nginx
   ```

4. **Clone and setup:**
   ```bash
   git clone your-repo-url
   cd mindmesh
   npm install
   npm run build
   ```

5. **Configure environment:**
   ```bash
   nano .env.local
   # Add your environment variables
   ```

6. **Start with PM2:**
   ```bash
   pm2 start npm --name "mindmesh" -- start
   pm2 save
   pm2 startup
   ```

7. **Configure Nginx:**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

8. **Enable HTTPS with Let's Encrypt:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

---

## 🔐 Environment Variables

### Production Environment

Create `.env.production`:

```env
# AI Configuration
BYTEZ_API_KEY=your_production_key
AI_PROVIDER=bytez
AI_API_BASE_URL=https://bytez.com/api
AI_MODEL=amgadhasan/Meta-Llama-3.1-8B-Instruct

# Database (if using)
DATABASE_URL=postgresql://user:pass@host:5432/mindmesh

# Redis Cache
REDIS_URL=redis://your-redis-url:6379

# Security
JWT_SECRET=your_secure_random_string
SESSION_SECRET=another_secure_random_string

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production

# Analytics (optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Monitoring (optional)
SENTRY_DSN=your_sentry_dsn
```

### Securing Secrets

**Using Vercel:**
```bash
vercel env add BYTEZ_API_KEY production
```

**Using AWS Secrets Manager:**
```bash
aws secretsmanager create-secret \
  --name mindmesh/bytez-api-key \
  --secret-string "your-api-key"
```

**Using Docker Secrets:**
```bash
echo "your-api-key" | docker secret create bytez_api_key -
```

---

## 📊 Database Setup

### PostgreSQL (Production)

1. **Create database:**
   ```sql
   CREATE DATABASE mindmesh;
   CREATE USER mindmesh_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE mindmesh TO mindmesh_user;
   ```

2. **Run migrations:**
   ```bash
   npm run db:migrate
   ```

3. **Seed data (optional):**
   ```bash
   npm run db:seed
   ```

### Redis (Caching)

**Upstash (Serverless Redis):**
1. Go to [upstash.com](https://upstash.com)
2. Create database
3. Copy connection URL
4. Add to environment variables

**Self-hosted:**
```bash
docker run -d \
  --name redis \
  -p 6379:6379 \
  -v redis-data:/data \
  redis:alpine
```

---

## 🔍 Monitoring & Logging

### Application Monitoring

**Sentry Integration:**

```bash
npm install @sentry/nextjs
```

`sentry.client.config.js`:
```javascript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
})
```

### Performance Monitoring

**Vercel Analytics:**
```bash
npm install @vercel/analytics
```

`src/app/layout.tsx`:
```typescript
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

### Log Management

**Winston Logger:**
```bash
npm install winston
```

`src/lib/logger.ts`:
```typescript
import winston from 'winston'

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }))
}
```

---

## 🚦 Health Checks

Create `src/app/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { bytezClient } from '@/lib/ai/bytez-client'

export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      ai: bytezClient.isAvailable() ? 'up' : 'down',
      database: 'up', // Add actual DB check
      redis: 'up', // Add actual Redis check
    }
  }

  const allUp = Object.values(health.services).every(s => s === 'up')
  const status = allUp ? 200 : 503

  return NextResponse.json(health, { status })
}
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

---

## 📈 Performance Optimization

### Build Optimization

`next.config.js`:
```javascript
module.exports = {
  // Enable SWC minification
  swcMinify: true,
  
  // Optimize images
  images: {
    domains: ['your-cdn.com'],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Compression
  compress: true,
  
  // Output standalone for Docker
  output: 'standalone',
  
  // Reduce bundle size
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react'],
  },
}
```

### CDN Configuration

**Cloudflare:**
1. Add your domain to Cloudflare
2. Enable caching rules
3. Configure page rules for static assets
4. Enable Brotli compression

---

## 🔒 Security Hardening

### Security Headers

`next.config.js`:
```javascript
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
        ],
      },
    ]
  },
}
```

### Rate Limiting

Use Vercel's built-in rate limiting or implement custom:

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
})

export async function middleware(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
  const { success } = await ratelimit.limit(ip)
  
  if (!success) {
    return new Response('Too Many Requests', { status: 429 })
  }
}
```

---

## 📱 Post-Deployment

### Verification Checklist

- [ ] Site loads correctly
- [ ] AI features working
- [ ] Document upload working
- [ ] Memory cards functional
- [ ] Mindmaps rendering
- [ ] Mobile responsive
- [ ] HTTPS enabled
- [ ] Analytics tracking
- [ ] Error monitoring active

### Monitoring

Set up alerts for:
- API errors (> 1% error rate)
- Response time (> 2s)
- AI provider failures
- Database connection issues
- High memory usage

---

## 🆘 Troubleshooting

### Common Issues

**Build fails:**
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

**Environment variables not loading:**
- Check variable names match exactly
- Restart deployment
- Verify secrets are set correctly

**AI not working in production:**
- Verify API key is set
- Check API endpoint is accessible
- Review logs for specific errors

---

## 📞 Support

- Documentation: Check all `.md` files
- Logs: Check deployment platform logs
- Health: Visit `/api/health`
- Status: Visit `/api/ai/status`

---

**Your MindMesh deployment is ready! 🎉**
