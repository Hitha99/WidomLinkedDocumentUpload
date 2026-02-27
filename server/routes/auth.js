import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// Simple login (no password hashing for minimal setup; use bcrypt in production)
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  const user = db.prepare('SELECT id, email, role FROM users WHERE email = ? AND password_hash = ?').get(email, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const role = user.role || 'student';
  res.json({
    user: { id: user.id, email: user.email, role },
    token: `session-${user.id}-${Date.now()}`,
  });
});

router.post('/register', (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  const userRole = role === 'committee' ? 'committee' : 'student';
  try {
    db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)').run(email, password, userRole);
    const user = db.prepare('SELECT id, email, role FROM users WHERE email = ?').get(email);
    res.status(201).json({
      user: { id: user.id, email: user.email, role: user.role || userRole },
      token: `session-${user.id}-${Date.now()}`,
    });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    throw e;
  }
});

export default router;
