import express from 'express';
import { all } from '../db.js';

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

router.get('/dashboard', requireAuth, async (req, res) => {
  const classes = await all(`SELECT * FROM classes WHERE teacher_id = ?`, [req.session.user.id]);
  res.render('dashboard', { classes });
});

export default router;
