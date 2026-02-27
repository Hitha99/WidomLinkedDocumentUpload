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

const ALLOWED_TYPES = ['sop', 'lor', 'resume', 'transcript'];
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
  const docs = db.prepare(
    'SELECT id, type, filename, path, size, created_at FROM documents WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.userId);
  const msg = db.prepare('SELECT id, message, created_at FROM messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(req.userId);
  res.json({ documents: docs, message: msg || null });
});

router.post('/upload', upload.single('file'), (req, res) => {
  const type = (req.body.type || '').toLowerCase();
  if (!ALLOWED_TYPES.includes(type)) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Invalid type. Use: sop, lor, resume, transcript' });
  }
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const originalName = req.body.originalName || req.file.originalname || type;
  db.prepare(
    'INSERT INTO documents (user_id, type, filename, path, size) VALUES (?, ?, ?, ?, ?)'
  ).run(req.userId, type, originalName, req.file.filename, req.file.size);
  const row = db.prepare('SELECT id, type, filename, path, size, created_at FROM documents WHERE id = last_insert_rowid()').get();
  res.status(201).json(row);
});

router.post('/message', (req, res) => {
  const message = req.body.message != null ? String(req.body.message).trim() : '';
  db.prepare('INSERT INTO messages (user_id, message) VALUES (?, ?)').run(req.userId, message);
  const row = db.prepare('SELECT id, message, created_at FROM messages WHERE id = last_insert_rowid()').get();
  res.status(201).json(row);
});

router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = db.prepare('SELECT id, path FROM documents WHERE id = ? AND user_id = ?').get(id, req.userId);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const filePath = path.join(uploadsDir, row.path);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  db.prepare('DELETE FROM documents WHERE id = ?').run(id);
  res.json({ deleted: id });
});

export default router;
