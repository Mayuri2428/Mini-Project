#!/usr/bin/env node

/**
 * Database Migration Script
 * Handles database schema updates and data migrations
 */

import { ensureDefaultTeacher, migrate } from '../src/db.js';
import { logger } from '../src/middleware/errorHandler.js';

async function runMigrations() {
  try {
    console.log('🚀 Starting database migrations...');
    
    // Run database migrations
    await migrate();
    console.log('✅ Database schema migrations completed');
    
    // Ensure default teacher exists
    await ensureDefaultTeacher();
    console.log('✅ Default teacher account verified');
    
    console.log('🎉 All migrations completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    logger.error('Database migration failed', { error: error.message });
    process.exit(1);
  }
}

// Run migrations
runMigrations();