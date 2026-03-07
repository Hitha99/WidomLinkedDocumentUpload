import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { db } from '../db.js';
import { authMiddleware, requireCommittee } from '../middleware/auth.js';
import { majorMatches } from '../utils/majorMatch.js';
import { sendClarificationEmail } from '../utils/email.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', 'uploads');

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const feedbackStorage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadsDir),
  filename: (_, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname) || '.bin'}`),
});
const feedbackUpload = multer({
  storage: feedbackStorage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_, file, cb) => {
    const ext = (path.extname(file.originalname) || '').toLowerCase();
    if (['.pdf', '.doc', '.docx', '.txt'].includes(ext)) return cb(null, true);
    cb(new Error('Only PDF, DOC, DOCX, TXT allowed'));
  },
});

function parseMajors(s) {
  if (!s) return [];
  try { const a = JSON.parse(s); return Array.isArray(a) ? a : []; } catch { return s.split(',').map(m => m.trim()).filter(Boolean); }
}

const router = Router();

router.use(authMiddleware, requireCommittee);

// List students: admin sees all; expert sees only students whose major matches their majors
router.get('/students', (req, res) => {
  const isAdmin = req.userRole === 'admin';
  let students;
  if (isAdmin) {
    students = db.prepare(`
      SELECT u.id, u.email, u.major, u.created_at, COALESCE(u.approved, 0) AS approved,
             (SELECT COUNT(*) FROM documents d WHERE d.user_id = u.id) AS doc_count,
             (SELECT COUNT(*) FROM messages m WHERE m.user_id = u.id) AS message_count
      FROM users u
      WHERE u.role = 'student'
      ORDER BY u.created_at DESC
    `).all();
  } else {
    const expertMajors = (req.userMajors || []).map(m => m.trim().toLowerCase()).filter(Boolean);
    if (expertMajors.length === 0) {
      students = [];
    } else {
      const allStudents = db.prepare(`
        SELECT u.id, u.email, u.major, u.created_at, COALESCE(u.approved, 0) AS approved,
               (SELECT COUNT(*) FROM documents d WHERE d.user_id = u.id) AS doc_count,
               (SELECT COUNT(*) FROM messages m WHERE m.user_id = u.id) AS message_count
        FROM users u
        WHERE u.role = 'student' AND COALESCE(u.major,'') != ''
        ORDER BY u.created_at DESC
      `).all();
      students = allStudents.filter(s => majorMatches(s.major, expertMajors));
    }
  }
  res.json({ students });
});

// Enable upload for all visible students (admin: all; expert: only matching majors)
router.patch('/students/approve-all', (req, res) => {
  const isAdmin = req.userRole === 'admin';
  if (isAdmin) {
    const result = db.prepare('UPDATE users SET approved = 1 WHERE role = ?').run('student');
    return res.json({ count: result.changes });
  }
  const expertMajors = (req.userMajors || []).map(m => m.trim().toLowerCase()).filter(Boolean);
  if (expertMajors.length === 0) return res.json({ count: 0 });
  const allStudents = db.prepare("SELECT id, major FROM users WHERE role = 'student' AND COALESCE(major,'') != ''").all();
  const ids = allStudents.filter(s => majorMatches(s.major, expertMajors)).map(s => s.id);
  if (ids.length === 0) return res.json({ count: 0 });
  const placeholders = ids.map(() => '?').join(',');
  const result = db.prepare(`UPDATE users SET approved = 1 WHERE id IN (${placeholders})`).run(...ids);
  res.json({ count: result.changes });
});

// Disable upload for all visible students (admin: all; expert: only matching majors)
router.patch('/students/disable-all', (req, res) => {
  const isAdmin = req.userRole === 'admin';
  if (isAdmin) {
    const result = db.prepare('UPDATE users SET approved = 0 WHERE role = ?').run('student');
    return res.json({ count: result.changes });
  }
  const expertMajors = (req.userMajors || []).map(m => m.trim().toLowerCase()).filter(Boolean);
  if (expertMajors.length === 0) return res.json({ count: 0 });
  const allStudents = db.prepare("SELECT id, major FROM users WHERE role = 'student' AND COALESCE(major,'') != ''").all();
  const ids = allStudents.filter(s => majorMatches(s.major, expertMajors)).map(s => s.id);
  if (ids.length === 0) return res.json({ count: 0 });
  const placeholders = ids.map(() => '?').join(',');
  const result = db.prepare(`UPDATE users SET approved = 0 WHERE id IN (${placeholders})`).run(...ids);
  res.json({ count: result.changes });
});

// Expert/admin send clarification note to student (short note, e.g. files incomplete, needs clarification)
router.post('/students/:studentId/clarify', async (req, res) => {
  const studentId = parseInt(req.params.studentId, 10);
  const student = db.prepare('SELECT id, email FROM users WHERE id = ? AND role = ?').get(studentId, 'student');
  if (!student) return res.status(404).json({ error: 'Student not found' });
  if (req.userRole !== 'admin') {
    const expertMajors = (req.userMajors || []).map(m => m.trim().toLowerCase()).filter(Boolean);
    const s = db.prepare('SELECT major FROM users WHERE id = ?').get(studentId);
    if (!majorMatches(s?.major, expertMajors)) return res.status(403).json({ error: 'Student not in your majors' });
  }
  const message = req.body.message != null ? String(req.body.message).trim().slice(0, 500) : '';
  if (!message) return res.status(400).json({ error: 'Message required' });
  db.prepare('INSERT INTO clarifications (student_id, from_user_id, message) VALUES (?, ?, ?)').run(studentId, req.userId, message);
  const row = db.prepare('SELECT id, message, created_at FROM clarifications WHERE id = last_insert_rowid()').get();
  const fromUser = db.prepare('SELECT email FROM users WHERE id = ?').get(req.userId);
  try {
    await sendClarificationEmail(
      student.email,
      'Clarification from admission committee – Wisdom Document System',
      `The admission committee has sent you a note:\n\n${message}\n\n— ${fromUser?.email || 'Committee'}`
    );
  } catch (_) {}
  res.status(201).json(row);
});

// Admin/expert upload feedback/comment/critique for a student (expert: only for students in their majors)
router.post('/students/:studentId/feedback', feedbackUpload.single('file'), async (req, res) => {
  const studentId = parseInt(req.params.studentId, 10);
  const student = db.prepare('SELECT id, email FROM users WHERE id = ? AND role = ?').get(studentId, 'student');
  if (!student) return res.status(404).json({ error: 'Student not found' });
  if (req.userRole !== 'admin') {
    const expertMajors = (req.userMajors || []).map(m => m.trim().toLowerCase()).filter(Boolean);
    const s = db.prepare('SELECT major FROM users WHERE id = ?').get(studentId);
    if (!majorMatches(s?.major, expertMajors)) return res.status(403).json({ error: 'Student not in your majors' });
  }
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const description = req.body.description != null ? String(req.body.description).trim().slice(0, 200) : null;
  const originalName = req.body.originalName || req.file.originalname || 'Feedback';
  db.prepare(
    'INSERT INTO documents (user_id, type, filename, path, size, description, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(studentId, 'feedback', originalName, req.file.filename, req.file.size, description || null, req.userId);
  const row = db.prepare('SELECT id, type, filename, path, size, created_at, description FROM documents WHERE id = last_insert_rowid()').get();
  const fromUser = db.prepare('SELECT email FROM users WHERE id = ?').get(req.userId);
  const descText = description ? `\n\nNote: ${description}` : '';
  try {
    await sendClarificationEmail(
      student.email,
      'New feedback from admission committee – Wisdom Document System',
      `The admission committee has uploaded feedback for you: "${originalName}"${descText}\n\nPlease log in to view and download it.\n\n— ${fromUser?.email || 'Committee'}`
    );
  } catch (_) {}
  res.status(201).json(row);
});

// Toggle student approval (expert: only if major match; admin: all)
router.patch('/students/:id/approve', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const student = db.prepare('SELECT id, major FROM users WHERE id = ? AND role = ?').get(id, 'student');
  if (!student) return res.status(404).json({ error: 'Student not found' });
  if (req.userRole !== 'admin') {
    const expertMajors = (req.userMajors || []).map(m => m.trim().toLowerCase()).filter(Boolean);
    if (!majorMatches(student.major, expertMajors)) return res.status(403).json({ error: 'Major does not match' });
  }
  const current = db.prepare('SELECT approved FROM users WHERE id = ?').get(id);
  const next = current.approved === 1 ? 0 : 1;
  db.prepare('UPDATE users SET approved = ? WHERE id = ?').run(next, id);
  res.json({ approved: next === 1 });
});

// One student's documents and latest message (expert: only if major match; admin: all)
router.get('/students/:id', (req, res) => {
  const studentId = parseInt(req.params.id, 10);
  const student = db.prepare('SELECT id, email, major, created_at, COALESCE(approved, 0) AS approved FROM users WHERE id = ? AND role = ?').get(studentId, 'student');
  if (!student) return res.status(404).json({ error: 'Student not found' });
  if (req.userRole !== 'admin') {
    const expertMajors = (req.userMajors || []).map(m => m.trim().toLowerCase()).filter(Boolean);
    if (!majorMatches(student.major, expertMajors)) return res.status(404).json({ error: 'Student not found' });
  }
  let documents;
  try {
    documents = db.prepare(
      'SELECT id, type, filename, path, size, created_at, description, uploaded_by FROM documents WHERE user_id = ? ORDER BY uploaded_by IS NULL DESC, type, created_at DESC'
    ).all(studentId);
  } catch (err) {
    documents = db.prepare(
      'SELECT id, type, filename, path, size, created_at FROM documents WHERE user_id = ? ORDER BY type, created_at DESC'
    ).all(studentId);
  }
  const message = db.prepare('SELECT id, message, created_at FROM messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(studentId);
  const clarifications = db.prepare(
    'SELECT c.id, c.message, c.created_at, u.email AS from_email FROM clarifications c LEFT JOIN users u ON u.id = c.from_user_id WHERE c.student_id = ? ORDER BY c.created_at DESC'
  ).all(studentId);
  res.json({
    student: { id: student.id, email: student.email, major: student.major, created_at: student.created_at, approved: student.approved === 1 },
    documents,
    message: message || null,
    clarifications,
  });
});

// Expert profile: update majors
router.get('/me', (req, res) => {
  const u = db.prepare('SELECT id, email, role, majors FROM users WHERE id = ?').get(req.userId);
  if (!u) return res.status(404).json({ error: 'Not found' });
  res.json({ id: u.id, email: u.email, role: u.role, majors: parseMajors(u.majors) });
});
router.patch('/me', (req, res) => {
  if (req.userRole !== 'expert' && req.userRole !== 'admin') return res.status(403).json({ error: 'Experts only' });
  const majors = Array.isArray(req.body.majors) ? req.body.majors : (typeof req.body.majors === 'string' ? req.body.majors.split(',').map(m => m.trim()).filter(Boolean) : []);
  db.prepare('UPDATE users SET majors = ? WHERE id = ?').run(JSON.stringify(majors), req.userId);
  res.json({ majors });
});

// Download a student's document (expert/admin only; expert: major must match)
router.get('/students/:studentId/documents/:docId/download', (req, res) => {
  const studentId = parseInt(req.params.studentId, 10);
  const docId = parseInt(req.params.docId, 10);
  const student = db.prepare('SELECT id, major FROM users WHERE id = ? AND role = ?').get(studentId, 'student');
  if (!student) return res.status(404).json({ error: 'Student not found' });
  if (req.userRole !== 'admin') {
    const expertMajors = (req.userMajors || []).map(m => m.trim().toLowerCase()).filter(Boolean);
    if (!majorMatches(student.major, expertMajors)) return res.status(403).json({ error: 'Student not found' });
  }
  const doc = db.prepare('SELECT id, filename, path FROM documents WHERE id = ? AND user_id = ?').get(docId, studentId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  const filePath = path.join(uploadsDir, doc.path);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.download(filePath, doc.filename);
});

export default router;
