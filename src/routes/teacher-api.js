import express from 'express';
import { all, run } from '../db.js';

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// Insights dashboard aggregated data
router.get('/api/teacher-insights', requireAuth, async (req, res) => {
  try {
    const teacherId = req.session.user.id;
    const { classId = '', section = '', subject = '' } = req.query;

    // Build common filter conditions for class-scoped queries
    const classConds = ['c.teacher_id = ?'];
    const classParams = [teacherId];
    if (classId) {
      classConds.push('c.id = ?');
      classParams.push(classId);
    }
    if (section) {
      classConds.push('c.section = ?');
      classParams.push(section);
    }
    if (subject) {
      classConds.push('c.subject = ?');
      classParams.push(subject);
    }
    const classWhere = classConds.join(' AND ');

    // 1) Overall stats for today and last 30 days
    const today = new Date().toISOString().slice(0, 10);
    const last30 = await all(`
      SELECT 
        COUNT(a.id) as totalDays,
        COUNT(CASE WHEN a.status IN ('present','late') THEN 1 END) as presentMarks
      FROM attendance a
      JOIN classes c ON a.class_id = c.id
      WHERE ${classWhere}
        AND a.date >= date('now','-30 days')
    `, [...classParams]);

    const todayAgg = await all(`
      SELECT 
        COUNT(s.id) as totalStudents,
        COUNT(CASE WHEN a.status IN ('present','late') THEN 1 END) as presentToday
      FROM classes c
      LEFT JOIN students s ON c.id = s.class_id
      LEFT JOIN attendance a ON a.student_id = s.id AND a.class_id = c.id AND a.date = ?
      WHERE ${classWhere}
    `, [today, ...classParams]);

    const totalStudents = todayAgg[0]?.totalStudents || 0;
    const totalPresent = todayAgg[0]?.presentToday || 0;
    const avg30 = last30[0]?.totalDays > 0 ? Math.round((last30[0].presentMarks / last30[0].totalDays) * 100) : 0;

    // Approx change vs previous 30 days
    const prev30 = await all(`
      SELECT 
        COUNT(a.id) as totalDays,
        COUNT(CASE WHEN a.status IN ('present','late') THEN 1 END) as presentMarks
      FROM attendance a
      JOIN classes c ON a.class_id = c.id
      WHERE ${classWhere}
        AND a.date < date('now','-30 days')
        AND a.date >= date('now','-60 days')
    `, [...classParams]);
    const prevAvg = prev30[0]?.totalDays > 0 ? Math.round((prev30[0].presentMarks / prev30[0].totalDays) * 100) : 0;
    const attendanceChange = avg30 - prevAvg;

    // 2) Low attendance students (last 30 days, <75%)
    const lowAttendanceStudents = await all(`
      SELECT 
        s.id,
        s.name,
        s.roll_no as roll_number,
        c.name as class_name,
        c.section,
        COUNT(a.id) as total_days,
        COUNT(CASE WHEN a.status IN ('present','late') THEN 1 END) as present_days,
        ROUND(
          COUNT(CASE WHEN a.status IN ('present','late') THEN 1 END) * 100.0 / NULLIF(COUNT(a.id),0), 1
        ) as attendance_rate
      FROM students s
      JOIN classes c ON s.class_id = c.id
      LEFT JOIN attendance a ON s.id = a.student_id AND a.class_id = c.id
        AND a.date >= date('now','-30 days')
      WHERE ${classWhere}
      GROUP BY s.id, s.name, s.roll_no, c.name, c.section
      HAVING total_days >= 5 AND attendance_rate < 75
      ORDER BY attendance_rate ASC
      LIMIT 20
    `, [...classParams]);

    // 3) Trends data (last 30 days attendance rate per day)
    const trendsRaw = await all(`
      SELECT a.date,
        COUNT(a.id) as total,
        COUNT(CASE WHEN a.status IN ('present','late') THEN 1 END) as present
      FROM attendance a
      JOIN classes c ON a.class_id = c.id
      WHERE ${classWhere}
        AND a.date >= date('now','-30 days')
      GROUP BY a.date
      ORDER BY a.date
    `, [...classParams]);
    const trendsData = {
      labels: trendsRaw.map(d => new Date(d.date).toLocaleDateString()),
      attendanceRates: trendsRaw.map(d => d.total > 0 ? Math.round((d.present / d.total) * 100) : 0)
    };

    // 4) Class performance comparison (average rate per class in last 30 days)
    const performanceRaw = await all(`
      SELECT c.name as class_name,
        COUNT(a.id) as total,
        COUNT(CASE WHEN a.status IN ('present','late') THEN 1 END) as present
      FROM classes c
      LEFT JOIN attendance a ON a.class_id = c.id 
        AND a.date >= date('now','-30 days')
      WHERE ${classWhere}
      GROUP BY c.id, c.name
      ORDER BY c.name
    `, [...classParams]);
    const performanceData = {
      classNames: performanceRaw.map(r => r.class_name),
      attendanceRates: performanceRaw.map(r => r.total > 0 ? Math.round((r.present / r.total) * 100) : 0)
    };

    // 5a) Subject insights (average attendance per subject in last 30 days)
    const subjectsRaw = await all(`
      SELECT c.subject as subject,
        COUNT(a.id) as total,
        COUNT(CASE WHEN a.status IN ('present','late') THEN 1 END) as present
      FROM classes c
      LEFT JOIN attendance a ON a.class_id = c.id 
        AND a.date >= date('now','-30 days')
      WHERE ${classWhere} AND c.subject IS NOT NULL AND c.subject <> ''
      GROUP BY c.subject
      ORDER BY c.subject
    `, [...classParams]);
    const subjectInsights = subjectsRaw.map(r => ({
      subject: r.subject,
      rate: r.total > 0 ? Math.round((r.present / r.total) * 100) : 0
    }));

    // 5b) Period insights (average attendance per session_time in last 30 days)
    const periodsRaw = await all(`
      SELECT a.session_time as period,
        COUNT(a.id) as total,
        COUNT(CASE WHEN a.status IN ('present','late') THEN 1 END) as present
      FROM attendance a
      JOIN classes c ON a.class_id = c.id
      WHERE ${classWhere}
        AND a.date >= date('now','-30 days')
        AND a.session_time IS NOT NULL
      GROUP BY a.session_time
      ORDER BY a.session_time
    `, [...classParams]);
    const periodInsights = periodsRaw.map(r => ({
      period: r.period,
      rate: r.total > 0 ? Math.round((r.present / r.total) * 100) : 0
    }));

    // 6) Historical comparison (current month vs previous month)
    const curMonth = await all(`
      SELECT COUNT(a.id) as total, COUNT(CASE WHEN a.status IN ('present','late') THEN 1 END) as present
      FROM attendance a
      JOIN classes c ON a.class_id = c.id
      WHERE ${classWhere}
        AND a.date >= date('now','start of month')
        AND a.date <= date('now','start of month','+1 month','-1 day')
    `, [...classParams]);
    const prevMonth = await all(`
      SELECT COUNT(a.id) as total, COUNT(CASE WHEN a.status IN ('present','late') THEN 1 END) as present
      FROM attendance a
      JOIN classes c ON a.class_id = c.id
      WHERE ${classWhere}
        AND a.date >= date('now','start of month','-1 month')
        AND a.date < date('now','start of month')
    `, [...classParams]);
    const currentMonthRate = curMonth[0]?.total > 0 ? Math.round((curMonth[0].present / curMonth[0].total) * 100) : 0;
    const previousMonthRate = prevMonth[0]?.total > 0 ? Math.round((prevMonth[0].present / prevMonth[0].total) * 100) : 0;
    const historicalComparison = { currentMonthRate, previousMonthRate, change: currentMonthRate - previousMonthRate };

    // 7) Alerts summary (pending attendance today, notifications last 7 days)
    const pendingClasses = await all(`
      SELECT c.id
      FROM classes c
      LEFT JOIN attendance a ON a.class_id = c.id AND a.date = ?
      WHERE c.teacher_id = ?
      GROUP BY c.id
      HAVING COUNT(a.id) = 0
    `, [today, teacherId]);
    const notificationsSentLast7Raw = await all(`
      SELECT COUNT(*) as sent
      FROM notification_log
      WHERE sent_at >= datetime('now','-7 days')
    `);
    const alertsSummary = {
      belowThresholdCount: lowAttendanceStudents.length,
      pendingAttendanceCount: pendingClasses.length,
      notificationsSentLast7: notificationsSentLast7Raw[0]?.sent || 0
    };

    // 5) Top performers (students with highest attendance rate)
    const topPerformers = await all(`
      SELECT 
        s.name,
        c.name as class_name,
        c.section,
        ROUND(COUNT(CASE WHEN a.status IN ('present','late') THEN 1 END) * 100.0 / NULLIF(COUNT(a.id),0), 1) as attendance_rate
      FROM students s
      JOIN classes c ON s.class_id = c.id
      LEFT JOIN attendance a ON a.student_id = s.id AND a.class_id = c.id
        AND a.date >= date('now','-30 days')
      WHERE ${classWhere}
      GROUP BY s.id, s.name, c.name, c.section
      HAVING COUNT(a.id) >= 5
      ORDER BY attendance_rate DESC, s.name
      LIMIT 10
    `, [...classParams]);

    // 6) Simple predictive insights (placeholder rules based on trends)
    const predictions = [];
    if (attendanceChange < 0) {
      predictions.push({
        title: 'Attendance declining',
        description: 'Attendance rate decreased vs previous month. Consider sending reminders or engaging activities.',
        confidence: 70
      });
    } else {
      predictions.push({
        title: 'Attendance improving',
        description: 'Attendance rate improved vs previous month. Keep up the current practices.',
        confidence: 70
      });
    }

    res.json({
      success: true,
      topInsights: {
        averageAttendance: avg30,
        attendanceChange,
        totalPresent,
        totalStudents,
        lowAttendanceCount: lowAttendanceStudents.length
      },
      lowAttendanceStudents,
      topPerformers,
      predictions,
      trendsData,
      performanceData,
      subjectInsights,
      periodInsights,
      historicalComparison,
      alertsSummary
    });

  } catch (error) {
    console.error('Teacher insights API error:', error);
    res.status(500).json({ success: false, error: 'Failed to load insights' });
  }
});

