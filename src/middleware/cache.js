import NodeCache from 'node-cache';
import crypto from 'crypto';

// Cache instances for different data types
const caches = {
  // Short-term cache for API responses (5 minutes)
  api: new NodeCache({ stdTTL: 300, checkperiod: 60 }),
  
  // Medium-term cache for database queries (15 minutes)
  database: new NodeCache({ stdTTL: 900, checkperiod: 120 }),
  
  // Long-term cache for static data (1 hour)
  static: new NodeCache({ stdTTL: 3600, checkperiod: 300 }),
  
  // Session cache for user data (30 minutes)
  session: new NodeCache({ stdTTL: 1800, checkperiod: 180 }),
  
  // Reports cache (2 hours)
  reports: new NodeCache({ stdTTL: 7200, checkperiod: 600 })
};

// Generate cache key
const generateCacheKey = (prefix, ...args) => {
  const data = args.join('|');
  const hash = crypto.createHash('md5').update(data).digest('hex');
  return `${prefix}:${hash}`;
};

// Cache middleware factory
export const createCacheMiddleware = (cacheType = 'api', ttl = null) => {
  return (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    const cache = caches[cacheType];
    const key = generateCacheKey(
      `${cacheType}_${req.route?.path || req.path}`,
      req.originalUrl,
      req.session?.user?.id || 'anonymous'
    );
    
    // Try to get from cache
    const cached = cache.get(key);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }
    
    // Store original json method
    const originalJson = res.json;
    
    // Override json method to cache response
    res.json = function(data) {
      // Cache successful responses only
      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (ttl) {
          cache.set(key, data, ttl);
        } else {
          cache.set(key, data);
        }
      }
      
      res.set('X-Cache', 'MISS');
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// Database query cache
export const cacheQuery = async (key, queryFn, ttl = 900) => {
  const cache = caches.database;
  const cached = cache.get(key);
  
  if (cached) {
    return cached;
  }
  
  const result = await queryFn();
  cache.set(key, result, ttl);
  return result;
};

// Invalidate cache patterns
export const invalidateCache = (pattern, cacheType = 'all') => {
  if (cacheType === 'all') {
    Object.values(caches).forEach(cache => {
      const keys = cache.keys().filter(key => key.includes(pattern));
      cache.del(keys);
    });
  } else {
    const cache = caches[cacheType];
    const keys = cache.keys().filter(key => key.includes(pattern));
    cache.del(keys);
  }
};

// Cache statistics
export const getCacheStats = () => {
  const stats = {};
  
  Object.entries(caches).forEach(([name, cache]) => {
    stats[name] = {
      keys: cache.keys().length,
      hits: cache.getStats().hits,
      misses: cache.getStats().misses,
      hitRate: cache.getStats().hits / (cache.getStats().hits + cache.getStats().misses) || 0
    };
  });
  
  return stats;
};

// Warm up cache with common queries
export const warmUpCache = async (dbQueries) => {
  console.log('Warming up cache...');
  
  try {
    // Cache common teacher queries
    if (dbQueries.all) {
      await cacheQuery('teachers:all', () => dbQueries.all('SELECT id, name, email, department FROM teachers'));
      await cacheQuery('classes:all', () => dbQueries.all('SELECT id, name, section, department, academic_year FROM classes'));
      await cacheQuery('students:count', () => dbQueries.all('SELECT COUNT(*) as count FROM students'));
    }
    
    console.log('Cache warmed up successfully');
  } catch (error) {
    console.error('Cache warm-up failed:', error);
  }
};

// Cache cleanup
export const cleanupCache = () => {
  Object.values(caches).forEach(cache => {
    cache.flushAll();
  });
  console.log('All caches cleared');
};

// Memory usage monitoring
export const getCacheMemoryUsage = () => {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100,
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100,
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100,
    external: Math.round(usage.external / 1024 / 1024 * 100) / 100
  };
};

// Specific cache functions for common operations
export const attendanceCache = {
  // Cache daily attendance summary
  getDailySummary: async (classId, date, queryFn) => {
    const key = generateCacheKey('attendance_daily', classId, date);
    return await cacheQuery(key, queryFn, 300); // 5 minutes
  },
  
  // Cache weekly reports
  getWeeklyReport: async (classId, startDate, endDate, queryFn) => {
    const key = generateCacheKey('attendance_weekly', classId, startDate, endDate);
    return await cacheQuery(key, queryFn, 1800); // 30 minutes
  },
  
  // Cache student attendance stats
  getStudentStats: async (studentId, queryFn) => {
    const key = generateCacheKey('student_stats', studentId);
    return await cacheQuery(key, queryFn, 600); // 10 minutes
  },
  
  // Invalidate attendance caches
  invalidate: (classId, studentId = null) => {
    invalidateCache(`attendance_${classId}`);
    if (studentId) {
      invalidateCache(`student_stats_${studentId}`);
    }
  }
};

export const classCache = {
  // Cache class details
  getClassDetails: async (classId, queryFn) => {
    const key = generateCacheKey('class_details', classId);
    return await cacheQuery(key, queryFn, 1800); // 30 minutes
  },
  
  // Cache class students
  getClassStudents: async (classId, queryFn) => {
    const key = generateCacheKey('class_students', classId);
    return await cacheQuery(key, queryFn, 900); // 15 minutes
  },
  
  // Invalidate class caches
  invalidate: (classId) => {
    invalidateCache(`class_${classId}`);
  }
};

export const reportCache = {
  // Cache generated reports
  getReport: async (reportType, params, queryFn) => {
    const key = generateCacheKey('report', reportType, JSON.stringify(params));
    return await cacheQuery(key, queryFn, 3600); // 1 hour
  },
  
  // Invalidate report caches
  invalidate: (reportType = null) => {
    if (reportType) {
      invalidateCache(`report_${reportType}`, 'reports');
    } else {
      caches.reports.flushAll();
    }
  }
};

// Cache middleware for specific routes
export const cacheMiddleware = {
  api: createCacheMiddleware('api', 300),
  database: createCacheMiddleware('database', 900),
  static: createCacheMiddleware('static', 3600),
  reports: createCacheMiddleware('reports', 7200)
};

// Export cache instances for direct access
export { caches };

export default {
  createCacheMiddleware,
  cacheQuery,
  invalidateCache,
  getCacheStats,
  warmUpCache,
  cleanupCache,
  getCacheMemoryUsage,
  attendanceCache,
  classCache,
  reportCache,
  cacheMiddleware,
  caches
};