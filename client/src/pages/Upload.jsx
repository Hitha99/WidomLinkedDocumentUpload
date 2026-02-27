import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../config';
import styles from './Upload.module.css';
const DOC_TYPES = [
  { id: 'sop', label: 'Statement of Purpose (SOP)' },
  { id: 'lor', label: 'Letter of Recommendation (LOR)' },
  { id: 'resume', label: 'Resume' },
  { id: 'transcript', label: 'Transcript' },
];

export default function Upload() {
  const { token } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [message, setMessage] = useState('');
  const [savedMessage, setSavedMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);
  const [messageSaving, setMessageSaving] = useState(false);
  const [error, setError] = useState('');

  const headers = () => ({ Authorization: `Bearer ${token}` });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/documents`, { headers: headers() });
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        if (!cancelled) {
          setDocuments(data.documents || []);
          if (data.message) {
            setSavedMessage(data.message);
            setMessage(data.message.message || '');
          }
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Could not load documents');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  async function handleUpload(type, file) {
    if (!file) return;
    setError('');
    setUploading(type);
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);
    form.append('originalName', file.name);
    try {
      const res = await fetch(`${API}/documents/upload`, {
        method: 'POST',
        headers: headers(),
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setDocuments(prev => [data, ...prev]);
    } catch (e) {
      setError(e.message || 'Upload failed');
    } finally {
      setUploading(null);
    }
  }

  async function handleDelete(id) {
    setError('');
    try {
      const res = await fetch(`${API}/documents/${id}`, { method: 'DELETE', headers: headers() });
      if (!res.ok) throw new Error('Delete failed');
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (e) {
      setError(e.message || 'Delete failed');
    }
  }

  async function handleSaveMessage(e) {
    e.preventDefault();
    setError('');
    setMessageSaving(true);
    try {
      const res = await fetch(`${API}/documents/message`, {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setSavedMessage(data);
    } catch (e) {
      setError(e.message || 'Failed to save message');
    } finally {
      setMessageSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h2 className={styles.heading}>Upload documents for admission</h2>
      <p className={styles.hint}>SOP, LOR, Resume, and Transcript. PDF, DOC, DOCX, or TXT (max 10MB each).</p>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.sections}>
        {DOC_TYPES.map(({ id, label }) => {
          const list = documents.filter(d => d.type === id);
          const isUploading = uploading === id;
          return (
            <section key={id} className={styles.section}>
              <label className={styles.label}>{label}</label>
              <div className={styles.row}>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  className={styles.fileInput}
                  onChange={e => handleUpload(id, e.target.files?.[0])}
                  disabled={isUploading}
                />
                {isUploading && <span className={styles.status}>Uploading…</span>}
              </div>
              {list.length > 0 && (
                <ul className={styles.list}>
                  {list.map(doc => (
                    <li key={doc.id} className={styles.docItem}>
                      <span className={styles.docName}>{doc.filename}</span>
                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => handleDelete(doc.id)}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}

        <section className={styles.section}>
          <label className={styles.label}>Message to admission committee</label>
          <form onSubmit={handleSaveMessage}>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Optional message to the admission committee…"
              className={styles.textarea}
              rows={4}
            />
            <button type="submit" className={styles.saveMsgBtn} disabled={messageSaving}>
              {messageSaving ? 'Saving…' : 'Save message'}
            </button>
          </form>
          {savedMessage && (
            <p className={styles.savedHint}>Last saved: {new Date(savedMessage.created_at).toLocaleString()}</p>
          )}
        </section>
      </div>
    </div>
  );
}
