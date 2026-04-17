import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AgentProvider } from './context/AgentContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';

// Guard for authenticated-only pages.
// If there is no token we send the user to /login and remember where they
// were trying to go, so after login we can bounce them back (if desired).
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const location = useLocation();
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
};

// If a visitor hits /login or /register while already signed in, skip the form.
const PublicOnlyRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (token) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <AgentProvider>
        <Routes>
          <Route path="/login"    element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
          <Route path="/"         element={<PrivateRoute><Home /></PrivateRoute>} />
          {/* Any unknown URL (e.g. a copy-pasted deep link) falls through to "/"
              which, if the user is not authenticated, redirects to /login. */}
          <Route path="*"         element={<Navigate to="/" replace />} />
        </Routes>
      </AgentProvider>
    </BrowserRouter>
  );
}
