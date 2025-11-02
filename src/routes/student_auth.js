import express from 'express';
import { all } from '../db.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

router.get('/student/login', (req, res) => {
  if (req.session.student) return res.redirect('/student/dashboard');
  res.render('student_login', { error: null });
});

router.post('/student/login', async (req, res) => {
  const { email, password } = req.body;
  const rows = await all(`SELECT sa.*, s.name as student_name FROM student_accounts sa JOIN students s ON s.id = sa.student_id WHERE sa.email = ?`, [email]);
  if (rows.length === 0) return res.status(401).render('student_login', { error: 'Invalid credentials' });
  const acct = rows[0];
  const ok = await bcrypt.compare(password, acct.password_hash);
  if (!ok) return res.status(401).render('student_login', { error: 'Invalid credentials' });
  req.session.student = { id: acct.student_id, email: acct.email, name: acct.student_name };
  res.redirect('/student/dashboard');
});

router.post('/student/logout', (req, res) => {
  delete req.session.student;
  res.redirect('/student/login');
});

export default router;
