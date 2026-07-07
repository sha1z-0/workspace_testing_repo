#!/usr/bin/env node

/**
 * Deployment Readiness Check Script
 * Verifies that the project is properly configured for production deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking deployment readiness...\n');

let hasErrors = false;
let hasWarnings = false;

// Check 1: Package.json exists
console.log('1️⃣  Checking package.json...');
if (fs.existsSync('package.json')) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  if (pkg.scripts && pkg.scripts.build) {
    console.log('   ✅ package.json found with build script');
  } else {
    console.log('   ❌ package.json missing build script');
    hasErrors = true;
  }
  
  if (pkg.scripts && pkg.scripts.start) {
    console.log('   ✅ package.json has start script');
  } else {
    console.log('   ❌ package.json missing start script');
    hasErrors = true;
  }
} else {
  console.log('   ❌ package.json not found');
  hasErrors = true;
}

// Check 2: Next.js config
console.log('\n2️⃣  Checking next.config.mjs...');
if (fs.existsSync('next.config.mjs')) {
  const config = fs.readFileSync('next.config.mjs', 'utf8');
  
  if (config.includes("output: 'export'")) {
    console.log('   ⚠️  Static export enabled - API routes will NOT work!');
    console.log('      For full functionality, remove "output: \'export\'" from next.config.mjs');
    hasWarnings = true;
  } else {
    console.log('   ✅ next.config.mjs configured for server deployment');
  }
} else {
  console.log('   ❌ next.config.mjs not found');
  hasErrors = true;
}

// Check 3: Environment variables
console.log('\n3️⃣  Checking environment configuration...');
if (fs.existsSync('.env.local')) {
  console.log('   ✅ .env.local found (for local development)');
} else {
  console.log('   ⚠️  .env.local not found');
  hasWarnings = true;
}

if (fs.existsSync('.env.production')) {
  console.log('   ✅ .env.production found (for production)');
} else {
  console.log('   ⚠️  .env.production not found');
  console.log('      Create this file before deployment with your Supabase credentials');
  hasWarnings = true;
}

if (fs.existsSync('.env.production.example')) {
  console.log('   ✅ .env.production.example found');
} else {
  console.log('   ℹ️  .env.production.example not found (optional)');
}

// Check 4: API Routes
console.log('\n4️⃣  Checking API routes...');
if (fs.existsSync('app/api')) {
  const apiDirs = fs.readdirSync('app/api');
  console.log(`   ✅ Found ${apiDirs.length} API route directories:`);
  apiDirs.forEach(dir => {
    console.log(`      - ${dir}`);
  });
  console.log('      Note: These require server-side deployment (VPS/Cloud hosting)');
} else {
  console.log('   ℹ️  No API routes found');
}

// Check 5: Supabase configuration
console.log('\n5️⃣  Checking Supabase setup...');
if (fs.existsSync('lib/supabase.ts')) {
  console.log('   ✅ Supabase client found at lib/supabase.ts');
  
  const supabaseFile = fs.readFileSync('lib/supabase.ts', 'utf8');
  if (supabaseFile.includes('NEXT_PUBLIC_SUPABASE_URL') && 
      supabaseFile.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY')) {
    console.log('   ✅ Supabase configuration uses environment variables');
  } else {
    console.log('   ⚠️  Supabase configuration might not use environment variables');
    hasWarnings = true;
  }
} else {
  console.log('   ❌ lib/supabase.ts not found');
  hasErrors = true;
}

// Check 6: Build artifacts
console.log('\n6️⃣  Checking for build artifacts...');
if (fs.existsSync('.next')) {
  console.log('   ℹ️  .next directory exists (previous build found)');
  console.log('      Run "npm run build" to create a fresh production build');
} else {
  console.log('   ℹ️  No .next directory (no previous build)');
}

if (fs.existsSync('out')) {
  console.log('   ⚠️  out/ directory exists (static export)');
  console.log('      This is only for static hosting without API routes');
  hasWarnings = true;
} else {
  console.log('   ✅ No out/ directory');
}

// Check 7: .gitignore
console.log('\n7️⃣  Checking .gitignore...');
if (fs.existsSync('.gitignore')) {
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  
  const shouldIgnore = ['.env.production', '.env.local', 'node_modules', '.next'];
  const missing = shouldIgnore.filter(item => !gitignore.includes(item));
  
  if (missing.length === 0) {
    console.log('   ✅ .gitignore properly configured');
  } else {
    console.log(`   ⚠️  .gitignore missing: ${missing.join(', ')}`);
    hasWarnings = true;
  }
} else {
  console.log('   ⚠️  .gitignore not found');
  hasWarnings = true;
}

// Check 8: Dependencies
console.log('\n8️⃣  Checking dependencies...');
if (fs.existsSync('node_modules')) {
  console.log('   ✅ node_modules found');
} else {
  console.log('   ⚠️  node_modules not found - run "npm install"');
  hasWarnings = true;
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 DEPLOYMENT READINESS SUMMARY');
console.log('='.repeat(60));

if (hasErrors) {
  console.log('❌ FAILED: Critical issues found. Fix errors before deploying.');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️  WARNINGS: Some issues detected. Review warnings before deploying.');
  console.log('\n📋 Next Steps:');
  console.log('   1. Review the warnings above');
  console.log('   2. Create .env.production with your Supabase credentials');
  console.log('   3. Run "npm run build" to test production build');
  console.log('   4. Proceed with deployment to Hostinger VPS');
  process.exit(0);
} else {
  console.log('✅ READY: Project is ready for deployment!');
  console.log('\n📋 Next Steps:');
  console.log('   1. Ensure .env.production has correct values');
  console.log('   2. Run "npm run build" to create production build');
  console.log('   3. Test locally with "npm start"');
  console.log('   4. Deploy to Hostinger VPS following the guide');
  process.exit(0);
}
