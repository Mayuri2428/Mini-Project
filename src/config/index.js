import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

class ConfigManager {
  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  loadConfiguration() {
    const baseConfig = {
      // Application Settings
      app: {
        name: 'AttendanceMS',
        version: '2.0.0',
        port: parseInt(process.env.PORT) || 3000,
        host: process.env.HOST || 'localhost',
        environment: this.environment,
        timezone: process.env.TZ || 'UTC',
        locale: process.env.LOCALE || 'en-US'
      },

      // Database Configuration
      database: {
        type: 'sqlite',
        filename: process.env.DB_PATH || path.join(__dirname, '../../data/app.db'),
        options: {
          journalMode: 'WAL',
          synchronous: 'NORMAL',
          cacheSize: parseInt(process.env.DB_CACHE_SIZE) || 1000,
          foreignKeys: true,
          tempStore: 'MEMORY',
          mmapSize: parseInt(process.env.DB_MMAP_SIZE) || 268435456
        }
      },

      // Security Configuration
      security: {
        session: {
          secret: process.env.SESSION_SECRET || this.generateSecureSecret(),
          name: process.env.SESSION_NAME || 'attendancems.sid',
          maxAge: parseInt(process.env.SESSION_MAX_AGE) || 6 * 60 * 60 * 1000,
          secure: this.environment === 'production',
          httpOnly: true,
          sameSite: 'strict'
        },
        cors: {
          origin: this.getAllowedOrigins(),
          credentials: true,
          optionsSuccessStatus: 200
        },
        rateLimit: {
          windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000,
          max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
          standardHeaders: true,
          legacyHeaders: false
        }
      },

      // Email Configuration
      email: {
        enabled: process.env.EMAIL_ENABLED !== 'false',
        smtp: {
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        },
        from: process.env.SMTP_FROM || 'AttendanceMS <no-reply@attendancems.com>'
      },

      // Cache Configuration
      cache: {
        enabled: process.env.CACHE_ENABLED !== 'false',
        ttl: {
          api: parseInt(process.env.CACHE_API_TTL) || 300,
          database: parseInt(process.env.CACHE_DB_TTL) || 900,
          static: parseInt(process.env.CACHE_STATIC_TTL) || 3600
        }
      },

      // Backup Configuration
      backup: {
        enabled: process.env.BACKUP_ENABLED !== 'false',
        path: process.env.BACKUP_PATH || path.join(__dirname, '../../backups'),
        maxBackups: parseInt(process.env.MAX_BACKUPS) || 30,
        compression: process.env.BACKUP_COMPRESSION !== 'false'
      }
    };

    return baseConfig;
  }

  getAllowedOrigins() {
    const origins = process.env.ALLOWED_ORIGINS;
    if (origins) {
      return origins.split(',').map(origin => origin.trim());
    }
    return ['http://localhost:3000', 'http://localhost:8080'];
  }

  generateSecureSecret() {
    const crypto = require('crypto');
    return crypto.randomBytes(64).toString('hex');
  }

  validateConfiguration() {
    const errors = [];

    if (this.environment === 'production') {
      const required = ['SESSION_SECRET', 'SMTP_USER', 'SMTP_PASS'];
      required.forEach(key => {
        if (!process.env[key]) {
          errors.push(`Missing required environment variable: ${key}`);
        }
      });
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  get(path) {
    return this.getNestedValue(this.config, path);
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
}

// Create singleton instance
const config = new ConfigManager();

export default config;
export { ConfigManager };
