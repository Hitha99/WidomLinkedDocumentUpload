import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Upload from './pages/Upload';
import CommitteeDashboard from './pages/CommitteeDashboard';
import Layout from './components/Layout';

function StudentRoute({ children }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (user?.role === 'committee') return <Navigate to="/committee" replace />;
  return children;
}

function CommitteeRoute({ children }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (user?.role !== 'committee') return <Navigate to="/" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { token } = useAuth();
  return !token ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/" element={<StudentRoute><Layout><Upload /></Layout></StudentRoute>} />
          <Route path="/committee" element={<CommitteeRoute><Layout><CommitteeDashboard /></Layout></CommitteeRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
