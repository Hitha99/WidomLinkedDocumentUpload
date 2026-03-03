import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API } from '../config';
import styles from './Login.module.css';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';
  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    if (!token.trim()) {
      setError('Reset token is required');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Reset failed');
        return;
      }
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <h1 className={styles.title}><span className="gradient_text">Password reset</span></h1>
          <p className={styles.successMsg}>Password updated. Redirecting to login…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.title}>
          <span className="gradient_text">Reset password</span>
        </h1>
        <p className={styles.choiceHint}>Enter your reset token and new password.</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            placeholder="Reset token (from email or forgot-password)"
            value={token}
            onChange={e => setToken(e.target.value)}
            className={styles.input}
          />
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className={styles.input}
            required
            minLength={4}
            autoComplete="new-password"
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className={styles.input}
            required
            minLength={4}
            autoComplete="new-password"
          />
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? 'Resetting…' : 'Reset password'}
          </button>
        </form>
        <button type="button" className={styles.toggle} onClick={() => navigate('/login')}>
          ← Back to login
        </button>
      </div>
    </div>
  );
}
