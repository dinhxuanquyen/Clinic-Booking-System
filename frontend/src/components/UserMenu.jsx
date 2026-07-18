import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { resolveMediaUrl } from '../utils/media.js';
import ChangePasswordModal from './ChangePasswordModal.jsx';
import { FaCalendarCheck, FaSignOutAlt, FaUser } from './icons/FaIcons.jsx';

function getFallbackInitial(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const source = parts.at(-1) || name.trim() || 'U';

  return source.charAt(0).toUpperCase();
}

export default function UserMenu({ user, onLogout, isOpen: controlledOpen, onToggle, onClose }) {
  const { updateUser } = useAuth();
  const menuRef = useRef(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const isControlled = typeof controlledOpen === 'boolean';
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const role = user?.role?.toLowerCase();
  const isPatient = role === 'patient';
  const profilePath = role === 'doctor' ? '/doctor/profile' : '/profile';
  const appointmentsPath = role === 'doctor' ? '/doctor/appointments' : '/appointments/my';

  const avatarUrl = useMemo(() => (
    user?.avatar && !avatarFailed ? resolveMediaUrl(user.avatar, '') : ''
  ), [avatarFailed, user?.avatar]);

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.avatar]);

  function closeMenu() {
    if (isControlled) {
      onClose?.();
      return;
    }

    setInternalOpen(false);
  }

  function toggleMenu() {
    if (isControlled) {
      onToggle?.();
      return;
    }

    setInternalOpen((current) => !current);
  }

  useEffect(() => {
    if (!isOpen || isControlled) return undefined;

    function handlePointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        closeMenu();
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        closeMenu();
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isControlled, isOpen]);

  function handleLogout() {
    onLogout?.();
    closeMenu();
  }

  function openChangePassword() {
    closeMenu();
    setChangePasswordOpen(true);
  }

  return (
    <>
      <div className="user-menu-wrapper" ref={menuRef}>
        <button
          aria-expanded={isOpen}
          aria-label="Menu tài khoản"
          className="user-menu-trigger"
          type="button"
          onClick={toggleMenu}
        >
          {avatarUrl ? (
            <img
              alt={user?.name || 'User avatar'}
              className="user-menu-avatar"
              src={avatarUrl}
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <span className="user-menu-avatar user-menu-avatar-fallback">
              {getFallbackInitial(user?.name)}
            </span>
          )}
          <span className={`user-menu-caret ${isOpen ? 'open' : ''}`} aria-hidden="true" />
        </button>

        {isOpen && (
          <div className="user-menu-dropdown">
            <div className="user-menu-header">
              <strong>{user?.name || 'Người dùng'}</strong>
              {user?.email && <span>{user.email}</span>}
            </div>

            <div className="user-menu-links">
              <Link className="user-menu-item" to={profilePath} onClick={closeMenu}>
                <FaUser size={17} />
                Hồ sơ cá nhân
              </Link>
              <Link className="user-menu-item" to={appointmentsPath} onClick={closeMenu}>
                <FaCalendarCheck size={17} />
                Lịch hẹn của tôi
              </Link>
              {isPatient && (
                <Link className="user-menu-item" to="/medical-records" onClick={closeMenu}>
                  <FaCalendarCheck size={17} />
                  Hồ sơ khám bệnh
                </Link>
              )}
              {isPatient && (
                <Link className="user-menu-item" to="/medical-records?tab=follow-ups" onClick={closeMenu}>
                  <FaCalendarCheck size={17} />
                  Lịch tái khám
                </Link>
              )}
              <button className="user-menu-item" type="button" onClick={openChangePassword}>
                <FaUser size={17} />
                Đổi mật khẩu
              </button>
              <button className="user-menu-item" type="button" onClick={handleLogout}>
                <FaSignOutAlt size={17} />
                Đăng xuất
              </button>
            </div>
          </div>
        )}
      </div>

      {changePasswordOpen && (
        <ChangePasswordModal
          user={user}
          onClose={() => setChangePasswordOpen(false)}
          onSuccess={(nextUser) => {
            if (nextUser) updateUser(nextUser);
          }}
        />
      )}
    </>
  );
}
