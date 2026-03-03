import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API } from '../config';
import { COMMON_MAJORS } from '../constants/majors';
import styles from './Login.module.css';

export default function Login() {
  const [view, setView] = useState('main');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [expertEmail, setExpertEmail] = useState('');
  const [expertPassword, setExpertPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [regStudentEmail, setRegStudentEmail] = useState('');
  const [regStudentPassword, setRegStudentPassword] = useState('');
  const [regStudentMajor, setRegStudentMajor] = useState('');
  const [regStudentMajorOther, setRegStudentMajorOther] = useState('');
  const [regExpertEmail, setRegExpertEmail] = useState('');
  const [regExpertPassword, setRegExpertPassword] = useState('');
  const [regExpertMajors, setRegExpertMajors] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetLink, setResetLink] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  function goToMain() {
    setView('main');
    setError('');
  }

  function goBack() {
    if (view.startsWith('login')) setView('login');
    else if (view.startsWith('register')) setView('register');
    else if (view === 'forgotPassword') setView('login');
    setError('');
    setResetLink('');
  }

  function getStudentMajor() {
    if (regStudentMajor === 'Other') return regStudentMajorOther.trim() || null;
    return regStudentMajor || null;
  }

  function getExpertMajorsList() {
    return regExpertMajors.split(',').map(m => m.trim()).filter(Boolean);
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    setResetLink('');
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Request failed');
        return;
      }
      if (data.token) {
        const base = window.location.origin + (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
        setResetLink(`${base}/reset-password?token=${data.token}`);
      } else {
        setResetLink('sent');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  async function handleStudentSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: studentEmail, password: studentPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      if (data.user?.role !== 'student') {
        setError('Not a student account. Use Expert or Admin login.');
        return;
      }
      setAuth(data.token, data.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError('Network error. Is the server running?');
    } finally {
      setLoading(false);
    }
  }

  async function handleExpertSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: expertEmail, password: expertPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      if (data.user?.role !== 'expert') {
        setError('Not an expert account. Use Student or Admin login.');
        return;
      }
      setAuth(data.token, data.user);
      navigate('/committee', { replace: true });
    } catch (err) {
      setError('Network error. Is the server running?');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      if (data.user?.role !== 'admin') {
        setError('Not an admin account.');
        return;
      }
      setAuth(data.token, data.user);
      navigate('/committee', { replace: true });
    } catch (err) {
      setError('Network error. Is the server running?');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterStudent(e) {
    e.preventDefault();
    const major = getStudentMajor();
    if (!major) {
      setError('Please select or enter your major');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regStudentEmail, password: regStudentPassword, role: 'student', major }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }
      setAuth(data.token, data.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError('Network error. Is the server running?');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterExpert(e) {
    e.preventDefault();
    const majors = getExpertMajorsList();
    if (majors.length === 0) {
      setError('Enter at least one major (comma-separated)');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regExpertEmail, password: regExpertPassword, role: 'expert', majors }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }
      setAuth(data.token, data.user);
      navigate('/committee', { replace: true });
    } catch (err) {
      setError('Network error. Is the server running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.title}>
          <span className="gradient_text">Wisdom Document System</span>
        </h1>

        {view === 'main' && (
          <div className={styles.choice}>
            <button
              type="button"
              className={styles.choiceBtn}
              onClick={() => { setView('login'); setError(''); }}
            >
              Login
            </button>
            <button
              type="button"
              className={styles.choiceBtnCommittee}
              onClick={() => { setView('register'); setError(''); }}
            >
              Register
            </button>
          </div>
        )}

        {view === 'login' && (
          <div className={styles.choice}>
            <p className={styles.choiceHint}>Choose login type</p>
            <button
              type="button"
              className={styles.choiceBtn}
              onClick={() => { setView('loginStudent'); setError(''); }}
            >
              Student login
            </button>
            <button
              type="button"
              className={styles.choiceBtnCommittee}
              onClick={() => { setView('loginExpert'); setError(''); }}
            >
              Expert login
            </button>
            <button
              type="button"
              className={styles.choiceBtnCommittee}
              onClick={() => { setView('loginAdmin'); setError(''); }}
            >
              Admin login
            </button>
            <button type="button" className={styles.toggle} onClick={() => { setView('forgotPassword'); setError(''); setResetLink(''); }}>
              Forgot password?
            </button>
            <button type="button" className={styles.toggle} onClick={goToMain}>
              ← Back
            </button>
          </div>
        )}

        {view === 'forgotPassword' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Forgot password</h2>
            {!resetLink ? (
              <form onSubmit={handleForgotPassword} className={styles.form}>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  className={styles.input}
                  required
                />
                <button type="submit" className={styles.btn} disabled={loading}>
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            ) : resetLink === 'sent' ? (
              <p className={styles.successMsg}>If that email exists, a reset link was sent. Check your email.</p>
            ) : (
              <div>
                <p className={styles.choiceHint}>Use this link to reset your password (valid 1 hour):</p>
                <a href={resetLink} className={styles.resetLink} target="_blank" rel="noopener noreferrer">
                  Reset password
                </a>
              </div>
            )}
            <button type="button" className={styles.toggle} onClick={goBack}>
              ← Back
            </button>
          </div>
        )}

        {view === 'register' && (
          <div className={styles.choice}>
            <p className={styles.choiceHint}>Choose registration type</p>
            <button
              type="button"
              className={styles.choiceBtn}
              onClick={() => { setView('registerStudent'); setError(''); }}
            >
              Student register
            </button>
            <button
              type="button"
              className={styles.choiceBtnCommittee}
              onClick={() => { setView('registerExpert'); setError(''); }}
            >
              Expert register
            </button>
            <button type="button" className={styles.toggle} onClick={goToMain}>
              ← Back
            </button>
          </div>
        )}

        {view === 'loginStudent' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Student login</h2>
            <form onSubmit={handleStudentSubmit} className={styles.form}>
              <input
                type="email"
                placeholder="Email"
                value={studentEmail}
                onChange={e => setStudentEmail(e.target.value)}
                className={styles.input}
                required
                autoComplete="email"
              />
              <input
                type="password"
                placeholder="Password"
                value={studentPassword}
                onChange={e => setStudentPassword(e.target.value)}
                className={styles.input}
                required
                autoComplete="current-password"
              />
              <button type="submit" className={styles.btn} disabled={loading}>
                {loading ? 'Please wait…' : 'Login'}
              </button>
            </form>
            <button type="button" className={styles.toggle} onClick={() => { setView('forgotPassword'); setError(''); setResetLink(''); }}>
              Forgot password?
            </button>
            <button type="button" className={styles.toggle} onClick={goBack}>
              ← Back
            </button>
          </div>
        )}

        {view === 'loginExpert' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Expert login</h2>
            <form onSubmit={handleExpertSubmit} className={styles.form}>
              <input
                type="email"
                placeholder="Email"
                value={expertEmail}
                onChange={e => setExpertEmail(e.target.value)}
                className={styles.input}
                required
                autoComplete="email"
              />
              <input
                type="password"
                placeholder="Password"
                value={expertPassword}
                onChange={e => setExpertPassword(e.target.value)}
                className={styles.input}
                required
                autoComplete="current-password"
              />
              <button type="submit" className={styles.btnCommittee} disabled={loading}>
                {loading ? 'Please wait…' : 'Login'}
              </button>
            </form>
            <button type="button" className={styles.toggle} onClick={() => { setView('forgotPassword'); setError(''); setResetLink(''); }}>
              Forgot password?
            </button>
            <button type="button" className={styles.toggle} onClick={goBack}>
              ← Back
            </button>
          </div>
        )}

        {view === 'loginAdmin' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Admin login</h2>
            <form onSubmit={handleAdminSubmit} className={styles.form}>
              <input
                type="email"
                placeholder="Email"
                value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                className={styles.input}
                required
                autoComplete="email"
              />
              <input
                type="password"
                placeholder="Password"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                className={styles.input}
                required
                autoComplete="current-password"
              />
              <button type="submit" className={styles.btnCommittee} disabled={loading}>
                {loading ? 'Please wait…' : 'Login'}
              </button>
            </form>
            <button type="button" className={styles.toggle} onClick={() => { setView('forgotPassword'); setError(''); setResetLink(''); }}>
              Forgot password?
            </button>
            <button type="button" className={styles.toggle} onClick={goBack}>
              ← Back
            </button>
          </div>
        )}

        {view === 'registerStudent' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Student register</h2>
            <form onSubmit={handleRegisterStudent} className={styles.form}>
              <input
                type="email"
                placeholder="Email"
                value={regStudentEmail}
                onChange={e => setRegStudentEmail(e.target.value)}
                className={styles.input}
                required
                autoComplete="email"
              />
              <input
                type="password"
                placeholder="Password"
                value={regStudentPassword}
                onChange={e => setRegStudentPassword(e.target.value)}
                className={styles.input}
                required
                autoComplete="new-password"
              />
              <label className={styles.label}>Major</label>
              <select
                value={regStudentMajor}
                onChange={e => setRegStudentMajor(e.target.value)}
                className={styles.input}
                required
              >
                <option value="">Select or type below if not in list</option>
                {COMMON_MAJORS.filter(m => m !== 'Other').map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
                <option value="Other">Other (type below)</option>
              </select>
              {(regStudentMajor === 'Other' || !COMMON_MAJORS.includes(regStudentMajor)) && regStudentMajor && (
                <input
                  type="text"
                  placeholder="Type your major"
                  value={regStudentMajorOther}
                  onChange={e => setRegStudentMajorOther(e.target.value)}
                  className={styles.input}
                />
              )}
              <button type="submit" className={styles.btn} disabled={loading}>
                {loading ? 'Please wait…' : 'Register'}
              </button>
            </form>
            <button type="button" className={styles.toggle} onClick={goBack}>
              ← Back
            </button>
          </div>
        )}

        {view === 'registerExpert' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Expert register</h2>
            <form onSubmit={handleRegisterExpert} className={styles.form}>
              <input
                type="email"
                placeholder="Email"
                value={regExpertEmail}
                onChange={e => setRegExpertEmail(e.target.value)}
                className={styles.input}
                required
                autoComplete="email"
              />
              <input
                type="password"
                placeholder="Password"
                value={regExpertPassword}
                onChange={e => setRegExpertPassword(e.target.value)}
                className={styles.input}
                required
                autoComplete="new-password"
              />
              <input
                type="text"
                placeholder="Majors you handle (comma-separated, e.g. CS, ECE)"
                value={regExpertMajors}
                onChange={e => setRegExpertMajors(e.target.value)}
                className={styles.input}
              />
              <button type="submit" className={styles.btnCommittee} disabled={loading}>
                {loading ? 'Please wait…' : 'Register'}
              </button>
            </form>
            <button type="button" className={styles.toggle} onClick={goBack}>
              ← Back
            </button>
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}
