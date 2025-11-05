import express from 'express';
import { all, run } from '../db.js';

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

// Enhanced Reports Dashboard
router.get('/reports', requireAuth, async (req, res) => {
  const teacherId = req.session.user.id;
  
  // Get all classes for this teacher
  const classes = await all(`
    SELECT c.*, COUNT(s.id) as student_count
    FROM classes c 
    LEFT JOIN students s ON c.id = s.class_id 
    WHERE c.teacher_id = ? 
    GROUP BY c.id
    ORDER BY c.academic_year DESC, c.department, c.name
  `, [teacherId]);

  // Get unique academic years
  const academicYears = await all(`
    SELECT DISTINCT academic_year 
    FROM classes 
    WHERE teacher_id = ? AND academic_year IS NOT NULL
    ORDER BY academic_year DESC
  `, [teacherId]);

  // Get unique departments
  const departments = await all(`
    SELECT DISTINCT department 
    FROM classes 
    WHERE teacher_id = ? AND department IS NOT NULL
    ORDER BY department
  `, [teacherId]);

  // Get unique subjects
  const subjects = await all(`
    SELECT DISTINCT subject 
    FROM classes 
    WHERE teacher_id = ? AND subject IS NOT NULL
    ORDER BY subject
  `, [teacherId]);

  res.render('enhanced-reports', {
    classes,
    academicYears,
    departments,
    subjects,
    pageTitle: 'Enhanced Reports Dashboard'
  });
});

