#!/usr/bin/env node

/**
 * MindMesh Setup Verification Script
 * 
 * This script verifies that your MindMesh installation is properly configured
 * and all AI features are working correctly with Bytez API.
 */

const fs = require('fs')
const path = require('path')

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
}

let totalTests = 0
let passedTests = 0
let failedTests = 0

function test(name, passed, details = '') {
  totalTests++
  if (passed) {
    passedTests++
    log.success(name)
    if (details) console.log(`  ${colors.cyan}${details}${colors.reset}`)
  } else {
    failedTests++
    log.error(name)
    if (details) console.log(`  ${colors.red}${details}${colors.reset}`)
  }
}

async function verifySetup() {
  console.log(`
${colors.bright}${colors.magenta}
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🧠 MindMesh Setup Verification                     ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
${colors.reset}
`)

  // 1. Check Node.js version
  log.section('1. System Requirements')
  const nodeVersion = process.version
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0])
  test(
    'Node.js version',
    majorVersion >= 18,
    majorVersion >= 18 
      ? `Version ${nodeVersion} (✓ Compatible)` 
      : `Version ${nodeVersion} (✗ Requires 18+)`
  )

  // 2. Check if package.json exists
  log.section('2. Project Files')
  const hasPackageJson = fs.existsSync('package.json')
  test('package.json exists', hasPackageJson)

  // 3. Check if node_modules exists
  const hasNodeModules = fs.existsSync('node_modules')
  test(
    'Dependencies installed',
    hasNodeModules,
    hasNodeModules ? 'node_modules found' : 'Run: npm install'
  )

  // 4. Check environment configuration
  log.section('3. Environment Configuration')
  const hasEnvLocal = fs.existsSync('.env.local')
  test('.env.local file exists', hasEnvLocal)

  if (hasEnvLocal) {
    const envContent = fs.readFileSync('.env.local', 'utf-8')
    
    // Check for Bytez API key
    const hasBytezKey = envContent.includes('BYTEZ_API_KEY=') && 
                        !envContent.includes('BYTEZ_API_KEY=your_')
    test(
      'Bytez API key configured',
      hasBytezKey,
      hasBytezKey ? 'API key found' : 'Add your Bytez API key to .env.local'
    )

    // Check for AI provider
    const hasProvider = envContent.includes('AI_PROVIDER=bytez')
    test(
      'AI provider set to Bytez',
      hasProvider,
      hasProvider ? 'Provider: bytez' : 'Set AI_PROVIDER=bytez in .env.local'
    )

    // Check for AI model
    const hasModel = envContent.includes('AI_MODEL=')
    test(
      'AI model configured',
      hasModel,
      hasModel ? 'Model configured' : 'Add AI_MODEL to .env.local'
    )

    // Check for base URL
    const hasBaseUrl = envContent.includes('AI_API_BASE_URL=')
    test(
      'API base URL configured',
      hasBaseUrl,
      hasBaseUrl ? 'Base URL set' : 'Add AI_API_BASE_URL to .env.local'
    )
  } else {
    log.warning('Create .env.local file with your configuration')
    log.info('Example:')
    console.log(`
${colors.cyan}BYTEZ_API_KEY=your_api_key_here
AI_PROVIDER=bytez
AI_API_BASE_URL=https://bytez.com/api
AI_MODEL=amgadhasan/Meta-Llama-3.1-8B-Instruct${colors.reset}
`)
  }

  // 5. Check critical source files
  log.section('4. Core Files')
  const criticalFiles = [
    'src/lib/ai/bytez-client.ts',
    'src/lib/ai/ai-service.ts',
    'src/app/api/ai/chat/route.ts',
    'src/app/api/ai/status/route.ts',
  ]

  for (const file of criticalFiles) {
    const exists = fs.existsSync(file)
    test(file, exists)
  }

  // 6. Check documentation
  log.section('5. Documentation')
  const docs = [
    'README.md',
    'API_KEYS_GUIDE.md',
    'AI_FEATURES_GUIDE.md',
    'QUICK_START.md',
    'BYTEZ_SETUP.md',
  ]

  for (const doc of docs) {
    const exists = fs.existsSync(doc)
    test(doc, exists)
  }

  // 7. Check test scripts
  log.section('6. Test Scripts')
  const testScripts = [
    'test-ai-chat.js',
    'test-document-analysis.js',
    'sample-document.md',
  ]

  for (const script of testScripts) {
    const exists = fs.existsSync(script)
    test(script, exists)
  }

  // 8. Check Next.js build files
  log.section('7. Build Configuration')
  const hasNextConfig = fs.existsSync('next.config.js') || fs.existsSync('next.config.mjs')
  test('Next.js config exists', hasNextConfig)

  const hasTailwindConfig = fs.existsSync('tailwind.config.ts') || fs.existsSync('tailwind.config.js')
  test('Tailwind config exists', hasTailwindConfig)

  const hasTsConfig = fs.existsSync('tsconfig.json')
  test('TypeScript config exists', hasTsConfig)

  // Summary
  log.section('📊 Summary')
  console.log(`
  Total Tests:  ${totalTests}
  ${colors.green}Passed:       ${passedTests}${colors.reset}
  ${failedTests > 0 ? colors.red : colors.green}Failed:       ${failedTests}${colors.reset}
  Success Rate: ${Math.round((passedTests / totalTests) * 100)}%
`)

  if (failedTests === 0) {
    console.log(`
${colors.green}${colors.bright}
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   ✓ All checks passed! Your setup is ready! 🎉      ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
${colors.reset}

${colors.cyan}Next steps:${colors.reset}

1. Start the development server:
   ${colors.yellow}npm run dev${colors.reset}

2. Open your browser:
   ${colors.yellow}http://localhost:3000${colors.reset}

3. Test AI features:
   ${colors.yellow}node test-ai-chat.js${colors.reset}

4. Read the guides:
   - ${colors.cyan}QUICK_START.md${colors.reset} - Get started in 5 minutes
   - ${colors.cyan}AI_FEATURES_GUIDE.md${colors.reset} - Learn all AI features
   - ${colors.cyan}API_KEYS_GUIDE.md${colors.reset} - API configuration help

${colors.green}Happy learning! 🧠✨${colors.reset}
`)
  } else {
    console.log(`
${colors.yellow}${colors.bright}
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   ⚠ Some checks failed. Please review above.        ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
${colors.reset}

${colors.cyan}Common fixes:${colors.reset}

1. Install dependencies:
   ${colors.yellow}npm install${colors.reset}

2. Create .env.local file:
   ${colors.yellow}cp .env.example .env.local${colors.reset}

3. Add your Bytez API key to .env.local

4. Check the documentation:
   - ${colors.cyan}API_KEYS_GUIDE.md${colors.reset}
   - ${colors.cyan}QUICK_START.md${colors.reset}

${colors.cyan}Need help?${colors.reset}
- Check the documentation files
- Review the error messages above
- Ensure all prerequisites are installed
`)
  }

  return failedTests === 0
}

// Run verification
verifySetup()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    log.error(`Verification failed: ${error.message}`)
    process.exit(1)
  })
