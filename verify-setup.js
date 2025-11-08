#!/usr/bin/env node

/**
 * Setup Verification Script
 * Verifies that all files are in place and properly configured
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  const fullPath = path.join(__dirname, filePath);
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    const stats = fs.statSync(fullPath);
    const size = (stats.size / 1024).toFixed(2);
    log(`✓ ${description} (${size} KB)`, 'green');
    return true;
  } else {
    log(`✗ ${description} - MISSING`, 'red');
    return false;
  }
}

function checkDirectory(dirPath, description) {
  const fullPath = path.join(__dirname, dirPath);
  const exists = fs.existsSync(fullPath);
  
  if (exists && fs.statSync(fullPath).isDirectory()) {
    const files = fs.readdirSync(fullPath);
    log(`✓ ${description} (${files.length} files)`, 'green');
    return true;
  } else {
    log(`✗ ${description} - MISSING`, 'red');
    return false;
  }
}

async function verifySetup() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     AttendanceMS Setup Verification                       ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  
  let totalChecks = 0;
  let passedChecks = 0;

  // Backend Core Files
  log('\n📦 Backend Core Files:', 'blue');
  const backendFiles = [
    ['src/app.js', 'Main application server'],
    ['src/db.js', 'Database layer'],
    ['package.json', 'Package configuration'],
    ['.env.example', 'Environment template'],
  ];

  backendFiles.forEach(([file, desc]) => {
    totalChecks++;
    if (checkFile(file, desc)) passedChecks++;
  });

  // Routes
  log('\n🛣️  API Routes:', 'blue');
  const routeFiles = [
    ['src/routes/api.js', 'Core API routes'],
    ['src/routes/auth.js', 'Authentication routes'],
    ['src/routes/dashboard.js', 'Dashboard routes'],
    ['src/routes/analytics.js', 'Analytics routes'],
    ['src/routes/teacher-dashboard.js', 'Teacher dashboard routes'],
    ['src/routes/daily-attendance.js', 'Attendance routes'],
    ['src/routes/realtime-dashboard.js', 'Real-time routes'],
  ];

  routeFiles.forEach(([file, desc]) => {
    totalChecks++;
    if (checkFile(file, desc)) passedChecks++;
  });

  // Frontend JavaScript Modules
  log('\n🎨 Frontend JavaScript Modules:', 'blue');
  const frontendFiles = [
    ['src/public/js/api-client.js', 'API Client'],
    ['src/public/js/loading-states.js', 'Loading States Manager'],
    ['src/public/js/toast-notifications.js', 'Toast Notification System'],
    ['public/js/alert-system.js', 'Alert System'],
    ['public/js/help-widget.js', 'Help Widget'],
    ['public/js/student-management.js', 'Student Management'],
  ];

  frontendFiles.forEach(([file, desc]) => {
    totalChecks++;
    if (checkFile(file, desc)) passedChecks++;
  });

  // EJS Views
  log('\n📄 EJS Views:', 'blue');
  const viewFiles = [
    ['src/views/dashboard.ejs', 'Main Dashboard'],
    ['src/views/realtime-dashboard.ejs', 'Real-time Dashboard'],
    ['src/views/teacher-dashboard.ejs', 'Teacher Dashboard'],
    ['src/views/daily-attendance.ejs', 'Daily Attendance'],
    ['src/views/partials/scripts.ejs', 'Shared Scripts Partial'],
  ];

  viewFiles.forEach(([file, desc]) => {
    totalChecks++;
    if (checkFile(file, desc)) passedChecks++;
  });

  // Middleware
  log('\n🛡️  Middleware:', 'blue');
  const middlewareFiles = [
    ['src/middleware/security.js', 'Security Middleware'],
    ['src/middleware/errorHandler.js', 'Error Handler'],
    ['src/middleware/cache.js', 'Cache Middleware'],
    ['src/middleware/rbac.js', 'RBAC Middleware'],
  ];

  middlewareFiles.forEach(([file, desc]) => {
    totalChecks++;
    if (checkFile(file, desc)) passedChecks++;
  });

  // Testing
  log('\n🧪 Testing Files:', 'blue');
  const testFiles = [
    ['test-connectivity.js', 'Connectivity Test Suite'],
    ['verify-setup.js', 'Setup Verification Script'],
  ];

  testFiles.forEach(([file, desc]) => {
    totalChecks++;
    if (checkFile(file, desc)) passedChecks++;
  });

  // Documentation
  log('\n📚 Documentation:', 'blue');
  const docFiles = [
    ['README.md', 'Project README'],
    ['CONNECTIVITY_REPORT.md', 'Connectivity Report'],
    ['COMPLETE_SETUP_GUIDE.md', 'Setup Guide'],
    ['CONNECTIVITY_COMPLETE.md', 'Completion Summary'],
  ];

  docFiles.forEach(([file, desc]) => {
    totalChecks++;
    if (checkFile(file, desc)) passedChecks++;
  });

  // Directories
  log('\n📁 Directory Structure:', 'blue');
  const directories = [
    ['src/routes', 'Routes directory'],
    ['src/middleware', 'Middleware directory'],
    ['src/services', 'Services directory'],
    ['src/views', 'Views directory'],
    ['src/public/js', 'Public JS directory'],
    ['data', 'Data directory'],
  ];

  directories.forEach(([dir, desc]) => {
    totalChecks++;
    if (checkDirectory(dir, desc)) passedChecks++;
  });

  // Check package.json scripts
  log('\n⚙️  Package Scripts:', 'blue');
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    const requiredScripts = ['start', 'dev', 'test:connectivity'];
    
    requiredScripts.forEach(script => {
      totalChecks++;
      if (packageJson.scripts && packageJson.scripts[script]) {
        log(`✓ Script: ${script}`, 'green');
        passedChecks++;
      } else {
        log(`✗ Script: ${script} - MISSING`, 'red');
      }
    });
  } catch (error) {
    log('✗ Failed to read package.json', 'red');
  }

  // Check dependencies
  log('\n📦 Key Dependencies:', 'blue');
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    const requiredDeps = ['express', 'sqlite3', 'socket.io', 'bcryptjs', 'express-session'];
    
    requiredDeps.forEach(dep => {
      totalChecks++;
      if (packageJson.dependencies && packageJson.dependencies[dep]) {
        log(`✓ Dependency: ${dep}`, 'green');
        passedChecks++;
      } else {
        log(`✗ Dependency: ${dep} - MISSING`, 'red');
      }
    });
  } catch (error) {
    log('✗ Failed to check dependencies', 'red');
  }

  // Summary
  log('\n' + '='.repeat(60), 'blue');
  const percentage = Math.round((passedChecks / totalChecks) * 100);
  log(`Verification Results: ${passedChecks}/${totalChecks} checks passed (${percentage}%)`, 
      percentage === 100 ? 'green' : percentage >= 80 ? 'yellow' : 'red');
  log('='.repeat(60) + '\n', 'blue');

  if (percentage === 100) {
    log('🎉 Perfect! All files are in place and ready to go!', 'green');
    log('\nNext steps:', 'cyan');
    log('1. Run: npm install', 'cyan');
    log('2. Run: node src/db.js init', 'cyan');
    log('3. Run: npm run dev', 'cyan');
    log('4. Run: npm run test:connectivity', 'cyan');
    log('5. Visit: http://localhost:3000\n', 'cyan');
  } else if (percentage >= 80) {
    log('⚠️  Most files are in place, but some are missing.', 'yellow');
    log('Review the missing files above and ensure they are created.\n', 'yellow');
  } else {
    log('❌ Many files are missing. Please review the setup guide.', 'red');
    log('See COMPLETE_SETUP_GUIDE.md for detailed instructions.\n', 'red');
  }

  // Additional checks
  log('🔍 Additional Checks:', 'blue');
  
  // Check if node_modules exists
  totalChecks++;
  if (fs.existsSync(path.join(__dirname, 'node_modules'))) {
    log('✓ node_modules directory exists', 'green');
    passedChecks++;
  } else {
    log('⚠️  node_modules not found - Run: npm install', 'yellow');
  }

  // Check if .env exists
  totalChecks++;
  if (fs.existsSync(path.join(__dirname, '.env'))) {
    log('✓ .env file exists', 'green');
    passedChecks++;
  } else {
    log('⚠️  .env not found - Copy from .env.example', 'yellow');
  }

  // Check if database exists
  totalChecks++;
  if (fs.existsSync(path.join(__dirname, 'data', 'app.db'))) {
    log('✓ Database file exists', 'green');
    passedChecks++;
  } else {
    log('⚠️  Database not initialized - Run: node src/db.js init', 'yellow');
  }

  log('\n' + '='.repeat(60), 'blue');
  const finalPercentage = Math.round((passedChecks / totalChecks) * 100);
  log(`Final Score: ${passedChecks}/${totalChecks} (${finalPercentage}%)`, 
      finalPercentage === 100 ? 'green' : finalPercentage >= 80 ? 'yellow' : 'red');
  log('='.repeat(60) + '\n', 'blue');

  process.exit(finalPercentage >= 80 ? 0 : 1);
}

// Run verification
verifySetup().catch(error => {
  log(`\n❌ Verification failed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
