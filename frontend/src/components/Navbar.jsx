import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import ChangePasswordModal from './ChangePasswordModal.jsx';
import NotificationBell from './NotificationBell.jsx';
import UserMenu from './UserMenu.jsx';
import {
  FaCalendarAlt,
  FaCalendarCheck,
  FaHospital,
  FaSignOutAlt,
  FaStethoscope,
  FaUser
} from './icons/FaIcons.jsx';

function Brand({ to = '/', subtitle = 'Clinic Appointment' }) {
  return (
    <Link className="navbar-brand d-flex align-items-center gap-2 fw-bold text-primary" to={to}>
      <span className="brand-mark brand-logo">B</span>
      <span className="brand-text">
        <span className="brand-title">BookingCare Mini</span>
        <small className="brand-subtitle">{subtitle}</small>
      </span>
    </Link>
  );
}

function ManagementNavbarContent({ homePath, subtitle, user, onLogout, activeDropdown, onToggleDropdown, onCloseDropdowns, actionsRef }) {
  return (
    <div className="management-navbar-inner">
      <Brand to={homePath} subtitle={subtitle} />
      <div className="management-navbar-actions" ref={actionsRef}>
        <NotificationBell
          isOpen={activeDropdown === 'notification'}
          onToggle={() => onToggleDropdown('notification')}
          onClose={onCloseDropdowns}
        />
        <UserMenu
          user={user}
          onLogout={onLogout}
          isOpen={activeDropdown === 'user'}
          onToggle={() => onToggleDropdown('user')}
          onClose={onCloseDropdowns}
        />
      </div>
    </div>
  );
}

function MobileDrawer({ user, isPatient, open, onClose, onLogout, onOpenChangePassword }) {
  if (!open) return null;

  function closeAndRun(callback) {
    onClose();
    callback?.();
  }

  return (
    <div className="mobile-drawer-layer open" aria-modal="true" role="dialog">
      <button className="mobile-drawer-backdrop" type="button" aria-label="Đóng menu" onClick={onClose} />
      <aside className="mobile-drawer">
        <div className="mobile-drawer-header">
          <span className="mobile-drawer-section-title" style={{ margin: 0 }}>Menu điều hướng</span>
          <button className="mobile-drawer-close" type="button" aria-label="Đóng menu" onClick={onClose}>
            ✕
          </button>
        </div>

        <nav className="mobile-drawer-links" aria-label="Điều hướng mobile">
          <div className="mobile-drawer-section-title">Hệ thống khám bệnh</div>
          <NavLink className="mobile-drawer-link" to="/clinics" onClick={onClose}>
            <FaHospital size={20} className="mobile-drawer-link-icon" />
            <span>Cơ sở khám bệnh</span>
          </NavLink>
          <NavLink className="mobile-drawer-link" to="/specialties" onClick={onClose}>
            <FaStethoscope size={20} className="mobile-drawer-link-icon" />
            <span>Chuyên khoa</span>
          </NavLink>
          <NavLink className="mobile-drawer-link" to="/doctors" onClick={onClose}>
            <FaUser size={20} className="mobile-drawer-link-icon" />
            <span>Bác sĩ</span>
          </NavLink>
          <NavLink className="mobile-drawer-link" to="/packages" onClick={onClose}>
            <FaCalendarCheck size={20} className="mobile-drawer-link-icon" />
            <span>Gói khám</span>
          </NavLink>
          <NavLink className="mobile-drawer-link" to="/articles" onClick={onClose}>
            <FaCalendarCheck size={20} className="mobile-drawer-link-icon" />
            <span>Cẩm nang</span>
          </NavLink>
          <NavLink className="mobile-drawer-link" to="/symptom-checker" onClick={onClose}>
            <FaStethoscope size={20} className="mobile-drawer-link-icon" />
            <span>Tư vấn triệu chứng</span>
          </NavLink>

          {isPatient && (
            <NavLink className="mobile-drawer-link" to="/appointments/my" onClick={onClose}>
              <FaCalendarAlt size={20} className="mobile-drawer-link-icon" />
              <span>Lịch hẹn của tôi</span>
            </NavLink>
          )}

          <div className="mobile-drawer-cta-box">
            <NavLink className="mobile-drawer-cta-btn" to="/booking" onClick={onClose}>
              <FaCalendarAlt size={18} />
              <span>Đặt lịch khám ngay</span>
            </NavLink>
          </div>

          {user ? (
            <>
              <div className="mobile-drawer-section-title">Tài khoản cá nhân</div>
              <NavLink className="mobile-drawer-link" to="/profile" onClick={onClose}>
                <FaUser size={20} className="mobile-drawer-link-icon" />
                <span>Hồ sơ cá nhân</span>
              </NavLink>
              {isPatient && (
                <NavLink className="mobile-drawer-link" to="/medical-records" onClick={onClose}>
                  <FaCalendarCheck size={20} className="mobile-drawer-link-icon" />
                  <span>Hồ sơ khám bệnh</span>
                </NavLink>
              )}
              {isPatient && (
                <NavLink className="mobile-drawer-link" to="/medical-records?tab=follow-ups" onClick={onClose}>
                  <FaCalendarCheck size={20} className="mobile-drawer-link-icon" />
                  <span>Lịch tái khám</span>
                </NavLink>
              )}
              <button className="mobile-drawer-link" type="button" onClick={() => closeAndRun(onOpenChangePassword)}>
                <FaUser size={20} className="mobile-drawer-link-icon" />
                <span>Đổi mật khẩu</span>
              </button>
              <button className="mobile-drawer-link mobile-drawer-danger" type="button" onClick={() => closeAndRun(onLogout)}>
                <FaSignOutAlt size={20} className="mobile-drawer-link-icon" />
                <span>Đăng xuất</span>
              </button>
            </>
          ) : (
            <>
              <div className="mobile-drawer-section-title">Tài khoản</div>
              <NavLink className="mobile-drawer-link" to="/login" onClick={onClose}>
                <FaUser size={20} className="mobile-drawer-link-icon" />
                <span>Đăng nhập</span>
              </NavLink>
              <NavLink className="mobile-drawer-link mobile-drawer-accent" to="/register" onClick={onClose}>
                <FaCalendarCheck size={20} className="mobile-drawer-link-icon" />
                <span>Đăng ký</span>
              </NavLink>
            </>
          )}
        </nav>
      </aside>
    </div>
  );
}

