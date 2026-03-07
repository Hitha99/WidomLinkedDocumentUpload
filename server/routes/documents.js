import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { db } from '../db.js';
import { authMiddleware, requireStudent } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', 'uploads');

const ALLOWED_TYPES = ['sop', 'lor', 'resume', 'transcript', 'additional'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadsDir),
  filename: (_, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname) || '.bin'}`),
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_, file, cb) => {
    const ext = (path.extname(file.originalname) || '').toLowerCase();
    const allowed = ['.pdf', '.doc', '.docx', '.txt'];
    if (allowed.some(e => ext === e)) return cb(null, true);
    cb(new Error('Only PDF, DOC, DOCX, TXT allowed'));
  },
});

const router = Router();

router.use(authMiddleware, requireStudent);

router.get('/', (req, res) => {
  const user = db.prepare('SELECT approved FROM users WHERE id = ?').get(req.userId) || {};
  const isApproved = user && user.approved === 1;
  let docs;
  try {
    docs = db.prepare(
      'SELECT id, type, filename, path, size, created_at, description, uploaded_by FROM documents WHERE user_id = ? ORDER BY uploaded_by IS NULL DESC, created_at DESC'
    ).all(req.userId);
  } catch (_) {
    docs = db.prepare(
      'SELECT id, type, filename, path, size, created_at FROM documents WHERE user_id = ? ORDER BY created_at DESC'
    ).all(req.userId);
  }
  const msg = db.prepare('SELECT id, message, created_at FROM messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(req.userId);
  let clarifications = [];
  try {
    clarifications = db.prepare(`
      SELECT c.id, c.message, c.created_at, u.email AS from_email
      FROM clarifications c
      JOIN users u ON u.id = c.from_user_id
      WHERE c.student_id = ?
      ORDER BY c.created_at DESC
    `).all(req.userId);
  } catch (_) {}
  res.json({ documents: docs, message: msg || null, clarifications, isApproved: !!isApproved });
});

router.post('/upload', upload.single('file'), (req, res) => {
  const user = db.prepare('SELECT approved FROM users WHERE id = ?').get(req.userId);
  if (!user || user.approved !== 1) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(403).json({ error: 'Only selected students can upload. Contact the committee.' });
  }
  const type = (req.body.type || '').toLowerCase();
  if (!ALLOWED_TYPES.includes(type)) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Invalid type.' });
  }
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const originalName = req.body.originalName || req.file.originalname || type;
  const description = type === 'additional' && req.body.description != null ? String(req.body.description).trim().slice(0, 200) : null;
  db.prepare(
    'INSERT INTO documents (user_id, type, filename, path, size, description) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(req.userId, type, originalName, req.file.filename, req.file.size, description || null);
  const row = db.prepare('SELECT id, type, filename, path, size, created_at, description FROM documents WHERE id = last_insert_rowid()').get();
  res.status(201).json(row);
});

router.post('/message', (req, res) => {
  const user = db.prepare('SELECT approved FROM users WHERE id = ?').get(req.userId);
  if (!user || user.approved !== 1) {
    return res.status(403).json({ error: 'Only selected students can add messages.' });
  }
  const message = req.body.message != null ? String(req.body.message).trim() : '';
  db.prepare('INSERT INTO messages (user_id, message) VALUES (?, ?)').run(req.userId, message);
  const row = db.prepare('SELECT id, message, created_at FROM messages WHERE id = last_insert_rowid()').get();
  res.status(201).json(row);
});

router.get('/:id/download', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const doc = db.prepare('SELECT id, filename, path FROM documents WHERE id = ? AND user_id = ?').get(id, req.userId);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  const filePath = path.join(uploadsDir, doc.path);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.download(filePath, doc.filename);
});

router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = db.prepare('SELECT id, path FROM documents WHERE id = ? AND user_id = ? AND uploaded_by IS NULL').get(id, req.userId);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const filePath = path.join(uploadsDir, row.path);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  db.prepare('DELETE FROM documents WHERE id = ?').run(id);
  res.json({ deleted: id });
});

export default router;
