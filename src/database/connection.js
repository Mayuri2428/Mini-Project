import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { logger } from '../middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseManager {
  constructor() {
    this.db = null;
    this.isConnected = false;
    this.connectionPool = [];
    this.maxConnections = 10;
    this.currentConnections = 0;
    this.queryQueue = [];
    this.isProcessingQueue = false;
    
    this.dataDir = path.join(__dirname, '../../data');
    this.dbPath = path.join(this.dataDir, 'app.db');
    
    // Ensure data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  async connect() {
    try {
      if (this.isConnected) {
        return this.db;
      }

      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });

      // Configure SQLite for better performance
      await this.db.exec(`
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA cache_size = 1000;
        PRAGMA foreign_keys = ON;
        PRAGMA temp_store = MEMORY;
        PRAGMA mmap_size = 268435456;
      `);

      this.isConnected = true;
      logger.info('Database connected successfully', { path: this.dbPath });
      
      return this.db;
    } catch (error) {
      logger.error('Database connection failed', { error: error.message });
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.db) {
        await this.db.close();
        this.isConnected = false;
        logger.info('Database disconnected');
      }
    } catch (error) {
      logger.error('Database disconnection failed', { error: error.message });
    }
  }

  async executeQuery(sql, params = []) {
    if (!this.isConnected) {
      await this.connect();
    }

    const startTime = Date.now();
    
    try {
      let result;
      
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        result = await this.db.all(sql, params);
      } else {
        result = await this.db.run(sql, params);
      }

      const duration = Date.now() - startTime;
      
      // Log slow queries
      if (duration > 100) {
        logger.warn('Slow query detected', {
          sql: sql.substring(0, 100) + '...',
          duration: `${duration}ms`,
          params: params.length
        });
      }

      return result;
    } catch (error) {
      logger.error('Query execution failed', {
        sql: sql.substring(0, 100) + '...',
        error: error.message,
        params
      });
      throw error;
    }
  }

  async transaction(queries) {
    if (!this.isConnected) {
      await this.connect();
    }

    const startTime = Date.now();
    
    try {
      await this.db.exec('BEGIN TRANSACTION');
      
      const results = [];
      for (const { sql, params } of queries) {
        const result = await this.executeQuery(sql, params);
        results.push(result);
      }
      
      await this.db.exec('COMMIT');
      
      const duration = Date.now() - startTime;
      logger.info('Transaction completed', {
        queries: queries.length,
        duration: `${duration}ms`
      });
      
      return results;
    } catch (error) {
      await this.db.exec('ROLLBACK');
      logger.error('Transaction failed', {
        error: error.message,
        queries: queries.length
      });
      throw error;
    }
  }

  async backup(backupPath) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const backup = await this.db.backup(backupPath);
      await backup.step(-1);
      await backup.finish();
      
      logger.info('Database backup completed', { backupPath });
    } catch (error) {
      logger.error('Database backup failed', { error: error.message });
      throw error;
    }
  }

  async getStats() {
    try {
      const stats = await this.executeQuery(`
        SELECT 
          (SELECT COUNT(*) FROM teachers) as teachers,
          (SELECT COUNT(*) FROM classes) as classes,
          (SELECT COUNT(*) FROM students) as students,
          (SELECT COUNT(*) FROM attendance) as attendance_records
      `);

      const dbSize = fs.statSync(this.dbPath).size;
      
      return {
        ...stats[0],
        database_size: `${(dbSize / 1024 / 1024).toFixed(2)} MB`,
        connection_status: this.isConnected ? 'Connected' : 'Disconnected'
      };
    } catch (error) {
      logger.error('Failed to get database stats', { error: error.message });
      throw error;
    }
  }

  async optimize() {
    try {
      logger.info('Starting database optimization');
      
      await this.executeQuery('VACUUM');
      await this.executeQuery('ANALYZE');
      await this.executeQuery('PRAGMA optimize');
      
      logger.info('Database optimization completed');
    } catch (error) {
      logger.error('Database optimization failed', { error: error.message });
      throw error;
    }
  }

  async healthCheck() {
    try {
      await this.executeQuery('SELECT 1');
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error.message, 
        timestamp: new Date().toISOString() 
      };
    }
  }
}