function PublicNavbarContent({
  user,
  onLogout,
  isPatient,
  activeDropdown,
  onToggleDropdown,
  onCloseDropdowns,
  actionsRef,
  mobileDrawerOpen,
  onOpenMobileDrawer,
  onCloseMobileDrawer,
  onOpenChangePassword
}) {
  return (
    <div className="public-navbar-inner">
      <div className="public-navbar-brand">
        <Brand />
      </div>

      <nav className="public-navbar-menu">
        <NavLink className="nav-link" to="/clinics">Cơ sở</NavLink>
        <NavLink className="nav-link" to="/specialties">Chuyên khoa</NavLink>
        <NavLink className="nav-link" to="/doctors">Tìm bác sĩ</NavLink>
        <NavLink className="nav-link" to="/packages">Gói khám</NavLink>
        <NavLink className="nav-link" to="/articles">Cẩm nang</NavLink>
        <NavLink className="nav-link" to="/symptom-checker">Tư vấn triệu chứng</NavLink>
        {isPatient && <NavLink className="nav-link" to="/appointments/my">Lịch hẹn của tôi</NavLink>}
      </nav>

      <div className="public-navbar-actions" ref={actionsRef}>
        <Link className="btn btn-primary btn-sm px-3 book-appointment-button navbar-booking-btn" to="/booking">
          <FaCalendarAlt className="navbar-booking-icon" size={16} />
          <span>Đặt lịch khám</span>
        </Link>

        {user ? (
          <>
            {isPatient && (
              <NotificationBell
                isOpen={activeDropdown === 'notification'}
                onToggle={() => onToggleDropdown('notification')}
                onClose={onCloseDropdowns}
              />
            )}
            <UserMenu
              user={user}
              onLogout={onLogout}
              isOpen={activeDropdown === 'user'}
              onToggle={() => onToggleDropdown('user')}
              onClose={onCloseDropdowns}
            />
          </>
        ) : (
          <div className="guest-actions">
            <Link className="btn btn-outline-primary btn-sm px-3" to="/login">Đăng nhập</Link>
            <Link className="btn btn-primary btn-sm px-3" to="/register">Đăng ký</Link>
          </div>
        )}
      </div>

      <button
        className="public-navbar-toggle"
        type="button"
        aria-label="Mở menu"
        aria-expanded={mobileDrawerOpen}
        onClick={mobileDrawerOpen ? onCloseMobileDrawer : onOpenMobileDrawer}
      >
        <span />
        <span />
        <span />
      </button>

      <MobileDrawer
        user={user}
        isPatient={isPatient}
        open={mobileDrawerOpen}
        onClose={onCloseMobileDrawer}
        onLogout={onLogout}
        onOpenChangePassword={onOpenChangePassword}
      />
    </div>
  );
}