// Get teacher's classes
router.get('/api/teacher-classes', requireAuth, async (req, res) => {
  try {
    const teacherId = req.session.user.id;
    
    const classes = await all(`
      SELECT 
        c.id,
        c.name,
        c.section,
        c.subject,
        COUNT(s.id) as studentCount
      FROM classes c
      LEFT JOIN students s ON c.id = s.class_id
      WHERE c.teacher_id = ?
      GROUP BY c.id, c.name, c.section, c.subject
      ORDER BY c.name, c.section
    `, [teacherId]);

    res.json({
      success: true,
      classes
    });
    
  } catch (error) {
    console.error('Teacher classes API error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load classes' 
    });
  }
});

// Get available students for class creation
router.get('/api/available-students', requireAuth, async (req, res) => {
  try {
    // Get all students not assigned to any class or create new ones
    const students = await all(`
      SELECT 
        s.id,
        s.name,
        s.roll_number,
        s.email,
        c.name as current_class
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      ORDER BY s.name
    `);

    res.json({
      success: true,
      students
    });
    
  } catch (error) {
    console.error('Available students API error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load students' 
    });
  }
});

// Get attendance history for a specific class and date
router.get('/api/attendance-history', requireAuth, async (req, res) => {
  try {
    const { classId, date } = req.query;
    const teacherId = req.session.user.id;
    
    // Verify teacher owns this class
    const classCheck = await all(`
      SELECT id FROM classes WHERE id = ? AND teacher_id = ?
    `, [classId, teacherId]);
    
    if (classCheck.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const attendance = await all(`
      SELECT 
        a.student_id,
        a.status,
        a.note,
        s.name as student_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE a.class_id = ? AND a.date = ?
    `, [classId, date]);

    res.json({
      success: true,
      attendance
    });
    
  } catch (error) {
    console.error('Attendance history API error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load attendance history' 
    });
  }
});

