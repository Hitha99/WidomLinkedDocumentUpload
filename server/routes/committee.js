import { Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { db } from '../db.js';
import { authMiddleware, requireCommittee } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', 'uploads');

const router = Router();

router.use(authMiddleware, requireCommittee);

// List all students (with doc/message counts)
router.get('/students', (req, res) => {
  const students = db.prepare(`
    SELECT u.id, u.email, u.created_at,
           (SELECT COUNT(*) FROM documents d WHERE d.user_id = u.id) AS doc_count,
           (SELECT COUNT(*) FROM messages m WHERE m.user_id = u.id) AS message_count
    FROM users u
    WHERE u.role = 'student'
    ORDER BY u.created_at DESC
  `).all();
  res.json({ students });
});

// One student's documents and latest message
router.get('/students/:id', (req, res) => {
  const studentId = parseInt(req.params.id, 10);
  const student = db.prepare('SELECT id, email, created_at FROM users WHERE id = ? AND role = ?').get(studentId, 'student');
  if (!student) return res.status(404).json({ error: 'Student not found' });
  const documents = db.prepare(
    'SELECT id, type, filename, path, size, created_at FROM documents WHERE user_id = ? ORDER BY type, created_at DESC'
  ).all(studentId);
  const message = db.prepare('SELECT id, message, created_at FROM messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(studentId);
  res.json({
    student: { id: student.id, email: student.email, created_at: student.created_at },
    documents,
    message: message || null,
  });
});

// Download a student's document (committee only)
router.get('/students/:studentId/documents/:docId/download', (req, res) => {
  const studentId = parseInt(req.params.studentId, 10);
  const docId = parseInt(req.params.docId, 10);
  const doc = db.prepare('SELECT id, filename, path FROM documents WHERE id = ? AND user_id = ?').get(docId, studentId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  const filePath = path.join(uploadsDir, doc.path);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.download(filePath, doc.filename);
});

export default router;