// Repository base class
export class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
    this.db = dbManager;
  }

  async findById(id) {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    const result = await this.db.executeQuery(sql, [id]);
    return result[0] || null;
  }

  async findAll(conditions = {}, limit = null, offset = null) {
    let sql = `SELECT * FROM ${this.tableName}`;
    const params = [];

    if (Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions)
        .map(key => `${key} = ?`)
        .join(' AND ');
      sql += ` WHERE ${whereClause}`;
      params.push(...Object.values(conditions));
    }

    if (limit) {
      sql += ` LIMIT ?`;
      params.push(limit);
    }

    if (offset) {
      sql += ` OFFSET ?`;
      params.push(offset);
    }

    return await this.db.executeQuery(sql, params);
  }

  async create(data) {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const sql = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`;
    
    const result = await this.db.executeQuery(sql, Object.values(data));
    return result.lastID;
  }

  async update(id, data) {
    const setClause = Object.keys(data)
      .map(key => `${key} = ?`)
      .join(', ');
    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
    
    const params = [...Object.values(data), id];
    return await this.db.executeQuery(sql, params);
  }

  async delete(id) {
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
    return await this.db.executeQuery(sql, [id]);
  }

  async count(conditions = {}) {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const params = [];

    if (Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions)
        .map(key => `${key} = ?`)
        .join(' AND ');
      sql += ` WHERE ${whereClause}`;
      params.push(...Object.values(conditions));
    }

    const result = await this.db.executeQuery(sql, params);
    return result[0].count;
  }
}

// Specific repositories
export class TeacherRepository extends BaseRepository {
  constructor() {
    super('teachers');
  }

  async findByEmail(email) {
    const sql = 'SELECT * FROM teachers WHERE email = ?';
    const result = await this.db.executeQuery(sql, [email]);
    return result[0] || null;
  }

  async findByDepartment(department) {
    return await this.findAll({ department });
  }
}

export class ClassRepository extends BaseRepository {
  constructor() {
    super('classes');
  }

  async findByTeacher(teacherId) {
    return await this.findAll({ teacher_id: teacherId });
  }

  async findWithStudentCount() {
    const sql = `
      SELECT c.*, COUNT(s.id) as student_count
      FROM classes c
      LEFT JOIN students s ON c.id = s.class_id
      GROUP BY c.id
    `;
    return await this.db.executeQuery(sql);
  }
}

export class StudentRepository extends BaseRepository {
  constructor() {
    super('students');
  }

  async findByClass(classId) {
    return await this.findAll({ class_id: classId });
  }

  async findByRollNo(rollNo, classId) {
    const sql = 'SELECT * FROM students WHERE roll_no = ? AND class_id = ?';
    const result = await this.db.executeQuery(sql, [rollNo, classId]);
    return result[0] || null;
  }
}

export class AttendanceRepository extends BaseRepository {
  constructor() {
    super('attendance');
  }

  async findByDateRange(classId, startDate, endDate) {
    const sql = `
      SELECT * FROM attendance 
      WHERE class_id = ? AND date BETWEEN ? AND ?
      ORDER BY date DESC
    `;
    return await this.db.executeQuery(sql, [classId, startDate, endDate]);
  }

  async getAttendanceStats(classId, startDate, endDate) {
    const sql = `
      SELECT 
        status,
        COUNT(*) as count
      FROM attendance 
      WHERE class_id = ? AND date BETWEEN ? AND ?
      GROUP BY status
    `;
    return await this.db.executeQuery(sql, [classId, startDate, endDate]);
  }
}

// Create singleton instance
const dbManager = new DatabaseManager();

// Initialize repositories
export const repositories = {
  teacher: new TeacherRepository(),
  class: new ClassRepository(),
  student: new StudentRepository(),
  attendance: new AttendanceRepository()
};

// Export database manager
export { dbManager };

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down database connections...');
  await dbManager.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down database connections...');
  await dbManager.disconnect();
  process.exit(0);
});

export default dbManager;