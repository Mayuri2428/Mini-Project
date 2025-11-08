import express from 'express';
import { body, validationResult } from 'express-validator';
import json2csv from 'json2csv';
import PDFDocument from 'pdfkit';
import { dbManager } from '../database/connection.js';
import { cacheMiddleware, createCacheMiddleware } from '../middleware/cache.js';

const router = express.Router();

const { Parser } = json2csv;

// Enhanced Reports Dashboard
router.get('/', async (req, res) => {
  try {
    const classes = await dbManager.executeQuery(`
      SELECT c.*, COUNT(s.id) as student_count 
      FROM classes c 
      LEFT JOIN students s ON c.id = s.class_id 
      WHERE c.teacher_id = ? 
      GROUP BY c.id
    `, [req.session.user.id]);

    res.render('enhanced-reports', {
      title: 'Enhanced Reports',
      user: req.session.user,
      classes
    });
  } catch (error) {
    console.error('Error loading enhanced reports:', error);
    res.status(500).render('error', { 
      message: 'Failed to load reports dashboard',
      error: error.message 
    });
  }
});

// Helper to build optional filters
function buildFilters({ classId, dateRange, section, subject, period }) {
  const joins = ['JOIN classes c ON a.class_id = c.id'];
  const where = ['a.class_id = ?', 'a.date BETWEEN ? AND ?'];
  const params = [classId, dateRange.start, dateRange.end];

  if (section) {
    where.push('c.section = ?');
    params.push(section);
  }
  if (subject) {
    where.push('c.subject = ?');
    params.push(subject);
  }
  if (period) {
    where.push('a.session_time = ?');
    params.push(period);
  }

  return { joins: joins.join(' '), where: where.join(' AND '), params };
}

// Generate Advanced Report
router.post('/generate', [
  body('class_id').isInt().withMessage('Valid class ID required'),
  body('report_type').isIn(['daily_summary', 'weekly_analysis', 'monthly_overview', 'student_performance', 'attendance_trends']).withMessage('Valid report type required'),
  body('date_range_type').isIn(['current_week', 'current_month', 'semester', 'last_30_days', 'custom']).withMessage('Valid date range required'),
  body('format').isIn(['json', 'pdf', 'csv', 'excel']).withMessage('Valid format required')
], createCacheMiddleware('reports', 300), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { class_id, report_type, date_range_type, format, start_date, end_date, section = '', subject = '', period = '' } = req.body;
    
    // Calculate date range
    let dateRange = calculateDateRange(date_range_type, start_date, end_date);
    
    // Generate report data based on type
    let reportData;
    switch (report_type) {
      case 'daily_summary':
        reportData = await generateDailySummary(class_id, dateRange, { section, subject, period });
        break;
      case 'weekly_analysis':
        reportData = await generateWeeklyAnalysis(class_id, dateRange, { section, subject, period });
        break;
      case 'monthly_overview':
        reportData = await generateMonthlyOverview(class_id, dateRange, { section, subject, period });
        break;
      case 'student_performance':
        reportData = await generateStudentPerformance(class_id, dateRange, { section, subject, period });
        break;
      case 'attendance_trends':
        reportData = await generateAttendanceTrends(class_id, dateRange, { section, subject, period });
        break;
      default:
        throw new Error('Invalid report type');
    }

    // Format response based on requested format
    switch (format) {
      case 'json':
        res.json(reportData);
        break;
      case 'pdf':
        await generatePDFReport(res, reportData, report_type);
        break;
      case 'csv':
        await generateCSVReport(res, reportData, report_type);
        break;
      default:
        res.json(reportData);
    }

  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error.message
    });
  }
});

// Helper Functions
function calculateDateRange(type, startDate, endDate) {
  const now = new Date();
  let start, end;

  switch (type) {
    case 'current_week':
      start = new Date(now.setDate(now.getDate() - now.getDay()));
      end = new Date(now.setDate(start.getDate() + 6));
      break;
    case 'current_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case 'semester':
      // Assume two semesters: Jan 1 - Jun 30, Jul 1 - Dec 31
      if (now.getMonth() < 6) { // 0-5 => Jan-Jun
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 5, 30);
      } else { // Jul-Dec
        start = new Date(now.getFullYear(), 6, 1);
        end = new Date(now.getFullYear(), 11, 31);
      }
      break;
    case 'last_30_days':
      end = new Date();
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'custom':
      start = new Date(startDate);
      end = new Date(endDate);
      break;
    default:
      start = new Date(now.setDate(now.getDate() - 7));
      end = new Date();
  }

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
}

async function generateDailySummary(classId, dateRange, { section = '', subject = '', period = '' } = {}) {
  const { joins, where, params } = buildFilters({ classId, dateRange, section, subject, period });
  const attendanceData = await dbManager.executeQuery(`
    SELECT 
      a.date,
      COUNT(*) as total_students,
      SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
      SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
      SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count,
      ROUND(AVG(CASE WHEN a.status = 'present' THEN 100.0 ELSE 0 END), 2) as attendance_percentage
    FROM attendance a
    ${joins}
    WHERE ${where}
    GROUP BY a.date
    ORDER BY a.date DESC
  `, params);

  const classInfo = await dbManager.executeQuery(`
    SELECT c.*, COUNT(s.id) as total_enrolled
    FROM classes c
    LEFT JOIN students s ON c.id = s.class_id
    WHERE c.id = ?
    GROUP BY c.id
  `, [classId]);

  return {
    type: 'daily_summary',
    class: classInfo[0],
    date_range: dateRange,
    data: attendanceData,
    summary: {
      total_days: attendanceData.length,
      average_attendance: attendanceData.reduce((sum, day) => sum + day.attendance_percentage, 0) / attendanceData.length || 0,
      best_day: attendanceData.reduce((max, day) => day.attendance_percentage > max.attendance_percentage ? day : max, attendanceData[0] || {}),
      worst_day: attendanceData.reduce((min, day) => day.attendance_percentage < min.attendance_percentage ? day : min, attendanceData[0] || {})
    },
    metadata: {
      generated_at: new Date().toISOString(),
      generated_by: 'AttendanceMS Enhanced Reports'
    }
  };
}

