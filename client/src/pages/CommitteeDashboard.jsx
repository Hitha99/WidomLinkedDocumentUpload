import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../config';
import styles from './CommitteeDashboard.module.css';

const DOC_LABELS = { sop: 'SOP', lor: 'LOR', resume: 'Resume', transcript: 'Transcript', additional: 'Additional files', feedback: 'Committee feedback' };

export default function CommitteeDashboard() {
  const { token, user } = useAuth();
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [myMajors, setMyMajors] = useState('');
  const [savingMajors, setSavingMajors] = useState(false);
  const isExpert = user?.role === 'expert';
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [enablingAll, setEnablingAll] = useState(false);
  const [disablingAll, setDisablingAll] = useState(false);
  const [feedbackFile, setFeedbackFile] = useState(null);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [feedbackUploading, setFeedbackUploading] = useState(false);
  const [clarifySending, setClarifySending] = useState(false);
  const [error, setError] = useState('');

  const headers = () => ({ Authorization: `Bearer ${token}` });

  function loadStudents() {
    fetch(`${API}/committee/students`, { headers: headers() })
      .then(r => r.json())
      .then(data => setStudents(data.students || []));
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/committee/students`, { headers: headers() });
        if (!res.ok) throw new Error('Failed to load students');
        const data = await res.json();
        if (!cancelled) setStudents(data.students || []);
        if (user?.role === 'expert') {
          try {
            const me = await fetch(`${API}/committee/me`, { headers: headers() }).then(r => r.json());
            if (!cancelled && me?.majors?.length) setMyMajors(me.majors.join(', '));
          } catch (_) {}
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Could not load students');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token, user?.role]);

  async function saveMyMajors(e) {
    e?.preventDefault();
    const majors = myMajors.split(',').map(m => m.trim()).filter(Boolean);
    setSavingMajors(true);
    try {
      await fetch(`${API}/committee/me`, {
        method: 'PATCH',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ majors }),
      });
      loadStudents();
    } finally {
      setSavingMajors(false);
    }
  }

  async function enableAll() {
    setError('');
    setEnablingAll(true);
    try {
      const res = await fetch(`${API}/committee/students/approve-all`, {
        method: 'PATCH',
        headers: headers(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed');
      loadStudents();
      if (selected) {
        const r = await fetch(`${API}/committee/students/${selected.id}`, { headers: headers() });
        const d = await r.json();
        setDetail(d);
      }
    } catch (e) {
      setError(e.message || 'Failed');
    } finally {
      setEnablingAll(false);
    }
  }

  async function disableAll() {
    setError('');
    setDisablingAll(true);
    try {
      const res = await fetch(`${API}/committee/students/disable-all`, {
        method: 'PATCH',
        headers: headers(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed');
      loadStudents();
      if (selected) {
        const r = await fetch(`${API}/committee/students/${selected.id}`, { headers: headers() });
        const d = await r.json();
        setDetail(d);
      }
    } catch (e) {
      setError(e.message || 'Failed');
    } finally {
      setDisablingAll(false);
    }
  }

  async function toggleApproval(studentId) {
    try {
      const res = await fetch(`${API}/committee/students/${studentId}/approve`, {
        method: 'PATCH',
        headers: headers(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed');
      loadStudents();
      if (selected?.id === studentId) {
        const r = await fetch(`${API}/committee/students/${studentId}`, { headers: headers() });
        const d = await r.json();
        setDetail(d);
      }
    } catch (e) {
      setError(e.message || 'Failed');
    }
  }

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    setError('');
    fetch(`${API}/committee/students/${selected.id}`, { headers: headers() })
      .then(r => r.json())
      .then(data => setDetail(data))
      .catch(() => setError('Could not load details'))
      .finally(() => setDetailLoading(false));
  }, [selected, token]);

  const downloadUrl = (studentId, docId) =>
    `${API}/committee/students/${studentId}/documents/${docId}/download?token=${encodeURIComponent(token)}`;

  const docLabel = (type) => DOC_LABELS[type || ''] || type || 'Document';

  const isAdmin = user?.role === 'admin';

  async function sendClarification(e) {
    e?.preventDefault();
    if (!feedbackNote.trim() || !selected) return;
    setError('');
    setClarifySending(true);
    try {
      const res = await fetch(`${API}/committee/students/${selected.id}/clarify`, {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: feedbackNote.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      setFeedbackNote('');
      const r = await fetch(`${API}/committee/students/${selected.id}`, { headers: headers() });
      const d = await r.json();
      setDetail(d);
    } catch (err) {
      setError(err.message || 'Failed to send');
    } finally {
      setClarifySending(false);
    }
  }

  async function uploadFeedback(e) {
    e?.preventDefault();
    if (!feedbackFile || !selected) return;
    setError('');
    setFeedbackUploading(true);
    const form = new FormData();
    form.append('file', feedbackFile);
    form.append('originalName', feedbackFile.name);
    if (feedbackNote.trim()) form.append('description', feedbackNote.trim());
    try {
      const res = await fetch(`${API}/committee/students/${selected.id}/feedback`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setFeedbackFile(null);
      const r = await fetch(`${API}/committee/students/${selected.id}`, { headers: headers() });
      const d = await r.json();
      setDetail(d);
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setFeedbackUploading(false);
    }
  }

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
      <p className={styles.hint}>Click on a student record to see their uploaded documents and message to the committee.</p>

      {error && <div className={styles.error}>{error}</div>}

      {students.length > 0 && (
        <div className={styles.bulkActions}>
          <button
            type="button"
            className={styles.enableAllBtn}
            onClick={enableAll}
            disabled={enablingAll || disablingAll}
          >
            {enablingAll ? 'Enabling…' : 'Enable upload for all'}
          </button>
          <button
            type="button"
            className={styles.disableAllBtn}
            onClick={disableAll}
            disabled={enablingAll || disablingAll}
          >
            {disablingAll ? 'Disabling…' : 'Disable upload for all'}
          </button>
        </div>
      )}

      <div className={`${styles.grid} ${!isExpert ? styles.gridTwoCol : ''}`}>
        <aside className={styles.sidebar}>
          <ul className={styles.studentList}>
            {students.length === 0 ? (
              <li className={styles.empty}>No students yet</li>
            ) : (
              students.map((s) => (
                <li key={s.id} className={styles.studentListItem}>
                  <button
                    type="button"
                    className={selected?.id === s.id ? styles.studentBtnActive : styles.studentBtn}
                    onClick={() => setSelected(s)}
                  >
                    <span className={styles.studentEmail}>{s.email}</span>
                    <span className={styles.studentMeta}>
                      {s.major || 'No major'} · {s.approved ? '✓' : '–'} · {s.doc_count} doc{s.doc_count !== 1 ? 's' : ''}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={s.approved ? styles.approveBtnOn : styles.approveBtn}
                    onClick={(e) => { e.stopPropagation(); toggleApproval(s.id); }}
title={s.approved ? 'Disable upload for student' : 'Enable upload for student'}
                    >
                    {s.approved ? 'Disable upload' : 'Enable upload'}
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
          {selected && detail && !detailLoading && detail.student && (
            <>
              <div className={styles.detailHeader}>
                <div>
                  <h3 className={styles.detailTitle}>{detail.student.email}</h3>
                  <p className={styles.detailMeta}>
                    Major: {detail.student.major || 'Not set'} · Registered: {detail.student.created_at ? new Date(detail.student.created_at).toLocaleString() : '—'}
                    {detail.student.approved ? ' · ✓ Upload enabled' : ' · Upload not enabled'}
                  </p>
                </div>
                <button
                  type="button"
                  className={detail.student.approved ? styles.approveBtnOn : styles.approveBtn}
                  onClick={() => toggleApproval(detail.student.id)}
                >
                  {detail.student.approved ? 'Disable upload' : 'Enable upload'}
                </button>
              </div>

              <div className={styles.section}>
                <h4 className={styles.sectionTitle}>Documents</h4>
                {!detail.documents?.length ? (
                  <p className={styles.empty}>No documents uploaded</p>
                ) : (
                  <ul className={styles.docList}>
                    {(detail.documents || []).map((doc) => (
                      <li key={doc.id} className={styles.docItem}>
                        <div className={styles.docInfo}>
                          <div className={styles.docRow}>
                            <span className={styles.docType}>{docLabel(doc.type)}</span>
                            <span className={styles.docName}>{doc.filename}</span>
                          </div>
                          {(doc.type === 'additional' || doc.type === 'feedback') && doc.description && (
                            <span className={styles.docDesc}>{doc.description}</span>
                          )}
                        </div>
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
                <h4 className={styles.sectionTitle}>Feedback for student</h4>
                <p className={styles.extraHint}>Send a clarification email and/or upload a file—either is optional.</p>
                <div className={styles.feedbackForm}>
                  <textarea
                    placeholder="e.g. Your LOR is missing. Files incomplete—please upload a complete resume."
                    value={feedbackNote}
                    onChange={e => setFeedbackNote(e.target.value)}
                    className={styles.clarifyTextarea}
                    rows={3}
                    disabled={feedbackUploading || clarifySending}
                    maxLength={500}
                  />
                  <div className={styles.feedbackActions}>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); sendClarification(e); }}
                      className={styles.addTypeBtn}
                      disabled={!feedbackNote.trim() || clarifySending || feedbackUploading}
                    >
                      {clarifySending ? 'Sending…' : 'Send email'}
                    </button>
                    <span className={styles.feedbackActionsDivider}>or</span>
                    <div className={styles.feedbackUploadRow}>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        className={styles.fileInput}
                        onChange={e => setFeedbackFile(e.target.files?.[0] || null)}
                        disabled={feedbackUploading || clarifySending}
                      />
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); uploadFeedback(e); }}
                        className={styles.addTypeBtn}
                        disabled={!feedbackFile || feedbackUploading || clarifySending}
                      >
                        {feedbackUploading ? 'Uploading…' : 'Upload feedback'}
                      </button>
                    </div>
                  </div>
                </div>
                {detail.clarifications?.length > 0 && (
                  <div className={styles.clarifyHistory}>
                    <p className={styles.extraHint}>Previous clarifications:</p>
                    {(detail.clarifications || []).map(c => (
                      <div key={c.id} className={styles.clarifyItem}>
                        <p className={styles.clarifyText}>{c.message}</p>
                        <p className={styles.clarifyMeta}>{c.from_email} · {new Date(c.created_at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
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

        {isExpert && (
        <aside className={styles.extraTypesPanel}>
            <div className={styles.myMajorsSection}>
              <h4 className={styles.sectionTitle}>My majors</h4>
              <p className={styles.extraHint}>Students with these majors will appear in your list.</p>
              <form onSubmit={saveMyMajors}>
                <input
                  type="text"
                  placeholder="CS, ECE, etc."
                  value={myMajors}
                  onChange={e => setMyMajors(e.target.value)}
                  className={styles.addTypeInput}
                />
                <button type="submit" className={styles.addTypeBtn} disabled={savingMajors}>
                  {savingMajors ? 'Saving…' : 'Save'}
                </button>
              </form>
            </div>
        </aside>
        )}
      </div>
    </div>
  );
}
