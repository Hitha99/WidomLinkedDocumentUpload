import { createContext, useContext, useState, useCallback } from 'react';

const KEY = 'windom_token';
const USER_KEY = 'windom_user';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => localStorage.getItem(KEY));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  });

  const setAuth = useCallback((newToken, newUser) => {
    if (newToken) {
      localStorage.setItem(KEY, newToken);
      localStorage.setItem(USER_KEY, JSON.stringify(newUser || {}));
      setTokenState(newToken);
      setUser(newUser || null);
    } else {
      localStorage.removeItem(KEY);
      localStorage.removeItem(USER_KEY);
      setTokenState(null);
      setUser(null);
    }
  }, []);

  const logout = useCallback(() => setAuth(null), [setAuth]);

  return (
    <AuthContext.Provider value={{ token, user, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
