import express from 'express';
import { all, run } from '../db.js';

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

router.get('/class/:id/period-attendance', requireAuth, async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  const klass = (await all(`SELECT * FROM classes WHERE id = ? AND teacher_id = ?`, [classId, req.session.user.id]))[0];
  if (!klass) return res.status(404).send('Not found');
  const date = req.query.date || new Date().toISOString().slice(0,10);
  const students = await all(`SELECT * FROM students WHERE class_id = ? ORDER BY CAST(roll_no AS INT)`, [classId]);
  const periods = await all(`SELECT * FROM periods WHERE class_id = ? ORDER BY id ASC`, [classId]);
  const rows = await all(`SELECT * FROM attendance_period WHERE class_id = ? AND date = ?`, [classId, date]);
  const presentMap = new Map();
  for (const r of rows) presentMap.set(`${r.student_id}_${r.period_id}`, r.present);
  res.render('attendance_period', { klass, students, periods, date, presentMap });
});

router.post('/class/:id/period-attendance', requireAuth, async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  const { date } = req.body;
  const klass = (await all(`SELECT * FROM classes WHERE id = ? AND teacher_id = ?`, [classId, req.session.user.id]))[0];
  if (!klass) return res.status(404).send('Not found');
  const students = await all(`SELECT * FROM students WHERE class_id = ?`, [classId]);
  const periods = await all(`SELECT * FROM periods WHERE class_id = ?`, [classId]);

  for (const s of students) {
    for (const p of periods) {
      const key = `present_${s.id}_${p.id}`;
      const present = req.body[key] ? 1 : 0;
      await run(
        `INSERT INTO attendance_period (date, period_id, class_id, student_id, present)
         VALUES (?,?,?,?,?)
         ON CONFLICT(date, period_id, student_id)
         DO UPDATE SET present = excluded.present`,
        [date, p.id, classId, s.id, present]
      );
    }
  }

  res.redirect(`/class/${classId}/period-attendance?date=${encodeURIComponent(date)}&saved=1`);
});

export default router;
