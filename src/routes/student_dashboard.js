import express from 'express';
import { all } from '../db.js';

const router = express.Router();

function requireStudent(req, res, next) {
  if (!req.session.student) return res.redirect('/student/login');
  next();
}

router.get('/student/dashboard', requireStudent, async (req, res) => {
  const sid = req.session.student.id;
  const student = (await all(`SELECT s.*, c.name as class_name, c.section FROM students s JOIN classes c ON c.id = s.class_id WHERE s.id = ?`, [sid]))[0];

  const overall = (await all(`
    SELECT
      SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present_count,
      COUNT(*) as total_count
    FROM attendance WHERE student_id = ?
  `, [sid]))[0];
  const pct = overall.total_count ? Math.round((overall.present_count / overall.total_count) * 100) : null;

  const recent = await all(`
    SELECT date, status FROM attendance WHERE student_id = ? ORDER BY date DESC LIMIT 10
  `, [sid]);

  const periodToday = await all(`
    SELECT p.name as period_name, ap.present, ap.date
    FROM attendance_period ap
    JOIN periods p ON p.id = ap.period_id
    WHERE ap.student_id = ? AND ap.date = DATE('now')
    ORDER BY p.id ASC
  `, [sid]);

  res.render('student_dashboard', { student, pct, overall, recent, periodToday });
});

export default router;