async function generateWeeklyAnalysis(classId, dateRange, { section = '', subject = '', period = '' } = {}) {
  const { joins, where, params } = buildFilters({ classId, dateRange, section, subject, period });
  const weeklyData = await dbManager.executeQuery(`
    SELECT 
      strftime('%Y-%W', a.date) as week,
      strftime('%Y-%m-%d', MIN(a.date)) as week_start,
      strftime('%Y-%m-%d', MAX(a.date)) as week_end,
      COUNT(DISTINCT a.date) as days_with_classes,
      COUNT(*) as total_records,
      SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
      SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
      SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count,
      ROUND(AVG(CASE WHEN a.status = 'present' THEN 100.0 ELSE 0 END), 2) as attendance_percentage
    FROM attendance a
    ${joins}
    WHERE ${where}
    GROUP BY strftime('%Y-%W', a.date)
    ORDER BY week DESC
  `, params);

  return {
    type: 'weekly_analysis',
    date_range: dateRange,
    data: weeklyData,
    trends: {
      improving_weeks: weeklyData.filter((week, index) => 
        index > 0 && week.attendance_percentage > weeklyData[index - 1].attendance_percentage
      ).length,
      declining_weeks: weeklyData.filter((week, index) => 
        index > 0 && week.attendance_percentage < weeklyData[index - 1].attendance_percentage
      ).length
    },
    metadata: {
      generated_at: new Date().toISOString(),
      generated_by: 'AttendanceMS Enhanced Reports'
    }
  };
}

async function generateStudentPerformance(classId, dateRange, { section = '', subject = '', period = '' } = {}) {
  // Build filters; join to classes and filter attendance by optional period
  const base = buildFilters({ classId, dateRange, section, subject, period });
  // For student performance we need LEFT JOIN attendance, so rebuild WHERE accordingly
  const where = ['s.class_id = ?'];
  const params = [classId];
  let attendanceDateFilter = 'a.date BETWEEN ? AND ?';
  params.push(dateRange.start, dateRange.end);
  if (period) {
    attendanceDateFilter += ' AND a.session_time = ?';
    params.push(period);
  }
  if (section) {
    where.push('c.section = ?');
    params.push(section);
  }
  if (subject) {
    where.push('c.subject = ?');
    params.push(subject);
  }

  const studentData = await dbManager.executeQuery(`
    SELECT 
      s.id,
      s.name,
      s.roll_no,
      COUNT(a.id) as total_classes,
      SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
      SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
      SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count,
      ROUND(
        (SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100.0) / 
        NULLIF(COUNT(a.id), 0), 2
      ) as attendance_percentage,
      MIN(a.date) as first_class,
      MAX(a.date) as last_class
    FROM students s
    JOIN classes c ON s.class_id = c.id
    LEFT JOIN attendance a ON s.id = a.student_id AND a.class_id = s.class_id AND ${attendanceDateFilter}
    WHERE ${where.join(' AND ')}
    GROUP BY s.id, s.name, s.roll_no
    ORDER BY attendance_percentage DESC
  `, params);

  // Categorize students
  const categories = {
    excellent: studentData.filter(s => s.attendance_percentage >= 90),
    good: studentData.filter(s => s.attendance_percentage >= 75 && s.attendance_percentage < 90),
    average: studentData.filter(s => s.attendance_percentage >= 60 && s.attendance_percentage < 75),
    poor: studentData.filter(s => s.attendance_percentage < 60)
  };

  return {
    type: 'student_performance',
    date_range: dateRange,
    data: studentData,
    categories,
    statistics: {
      total_students: studentData.length,
      class_average: studentData.reduce((sum, s) => sum + (s.attendance_percentage || 0), 0) / studentData.length || 0,
      top_performer: studentData[0] || null,
      needs_attention: studentData.filter(s => s.attendance_percentage < 75)
    },
    metadata: {
      generated_at: new Date().toISOString(),
      generated_by: 'AttendanceMS Enhanced Reports'
    }
  };
}

async function generatePDFReport(res, data, reportType) {
  const doc = new PDFDocument();
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${reportType}_${Date.now()}.pdf"`);
  
  doc.pipe(res);
  
  // Header
  doc.fontSize(20).text('AttendanceMS Report', 50, 50);
  doc.fontSize(16).text(`Report Type: ${reportType.replace('_', ' ').toUpperCase()}`, 50, 80);
  doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, 50, 100);
  
  // Content based on report type
  let yPosition = 140;
  
  if (data.data && Array.isArray(data.data)) {
    data.data.forEach((item, index) => {
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }
      
      doc.text(`${index + 1}. ${JSON.stringify(item, null, 2)}`, 50, yPosition);
      yPosition += 60;
    });
  }
  
  doc.end();
}

async function generateCSVReport(res, data, reportType) {
  try {
    const fields = Object.keys(data.data[0] || {});
    const parser = new Parser({ fields });
    const csv = parser.parse(data.data);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${reportType}_${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to generate CSV' });
  }
}

export default router;