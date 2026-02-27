import { db } from '../db.js';

export function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || req.query.token;
  const token = typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  if (!token || !token.startsWith('session-')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const parts = token.split('-');
  const userId = parseInt(parts[1], 10);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const user = db.prepare('SELECT id, email, role FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  req.userId = user.id;
  req.userEmail = user.email;
  req.userRole = user.role || 'student';
  next();
}

export function requireStudent(req, res, next) {
  if (req.userRole !== 'student') {
    return res.status(403).json({ error: 'Students only' });
  }
  next();
}

export function requireCommittee(req, res, next) {
  if (req.userRole !== 'committee') {
    return res.status(403).json({ error: 'Committee members only' });
  }
  next();
}
