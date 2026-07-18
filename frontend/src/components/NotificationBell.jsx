import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { connectSocket, joinSocketRoom } from '../services/socket.js';
import { getToken } from '../utils/auth.js';
import { cleanDisplayText } from '../utils/textEncoding.js';
import BaseModal from './BaseModal.jsx';

function formatNotificationTime(value) {
  if (!value) return '';

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(value));
}

function getAppointmentId(notification) {
  return notification.appointmentId?._id || notification.appointmentId || notification.metadata?.appointmentId;
}

function getWaitingListId(notification) {
  return notification.waitingListId?._id || notification.waitingListId || notification.metadata?.waitingListId;
}

function getMedicalRecordId(notification) {
  return notification.metadata?.medicalRecordId || notification.medicalRecordId;
}

function formatCountdown(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getAdminNotificationTarget(notification) {
  const appointmentId = getAppointmentId(notification);
  const params = new URLSearchParams();

  if (notification.type === 'new_appointment') params.set('status', 'pending');
  if (notification.type === 'cancel_request') params.set('status', 'cancel_requested');
  if (notification.type === 'reschedule_request') params.set('status', 'reschedule_requested');
  if (appointmentId) params.set('appointmentId', appointmentId);

  const query = params.toString();
  return query ? `/admin/appointments?${query}` : '/admin/appointments';
}

function getDoctorNotificationTarget(notification) {
  const appointmentId = getAppointmentId(notification);
  return appointmentId ? `/doctor/appointments?appointmentId=${appointmentId}` : '/doctor/appointments';
}

function getDoctorToastMessage(notification) {
  if (notification.type === 'doctor_new_appointment') {
    const message = cleanDisplayText(notification.message);
    const match = message?.match(/Bệnh nhân\s+(.+?)\s+đã đặt/i);
    return match?.[1] ? `Có lịch khám mới từ bệnh nhân ${match[1]}` : 'Có lịch khám mới';
  }

  if (notification.type === 'doctor_follow_up_scheduled') return 'Bệnh nhân đã đặt lịch tái khám';
  if (notification.type === 'doctor_waiting_list_accepted') return 'Có lịch khám mới từ danh sách chờ';
  if (notification.type === 'doctor_cancel_request') return 'Có yêu cầu hủy lịch mới';
  if (notification.type === 'doctor_reschedule_request') return 'Có yêu cầu đổi lịch mới';
  if (notification.type === 'doctor_appointment_cancelled') return 'Lịch hẹn của bạn đã bị hủy';
  if (notification.type === 'doctor_appointment_rescheduled') return 'Lịch hẹn đã được đổi';

  return '';
}

function getNotificationIcon(notification) {
  if (['follow_up_scheduled', 'follow_up_due_soon', 'follow_up_overdue'].includes(notification.type)) return '↻';
  if (notification.type === 'follow_up_recommended') return '↻';
  if (String(notification.type || '').startsWith('doctor_')) return '🩺';
  if (notification.type === 'waitinglist_offered') return '⏳';
  if (notification.type === 'consultation_called') return '📣';
  if (notification.type === 'consultation_completed') return '✅';
  if (notification.type === 'appointment_no_show') return '⚠';
  if (notification.type === 'medical_record_created') return '📋';
  if (notification.type === 'cancel_request' || notification.type === 'cancel_request_approved') return '⚠';
  if (notification.type === 'reschedule_request') return '↻';
  return '📅';
}

function notifyPatientToast(notification, toast) {
  if (notification.type === 'follow_up_scheduled') {
    toast.success('Bạn đã đặt lịch tái khám thành công.');
    return;
  }
  if (notification.type === 'follow_up_due_soon') {
    toast.info('Bạn có lịch tái khám được khuyến nghị vào ngày mai.');
    return;
  }
  if (notification.type === 'follow_up_overdue') {
    toast.warning('Bạn đã quá hạn tái khám. Vui lòng đặt lịch nếu vẫn cần theo dõi.');
    return;
  }
  if (notification.type === 'follow_up_recommended') {
    toast.info('Bác sĩ khuyến nghị bạn tái khám. Vui lòng đặt lịch phù hợp.');
    return;
  }
  if (notification.type === 'waitinglist_offered') return;
  if (notification.type === 'consultation_called') {
    toast.info('Đã đến lượt khám của bạn. Vui lòng vào phòng khám.');
    return;
  }
  if (notification.type === 'consultation_completed') {
    toast.success('Buổi khám của bạn đã hoàn thành.');
    return;
  }
  if (notification.type === 'medical_record_created') {
    toast.success('Hồ sơ khám bệnh của bạn đã được cập nhật.');
    return;
  }
  if (notification.type === 'appointment_no_show') {
    toast.warning('Bạn đã bỏ lỡ lịch khám. Vui lòng đặt lịch mới nếu vẫn cần được thăm khám.');
  }
}

export default function NotificationBell({ isOpen: controlledOpen, onToggle, onClose } = {}) {
  const navigate = useNavigate();
  const { hasRole, user } = useAuth();
  const toast = useToast();
  const wrapperRef = useRef(null);
  const knownUnreadIdsRef = useRef(new Set());
  const hasLoadedOnceRef = useRef(false);
  const shownWaitingOfferRef = useRef('');
  const [filter, setFilter] = useState('all');
  const [internalOpen, setInternalOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [waitingOffer, setWaitingOffer] = useState(null);
  const [offerSeconds, setOfferSeconds] = useState(0);
  const [offerActionLoading, setOfferActionLoading] = useState(false);
  const isControlled = typeof controlledOpen === 'boolean';
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const closeDropdown = useCallback(() => {
    if (isControlled) {
      onClose?.();
      return;
    }

    setInternalOpen(false);
  }, [isControlled, onClose]);

  const toggleDropdown = useCallback(() => {
    if (isControlled) {
      onToggle?.();
      return;
    }

    setInternalOpen((current) => !current);
  }, [isControlled, onToggle]);

  const loadWaitingOffer = useCallback(async (waitingListId, options = {}) => {
    const { notify = true, force = false } = options;
    if (!waitingListId || (!force && shownWaitingOfferRef.current === waitingListId)) return;
    shownWaitingOfferRef.current = waitingListId;

    try {
      const payload = await api('/waiting-list/my');
      const entry = (payload.data || []).find((item) => item._id === waitingListId);
      const expiresAt = entry?.offerExpiresAt ? new Date(entry.offerExpiresAt).getTime() : 0;

      if (!entry || entry.status !== 'offered' || expiresAt <= Date.now()) {
        shownWaitingOfferRef.current = '';
        return;
      }

      setWaitingOffer(entry);
      setOfferSeconds(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
      if (notify) toast.info('Có lịch khám trống dành cho bạn.');
    } catch (error) {
      shownWaitingOfferRef.current = '';
      throw error;
    }
  }, [toast]);

  const fetchNotifications = useCallback(async () => {
    const payload = await api('/notifications/my');
    const nextNotifications = payload.data || [];
    const nextUnreadIds = new Set(nextNotifications.filter((item) => !item.isRead).map((item) => item._id));

    if (hasLoadedOnceRef.current && hasRole('patient')) {
      nextNotifications
        .filter((item) => !item.isRead && !knownUnreadIdsRef.current.has(item._id))
        .forEach((item) => notifyPatientToast(item, toast));

      const waitingOfferNotification = nextNotifications.find((item) => (
        !item.isRead &&
        item.type === 'waitinglist_offered' &&
        !knownUnreadIdsRef.current.has(item._id)
      ));
      if (waitingOfferNotification) {
        loadWaitingOffer(getWaitingListId(waitingOfferNotification)).catch(() => {});
      }
    } else if (!hasLoadedOnceRef.current && hasRole('patient')) {
      const waitingOfferNotification = nextNotifications.find((item) => (
        !item.isRead && item.type === 'waitinglist_offered'
      ));
      if (waitingOfferNotification) {
        loadWaitingOffer(getWaitingListId(waitingOfferNotification)).catch(() => {});
      }
    }

    if (hasLoadedOnceRef.current && hasRole('doctor')) {
      nextNotifications
        .filter((item) => (
          !item.isRead &&
          !knownUnreadIdsRef.current.has(item._id) &&
          String(item.type || '').startsWith('doctor_')
        ))
        .forEach((item) => {
          const message = getDoctorToastMessage(item);
          if (message) toast.info(message);
        });
    }

    knownUnreadIdsRef.current = nextUnreadIds;
    hasLoadedOnceRef.current = true;
    setNotifications(nextNotifications);
  }, [hasRole, loadWaitingOffer, toast]);

  useEffect(() => {
    fetchNotifications().catch(() => {});
    const timer = window.setInterval(() => {
      fetchNotifications().catch(() => {});
    }, 30000);

    return () => window.clearInterval(timer);
  }, [fetchNotifications]);

  useEffect(() => {
    const socket = connectSocket(getToken());
    if (!socket) return undefined;
    joinSocketRoom(user?._id || user?.id);

    function handleNewNotification(payload) {
      const notification = payload?.notification || payload;
      if (!notification?._id) return;
      console.log('Received notification:new', notification);

      if (!notification.isRead) {
        knownUnreadIdsRef.current.add(notification._id);
      }

      setNotifications((current) => {
        if (current.some((item) => item._id === notification._id)) return current;
        return [notification, ...current];
      });

      if (hasRole('patient')) {
        if (notification.type === 'waitinglist_offered') {
          loadWaitingOffer(getWaitingListId(notification)).catch(() => {});
        } else {
          notifyPatientToast(notification, toast);
        }
      }

      if (hasRole('doctor') && String(notification.type || '').startsWith('doctor_')) {
        const message = getDoctorToastMessage(notification);
        if (message) toast.info(message);
      }
    }

    function handleWaitingListOffer(payload) {
      if (!hasRole('patient')) return;
      loadWaitingOffer(payload?.waitingListId).catch(() => {});
    }

    socket.on('notification:new', handleNewNotification);
    socket.on('waitinglist:offered', handleWaitingListOffer);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('waitinglist:offered', handleWaitingListOffer);
    };
  }, [hasRole, loadWaitingOffer, toast, user]);

  useEffect(() => {
    if (!waitingOffer?.offerExpiresAt) return undefined;

    function updateCountdown() {
      const remaining = Math.max(
        0,
        Math.ceil((new Date(waitingOffer.offerExpiresAt).getTime() - Date.now()) / 1000)
      );
      setOfferSeconds(remaining);
      if (remaining === 0) {
        setWaitingOffer(null);
        shownWaitingOfferRef.current = '';
      }
    }

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [waitingOffer]);

  useEffect(() => {
    if (isOpen) fetchNotifications().catch(() => {});
  }, [fetchNotifications, isOpen]);

  useEffect(() => {
    if (!isOpen || isControlled) return undefined;

    function handlePointerDown(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        closeDropdown();
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') closeDropdown();
    }

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeDropdown, isControlled, isOpen]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((notification) => !notification.isRead);
    }

    return notifications;
  }, [filter, notifications]);

  async function markAllRead() {
    await api('/notifications/read-all', { method: 'PATCH' });
    knownUnreadIdsRef.current = new Set();
    setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true })));
  }

  async function openNotification(notification) {
    const appointmentId = getAppointmentId(notification);

    if (!notification.isRead) {
      await api(`/notifications/${notification._id}/read`, { method: 'PATCH' });
      knownUnreadIdsRef.current.delete(notification._id);
      setNotifications((current) => (
        current.map((item) => (item._id === notification._id ? { ...item, isRead: true } : item))
      ));
    }

    closeDropdown();
    if (notification.type === 'waitinglist_offered') {
      await loadWaitingOffer(getWaitingListId(notification), { notify: false, force: true });
      return;
    }

    if (hasRole('admin')) {
      navigate(getAdminNotificationTarget(notification));
    } else if (hasRole('doctor')) {
      navigate(getDoctorNotificationTarget(notification));
    } else if (['medical_record_created', 'medical_record_updated'].includes(notification.type)) {
      const medicalRecordId = getMedicalRecordId(notification);
      navigate(notification.targetUrl || (medicalRecordId ? `/medical-records?recordId=${medicalRecordId}` : appointmentId ? `/medical-records?appointmentId=${appointmentId}` : '/medical-records'));
    } else if (notification.targetUrl) {
      navigate(notification.targetUrl);
    } else if (appointmentId) {
      navigate(`/appointments/my?appointmentId=${appointmentId}`);
    }
  }

  async function respondToWaitingOffer(action) {
    if (!waitingOffer?._id || offerActionLoading) return;

    setOfferActionLoading(true);
    try {
      await api(`/waiting-list/${waitingOffer._id}/${action}`, { method: 'POST' });
      const relatedNotification = notifications.find((item) => (
        item.type === 'waitinglist_offered' && getWaitingListId(item) === waitingOffer._id
      ));
      if (relatedNotification && !relatedNotification.isRead) {
        await api(`/notifications/${relatedNotification._id}/read`, { method: 'PATCH' }).catch(() => {});
      }
      setWaitingOffer(null);
      shownWaitingOfferRef.current = '';
      await fetchNotifications();

      if (action === 'accept') {
        toast.success('Nhận lịch khám thành công.');
        navigate('/appointments/my');
      } else {
        toast.info('Bạn đã từ chối lời mời nhận lịch.');
      }
    } catch (error) {
      toast.error(error.message || 'Đã xảy ra lỗi, vui lòng thử lại');
      if ([400, 409].includes(error.status)) {
        setWaitingOffer(null);
        shownWaitingOfferRef.current = '';
      }
      await fetchNotifications().catch(() => {});
    } finally {
      setOfferActionLoading(false);
    }
  }

  return (
    <>
      <div className="notification-bell-wrapper" ref={wrapperRef}>
        <button
          aria-label="Thông báo"
          className="notification-bell-button"
          type="button"
          onClick={toggleDropdown}
        >
          <span aria-hidden="true">🔔</span>
          {unreadCount > 0 && <span className="notification-bell-badge">{unreadCount}</span>}
        </button>

        {isOpen && (
          <div className="notification-dropdown">
            <div className="notification-dropdown-header">
              <h2>Thông báo</h2>
              <button
                className="btn btn-link btn-sm p-0"
                disabled={!unreadCount}
                type="button"
                onClick={markAllRead}
              >
                Đánh dấu tất cả đã đọc
              </button>
            </div>

            <div className="notification-tabs" role="tablist" aria-label="Lọc thông báo">
              <button
                className={`notification-tab ${filter === 'all' ? 'active' : ''}`}
                type="button"
                onClick={() => setFilter('all')}
              >
                Tất cả
              </button>
              <button
                className={`notification-tab ${filter === 'unread' ? 'active' : ''}`}
                type="button"
                onClick={() => setFilter('unread')}
              >
                Chưa đọc
              </button>
            </div>

            <div className="notification-list">
              {!filteredNotifications.length && (
                <div className="notification-empty">
                  <span className="notification-empty-icon" aria-hidden="true">🔔</span>
                  <p>Bạn chưa có thông báo nào</p>
                </div>
              )}

              {filteredNotifications.map((notification) => (
                <button
                  className={`notification-item notification-type-${notification.type} ${notification.isRead ? '' : 'unread'}`}
                  key={notification._id}
                  type="button"
                  onClick={() => openNotification(notification)}
                >
                  <span className="notification-item-icon" aria-hidden="true">{getNotificationIcon(notification)}</span>
                  <span className="notification-item-body">
                    <strong className="notification-item-title">{cleanDisplayText(notification.title, 'Thông báo')}</strong>
                    <span className="notification-item-message">{cleanDisplayText(notification.message)}</span>
                    <span className="notification-item-time">{formatNotificationTime(notification.createdAt)}</span>
                  </span>
                  {!notification.isRead && <span className="notification-unread-dot" aria-hidden="true" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <BaseModal
        ariaLabel="Lịch khám trống từ danh sách chờ"
        show={Boolean(waitingOffer)}
        onClose={() => setWaitingOffer(null)}
        disableClose={offerActionLoading}
        className="waiting-offer-modal"
      >
        <div className="waiting-offer-header">
          <span className="waiting-offer-icon" aria-hidden="true">⏳</span>
          <div>
            <span className="section-eyebrow">DANH SÁCH CHỜ</span>
            <h2>Có lịch khám trống dành cho bạn</h2>
          </div>
          <button
            aria-label="Đóng"
            className="waiting-offer-close"
            disabled={offerActionLoading}
            type="button"
            onClick={() => setWaitingOffer(null)}
          >
            ×
          </button>
        </div>

        <div className="waiting-offer-body">
          <p className="waiting-offer-lead">Xác nhận trong thời gian còn lại để nhận khung giờ này.</p>
          <div className="waiting-offer-countdown" aria-live="polite">{formatCountdown(offerSeconds)}</div>
          <dl className="waiting-offer-details">
            <div><dt>Bác sĩ</dt><dd>{waitingOffer?.doctorId?.name || 'Đang cập nhật'}</dd></div>
            <div><dt>Ngày khám</dt><dd>{waitingOffer?.date || 'Đang cập nhật'}</dd></div>
            <div><dt>Khung giờ</dt><dd>{waitingOffer?.timeSlot || 'Đang cập nhật'}</dd></div>
          </dl>
        </div>

        <div className="waiting-offer-actions">
          <button
            className="btn waiting-offer-decline"
            disabled={offerActionLoading || offerSeconds <= 0}
            type="button"
            onClick={() => respondToWaitingOffer('decline')}
          >
            Từ chối
          </button>
          <button
            className="btn waiting-offer-accept"
            disabled={offerActionLoading || offerSeconds <= 0}
            type="button"
            onClick={() => respondToWaitingOffer('accept')}
          >
            {offerActionLoading ? 'Đang xử lý...' : 'Nhận lịch'}
          </button>
        </div>
      </BaseModal>
    </>
  );
}
