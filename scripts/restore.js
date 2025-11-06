#!/usr/bin/env node

/**
 * Database Restore Script
 * Restores database from backup files
 */

import backupService from '../src/services/backupService.js';

async function restoreDatabase() {
  try {
    const args = process.argv.slice(2);
    const fileArg = args.find(arg => arg.startsWith('--file='));
    
    if (!fileArg) {
      console.log('❌ Please specify backup file with --file=filename');
      console.log('📋 Available backups:');
      
      const backups = await backupService.getBackupList();
      backups.forEach(backup => {
        console.log(`   📁 ${backup.filename} (${backup.sizeFormatted}) - ${backup.created.toLocaleString()}`);
      });
      
      process.exit(1);
    }
    
    const filename = fileArg.split('=')[1];
    
    console.log(`🔄 Restoring database from ${filename}...`);
    
    const result = await backupService.restoreFromBackup(filename);
    
    console.log('✅ Database restored successfully!');
    console.log(`📁 Backup file: ${result.backupFilename}`);
    console.log(`⏱️  Duration: ${result.duration}ms`);
    console.log(`🕐 Restored at: ${result.restoredAt}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Restore failed:', error.message);
    process.exit(1);
  }
}

// Restore database
restoreDatabase();