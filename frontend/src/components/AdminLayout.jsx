import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

const links = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/clinics', label: 'Cơ sở' },
  { to: '/admin/specialties', label: 'Chuyên khoa' },
  { to: '/admin/doctors', label: 'Bác sĩ' },
  { to: '/admin/schedules', label: 'Lịch làm việc' },
  { to: '/admin/queue', label: 'Hàng đợi khám' },
  { to: '/admin/appointments', label: 'Lịch hẹn' },
  { to: '/admin/articles', label: 'Cẩm nang' }
];

export default function AdminLayout({ children }) {
  const location = useLocation();
  const mainRef = useRef(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  return (
    <main className="admin-layout">
      <aside className="admin-sidebar">
        <h1 className="h5 mb-3">Admin</h1>
        {links.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end}>
            {item.label}
          </NavLink>
        ))}
        <NavLink to="/admin/service-packages">Gói khám</NavLink>
        <NavLink to="/admin/audit-logs">Nhật ký hệ thống</NavLink>
      </aside>
      <section className="admin-main" ref={mainRef}>
        <div className="admin-topbar">
          <strong>Admin Dashboard</strong>
          <span className="text-secondary small">Quản trị hệ thống đặt lịch khám</span>
        </div>
        <div className="admin-content">
          {children || <Outlet />}
        </div>
      </section>
    </main>
  );
}