// Generate Report with Filters
router.post('/reports/generate', requireAuth, async (req, res) => {
  const teacherId = req.session.user.id;
  const {
    class_id,
    report_type,
    date_range_type,
    start_date,
    end_date,
    academic_year,
    department,
    subject,
    section,
    format
  } = req.body;

  try {
    // Validate inputs
    if (!class_id) {
      return res.status(400).json({ error: 'Please select a class' });
    }

    if (!report_type) {
      return res.status(400).json({ error: 'Please select a report type' });
    }

    // Verify teacher owns this class
    const classInfo = await all(`
      SELECT * FROM classes WHERE id = ? AND teacher_id = ?
    `, [class_id, teacherId]);

    if (classInfo.length === 0) {
      return res.status(403).json({ error: 'Access denied to this class' });
    }

    // Calculate date range based on type
    let dateFrom, dateTo;
    const today = new Date();
    
    switch (date_range_type) {
      case 'current_week':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        dateFrom = startOfWeek.toISOString().slice(0, 10);
        dateTo = endOfWeek.toISOString().slice(0, 10);
        break;
        
      case 'current_month':
        dateFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
        dateTo = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
        break;
        
      case 'current_semester':
        // Assume semester starts in January or July
        const month = today.getMonth();
        if (month >= 0 && month <= 5) { // Jan-Jun
          dateFrom = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10);
          dateTo = new Date(today.getFullYear(), 5, 30).toISOString().slice(0, 10);
        } else { // Jul-Dec
          dateFrom = new Date(today.getFullYear(), 6, 1).toISOString().slice(0, 10);
          dateTo = new Date(today.getFullYear(), 11, 31).toISOString().slice(0, 10);
        }
        break;
        
      case 'custom':
        if (!start_date || !end_date) {
          return res.status(400).json({ error: 'Please provide start and end dates for custom range' });
        }
        dateFrom = start_date;
        dateTo = end_date;
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid date range type' });
    }

    // Build filter conditions
    let whereConditions = ['a.class_id = ?', 'a.date >= ?', 'a.date <= ?'];
    let queryParams = [class_id, dateFrom, dateTo];

    // Add optional filters
    if (section) {
      whereConditions.push('c.section = ?');
      queryParams.push(section);
    }

    if (subject) {
      whereConditions.push('c.subject = ?');
      queryParams.push(subject);
    }

    // Generate report based on type
    let reportData;
    switch (report_type) {
      case 'daily_summary':
        reportData = await generateDailySummaryReport(whereConditions, queryParams, dateFrom, dateTo);
        break;
        
      case 'student_wise':
        reportData = await generateStudentWiseReport(whereConditions, queryParams, class_id);
        break;
        
      case 'session_wise':
        reportData = await generateSessionWiseReport(whereConditions, queryParams, class_id);
        break;
        
      case 'attendance_trends':
        reportData = await generateAttendanceTrendsReport(whereConditions, queryParams, class_id);
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    // Add metadata
    reportData.metadata = {
      class: classInfo[0],
      dateRange: { from: dateFrom, to: dateTo },
      reportType: report_type,
      generatedAt: new Date().toISOString(),
      generatedBy: req.session.user.name,
      filters: {
        academic_year,
        department,
        subject,
        section
      }
    };

    // Return based on format
    if (format === 'json') {
      res.json(reportData);
    } else if (format === 'csv') {
      generateCSVReport(res, reportData, report_type);
    } else {
      res.render('report-results', {
        reportData,
        pageTitle: `${report_type.replace('_', ' ').toUpperCase()} Report`
      });
    }

  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Report generation functions
async function generateDailySummaryReport(whereConditions, queryParams, dateFrom, dateTo) {
  const query = `
    SELECT 
      a.date,
      a.session_time,
      COUNT(DISTINCT a.student_id) as total_students,
      SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
      SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
      SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count,
      SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) as excused_count,
      ROUND(
        (SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100.0 / 
         COUNT(DISTINCT a.student_id)), 2
      ) as attendance_percentage
    FROM attendance a
    JOIN classes c ON a.class_id = c.id
    WHERE ${whereConditions.join(' AND ')}
    GROUP BY a.date, a.session_time
    ORDER BY a.date DESC, a.session_time
  `;

  const rows = await all(query, queryParams);
  
  return {
    type: 'daily_summary',
    data: rows,
    summary: {
      totalDays: new Set(rows.map(r => r.date)).size,
      totalSessions: rows.length,
      averageAttendance: rows.length > 0 ? 
        Math.round(rows.reduce((sum, r) => sum + r.attendance_percentage, 0) / rows.length) : 0
    }
  };
}

async function generateStudentWiseReport(whereConditions, queryParams, classId) {
  const query = `
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
      ) as attendance_percentage
    FROM students s
    LEFT JOIN attendance a ON s.id = a.student_id
    JOIN classes c ON s.class_id = c.id
    WHERE s.class_id = ? AND (a.id IS NULL OR (${whereConditions.join(' AND ')}))
    GROUP BY s.id, s.name, s.roll_no, s.academic_year, s.branch
    ORDER BY s.roll_no
  `;

  const rows = await all(query, [classId, ...queryParams]);
  
  return {
    type: 'student_wise',
    data: rows,
    summary: {
      totalStudents: rows.length,
      averageAttendance: rows.length > 0 ? 
        Math.round(rows.reduce((sum, r) => sum + (r.attendance_percentage || 0), 0) / rows.length) : 0,
      highAttendance: rows.filter(r => (r.attendance_percentage || 0) >= 90).length,
      lowAttendance: rows.filter(r => (r.attendance_percentage || 0) < 75).length
    }
  };
}

async function generateSessionWiseReport(whereConditions, queryParams, classId) {
  const query = `
    SELECT 
      a.session_time,
      COUNT(DISTINCT a.date) as total_days,
      COUNT(a.id) as total_records,
      SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
      SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
      ROUND(
        (SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100.0 / 
         NULLIF(COUNT(a.id), 0)), 2
      ) as attendance_percentage
    FROM attendance a
    JOIN classes c ON a.class_id = c.id
    WHERE ${whereConditions.join(' AND ')}
    GROUP BY a.session_time
    ORDER BY a.session_time
  `;

  const rows = await all(query, queryParams);
  
  return {
    type: 'session_wise',
    data: rows,
    summary: {
      totalSessions: rows.length,
      bestSession: rows.reduce((best, current) => 
        (current.attendance_percentage > (best.attendance_percentage || 0)) ? current : best, {}),
      worstSession: rows.reduce((worst, current) => 
        (current.attendance_percentage < (worst.attendance_percentage || 100)) ? current : worst, {})
    }
  };
}

async function generateAttendanceTrendsReport(whereConditions, queryParams, classId) {
  const query = `
    SELECT 
      a.date,
      COUNT(a.id) as total_records,
      SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
      ROUND(
        (SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100.0 / 
         NULLIF(COUNT(a.id), 0)), 2
      ) as attendance_percentage
    FROM attendance a
    JOIN classes c ON a.class_id = c.id
    WHERE ${whereConditions.join(' AND ')}
    GROUP BY a.date
    ORDER BY a.date
  `;

  const rows = await all(query, queryParams);
  
  // Calculate trends
  const trend = rows.length > 1 ? 
    rows[rows.length - 1].attendance_percentage - rows[0].attendance_percentage : 0;
  
  return {
    type: 'attendance_trends',
    data: rows,
    summary: {
      totalDays: rows.length,
      trend: trend > 0 ? 'improving' : trend < 0 ? 'declining' : 'stable',
      trendValue: Math.abs(trend),
      highestDay: rows.reduce((max, current) => 
        (current.attendance_percentage > (max.attendance_percentage || 0)) ? current : max, {}),
      lowestDay: rows.reduce((min, current) => 
        (current.attendance_percentage < (min.attendance_percentage || 100)) ? current : min, {})
    }
  };
}

function generateCSVReport(res, reportData, reportType) {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `${reportType}_report_${timestamp}.csv`;
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  
  // Generate CSV based on report type
  let headers, rows;
  
  switch (reportType) {
    case 'daily_summary':
      headers = ['Date', 'Session', 'Total Students', 'Present', 'Absent', 'Late', 'Excused', 'Attendance %'];
      rows = reportData.data.map(row => [
        row.date,
        row.session_time || 'All Day',
        row.total_students,
        row.present_count,
        row.absent_count,
        row.late_count,
        row.excused_count,
        row.attendance_percentage
      ]);
      break;
      
    case 'student_wise':
      headers = ['Roll No', 'Name', 'Year', 'Branch', 'Total Sessions', 'Present', 'Absent', 'Late', 'Excused', 'Attendance %'];
      rows = reportData.data.map(row => [
        row.roll_no,
        row.name,
        row.academic_year || '',
        row.branch || '',
        row.total_sessions,
        row.present_sessions,
        row.absent_sessions,
        row.late_sessions,
        row.excused_sessions,
        row.attendance_percentage || 0
      ]);
      break;
      
    default:
      headers = ['Data'];
      rows = [['Report data not available in CSV format']];
  }
  
  // Write CSV
  res.write(headers.join(',') + '\n');
  rows.forEach(row => {
    res.write(row.map(cell => `"${cell}"`).join(',') + '\n');
  });
  res.end();
}

export default router;