// Get attendance reports with filters
router.get('/api/attendance-reports', requireAuth, async (req, res) => {
  try {
    const teacherId = req.session.user.id;
    const { classId, fromDate, toDate } = req.query;
    
    let classFilter = '';
    let params = [teacherId];
    
    if (classId) {
      classFilter = 'AND c.id = ?';
      params.push(classId);
    }
    
    params.push(fromDate, toDate);
    
    // Get detailed attendance reports
    const reports = await all(`
      SELECT 
        s.id as studentId,
        s.name as studentName,
        s.roll_number as rollNumber,
        c.name as className,
        c.section,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as presentDays,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absentDays,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) as lateDays,
        COUNT(a.id) as totalDays
      FROM students s
      JOIN classes c ON s.class_id = c.id
      LEFT JOIN attendance a ON s.id = a.student_id 
        AND a.class_id = c.id
        AND a.date BETWEEN ? AND ?
      WHERE c.teacher_id = ? ${classFilter}
      GROUP BY s.id, s.name, s.roll_number, c.name, c.section
      ORDER BY c.name, c.section, s.name
    `, [...params.slice(1), teacherId]);
    
    // Calculate summary statistics
    const summary = {
      totalPresent: reports.reduce((sum, r) => sum + r.presentDays, 0),
      totalAbsent: reports.reduce((sum, r) => sum + r.absentDays, 0),
      totalLate: reports.reduce((sum, r) => sum + r.lateDays, 0),
      averageRate: reports.length > 0 ? 
        Math.round(reports.reduce((sum, r) => {
          const rate = r.totalDays > 0 ? ((r.presentDays + r.lateDays) / r.totalDays) * 100 : 0;
          return sum + rate;
        }, 0) / reports.length) : 0
    };
    
    // Get chart data (daily attendance for the period)
    const chartData = await all(`
      SELECT 
        a.date,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late
      FROM attendance a
      JOIN classes c ON a.class_id = c.id
      WHERE c.teacher_id = ? ${classFilter}
        AND a.date BETWEEN ? AND ?
      GROUP BY a.date
      ORDER BY a.date
    `, params);
    
    const formattedChartData = {
      labels: chartData.map(d => new Date(d.date).toLocaleDateString()),
      present: chartData.map(d => d.present),
      absent: chartData.map(d => d.absent),
      late: chartData.map(d => d.late)
    };

    res.json({
      success: true,
      reports,
      summary,
      chartData: formattedChartData
    });
    
  } catch (error) {
    console.error('Attendance reports API error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load attendance reports' 
    });
  }
});

