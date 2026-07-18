import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import { displayName, formatDateVN, formatQueueNumber, formatTimeSlot } from '../utils/appointmentView.js';
import { getVietnamToday } from '../utils/dateTime.js';
import { getConsultationStatusPresentation } from '../utils/status.js';
import { cleanDisplayText } from '../utils/textEncoding.js';

const ATTENTION_STATUSES = ['pending', 'cancel_requested', 'reschedule_requested'];

const taskMeta = {
  pending: {
    label: 'Lịch chờ xác nhận',
    description: 'Lịch mới cần xác nhận để đưa vào quy trình khám.',
    tone: 'warning',
    to: '/doctor/appointments?status=pending'
  },
  cancel_requested: {
    label: 'Yêu cầu hủy',
    description: 'Bệnh nhân đã gửi yêu cầu hủy lịch, cần phản hồi.',
    tone: 'danger',
    to: '/doctor/appointments?status=cancel_requested'
  },
  reschedule_requested: {
    label: 'Yêu cầu đổi lịch',
    description: 'Bệnh nhân muốn đổi ngày hoặc khung giờ khám.',
    tone: 'warning',
    to: '/doctor/appointments?status=reschedule_requested'
  },
  in_progress: {
    label: 'Đang khám cần nhập hồ sơ',
    description: 'Hoàn tất hồ sơ khám để kết thúc buổi khám.',
    tone: 'info',
    to: '/doctor/appointments'
  }
};

function doctorIdFromUser(user) {
  return user?.doctorId?._id || user?.doctorId || '';
}

function doctorNameFromUser(user) {
  return cleanDisplayText(user?.doctorId?.name || user?.name, 'Bác sĩ');
}

function patientName(appointment) {
  return cleanDisplayText(
    appointment?.patientInfo?.name || appointment?.patientId?.name,
    'Bệnh nhân'
  );
}

function shortReason(appointment) {
  return cleanDisplayText(appointment?.reason, '');
}

function reviewPatientName(review) {
  return cleanDisplayText(review?.patientId?.name || review?.patientName, 'Bệnh nhân');
}