export default function Navbar() {
  const { user, logout, hasRole } = useAuth();
  const toast = useToast();
  const isAdmin = hasRole('admin');
  const isDoctor = hasRole('doctor');
  const isPatient = hasRole('patient');
  const actionsRef = useRef(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const closeDropdowns = useCallback(() => {
    setActiveDropdown(null);
  }, []);

  const toggleDropdown = useCallback((dropdown) => {
    setActiveDropdown((current) => (current === dropdown ? null : dropdown));
  }, []);

  const closeMobileDrawer = useCallback(() => {
    setMobileDrawerOpen(false);
  }, []);

  const openMobileDrawer = useCallback(() => {
    closeDropdowns();
    setMobileDrawerOpen(true);
  }, [closeDropdowns]);

  const handlePublicLogout = useCallback(() => {
    logout();
    closeDropdowns();
    setMobileDrawerOpen(false);
    toast.info('Đăng xuất thành công');
  }, [closeDropdowns, logout, toast]);

  const openChangePassword = useCallback(() => {
    closeDropdowns();
    setMobileDrawerOpen(false);
    setChangePasswordOpen(true);
  }, [closeDropdowns]);

  // Auto close mobile drawer on desktop resize
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) {
        setMobileDrawerOpen(false);
      }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!activeDropdown) return undefined;

    function handlePointerDown(event) {
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        closeDropdowns();
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        closeDropdowns();
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeDropdown, closeDropdowns]);

  useEffect(() => {
    if (!mobileDrawerOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        closeMobileDrawer();
      }
    }

    document.body.classList.add('mobile-drawer-open');
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove('mobile-drawer-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeMobileDrawer, mobileDrawerOpen]);

  if (isAdmin || isDoctor) {
    return (
      <header className="app-navbar management-navbar sticky-top">
        <ManagementNavbarContent
          homePath={isAdmin ? '/admin' : '/doctor/queue'}
          subtitle={isAdmin ? 'Admin Portal' : 'Doctor Portal'}
          user={user}
          onLogout={logout}
          activeDropdown={activeDropdown}
          onToggleDropdown={toggleDropdown}
          onCloseDropdowns={closeDropdowns}
          actionsRef={actionsRef}
        />
      </header>
    );
  }

  return (
    <header className="app-navbar public-navbar">
      <PublicNavbarContent
        user={user}
        onLogout={handlePublicLogout}
        isPatient={isPatient}
        activeDropdown={activeDropdown}
        onToggleDropdown={toggleDropdown}
        onCloseDropdowns={closeDropdowns}
        actionsRef={actionsRef}
        mobileDrawerOpen={mobileDrawerOpen}
        onOpenMobileDrawer={openMobileDrawer}
        onCloseMobileDrawer={closeMobileDrawer}
        onOpenChangePassword={openChangePassword}
      />
      {changePasswordOpen && (
        <ChangePasswordModal user={user} onClose={() => setChangePasswordOpen(false)} />
      )}
    </header>
  );
}
