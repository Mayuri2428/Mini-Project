import { expect } from 'chai';
import { ConfigManager } from '../../src/config/index.js';
import { BackupService } from '../../src/services/backupService.js';

describe('Services Unit Tests', () => {
  describe('BackupService', () => {
    let backupService;
    
    beforeEach(() => {
      backupService = new BackupService();
    });
    
    it('should generate backup filename correctly', () => {
      const filename = backupService.generateBackupFilename('full');
      expect(filename).to.match(/^full_backup_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
    });
    
    it('should ensure backup directory exists', () => {
      expect(() => backupService.ensureBackupDirectory()).to.not.throw();
    });
  });
  
  describe('ConfigManager', () => {
    let configManager;
    
    beforeEach(() => {
      configManager = new ConfigManager();
    });
    
    it('should load configuration correctly', () => {
      expect(configManager.config).to.have.property('app');
      expect(configManager.config).to.have.property('database');
      expect(configManager.config).to.have.property('security');
    });
    
    it('should get nested configuration values', () => {
      const appName = configManager.get('app.name');
      expect(appName).to.equal('AttendanceMS');
    });
  });
});