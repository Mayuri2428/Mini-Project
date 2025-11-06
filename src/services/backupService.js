import fs, { createReadStream, createWriteStream } from 'fs';
import cron from 'node-cron';
import path from 'path';
import { pipeline } from 'stream/promises';
import { fileURLToPath } from 'url';
import { createGzip } from 'zlib';
import { dbManager } from '../database/connection.js';
import { logger } from '../middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BackupService {
  constructor() {
    this.backupDir = path.join(__dirname, '../../backups');
    this.maxBackups = parseInt(process.env.MAX_BACKUPS) || 30;
    this.compressionEnabled = process.env.BACKUP_COMPRESSION !== 'false';
    
    this.ensureBackupDirectory();
    this.scheduleAutomaticBackups();
  }

  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      logger.info('Backup directory created', { path: this.backupDir });
    }
  }

  generateBackupFilename(type = 'full') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = this.compressionEnabled ? '.gz' : '';
    return `${type}_backup_${timestamp}.db${extension}`;
  }

  async createFullBackup() {
    const startTime = Date.now();
    const filename = this.generateBackupFilename('full');
    const backupPath = path.join(this.backupDir, filename);
    
    try {
      logger.info('Starting full database backup', { filename });
      
      // Create database backup
      await dbManager.backup(backupPath.replace('.gz', ''));
      
      // Compress if enabled
      if (this.compressionEnabled) {
        await this.compressFile(backupPath.replace('.gz', ''), backupPath);
        fs.unlinkSync(backupPath.replace('.gz', ''));
      }
      
      const fileSize = fs.statSync(backupPath).size;
      const duration = Date.now() - startTime;
      
      logger.info('Full backup completed successfully', {
        filename,
        size: `${(fileSize / 1024 / 1024).toFixed(2)} MB`,
        duration: `${duration}ms`
      });
      
      // Clean old backups
      await this.cleanOldBackups();
      
      return {
        success: true,
        filename,
        path: backupPath,
        size: fileSize,
        duration,
        compressed: this.compressionEnabled
      };
      
    } catch (error) {
      logger.error('Full backup failed', {
        filename,
        error: error.message
      });
      
      // Clean up failed backup file
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
      
      throw error;
    }
  }

  async compressFile(inputPath, outputPath) {
    const input = createReadStream(inputPath);
    const output = createWriteStream(outputPath);
    const gzip = createGzip({ level: 9 });
    
    await pipeline(input, gzip, output);
  }

  async cleanOldBackups() {
    const backups = await this.getBackupList();
    
    if (backups.length > this.maxBackups) {
      const toDelete = backups.slice(this.maxBackups);
      
      for (const backup of toDelete) {
        const filePath = path.join(this.backupDir, backup.filename);
        fs.unlinkSync(filePath);
        logger.info('Old backup deleted', { filename: backup.filename });
      }
      
      logger.info('Backup cleanup completed', {
        deleted: toDelete.length,
        remaining: this.maxBackups
      });
    }
  }

  async getBackupList() {
    const files = fs.readdirSync(this.backupDir)
      .filter(file => file.endsWith('.db') || file.endsWith('.db.gz'))
      .map(file => {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);
        
        return {
          filename: file,
          size: stats.size,
          sizeFormatted: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
          created: stats.birthtime,
          modified: stats.mtime,
          type: file.includes('incremental') ? 'incremental' : 'full',
          compressed: file.endsWith('.gz')
        };
      })
      .sort((a, b) => b.created - a.created);
    
    return files;
  }

  scheduleAutomaticBackups() {
    // Daily full backup at 2 AM
    cron.schedule('0 2 * * *', async () => {
      try {
        await this.createFullBackup();
        logger.info('Scheduled full backup completed');
      } catch (error) {
        logger.error('Scheduled full backup failed', { error: error.message });
      }
    });
    
    logger.info('Automatic backup schedules configured');
  }
}

// Create singleton instance
const backupService = new BackupService();

export default backupService;
export { BackupService };
