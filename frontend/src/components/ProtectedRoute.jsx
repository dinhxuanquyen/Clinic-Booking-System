import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ roles, allowedRoles, children }) {
  const location = useLocation();
  const { user, isAuthenticated, hasRole } = useAuth();
  const requiredRoles = allowedRoles || roles || [];

  if (!isAuthenticated()) {
    const returnUrl = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?returnUrl=${encodeURIComponent(returnUrl)}`} replace />;
  }

  if (user?.mustChangePassword && location.pathname !== '/change-password-first-login') {
    return <Navigate to="/change-password-first-login" replace />;
  }

  if (!user?.mustChangePassword && location.pathname === '/change-password-first-login') {
    return <Navigate to={user?.role === 'doctor' ? '/doctor/queue' : user?.role === 'admin' ? '/admin' : '/'} replace />;
  }

  if (requiredRoles.length && !hasRole(requiredRoles)) {
    return (
      <main className="container py-5">
        <div className="forbidden-panel">
          <span className="eyebrow">403</span>
          <h1 className="h3 mt-2">Bạn không có quyền truy cập</h1>
          <p className="text-secondary mb-0">
            Tài khoản {user?.email} không có vai trò phù hợp để mở trang này.
          </p>
        </div>
      </main>
    );
  }

  return children;
}
