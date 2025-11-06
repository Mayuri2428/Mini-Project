#!/usr/bin/env node

/**
 * Manual Backup Script
 * Creates database backups on demand
 */

import backupService from '../src/services/backupService.js';

async function createBackup() {
  try {
    console.log('🔄 Creating database backup...');
    
    const result = await backupService.createFullBackup();
    
    console.log('✅ Backup created successfully!');
    console.log(`📁 File: ${result.filename}`);
    console.log(`📊 Size: ${(result.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`⏱️  Duration: ${result.duration}ms`);
    console.log(`🗜️  Compressed: ${result.compressed ? 'Yes' : 'No'}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  }
}

// Create backup
createBackup();