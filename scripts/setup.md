# Setup Instructions

If you're experiencing TypeScript or module resolution issues, follow these steps:

## 1. Install Dependencies
```bash
npm install
```

## 2. Generate Prisma Client
```bash
npm run db:generate
```

## 3. Clear Next.js Cache
```bash
rm -rf .next
```

## 4. Restart TypeScript Server
In VS Code: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"

## 5. Check TypeScript Configuration
```bash
npx tsc --noEmit
```

## Common Issues and Solutions

### "Cannot find module 'next/server'"
- Ensure Next.js is properly installed: `npm install next@latest`
- Check that `next-env.d.ts` exists in the root directory
- Restart your IDE/TypeScript server

### Prisma Client Issues
- Run `npm run db:generate` to generate the Prisma client
- Ensure your database connection string is set in `.env`

### Import Path Issues
- Check that `baseUrl` and `paths` are correctly set in `tsconfig.json`
- Ensure the `@/*` alias points to `./src/*`

## Development Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run db:studio` - Open Prisma Studio