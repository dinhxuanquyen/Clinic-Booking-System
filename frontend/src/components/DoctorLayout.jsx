import { useLayoutEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

const links = [
  { to: '/doctor/queue', label: 'Hàng đợi khám' },
  { to: '/doctor/schedules', label: 'Lịch làm việc của tôi' },
  { to: '/doctor/appointments', label: 'Lịch hẹn của tôi' },
  { to: '/doctor/medical-records', label: 'Hồ sơ đã tạo' },
  { to: '/doctor/medical-records?followUpOnly=true', label: 'Theo dõi tái khám' },
  { to: '/doctor/articles', label: 'Bài viết của tôi' },
  { to: '/doctor/reviews', label: 'Đánh giá của tôi' },
  { to: '/doctor/profile', label: 'Hồ sơ bác sĩ' }
];

export default function DoctorLayout() {
  const location = useLocation();
  const mainRef = useRef(null);
  const searchParams = new URLSearchParams(location.search);
  const isFollowUpMode = location.pathname === '/doctor/medical-records' && searchParams.get('followUpOnly') === 'true';

  useLayoutEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useLayoutEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname, location.search]);

  return (
    <main className="doctor-layout">
      <aside className="doctor-sidebar">
        <h1 className="h5 mb-3">Bác sĩ</h1>
        {links.map((item) => (
          <NavLink
            className={({ isActive }) => {
              if (item.to === '/doctor/medical-records?followUpOnly=true') {
                return isFollowUpMode ? 'active' : undefined;
              }

              if (item.to === '/doctor/medical-records') {
                return location.pathname === '/doctor/medical-records' && !isFollowUpMode ? 'active' : undefined;
              }

              return isActive ? 'active' : undefined;
            }}
            key={item.to}
            to={item.to}
          >
            {item.label}
          </NavLink>
        ))}
        <NavLink to="/doctor/service-packages">Gói khám áp dụng</NavLink>
      </aside>
      <section className="doctor-main" ref={mainRef}>
        <div className="doctor-topbar">
          <strong>Khu vực bác sĩ</strong>
          <span className="text-secondary small">Quản lý lịch làm việc và quá trình khám của chính bạn</span>
        </div>
        <div className="doctor-page-container">
          <Outlet />
        </div>
      </section>
    </main>
  );
}
