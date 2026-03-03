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
  const user = db.prepare('SELECT id, email, role, major, majors FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  req.userId = user.id;
  req.userEmail = user.email;
  req.userRole = user.role || 'student';
  req.userMajor = user.major;
  req.userMajors = parseMajors(user.majors);
  next();
}

function parseMajors(s) {
  if (!s) return [];
  try {
    const a = JSON.parse(s);
    return Array.isArray(a) ? a : [];
  } catch {
    return s.split(',').map(m => m.trim()).filter(Boolean);
  }
}

export function requireStudent(req, res, next) {
  if (req.userRole !== 'student') return res.status(403).json({ error: 'Students only' });
  next();
}

export function requireCommittee(req, res, next) {
  if (req.userRole !== 'expert' && req.userRole !== 'committee' && req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Experts or admin only' });
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (req.userRole !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}
