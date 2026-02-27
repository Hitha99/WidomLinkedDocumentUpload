import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../config';
import styles from './CommitteeDashboard.module.css';
const DOC_LABELS = { sop: 'SOP', lor: 'LOR', resume: 'Resume', transcript: 'Transcript' };

export default function CommitteeDashboard() {
  const { token } = useAuth();
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');

  const headers = () => ({ Authorization: `Bearer ${token}` });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/committee/students`, { headers: headers() });
        if (!res.ok) throw new Error('Failed to load students');
        const data = await res.json();
        if (!cancelled) setStudents(data.students || []);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Could not load students');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    setError('');
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/committee/students/${selected.id}`, { headers: headers() });
        if (!res.ok) throw new Error('Failed to load student details');
        const data = await res.json();
        if (!cancelled) setDetail(data);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Could not load details');
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selected, token]);

  const downloadUrl = (studentId, docId) =>
    `${API}/committee/students/${studentId}/documents/${docId}/download?token=${encodeURIComponent(token)}`;

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Loading students…</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h2 className={styles.heading}>Student submissions</h2>
      <p className={styles.hint}>Select a student to view their documents and message to the committee.</p>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.grid}>
        <aside className={styles.sidebar}>
          <ul className={styles.studentList}>
            {students.length === 0 ? (
              <li className={styles.empty}>No students yet</li>
            ) : (
              students.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className={selected?.id === s.id ? styles.studentBtnActive : styles.studentBtn}
                    onClick={() => setSelected(s)}
                  >
                    <span className={styles.studentEmail}>{s.email}</span>
                    <span className={styles.studentMeta}>
                      {s.doc_count} doc{s.doc_count !== 1 ? 's' : ''}
                      {s.message_count > 0 && ` · message`}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>
        <section className={styles.detail}>
          {!selected && (
            <p className={styles.placeholder}>Select a student</p>
          )}
          {selected && detailLoading && (
            <p className={styles.placeholder}>Loading…</p>
          )}
          {selected && detail && !detailLoading && (
            <>
              <h3 className={styles.detailTitle}>{detail.student.email}</h3>
              <p className={styles.detailMeta}>
                Registered: {new Date(detail.student.created_at).toLocaleString()}
              </p>

              <div className={styles.section}>
                <h4 className={styles.sectionTitle}>Documents</h4>
                {!detail.documents?.length ? (
                  <p className={styles.empty}>No documents uploaded</p>
                ) : (
                  <ul className={styles.docList}>
                    {detail.documents.map((doc) => (
                      <li key={doc.id} className={styles.docItem}>
                        <span className={styles.docType}>{DOC_LABELS[doc.type] || doc.type}</span>
                        <span className={styles.docName}>{doc.filename}</span>
                        <a
                          href={downloadUrl(detail.student.id, doc.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.downloadLink}
                        >
                          Download
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className={styles.section}>
                <h4 className={styles.sectionTitle}>Message to committee</h4>
                {!detail.message?.message ? (
                  <p className={styles.empty}>No message</p>
                ) : (
                  <div className={styles.messageBox}>
                    <p className={styles.messageText}>{detail.message.message}</p>
                    <p className={styles.messageMeta}>
                      {detail.message.created_at && new Date(detail.message.created_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
