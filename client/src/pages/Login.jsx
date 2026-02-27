import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API } from '../config';
import styles from './Login.module.css';

export default function Login() {
  const [view, setView] = useState('main'); // 'main' | 'login' | 'register' | 'loginStudent' | 'loginCommittee' | 'registerStudent' | 'registerCommittee'
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [committeeEmail, setCommitteeEmail] = useState('');
  const [committeePassword, setCommitteePassword] = useState('');
  const [regStudentEmail, setRegStudentEmail] = useState('');
  const [regStudentPassword, setRegStudentPassword] = useState('');
  const [regCommitteeEmail, setRegCommitteeEmail] = useState('');
  const [regCommitteePassword, setRegCommitteePassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  function goToMain() {
    setView('main');
    setError('');
  }

  function goBack() {
    if (view === 'loginStudent' || view === 'loginCommittee') setView('login');
    else if (view === 'registerStudent' || view === 'registerCommittee') setView('register');
    setError('');
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
        setError('Not a student account. Use Committee login.');
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

  async function handleCommitteeSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: committeeEmail, password: committeePassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      if (data.user?.role !== 'committee') {
        setError('Not a committee account. Use Student login.');
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
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regStudentEmail, password: regStudentPassword, role: 'student' }),
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

  async function handleRegisterCommittee(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regCommitteeEmail, password: regCommitteePassword, role: 'committee' }),
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
              onClick={() => { setView('loginCommittee'); setError(''); }}
            >
              Committee login
            </button>
            <button type="button" className={styles.toggle} onClick={goToMain}>
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
              onClick={() => { setView('registerCommittee'); setError(''); }}
            >
              Committee register
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
            <button type="button" className={styles.toggle} onClick={goBack}>
              ← Back
            </button>
          </div>
        )}

        {view === 'loginCommittee' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Committee login</h2>
            <form onSubmit={handleCommitteeSubmit} className={styles.form}>
              <input
                type="email"
                placeholder="Email"
                value={committeeEmail}
                onChange={e => setCommitteeEmail(e.target.value)}
                className={styles.input}
                required
                autoComplete="email"
              />
              <input
                type="password"
                placeholder="Password"
                value={committeePassword}
                onChange={e => setCommitteePassword(e.target.value)}
                className={styles.input}
                required
                autoComplete="current-password"
              />
              <button type="submit" className={styles.btnCommittee} disabled={loading}>
                {loading ? 'Please wait…' : 'Login'}
              </button>
            </form>
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
              <button type="submit" className={styles.btn} disabled={loading}>
                {loading ? 'Please wait…' : 'Register'}
              </button>
            </form>
            <button type="button" className={styles.toggle} onClick={goBack}>
              ← Back
            </button>
          </div>
        )}

        {view === 'registerCommittee' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Committee register</h2>
            <form onSubmit={handleRegisterCommittee} className={styles.form}>
              <input
                type="email"
                placeholder="Email"
                value={regCommitteeEmail}
                onChange={e => setRegCommitteeEmail(e.target.value)}
                className={styles.input}
                required
                autoComplete="email"
              />
              <input
                type="password"
                placeholder="Password"
                value={regCommitteePassword}
                onChange={e => setRegCommitteePassword(e.target.value)}
                className={styles.input}
                required
                autoComplete="new-password"
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
