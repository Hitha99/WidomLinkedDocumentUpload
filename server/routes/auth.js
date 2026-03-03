import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';

function parseMajors(s) {
  if (!s) return [];
  try {
    const a = JSON.parse(s);
    return Array.isArray(a) ? a : [];
  } catch {
    return s.split(',').map(m => m.trim()).filter(Boolean);
  }
}

const router = Router();

// Simple login (no password hashing for minimal setup; use bcrypt in production)
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  const user = db.prepare('SELECT id, email, role, major, majors FROM users WHERE email = ? AND password_hash = ?').get(email, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const role = user.role || 'student';
  res.json({
    user: { id: user.id, email: user.email, role, major: user.major, majors: parseMajors(user.majors) },
    token: `session-${user.id}-${Date.now()}`,
  });
});

router.post('/register', (req, res) => {
  const { email, password, role, major, majors } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  const userRole = role === 'expert' || role === 'committee' ? 'expert' : 'student';
  const maj = userRole === 'student' ? (major != null ? String(major).trim() : null) : null;
  const majs = userRole === 'expert' && Array.isArray(majors) ? JSON.stringify(majors) : (userRole === 'expert' && typeof majors === 'string' ? JSON.stringify(majors.split(',').map(m => m.trim()).filter(Boolean)) : null);
  try {
    db.prepare('INSERT INTO users (email, password_hash, role, major, majors) VALUES (?, ?, ?, ?, ?)').run(email, password, userRole, maj, majs);
    const user = db.prepare('SELECT id, email, role, major, majors FROM users WHERE email = ?').get(email);
    res.status(201).json({
      user: { id: user.id, email: user.email, role: user.role || userRole, major: user.major, majors: parseMajors(user.majors) },
      token: `session-${user.id}-${Date.now()}`,
    });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    throw e;
  }
});

router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email || !String(email).trim()) {
    return res.status(400).json({ error: 'Email required' });
  }
  const em = String(email).trim().toLowerCase();
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(em);
  if (!user) {
    return res.json({ success: true, message: 'If that email exists, a reset link was sent.' });
  }
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  db.prepare('DELETE FROM password_reset_tokens WHERE email = ?').run(em);
  db.prepare('INSERT INTO password_reset_tokens (email, token, expires_at) VALUES (?, ?, ?)').run(em, token, expiresAt);
  res.json({ success: true, token, expiresAt });
});

router.post('/reset-password', (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || String(newPassword).length < 4) {
    return res.status(400).json({ error: 'Valid token and password (min 4 chars) required' });
  }
  const row = db.prepare('SELECT email, expires_at FROM password_reset_tokens WHERE token = ?').get(token);
  if (!row) return res.status(400).json({ error: 'Invalid or expired reset link' });
  if (new Date(row.expires_at) < new Date()) {
    db.prepare('DELETE FROM password_reset_tokens WHERE token = ?').run(token);
    return res.status(400).json({ error: 'Reset link has expired' });
  }
  db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(String(newPassword), row.email);
  db.prepare('DELETE FROM password_reset_tokens WHERE token = ?').run(token);
  res.json({ success: true, message: 'Password updated' });
});

export default router;