function formatDateTime(value) {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function SectionError({ message, onRetry }) {
  return (
    <div className="doctor-dashboard-inline-state doctor-dashboard-inline-state-error" role="status">
      <span>{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}

function SectionEmpty({ children }) {
  return (
    <div className="doctor-dashboard-inline-state">
      {children}
    </div>
  );
}

export default function DoctorDashboardPage() {
  const { user } = useAuth();
  const doctorId = doctorIdFromUser(user);
  const today = useMemo(() => getVietnamToday(), []);

  const [appointments, setAppointments] = useState([]);
  const [queue, setQueue] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [coreLoading, setCoreLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [coreErrors, setCoreErrors] = useState({ appointments: '', queue: '' });
  const [reviewsError, setReviewsError] = useState('');

  async function loadCoreData() {
    if (!doctorId) {
      setCoreLoading(false);
      setCoreErrors({
        appointments: 'Tài khoản bác sĩ chưa liên kết hồ sơ bác sĩ.',
        queue: 'Tài khoản bác sĩ chưa liên kết hồ sơ bác sĩ.'
      });
      return;
    }

    setCoreLoading(true);
    const [appointmentsResult, queueResult] = await Promise.allSettled([
      api(`/doctors/${doctorId}/appointments`, { params: { date: today } }),
      api('/doctor/queue/today', { params: { date: today } })
    ]);

    if (appointmentsResult.status === 'fulfilled') {
      setAppointments(appointmentsResult.value?.data || []);
    }

    if (queueResult.status === 'fulfilled') {
      setQueue(queueResult.value?.data || []);
    }

    setCoreErrors({
      appointments: appointmentsResult.status === 'rejected'
        ? appointmentsResult.reason?.message || 'Không tải được lịch hẹn hôm nay.'
        : '',
      queue: queueResult.status === 'rejected'
        ? queueResult.reason?.message || 'Không tải được hàng đợi hôm nay.'
        : ''
    });
    setCoreLoading(false);
  }

  async function loadReviews() {
    setReviewsLoading(true);
    setReviewsError('');
    try {
      const payload = await api('/doctor/reviews', {
        params: { page: 1, limit: 3, sort: 'newest' }
      });
      setReviews(payload?.data?.reviews || []);
    } catch (error) {
      setReviews([]);
      setReviewsError(error.message || 'Không tải được đánh giá gần đây.');
    } finally {
      setReviewsLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function load() {
      await loadCoreData();
      if (!active) return;
    }

    load();
    return () => {
      active = false;
    };
  }, [doctorId, today]);

  useEffect(() => {
    let active = true;

    async function load() {
      await loadReviews();
      if (!active) return;
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    const waiting = queue.filter((item) => (item.consultationStatus || 'waiting') === 'waiting').length;
    const inProgress = queue.filter((item) => item.consultationStatus === 'in_progress').length;
    const completed = queue.filter((item) => item.consultationStatus === 'completed' || item.status === 'completed').length;
    const needsAttention = appointments.filter((item) => ATTENTION_STATUSES.includes(item.status)).length;

    return {
      totalToday: appointments.length,
      waiting,
      inProgress,
      completed,
      needsAttention
    };
  }, [appointments, queue]);

  const kpis = [
    {
      key: 'total',
      label: 'Tổng lịch hôm nay',
      value: summary.totalToday,
      description: 'Tất cả lịch của ngày khám hiện tại',
      to: '/doctor/appointments',
      tone: 'primary',
      unavailable: Boolean(coreErrors.appointments)
    },
    {
      key: 'waiting',
      label: 'Chờ khám',
      value: summary.waiting,
      description: 'Bệnh nhân đã vào hàng đợi',
      to: '/doctor/queue',
      tone: 'warning',
      unavailable: Boolean(coreErrors.queue)
    },
    {
      key: 'in-progress',
      label: 'Đang khám',
      value: summary.inProgress,
      description: 'Ca khám đang được xử lý',
      to: '/doctor/queue',
      tone: 'info',
      unavailable: Boolean(coreErrors.queue)
    },
    {
      key: 'completed',
      label: 'Hoàn thành',
      value: summary.completed,
      description: 'Buổi khám đã kết thúc',
      to: '/doctor/queue',
      tone: 'success',
      unavailable: Boolean(coreErrors.queue)
    },
    {
      key: 'attention',
      label: 'Cần xử lý',
      value: summary.needsAttention,
      description: 'Xác nhận, hủy hoặc đổi lịch',
      to: '/doctor/appointments',
      tone: 'danger',
      unavailable: Boolean(coreErrors.appointments)
    }
  ];

  const nextPatients = useMemo(() => {
    const inProgress = queue.filter((item) => item.consultationStatus === 'in_progress');
    const waiting = queue.filter((item) => (item.consultationStatus || 'waiting') === 'waiting');
    return [...inProgress, ...waiting].slice(0, 5);
  }, [queue]);

  const tasks = useMemo(() => {
    const counts = {
      pending: appointments.filter((item) => item.status === 'pending').length,
      cancel_requested: appointments.filter((item) => item.status === 'cancel_requested').length,
      reschedule_requested: appointments.filter((item) => item.status === 'reschedule_requested').length,
      in_progress: queue.filter((item) => item.consultationStatus === 'in_progress' || item.status === 'in_progress').length
    };

    return Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([key, count]) => ({ key, count, ...taskMeta[key] }));
  }, [appointments, queue]);

  const todayLabel = formatDateVN(today);

  return (
    <div className="doctor-page doctor-dashboard-page">
      <section className="doctor-dashboard-header" aria-labelledby="doctor-dashboard-title">
        <div className="doctor-dashboard-header-copy">
          <p className="doctor-page-eyebrow">Khu vực bác sĩ</p>
          <h1 className="doctor-page-title" id="doctor-dashboard-title">Tổng quan hôm nay</h1>
          <p className="doctor-page-subtitle">
            Theo dõi lịch khám, hàng đợi và các việc cần xử lý trong ngày.
          </p>
        </div>
        <div className="doctor-dashboard-header-meta" aria-label={`Ngày làm việc ${todayLabel}`}>
          <span>Hôm nay</span>
          <strong>{todayLabel}</strong>
          <small>{doctorNameFromUser(user)}</small>
        </div>
      </section>

      <section className="doctor-dashboard-kpis" aria-label="Tóm tắt lịch khám hôm nay">
        {coreLoading ? (
          Array.from({ length: 5 }, (_, index) => (
            <div className="doctor-dashboard-kpi doctor-dashboard-skeleton" key={index} aria-hidden="true" />
          ))
        ) : (
          kpis.map((item) => (
            <Link className={`doctor-dashboard-kpi doctor-dashboard-kpi-${item.tone}`} key={item.key} to={item.to}>
              <span>{item.label}</span>
              <strong>{item.unavailable ? '—' : item.value}</strong>
              <small>{item.unavailable ? 'Chưa tải được dữ liệu' : item.description}</small>
            </Link>
          ))
        )}
      </section>

      <div className="doctor-dashboard-main-grid">
        <section className="doctor-dashboard-panel doctor-dashboard-queue" aria-labelledby="doctor-dashboard-queue-title">
          <div className="doctor-dashboard-section-header">
            <div>
              <p className="doctor-dashboard-section-eyebrow">Hàng đợi hôm nay</p>
              <h2 id="doctor-dashboard-queue-title">Bệnh nhân tiếp theo</h2>
            </div>
            <Link to="/doctor/queue">Xem toàn bộ hàng đợi</Link>
          </div>

          {coreErrors.queue && <SectionError message={coreErrors.queue} onRetry={loadCoreData} />}

          {coreLoading && (
            <div className="doctor-dashboard-list-skeleton" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          )}

          {!coreLoading && !coreErrors.queue && nextPatients.length === 0 && (
            <SectionEmpty>Chưa có bệnh nhân trong hàng đợi hôm nay.</SectionEmpty>
          )}

          {!coreLoading && !coreErrors.queue && nextPatients.length > 0 && (
            <div className="doctor-dashboard-queue-list">
              {nextPatients.map((appointment) => {
                const consultation = getConsultationStatusPresentation(appointment.consultationStatus || 'waiting');
                const reason = shortReason(appointment);
                return (
                  <article className="doctor-dashboard-queue-row" key={appointment._id}>
                    <div className="doctor-dashboard-queue-number">
                      <span>STT</span>
                      <strong>{formatQueueNumber(appointment.queueNumber) || '--'}</strong>
                    </div>
                    <div className="doctor-dashboard-queue-info">
                      <div>
                        <h3>{patientName(appointment)}</h3>
                        <span className={consultation.badgeClass}>{consultation.label}</span>
                      </div>
                      <p>{formatTimeSlot(appointment.timeSlot)}{reason ? ` · ${reason}` : ''}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="doctor-dashboard-panel doctor-dashboard-task-center" aria-labelledby="doctor-dashboard-task-title">
          <div className="doctor-dashboard-section-header">
            <div>
              <p className="doctor-dashboard-section-eyebrow">Cần chú ý</p>
              <h2 id="doctor-dashboard-task-title">Task Center</h2>
            </div>
          </div>

          {coreErrors.appointments && <SectionError message={coreErrors.appointments} onRetry={loadCoreData} />}

          {coreLoading && (
            <div className="doctor-dashboard-list-skeleton compact" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          )}

          {!coreLoading && !coreErrors.appointments && tasks.length === 0 && (
            <SectionEmpty>Không có việc cần xử lý ngay.</SectionEmpty>
          )}

          {!coreLoading && !coreErrors.appointments && tasks.length > 0 && (
            <div className="doctor-dashboard-task-list">
              {tasks.map((task) => (
                <Link className={`doctor-dashboard-task doctor-dashboard-task-${task.tone}`} key={task.key} to={task.to}>
                  <div>
                    <span>{task.label}</span>
                    <p>{task.description}</p>
                  </div>
                  <strong>{task.count}</strong>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="doctor-dashboard-secondary-grid">
        <section className="doctor-dashboard-panel doctor-dashboard-reviews" aria-labelledby="doctor-dashboard-reviews-title">
          <div className="doctor-dashboard-section-header">
            <div>
              <p className="doctor-dashboard-section-eyebrow">Phản hồi bệnh nhân</p>
              <h2 id="doctor-dashboard-reviews-title">Đánh giá gần đây</h2>
            </div>
            <Link to="/doctor/reviews">Xem tất cả đánh giá</Link>
          </div>

          {reviewsLoading && (
            <div className="doctor-dashboard-list-skeleton compact" aria-hidden="true">
              <span />
              <span />
            </div>
          )}

          {!reviewsLoading && reviewsError && (
            <SectionError message="Tạm thời chưa tải được đánh giá gần đây." onRetry={loadReviews} />
          )}

          {!reviewsLoading && !reviewsError && reviews.length === 0 && (
            <SectionEmpty>Chưa có đánh giá mới.</SectionEmpty>
          )}

          {!reviewsLoading && !reviewsError && reviews.length > 0 && (
            <div className="doctor-dashboard-review-list">
              {reviews.map((review) => (
                <article className="doctor-dashboard-review" key={review._id}>
                  <div>
                    <strong>{'★'.repeat(Number(review.rating || 0)) || 'Chưa chấm điểm'}</strong>
                    <span>{reviewPatientName(review)} · {formatDateTime(review.createdAt)}</span>
                  </div>
                  {review.comment && <p>{cleanDisplayText(review.comment)}</p>}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="doctor-dashboard-panel doctor-dashboard-quick-actions" aria-labelledby="doctor-dashboard-actions-title">
          <div className="doctor-dashboard-section-header">
            <div>
              <p className="doctor-dashboard-section-eyebrow">Truy cập nhanh</p>
              <h2 id="doctor-dashboard-actions-title">Thao tác thường dùng</h2>
            </div>
          </div>

          <div className="doctor-dashboard-action-grid">
            <Link to="/doctor/queue">
              <span aria-hidden="true">01</span>
              <strong>Hàng đợi hôm nay</strong>
              <small>Theo dõi bệnh nhân đang chờ và đang khám.</small>
            </Link>
            <Link to="/doctor/appointments">
              <span aria-hidden="true">02</span>
              <strong>Xử lý lịch hẹn</strong>
              <small>Xác nhận, hủy, đổi lịch và nhập hồ sơ.</small>
            </Link>
            <Link to="/doctor/schedules">
              <span aria-hidden="true">03</span>
              <strong>Lịch làm việc</strong>
              <small>Cập nhật lịch mặc định và ngoại lệ.</small>
            </Link>
            <Link to="/doctor/medical-records?followUpOnly=true">
              <span aria-hidden="true">04</span>
              <strong>Theo dõi tái khám</strong>
              <small>Xem các hồ sơ có kế hoạch tái khám.</small>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
