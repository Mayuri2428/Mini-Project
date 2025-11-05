import { dbManager } from '../database/connection.js';
import { logger } from '../middleware/errorHandler.js';
import { cacheQuery } from '../middleware/cache.js';

class AnalyticsService {
  constructor() {
    this.metrics = new Map();
    this.startTime = Date.now();
  }

  // Track user actions
  trackEvent(eventType, userId, metadata = {}) {
    const event = {
      type: eventType,
      userId,
      timestamp: new Date().toISOString(),
      metadata
    };

    // Store in memory for real-time analytics
    const key = `${eventType}_${Date.now()}`;
    this.metrics.set(key, event);

    // Log for persistence
    logger.info('Analytics Event', event);

    // Clean old events (keep last 1000)
    if (this.metrics.size > 1000) {
      const oldestKey = this.metrics.keys().next().value;
      this.metrics.delete(oldestKey);
    }
  }

  // Get system statistics
  async getSystemStats() {
    const cacheKey = 'system_stats';
    
    return await cacheQuery(cacheKey, async () => {
      const stats = await dbManager.executeQuery(`
        SELECT 
          (SELECT COUNT(*) FROM teachers) as total_teachers,
          (SELECT COUNT(*) FROM classes) as total_classes,
          (SELECT COUNT(*) FROM students) as total_students,
          (SELECT COUNT(*) FROM attendance) as total_attendance_records,
          (SELECT COUNT(*) FROM attendance WHERE date = date('now')) as today_attendance,
          (SELECT COUNT(DISTINCT class_id) FROM attendance WHERE date = date('now')) as active_classes_today
      `);

      const dbStats = await dbManager.getStats();
      
      return {
        ...stats[0],
        database: dbStats,
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      };
    }, 300); // Cache for 5 minutes
  }

  // Get attendance analytics
  async getAttendanceAnalytics(classId = null, days = 30) {
    const cacheKey = `attendance_analytics_${classId}_${days}`;
    
    return await cacheQuery(cacheKey, async () => {
      let whereClause = `WHERE date >= date('now', '-${days} days')`;
      let params = [];
      
      if (classId) {
        whereClause += ' AND class_id = ?';
        params.push(classId);
      }

      // Daily attendance trends
      const dailyTrends = await dbManager.executeQuery(`
        SELECT 
          date,
          COUNT(*) as total_records,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
          SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count,
          SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count,
          SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused_count,
          ROUND(
            (SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2
          ) as attendance_rate
        FROM attendance 
        ${whereClause}
        GROUP BY date
        ORDER BY date DESC
      `, params);

      // Session-wise analytics
      const sessionAnalytics = await dbManager.executeQuery(`
        SELECT 
          session_time,
          COUNT(*) as total_records,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
          ROUND(
            (SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2
          ) as attendance_rate
        FROM attendance 
        ${whereClause} AND session_time IS NOT NULL
        GROUP BY session_time
        ORDER BY session_time
      `, params);

      // Top performing classes
      const classPerformance = await dbManager.executeQuery(`
        SELECT 
          c.name as class_name,
          c.section,
          c.department,
          COUNT(a.id) as total_records,
          SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
          ROUND(
            (SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100.0 / COUNT(a.id)), 2
          ) as attendance_rate
        FROM classes c
        LEFT JOIN attendance a ON c.id = a.class_id AND a.date >= date('now', '-${days} days')
        ${classId ? 'WHERE c.id = ?' : ''}
        GROUP BY c.id, c.name, c.section, c.department
        HAVING COUNT(a.id) > 0
        ORDER BY attendance_rate DESC
        LIMIT 10
      `, classId ? [classId] : []);

      return {
        dailyTrends,
        sessionAnalytics,
        classPerformance,
        period: `${days} days`,
        generatedAt: new Date().toISOString()
      };
    }, 600); // Cache for 10 minutes
  }

  // Get student performance analytics
  async getStudentAnalytics(classId, limit = 20) {
    const cacheKey = `student_analytics_${classId}_${limit}`;
    
    return await cacheQuery(cacheKey, async () => {
      const studentStats = await dbManager.executeQuery(`
        SELECT 
          s.id,
          s.name,
          s.roll_no,
          s.academic_year,
          s.branch,
          COUNT(a.id) as total_sessions,
          SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_sessions,
          SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_sessions,
          SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_sessions,
          SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) as excused_sessions,
          ROUND(
            (SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100.0 / 
             NULLIF(COUNT(a.id), 0)), 2
          ) as attendance_percentage,
          MAX(a.date) as last_attendance_date
        FROM students s
        LEFT JOIN attendance a ON s.id = a.student_id
        WHERE s.class_id = ?
        GROUP BY s.id, s.name, s.roll_no, s.academic_year, s.branch
        ORDER BY attendance_percentage DESC
        LIMIT ?
      `, [classId, limit]);

      // Attendance distribution
      const distribution = {
        excellent: studentStats.filter(s => s.attendance_percentage >= 90).length,
        good: studentStats.filter(s => s.attendance_percentage >= 80 && s.attendance_percentage < 90).length,
        average: studentStats.filter(s => s.attendance_percentage >= 70 && s.attendance_percentage < 80).length,
        poor: studentStats.filter(s => s.attendance_percentage < 70).length
      };

      return {
        students: studentStats,
        distribution,
        classId,
        generatedAt: new Date().toISOString()
      };
    }, 900); // Cache for 15 minutes
  }

