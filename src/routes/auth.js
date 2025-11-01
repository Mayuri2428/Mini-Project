import express from 'express';
import { all } from '../db.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const rows = await all(`SELECT * FROM teachers WHERE email = ?`, [email]);
  if (rows.length === 0) return res.status(401).render('login', { error: 'Invalid credentials' });
  const teacher = rows[0];
  const ok = await bcrypt.compare(password, teacher.password_hash);
  if (!ok) return res.status(401).render('login', { error: 'Invalid credentials' });
  req.session.user = { id: teacher.id, name: teacher.name, email: teacher.email };
  res.redirect('/dashboard');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

export default router;