// Export attendance data
router.get('/api/export-attendance', requireAuth, async (req, res) => {
  try {
    const teacherId = req.session.user.id;
    const { format, classId, fromDate, toDate } = req.query;
    
    let classFilter = '';
    let params = [teacherId];
    
    if (classId) {
      classFilter = 'AND c.id = ?';
      params.push(classId);
    }
    
    params.push(fromDate, toDate);
    
    // Get attendance data for export
    const exportData = await all(`
      SELECT 
        s.name as "Student Name",
        s.roll_number as "Roll Number",
        c.name as "Class",
        c.section as "Section",
        a.date as "Date",
        a.status as "Status",
        a.note as "Notes"
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN classes c ON a.class_id = c.id
      WHERE c.teacher_id = ? ${classFilter}
        AND a.date BETWEEN ? AND ?
      ORDER BY a.date DESC, c.name, c.section, s.name
    `, [...params.slice(1), teacherId]);
    
    if (format === 'excel') {
      // Generate Excel file
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.xlsx');
      
      // Simple CSV format for now (can be enhanced with actual Excel library)
      const csv = [
        Object.keys(exportData[0] || {}).join(','),
        ...exportData.map(row => Object.values(row).join(','))
      ].join('\n');
      
      res.send(csv);
    } else if (format === 'pdf') {
      // Generate PDF (would need PDF library like puppeteer or jsPDF)
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.pdf');
      
      // For now, return JSON (can be enhanced with actual PDF generation)
      res.json({ data: exportData, format: 'pdf' });
    } else {
      res.json({ success: true, data: exportData });
    }
    
  } catch (error) {
    console.error('Export attendance API error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to export attendance data' 
    });
  }
});

// Get low attendance students for alerts
router.get('/api/low-attendance-students', requireAuth, async (req, res) => {
  try {
    const teacherId = req.session.user.id;
    const { threshold = 75, days = 30 } = req.query;
    
    const lowAttendanceStudents = await all(`
      SELECT 
        s.id,
        s.name,
        s.roll_number,
        c.name as class_name,
        c.section,
        COUNT(a.id) as total_days,
        COUNT(CASE WHEN a.status IN ('present', 'late') THEN 1 END) as present_days,
        ROUND(COUNT(CASE WHEN a.status IN ('present', 'late') THEN 1 END) * 100.0 / COUNT(a.id), 1) as attendance_rate,
        g.email as guardian_email,
        g.phone as guardian_phone
      FROM students s
      JOIN classes c ON s.class_id = c.id
      LEFT JOIN guardians g ON s.id = g.student_id
      LEFT JOIN attendance a ON s.id = a.student_id 
        AND a.date >= date('now', '-' || ? || ' days')
        AND a.class_id = c.id
      WHERE c.teacher_id = ?
      GROUP BY s.id, s.name, s.roll_number, c.name, c.section, g.email, g.phone
      HAVING total_days >= 5 AND attendance_rate < ?
      ORDER BY attendance_rate ASC
    `, [days, teacherId, threshold]);

    res.json({
      success: true,
      students: lowAttendanceStudents,
      threshold: parseInt(threshold),
      period: parseInt(days)
    });
    
  } catch (error) {
    console.error('Low attendance students API error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load low attendance students' 
    });
  }
});