  // Get teacher analytics
  async getTeacherAnalytics(teacherId) {
    const cacheKey = `teacher_analytics_${teacherId}`;
    
    return await cacheQuery(cacheKey, async () => {
      // Teacher's classes and their performance
      const classStats = await dbManager.executeQuery(`
        SELECT 
          c.id,
          c.name,
          c.section,
          c.department,
          c.academic_year,
          COUNT(DISTINCT s.id) as total_students,
          COUNT(a.id) as total_attendance_records,
          SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
          ROUND(
            (SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100.0 / 
             NULLIF(COUNT(a.id), 0)), 2
          ) as attendance_rate,
          COUNT(DISTINCT a.date) as days_with_attendance
        FROM classes c
        LEFT JOIN students s ON c.id = s.class_id
        LEFT JOIN attendance a ON s.id = a.student_id
        WHERE c.teacher_id = ?
        GROUP BY c.id, c.name, c.section, c.department, c.academic_year
        ORDER BY c.name
      `, [teacherId]);

      // Recent activity
      const recentActivity = await dbManager.executeQuery(`
        SELECT 
          a.date,
          a.session_time,
          c.name as class_name,
          COUNT(*) as students_marked,
          SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        JOIN classes c ON s.class_id = c.id
        WHERE c.teacher_id = ? AND a.marked_by = ?
        GROUP BY a.date, a.session_time, c.name
        ORDER BY a.date DESC, a.session_time DESC
        LIMIT 10
      `, [teacherId, teacherId]);

      return {
        classes: classStats,
        recentActivity,
        summary: {
          totalClasses: classStats.length,
          totalStudents: classStats.reduce((sum, c) => sum + c.total_students, 0),
          averageAttendanceRate: classStats.length > 0 
            ? Math.round(classStats.reduce((sum, c) => sum + (c.attendance_rate || 0), 0) / classStats.length)
            : 0
        },
        generatedAt: new Date().toISOString()
      };
    }, 600); // Cache for 10 minutes
  }

  // Get real-time metrics
  getRealTimeMetrics() {
    const events = Array.from(this.metrics.values());
    const last24Hours = events.filter(e => 
      new Date(e.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    const eventTypes = {};
    last24Hours.forEach(event => {
      eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
    });

    return {
      totalEvents: last24Hours.length,
      eventTypes,
      activeUsers: new Set(last24Hours.map(e => e.userId)).size,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString()
    };
  }

  // Generate insights and recommendations
  async generateInsights(classId = null) {
    const analytics = await this.getAttendanceAnalytics(classId, 30);
    const insights = [];

    // Analyze trends
    if (analytics.dailyTrends.length >= 7) {
      const recent = analytics.dailyTrends.slice(0, 7);
      const older = analytics.dailyTrends.slice(7, 14);
      
      const recentAvg = recent.reduce((sum, d) => sum + d.attendance_rate, 0) / recent.length;
      const olderAvg = older.reduce((sum, d) => sum + d.attendance_rate, 0) / older.length;
      
      if (recentAvg > olderAvg + 5) {
        insights.push({
          type: 'positive',
          title: 'Improving Attendance Trend',
          description: `Attendance has improved by ${(recentAvg - olderAvg).toFixed(1)}% in the last week`,
          recommendation: 'Continue current engagement strategies'
        });
      } else if (recentAvg < olderAvg - 5) {
        insights.push({
          type: 'warning',
          title: 'Declining Attendance Trend',
          description: `Attendance has decreased by ${(olderAvg - recentAvg).toFixed(1)}% in the last week`,
          recommendation: 'Consider reviewing class engagement and reaching out to students'
        });
      }
    }

    // Session analysis
    if (analytics.sessionAnalytics.length > 0) {
      const bestSession = analytics.sessionAnalytics.reduce((best, current) => 
        current.attendance_rate > best.attendance_rate ? current : best
      );
      
      const worstSession = analytics.sessionAnalytics.reduce((worst, current) => 
        current.attendance_rate < worst.attendance_rate ? current : worst
      );

      if (bestSession.attendance_rate - worstSession.attendance_rate > 10) {
        insights.push({
          type: 'info',
          title: 'Session Performance Variation',
          description: `${bestSession.session_time} has ${(bestSession.attendance_rate - worstSession.attendance_rate).toFixed(1)}% better attendance than ${worstSession.session_time}`,
          recommendation: 'Consider scheduling important topics during high-attendance sessions'
        });
      }
    }

    return {
      insights,
      analytics,
      generatedAt: new Date().toISOString()
    };
  }

  // Export analytics data
  async exportAnalytics(format = 'json', classId = null, days = 30) {
    const data = await this.getAttendanceAnalytics(classId, days);
    
    if (format === 'csv') {
      // Convert to CSV format
      const csvData = data.dailyTrends.map(row => ({
        Date: row.date,
        'Total Records': row.total_records,
        'Present': row.present_count,
        'Absent': row.absent_count,
        'Late': row.late_count,
        'Excused': row.excused_count,
        'Attendance Rate %': row.attendance_rate
      }));
      
      return {
        format: 'csv',
        data: csvData,
        filename: `attendance_analytics_${days}days_${new Date().toISOString().split('T')[0]}.csv`
      };
    }
    
    return {
      format: 'json',
      data,
      filename: `attendance_analytics_${days}days_${new Date().toISOString().split('T')[0]}.json`
    };
  }
}

// Create singleton instance
const analyticsService = new AnalyticsService();

export default analyticsService;
export { AnalyticsService };