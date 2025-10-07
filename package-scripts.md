# 📦 Package Scripts Reference

Quick reference for all npm scripts available in MindMesh.

## 🚀 Development

### `npm run dev`
Start the Next.js development server with hot reload.
- Opens at: `http://localhost:3000`
- Auto-reloads on file changes
- Shows detailed error messages

### `npm run electron:dev`
Start the Electron desktop app in development mode.
- Runs Next.js dev server
- Launches Electron window
- Hot reload enabled

## 🏗️ Building

### `npm run build`
Build the Next.js application for production.
- Optimizes code and assets
- Generates static pages
- Creates production bundle

### `npm run electron:build`
Build the Electron desktop application.
- Creates distributable packages
- Platform-specific builds
- Code signing (if configured)

## 🎯 Production

### `npm start`
Start the production Next.js server.
- Requires `npm run build` first
- Optimized for performance
- Production environment

## 🧪 Testing & Verification

### `node verify-setup.js`
Verify your MindMesh installation.
- Checks all dependencies
- Validates configuration
- Tests file structure
- Provides setup guidance

### `node test-ai-chat.js`
Test AI chat functionality.
- Tests Scholar mode
- Tests Explorer mode
- Validates Bytez integration
- Shows sample responses

### `node test-document-analysis.js`
Test document analysis features.
- Tests document upload
- Tests node generation
- Tests memory card creation
- Tests connection suggestions

## 🗄️ Database

### `npm run db:generate`
Generate Prisma client from schema.
- Creates TypeScript types
- Updates database client
- Run after schema changes

### `npm run db:push`
Push schema changes to database.
- Updates database structure
- No migration files created
- Good for development

### `npm run db:studio`
Open Prisma Studio (database GUI).
- Visual database browser
- Edit data directly
- View relationships

### `npm run db:migrate`
Create and run migrations.
- Production-safe migrations
- Version controlled
- Rollback support

## 🔍 Code Quality

### `npm run lint`
Run ESLint code analysis.
- Checks code style
- Finds potential bugs
- Enforces best practices

### `npm run lint:fix`
Auto-fix linting issues.
- Fixes formatting
- Corrects simple errors
- Updates code style

### `npm run type-check`
Run TypeScript type checking.
- Validates types
- Finds type errors
- No code generation

## 🧹 Maintenance

### `npm run clean`
Clean build artifacts.
```bash
rm -rf .next out dist node_modules/.cache
```

### `npm run clean:all`
Deep clean (including node_modules).
```bash
rm -rf .next out dist node_modules
npm install
```

### `npm run update`
Update dependencies.
```bash
npm update
npm audit fix
```

## 📊 Analysis

### `npm run analyze`
Analyze bundle size.
- Shows bundle composition
- Identifies large dependencies
- Optimization opportunities

### `npm run analyze:server`
Analyze server bundle.
- Server-side code analysis
- API route sizes
- Serverless function sizes

## 🔧 Utilities

### `npm run format`
Format code with Prettier.
- Consistent code style
- Auto-formatting
- Applies to all files

### `npm run format:check`
Check code formatting.
- Validates formatting
- No changes made
- CI/CD friendly

## 🎨 Custom Scripts

### Quick Start
```bash
npm install && npm run dev
```

### Full Reset
```bash
npm run clean:all && npm install && npm run build
```

### Production Deploy
```bash
npm run lint && npm run type-check && npm run build && npm start
```

### Test Everything
```bash
node verify-setup.js && node test-ai-chat.js && node test-document-analysis.js
```

## 📝 Script Combinations

### Development Workflow
```bash
# 1. Install and verify
npm install
node verify-setup.js

# 2. Start development
npm run dev

# 3. Test features
node test-ai-chat.js
```

### Pre-Deployment
```bash
# 1. Clean and install
npm run clean:all
npm install

# 2. Verify and test
node verify-setup.js
npm run lint
npm run type-check

# 3. Build
npm run build

# 4. Test production
npm start
```

### Desktop App Development
```bash
# 1. Start web dev server
npm run dev

# 2. In another terminal, start Electron
npm run electron:dev

# 3. Build desktop app
npm run electron:build
```

## 🆘 Troubleshooting Scripts

### Fix Common Issues
```bash
# Port already in use
lsof -ti:3000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :3000   # Windows

# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Reset database
rm -f prisma/dev.db
npm run db:push
```

## 💡 Tips

1. **Always verify setup** after cloning:
   ```bash
   node verify-setup.js
   ```

2. **Test AI before developing**:
   ```bash
   node test-ai-chat.js
   ```

3. **Use concurrent development**:
   ```bash
   npm run dev & npm run electron:dev
   ```

4. **Check types frequently**:
   ```bash
   npm run type-check
   ```

5. **Clean before building**:
   ```bash
   npm run clean && npm run build
   ```

---

**Need more help?** Check the documentation files or run `node verify-setup.js` for guidance.