// Get class attendance summary for a specific date
router.get('/api/class-attendance-summary', requireAuth, async (req, res) => {
  try {
    const teacherId = req.session.user.id;
    const { date = new Date().toISOString().slice(0, 10) } = req.query;
    
    const summary = await all(`
      SELECT 
        c.id,
        c.name,
        c.section,
        c.subject,
        COUNT(s.id) as total_students,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
        COUNT(a.id) > 0 as attendance_marked
      FROM classes c
      LEFT JOIN students s ON c.id = s.class_id
      LEFT JOIN attendance a ON s.id = a.student_id AND a.date = ? AND a.class_id = c.id
      WHERE c.teacher_id = ?
      GROUP BY c.id, c.name, c.section, c.subject
      ORDER BY c.name, c.section
    `, [date, teacherId]);

    res.json({
      success: true,
      date,
      classes: summary.map(cls => ({
        ...cls,
        attendance_marked: cls.attendance_marked === 1,
        attendance_rate: cls.total_students > 0 ? 
          Math.round(((cls.present_count + cls.late_count) / cls.total_students) * 100) : 0
      }))
    });
    
  } catch (error) {
    console.error('Class attendance summary API error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load class attendance summary' 
    });
  }
});

// Create teacher notes table
router.get('/api/create-teacher-notes-table', requireAuth, async (req, res) => {
  try {
    const teacherId = req.session.user.id;
    const query = `
      CREATE TABLE IF NOT EXISTS teacher_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        note TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teacher_id) REFERENCES teachers (id),
        FOREIGN KEY (student_id) REFERENCES students (id)
      );
    `;
    await run(query);
    res.json({ success: true, message: 'Teacher notes table created successfully' });
  } catch (error) {
    console.error('Create teacher notes table API error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create teacher notes table' 
    });
  }
});

// Get teacher notes
router.get('/api/teacher-notes', requireAuth, async (req, res) => {
  try {
    const teacherId = req.session.user.id;
    const query = `
      SELECT * FROM teacher_notes
      WHERE teacher_id = ?
    `;
    const notes = await all(query, [teacherId]);
    res.json({ success: true, notes });
  } catch (error) {
    console.error('Get teacher notes API error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load teacher notes' 
    });
  }
});

// Add teacher note
router.post('/api/add-teacher-note', requireAuth, async (req, res) => {
  try {
    const teacherId = req.session.user.id;
    const { studentId, note } = req.body;
    const query = `
      INSERT INTO teacher_notes (teacher_id, student_id, note)
      VALUES (?, ?, ?)
    `;
    await run(query, [teacherId, studentId, note]);
    res.json({ success: true, message: 'Teacher note added successfully' });
  } catch (error) {
    console.error('Add teacher note API error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to add teacher note' 
    });
  }
});

// Update teacher note
router.put('/api/update-teacher-note', requireAuth, async (req, res) => {
  try {
    const teacherId = req.session.user.id;
    const { id, note } = req.body;
    const query = `
      UPDATE teacher_notes
      SET note = ?
      WHERE id = ? AND teacher_id = ?
    `;
    await run(query, [note, id, teacherId]);
    res.json({ success: true, message: 'Teacher note updated successfully' });
  } catch (error) {
    console.error('Update teacher note API error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update teacher note' 
    });
  }
});

// Delete teacher note
router.delete('/api/delete-teacher-note', requireAuth, async (req, res) => {
  try {
    const teacherId = req.session.user.id;
    const { id } = req.body;
    const query = `
      DELETE FROM teacher_notes
      WHERE id = ? AND teacher_id = ?
    `;
    await run(query, [id, teacherId]);
    res.json({ success: true, message: 'Teacher note deleted successfully' });
  } catch (error) {
    console.error('Delete teacher note API error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete teacher note' 
    });
  }
});

export default router;