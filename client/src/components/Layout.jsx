import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Layout.module.css';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const isCommittee = user?.role === 'committee';
  const location = useLocation();

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <h1 className={styles.logo}>
          <span className="gradient_text">Wisdom Document System</span>
        </h1>
        <nav className={styles.nav}>
          {isCommittee ? (
            <Link to="/committee" className={location.pathname === '/committee' ? styles.navActive : styles.navLink}>
              Submissions
            </Link>
          ) : (
            <Link to="/" className={location.pathname === '/' ? styles.navActive : styles.navLink}>
              My uploads
            </Link>
          )}
        </nav>
        <div className={styles.userRow}>
          <span className={styles.email}>{user?.email}</span>
          <span className={styles.role}>{isCommittee ? 'Committee' : 'Student'}</span>
          <button type="button" className={styles.logout} onClick={logout}>
            Logout
          </button>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
