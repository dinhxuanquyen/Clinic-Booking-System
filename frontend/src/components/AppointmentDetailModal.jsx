import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { downloadPdf } from '../utils/downloadFile.js';
import { resolveMediaUrl } from '../utils/media.js';
import { cleanDisplayText } from '../utils/textEncoding.js';
import BaseModal from './BaseModal.jsx';

const STATUS_META = {
  pending: { label: 'Chờ xác nhận', tone: 'warning', step: 1 },
  confirmed: { label: 'Đã xác nhận', tone: 'success', step: 2 },
  in_progress: { label: 'Đang khám', tone: 'info', step: 3 },
  completed: { label: 'Hoàn thành', tone: 'primary', step: 4 },
  cancelled: { label: 'Đã hủy', tone: 'neutral', step: 1, terminal: true },
  cancel_requested: { label: 'Chờ duyệt hủy', tone: 'danger', step: 1 },
  reschedule_requested: { label: 'Chờ duyệt đổi lịch', tone: 'warning', step: 2 },
  reschedule_rejected: { label: 'Từ chối đổi lịch', tone: 'danger', step: 2 },
  no_show: { label: 'Không đến khám', tone: 'danger', step: 3, terminal: true }
};

const CONSULTATION_META = {
  waiting: { label: 'Chờ khám', tone: 'warning' },
  in_progress: { label: 'Đang khám', tone: 'info' },
  completed: { label: 'Đã hoàn thành khám', tone: 'success' },
  skipped: { label: 'Bỏ qua', tone: 'danger' }
};

const JOURNEY_STEPS = [
  { key: 'created', label: 'Đã gửi', description: 'Yêu cầu đặt lịch đã được ghi nhận.' },
  { key: 'confirmed', label: 'Xác nhận', description: 'Phòng khám xác nhận lịch khám.' },
  { key: 'exam', label: 'Khám', description: 'Bệnh nhân chờ khám hoặc đang khám.' },
  { key: 'done', label: 'Hoàn thành', description: 'Buổi khám đã kết thúc.' }
];

const PREPARATION_ITEMS = [
  'Đến trước giờ khám khoảng 15 phút để làm thủ tục.',
  'Mang giấy tờ tùy thân và thông tin đặt lịch.',
  'Mang BHYT nếu đã đăng ký sử dụng.',
  'Chuẩn bị hồ sơ cũ, đơn thuốc hoặc kết quả xét nghiệm liên quan nếu có.'
];

const SIMPLE_ADMIN_ACTIONS = {
  pending: [
    { label: 'Từ chối lịch', status: 'cancelled', className: 'btn-outline-danger', context: 'direct_cancel' },
    { label: 'Xác nhận lịch', status: 'confirmed', className: 'btn-primary' }
  ],
  confirmed: [
    { label: 'Hủy lịch', status: 'cancelled', className: 'btn-outline-danger', context: 'direct_cancel' }
  ]
};

const REQUEST_ADMIN_ACTIONS = {
  cancel_requested: [
    { label: 'Từ chối hủy', status: 'confirmed', className: 'btn-outline-warning', context: 'cancel_request' },
    { label: 'Xác nhận hủy', status: 'cancelled', className: 'btn-danger', context: 'cancel_request' }
  ],
  reschedule_requested: [
    { label: 'Từ chối đổi lịch', status: 'reschedule_rejected', className: 'btn-outline-warning', context: 'reschedule_request' },
    { label: 'Xác nhận đổi lịch', status: 'confirmed', className: 'btn-primary', context: 'reschedule_request' }
  ]
};

function text(value, fallback = 'Đang cập nhật') {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') {
    return cleanDisplayText(value.name || value.fullName || value.title || value.email || value.phone, fallback);
  }
  return cleanDisplayText(String(value), fallback);
}

function getEntity(value) {
  return value && typeof value === 'object' ? value : {};
}

function getEntityId(value) {
  return typeof value === 'object' ? value?._id : value;
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateVN(value) {
  const date = parseDate(value);
  if (!date) return text(value, 'Chưa cập nhật');
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

function formatDateTimeVN(value) {
  const date = parseDate(value);
  if (!date) return 'Chưa cập nhật';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatQueueNumber(queueNumber) {
  if (!queueNumber) return 'Chưa cấp số';
  return String(queueNumber).padStart(2, '0');
}

function getStatusMeta(status) {
  return STATUS_META[status] || { label: text(status, 'Không xác định'), tone: 'neutral', step: 1 };
}

function getConsultationMeta(status) {
  return CONSULTATION_META[status] || { label: text(status, 'Chưa cập nhật'), tone: 'neutral' };
}

function getAppointmentCode(appointment) {
  return appointment?.appointmentCode || appointment?.code || (appointment?._id ? `AP-${String(appointment._id).slice(-8).toUpperCase()}` : 'Chưa cấp mã');
}

function getAppointmentTypeLabel(appointment) {
  return appointment?.isFollowUp || appointment?.followUpRecordId ? 'Tái khám' : 'Khám lần đầu';
}

function getPatientValue(appointment, field) {
  return appointment?.patientInfo?.[field] || appointment?.patientId?.[field] || '';
}

function getBookingValue(appointment, field) {
  return appointment?.patientId?.[field] || '';
}

function getServicePackage(appointment) {
  const servicePackage = appointment?.servicePackageSnapshot || appointment?.servicePackageId;
  return servicePackage && typeof servicePackage === 'object' ? servicePackage : null;
}

function isFollowUpAppointment(appointment) {
  return Boolean(appointment?.isFollowUp || appointment?.followUpRecordId);
}

function getFollowUpRecord(appointment) {
  const record = appointment?.followUpRecordId;
  return record && typeof record === 'object' ? record : null;
}

function getOriginalAppointment(appointment) {
  const record = getFollowUpRecord(appointment);
  if (record?.appointmentId && typeof record.appointmentId === 'object') return record.appointmentId;
  if (appointment?.originalAppointmentId && typeof appointment.originalAppointmentId === 'object') return appointment.originalAppointmentId;
  return null;
}

function hasQueueInfo(appointment) {
  return Boolean(
    appointment?.queueNumber ||
    ['waiting', 'in_progress', 'completed', 'skipped'].includes(appointment?.consultationStatus)
  );
}

function hasCancelRequest(appointment) {
  return Boolean(
    appointment?.cancelRequest &&
    (appointment.cancelRequest.reason || appointment.cancelRequest.requestedAt || appointment.cancelRequest.adminNote)
  );
}

function hasRescheduleRequest(appointment) {
  return Boolean(
    appointment?.rescheduleRequest &&
    (
      appointment.rescheduleRequest.oldDate ||
      appointment.rescheduleRequest.oldTimeSlot ||
      appointment.rescheduleRequest.newDate ||
      appointment.rescheduleRequest.newTimeSlot ||
      appointment.rescheduleRequest.reason ||
      appointment.rescheduleRequest.adminNote ||
      appointment.rescheduleRequest.decision
    )
  );
}

function getCancelResponse(appointment) {
  if (!hasCancelRequest(appointment)) return null;
  const adminNote = appointment.cancelRequest?.adminNote?.trim();

  if (appointment.status === 'cancelled') {
    return {
      tone: 'success',
      title: 'Phòng khám đã xác nhận hủy lịch',
      message: adminNote || 'Yêu cầu hủy lịch đã được chấp thuận.'
    };
  }

  if (appointment.status === 'confirmed' && appointment.cancelRequest?.handledAt) {
    return {
      tone: 'danger',
      title: 'Yêu cầu hủy không được chấp thuận',
      message: adminNote || 'Lịch hẹn vẫn được giữ nguyên.'
    };
  }

  return null;
}

function getRescheduleDecisionLabel(decision) {
  if (decision === 'approved') return 'Đã chấp thuận';
  if (decision === 'rejected') return 'Đã từ chối';
  if (decision === 'cancelled_by_patient') return 'Đã hủy bởi bệnh nhân';
  return 'Đang chờ xử lý';
}

function getRescheduleResponse(appointment) {
  const request = appointment?.rescheduleRequest;
  if (!request) return null;
  const adminNote = request.adminNote?.trim();

  if (request.decision === 'approved') {
    return {
      tone: 'success',
      title: 'Phòng khám đã chấp thuận đổi lịch',
      message: adminNote || 'Lịch hẹn đã được cập nhật theo thời gian mới.'
    };
  }

  if (request.decision === 'rejected') {
    return {
      tone: 'danger',
      title: 'Yêu cầu đổi lịch không được chấp thuận',
      message: adminNote || 'Lịch khám ban đầu vẫn được giữ nguyên.'
    };
  }

  if (request.decision === 'cancelled_by_patient') {
    return {
      tone: 'neutral',
      title: 'Yêu cầu đổi lịch đã được hủy',
      message: adminNote || 'Lịch khám ban đầu vẫn được giữ nguyên.'
    };
  }

  return null;
}

function getConsultationNotice(status) {
  if (status === 'waiting') return 'Bạn đang trong hàng đợi khám. Vui lòng chú ý thông báo từ phòng khám.';
  if (status === 'in_progress') return 'Đã đến lượt khám của bạn. Vui lòng vào phòng khám.';
  if (status === 'completed') return 'Buổi khám đã hoàn thành.';
  if (status === 'skipped') return 'Lượt khám này đã được đánh dấu bỏ qua. Vui lòng liên hệ phòng khám nếu cần hỗ trợ.';
  return '';
}

function buildJourneyEvents(appointment, userRole) {
  const isAdmin = userRole === 'admin';
  const events = [
    {
      title: isAdmin ? 'Bệnh nhân tạo lịch khám' : 'Bạn đã đặt lịch khám',
      description: 'Lịch khám đã được ghi nhận trên hệ thống.',
      time: appointment.createdAt,
      tone: 'info'
    },
    {
      title: 'Phòng khám xác nhận lịch hẹn',
      description: 'Lịch khám đã được xác nhận.',
      time: appointment.confirmedAt,
      tone: 'success'
    }
  ];

  const cancelRequestedAt = appointment.cancelRequestedAt || appointment.cancelRequest?.requestedAt;
  if (cancelRequestedAt || appointment.status === 'cancel_requested') {
    events.push({
      title: 'Yêu cầu hủy lịch',
      description: appointment.status === 'cancel_requested' ? 'Yêu cầu đang chờ phòng khám xử lý.' : 'Yêu cầu hủy lịch đã được gửi.',
      time: cancelRequestedAt,
      tone: 'warning'
    });
  }

  if (appointment.status === 'cancelled') {
    events.push({
      title: 'Lịch hẹn đã hủy',
      description: 'Bệnh nhân không cần đến phòng khám theo lịch này.',
      time: appointment.cancelApprovedAt || appointment.cancelRequest?.handledAt || appointment.updatedAt,
      tone: 'danger'
    });
  }

  const rescheduleRequestedAt = appointment.rescheduleRequestedAt || appointment.rescheduleRequest?.requestedAt;
  if (rescheduleRequestedAt || appointment.status === 'reschedule_requested') {
    events.push({
      title: 'Yêu cầu đổi lịch',
      description: appointment.status === 'reschedule_requested' ? 'Yêu cầu đang chờ phòng khám xử lý.' : 'Yêu cầu đổi lịch đã được gửi.',
      time: rescheduleRequestedAt,
      tone: 'warning'
    });
  }

  const rescheduleDecision = appointment.rescheduleRequest?.decision;
  if (rescheduleDecision === 'approved' || rescheduleDecision === 'rejected' || rescheduleDecision === 'cancelled_by_patient') {
    events.push({
      title: getRescheduleDecisionLabel(rescheduleDecision),
      description: rescheduleDecision === 'approved' ? 'Thời gian khám mới đã được áp dụng.' : 'Lịch khám ban đầu vẫn được giữ nguyên.',
      time: appointment.rescheduleApprovedAt || appointment.rescheduleRequest?.handledAt,
      tone: rescheduleDecision === 'approved' ? 'success' : 'danger'
    });
  }

  if (appointment.status === 'in_progress' || appointment.consultationStatus === 'in_progress') {
    events.push({
      title: 'Đang khám',
      description: 'Buổi khám đang được thực hiện.',
      time: appointment.startConsultationAt,
      tone: 'info'
    });
  }

  if (appointment.status === 'completed' || appointment.consultationStatus === 'completed') {
    events.push({
      title: 'Hoàn thành khám',
      description: 'Buổi khám đã hoàn thành.',
      time: appointment.completedAt || appointment.finishConsultationAt || appointment.updatedAt,
      tone: 'success'
    });
  }

  if (appointment.status === 'no_show' || appointment.noShowAt) {
    events.push({
      title: 'Không đến khám',
      description: 'Lịch hẹn được ghi nhận là không đến khám.',
      time: appointment.noShowAt || appointment.updatedAt,
      tone: 'danger'
    });
  }

  return events.filter((event) => event.time || event.title);
}

function InfoItem({ label, value, strong = false }) {
  return (
    <div className="apd-info-item">
      <span>{label}</span>
      <strong className={strong ? 'is-strong' : ''}>{text(value)}</strong>
    </div>
  );
}

function Section({ title, eyebrow, children, className = '' }) {
  return (
    <section className={`apd-section ${className}`}>
      <div className="apd-section-heading">
        {eyebrow && <span>{eyebrow}</span>}
        <h3>{title}</h3>
      </div>
      {children}
    </section>
  );
}

function AppointmentProgress({ appointment }) {
  const statusMeta = getStatusMeta(appointment.status);
  const currentStep = statusMeta.step || 1;
  const isInterrupted = ['cancelled', 'cancel_requested', 'reschedule_requested', 'no_show'].includes(appointment.status);
  const terminalProgress = {
    cancelled: {
      title: 'Lịch hẹn đã hủy',
      message: 'Lịch này không còn hiệu lực. Nếu cần khám lại, vui lòng đặt một lịch mới.',
      tone: 'neutral'
    },
    no_show: {
      title: 'Không đến khám',
      message: 'Lịch được ghi nhận là không tham dự, quy trình khám không tiếp tục.',
      tone: 'danger'
    }
  }[appointment.status];

  if (terminalProgress) {
    return (
      <Section title="Hành trình lịch hẹn" eyebrow="Theo dõi lịch hẹn" className="apd-progress-section">
        <div className={`apd-terminal-progress ${terminalProgress.tone}`}>
          <span className={`apd-terminal-icon ${terminalProgress.tone}`} aria-hidden="true" />
          <div>
            <strong>{terminalProgress.title}</strong>
            <p>{terminalProgress.message}</p>
          </div>
        </div>
      </Section>
    );
  }

  return (
    <Section title="Hành trình lịch hẹn" eyebrow="Theo dõi lịch hẹn" className="apd-progress-section">
      <ol className={`apd-progress ${isInterrupted ? 'has-attention' : ''}`}>
        {JOURNEY_STEPS.map((step, index) => {
          const stepNumber = index + 1;
          const state = stepNumber < currentStep ? 'done' : stepNumber === currentStep ? 'current' : 'next';
          return (
            <li className={state} key={step.key}>
              <span className="apd-progress-marker">{stepNumber < currentStep ? '✓' : stepNumber}</span>
              <div>
                <strong>{step.label}</strong>
                <small>{step.description}</small>
              </div>
            </li>
          );
        })}
      </ol>
      {isInterrupted && (
        <div className={`apd-status-note ${statusMeta.tone}`}>
          <strong>{statusMeta.label}</strong>
          <span>Trạng thái đặc biệt, vui lòng theo dõi ghi chú xử lý bên dưới.</span>
        </div>
      )}
    </Section>
  );
}

function JourneyEvents({ appointment, userRole }) {
  const events = buildJourneyEvents(appointment, userRole);
  if (!events.length) return null;

  return (
    <Section title="Dòng thời gian xử lý" eyebrow="Tiến trình">
      <div className="apd-event-list">
        {events.map((event, index) => (
          <article className={`apd-event ${event.tone}`} key={`${event.title}-${index}`}>
            <span className="apd-event-dot" />
            <div>
              <strong>{event.title}</strong>
              <p>{event.description}</p>
              <time>{event.time ? formatDateTimeVN(event.time) : 'Đang chờ xử lý'}</time>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}

function getDoctorRatingMeta(doctor) {
  const count = Number(
    doctor.ratingCount ||
    doctor.reviewCount ||
    doctor.totalReviews ||
    doctor.reviewsCount ||
    0
  );
  const average = Number(
    doctor.ratingAverage ||
    doctor.averageRating ||
    doctor.avgRating ||
    doctor.rating ||
    0
  );

  if (!Number.isFinite(count) || !Number.isFinite(average) || count <= 0 || average <= 0) {
    return null;
  }

  return {
    average: Math.min(5, average).toFixed(average % 1 === 0 ? 0 : 1),
    count
  };
}

function DoctorBlock({ appointment }) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const doctor = getEntity(appointment.doctorId);
  const specialty = getEntity(appointment.specialtyId);
  const clinic = getEntity(appointment.clinicId);
  const ratingMeta = getDoctorRatingMeta(doctor);
  const avatar = doctor.avatar || doctor.image || doctor.photoUrl || doctor.photo || doctor.profileImage;
  const avatarUrl = useMemo(() => {
    if (!avatar || avatarFailed) return '';
    const normalizedAvatar = String(avatar).trim().startsWith('uploads/') ? `/${String(avatar).trim()}` : avatar;
    return resolveMediaUrl(normalizedAvatar, '');
  }, [avatar, avatarFailed]);
  const doctorName = text(doctor, 'Bác sĩ đang cập nhật');
  const doctorDegree = text(doctor.degree || doctor.title, 'Bác sĩ');
  const doctorSpecialty = text(specialty, 'Chuyên khoa đang cập nhật');
  const clinicName = text(clinic, 'Cơ sở đang cập nhật');
  const trustItems = [
    ratingMeta ? `★ ${ratingMeta.average}/5 · ${ratingMeta.count} đánh giá` : '',
    doctor.experienceYears ? `${text(doctor.experienceYears)} năm kinh nghiệm` : '',
    doctor.doctorCode || doctor.code ? `Mã bác sĩ: ${text(doctor.doctorCode || doctor.code)}` : '',
    doctor.licenseNumber ? `Chứng chỉ: ${text(doctor.licenseNumber)}` : ''
  ].filter(Boolean);
  const initials = doctorName
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatar]);

  return (
    <Section title="Bác sĩ phụ trách" eyebrow="Bác sĩ">
      <div className="apd-profile-block">
        {avatarUrl ? (
          <img
            alt={doctorName}
            className="apd-avatar"
            loading="lazy"
            src={avatarUrl}
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          <span className="apd-avatar fallback">{initials || 'BS'}</span>
        )}
        <div className="apd-doctor-content">
          <span className="apd-doctor-degree">{doctorDegree}</span>
          <strong>{doctorName}</strong>
          <p>{doctorSpecialty}</p>
          <small>{clinicName}</small>
          {trustItems.length > 0 && (
            <div className="apd-trust-list">
              {trustItems.map((item) => <span key={item}>{item}</span>)}
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

function ClinicBlock({ appointment }) {
  const clinic = getEntity(appointment.clinicId);

  return (
    <Section title="Cơ sở khám" eyebrow="Cơ sở">
      <div className="apd-clinic-block">
        <strong>{text(clinic, 'Cơ sở đang cập nhật')}</strong>
        <p>{text(clinic.address, 'Địa chỉ đang cập nhật')}</p>
        <div className="apd-inline-meta">
          {clinic.phone && <span>Điện thoại: {text(clinic.phone)}</span>}
          {clinic.email && <span>Thư điện tử: {text(clinic.email)}</span>}
        </div>
      </div>
    </Section>
  );
}

function PreparationGuidance({ appointment }) {
  const hasInsurance = Boolean(appointment?.insuranceSnapshot?.enabled && appointment?.insuranceSnapshot?.insuranceNumber);
  const items = hasInsurance ? PREPARATION_ITEMS : PREPARATION_ITEMS.filter((item) => !item.includes('BHYT'));

  return (
    <Section title="Chuẩn bị trước khi khám" eyebrow="Hướng dẫn">
      <ul className="apd-guidance-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </Section>
  );
}

function ServiceBlock({ appointment }) {
  const servicePackage = getServicePackage(appointment);
  const targets = Array.isArray(servicePackage?.targetPatients) ? servicePackage.targetPatients.filter(Boolean).slice(0, 4) : [];
  const includes = Array.isArray(servicePackage?.includes) ? servicePackage.includes.filter(Boolean).slice(0, 5) : [];

  return (
    <Section title="Dịch vụ khám" eyebrow="Dịch vụ">
      <div className="apd-service-block">
        <div>
          <strong>{servicePackage ? text(servicePackage.name, 'Gói khám') : 'Để bác sĩ tư vấn'}</strong>
          <p>
            {servicePackage
              ? text(servicePackage.description, 'Dịch vụ khám được chọn khi đặt lịch.')
              : 'Bác sĩ sẽ đánh giá tình trạng và tư vấn dịch vụ phù hợp khi thăm khám.'}
          </p>
        </div>
        <dl>
          {servicePackage?.code && <div><dt>Mã gói</dt><dd>{text(servicePackage.code)}</dd></div>}
          <div><dt>Chi phí</dt><dd>{servicePackage ? formatCurrency(servicePackage.price) : 'Tại phòng khám'}</dd></div>
          <div><dt>Thời lượng</dt><dd>{servicePackage?.durationMinutes || 30} phút</dd></div>
          <div><dt>Thanh toán</dt><dd>Tại phòng khám</dd></div>
        </dl>
        {(targets.length > 0 || includes.length > 0) && (
          <div className="apd-service-tags">
            {[...targets, ...includes].map((item) => (
              <span key={item}>✓ {text(item)}</span>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}

function InsuranceSnapshot({ appointment }) {
  const insurance = appointment?.insuranceSnapshot;
  const hasInsurance = Boolean(insurance?.enabled && insurance?.insuranceNumber);

  return (
    <Section title="Bảo hiểm y tế" eyebrow="Bảo hiểm" className={!hasInsurance ? 'is-muted' : ''}>
      <div className="apd-insurance-row">
        <span className={`apd-pill ${hasInsurance ? 'success' : 'neutral'}`}>
          {hasInsurance ? 'Có sử dụng BHYT' : 'Không sử dụng BHYT'}
        </span>
        {hasInsurance && (
          <div className="apd-mini-grid">
            <InfoItem label="Mã BHYT" value={insurance.insuranceNumber} />
            <InfoItem label="Ngày hết hạn" value={formatDateVN(insurance.insuranceExpiryDate)} />
            <InfoItem label="Nơi đăng ký KCB" value={insurance.insuranceRegisteredHospital} />
          </div>
        )}
      </div>
    </Section>
  );
}

function QueueBlock({ appointment, userRole }) {
  if (userRole !== 'patient' || !hasQueueInfo(appointment)) return null;
  const consultationStatus = appointment.consultationStatus || 'waiting';
  const consultationMeta = getConsultationMeta(consultationStatus);
  const notice = getConsultationNotice(consultationStatus);

  return (
    <Section title="Thông tin hàng đợi" eyebrow="Hàng đợi">
      <div className="apd-queue-block">
        <div className="apd-queue-number">
          <span>Số thứ tự</span>
          <strong>{formatQueueNumber(appointment.queueNumber)}</strong>
        </div>
        <div className="apd-queue-content">
          <span className={`apd-pill ${consultationMeta.tone}`}>{consultationMeta.label}</span>
          {notice && <p>{notice}</p>}
          <div className="apd-inline-meta">
            {appointment.startConsultationAt && <span>Gọi vào khám: {formatDateTimeVN(appointment.startConsultationAt)}</span>}
            {appointment.finishConsultationAt && <span>Hoàn thành: {formatDateTimeVN(appointment.finishConsultationAt)}</span>}
          </div>
        </div>
      </div>
    </Section>
  );
}

function FollowUpContext({ appointment, userRole }) {
  if (!isFollowUpAppointment(appointment)) return null;
  const followUpRecord = getFollowUpRecord(appointment);
  const originalAppointment = getOriginalAppointment(appointment);
  const followUpRecordId = getEntityId(appointment.followUpRecordId);
  const recordUrl = userRole === 'doctor'
    ? `/doctor/medical-records?recordId=${followUpRecordId}`
    : `/medical-records?recordId=${followUpRecordId}`;

  return (
    <Section title="Nguồn hồ sơ tái khám" eyebrow="Tái khám">
      <div className="apd-followup-card">
        <div>
          <span className="apd-pill primary">Tái khám</span>
          <p>
            Lịch này được tạo để theo dõi sau buổi khám trước.
            {followUpRecord?.followUpDate ? ` Ngày tái khám đề xuất: ${formatDateVN(followUpRecord.followUpDate)}.` : ''}
          </p>
        </div>
        <div className="apd-mini-grid">
          <InfoItem
            label="Ngày khám gốc"
            value={originalAppointment ? `${formatDateVN(originalAppointment.date)} · ${text(originalAppointment.timeSlot, '')}` : 'Đã liên kết hồ sơ khám bệnh'}
          />
          {followUpRecord?.diagnosis && <InfoItem label="Chẩn đoán trước đó" value={followUpRecord.diagnosis} />}
        </div>
        {followUpRecordId && (
          <Link className="btn btn-sm btn-outline-primary" to={recordUrl}>
            Xem hồ sơ gốc
          </Link>
        )}
      </div>
    </Section>
  );
}

function RequestContext({ appointment }) {
  const cancelResponse = getCancelResponse(appointment);
  const rescheduleResponse = getRescheduleResponse(appointment);

  if (!hasCancelRequest(appointment) && !hasRescheduleRequest(appointment)) return null;

  return (
    <Section title="Yêu cầu xử lý" eyebrow="Yêu cầu">
      <div className="apd-request-stack">
        {hasRescheduleRequest(appointment) && (
          <article className="apd-request-card">
            <div className="apd-request-header">
              <strong>Yêu cầu đổi lịch</strong>
              <span className="apd-pill warning">{getRescheduleDecisionLabel(appointment.rescheduleRequest?.decision)}</span>
            </div>
            {appointment.status === 'reschedule_requested' && (
              <p className="apd-request-note">
                Lịch cũ vẫn được giữ cho đến khi yêu cầu đổi lịch được phòng khám xác nhận.
              </p>
            )}
            <div className="apd-mini-grid">
              <InfoItem label="Thời gian cũ" value={`${text(appointment.rescheduleRequest?.oldDate || appointment.date)} · ${text(appointment.rescheduleRequest?.oldTimeSlot || appointment.timeSlot)}`} />
              <InfoItem label="Thời gian mới" value={`${text(appointment.rescheduleRequest?.newDate)} · ${text(appointment.rescheduleRequest?.newTimeSlot)}`} />
              <InfoItem label="Lý do" value={appointment.rescheduleRequest?.reason || 'Không có lý do'} />
              {appointment.rescheduleRequest?.handledAt && <InfoItem label="Thời gian xử lý" value={formatDateTimeVN(appointment.rescheduleRequest.handledAt)} />}
            </div>
            {rescheduleResponse && (
              <div className={`apd-response ${rescheduleResponse.tone}`}>
                <strong>{rescheduleResponse.title}</strong>
                <p>{rescheduleResponse.message}</p>
              </div>
            )}
          </article>
        )}

        {hasCancelRequest(appointment) && (
          <article className="apd-request-card">
            <div className="apd-request-header">
              <strong>Yêu cầu hủy lịch</strong>
              <span className="apd-pill danger">{appointment.status === 'cancelled' ? 'Đã xử lý' : 'Đang theo dõi'}</span>
            </div>
            {appointment.status === 'cancel_requested' && (
              <p className="apd-request-note">
                Lịch chưa bị hủy cho đến khi phòng khám xác nhận yêu cầu.
              </p>
            )}
            <div className="apd-mini-grid">
              <InfoItem label="Lý do" value={appointment.cancelRequest?.reason || 'Không có lý do'} />
              {appointment.cancelRequest?.requestedAt && <InfoItem label="Thời gian yêu cầu" value={formatDateTimeVN(appointment.cancelRequest.requestedAt)} />}
              {appointment.cancelRequest?.handledAt && <InfoItem label="Thời gian xử lý" value={formatDateTimeVN(appointment.cancelRequest.handledAt)} />}
            </div>
            {cancelResponse && (
              <div className={`apd-response ${cancelResponse.tone}`}>
                <strong>{cancelResponse.title}</strong>
                <p>{cancelResponse.message}</p>
              </div>
            )}
          </article>
        )}
      </div>
    </Section>
  );
}

function getCurrentStatusPresentation(appointment, statusMeta) {
  const presentations = {
    pending: {
      icon: '!',
      title: 'Chờ phòng khám xác nhận',
      description: 'Lịch đã được gửi và đang chờ phòng khám phản hồi.'
    },
    confirmed: {
      icon: '✓',
      title: 'Lịch đã được xác nhận',
      description: 'Vui lòng đến trước giờ khám khoảng 15 phút để làm thủ tục.'
    },
    in_progress: {
      icon: '•',
      title: 'Đang trong quy trình khám',
      description: 'Vui lòng theo dõi hàng đợi và hướng dẫn từ phòng khám.'
    },
    completed: {
      icon: '✓',
      title: 'Buổi khám đã hoàn tất',
      description: 'Bạn có thể xem hồ sơ hoặc tải kết quả khám nếu phòng khám đã cập nhật.'
    },
    cancelled: {
      icon: '×',
      title: 'Lịch hẹn đã hủy',
      description: 'Lịch này không còn hiệu lực. Bạn có thể đặt lịch mới khi cần.'
    },
    no_show: {
      icon: '!',
      title: 'Không đến khám',
      description: 'Lịch được ghi nhận là không tham dự, quy trình khám không tiếp tục.'
    },
    cancel_requested: {
      icon: '!',
      title: 'Đang chờ duyệt hủy',
      description: 'Lịch chưa bị hủy cho đến khi phòng khám xác nhận yêu cầu.'
    },
    reschedule_requested: {
      icon: '!',
      title: 'Đang chờ duyệt đổi lịch',
      description: 'Lịch cũ vẫn được giữ cho đến khi yêu cầu đổi lịch được duyệt.'
    },
    reschedule_rejected: {
      icon: '!',
      title: 'Yêu cầu đổi lịch bị từ chối',
      description: 'Lịch khám ban đầu vẫn được giữ nguyên theo phản hồi của phòng khám.'
    }
  };

  return presentations[appointment.status] || {
    icon: '•',
    title: statusMeta.label,
    description: 'Thông tin sẽ tự cập nhật khi phòng khám thay đổi trạng thái.'
  };
}

function CurrentStatusCard({ appointment }) {
  const statusMeta = getStatusMeta(appointment.status);
  const presentation = getCurrentStatusPresentation(appointment, statusMeta);
  const terminalConsultationMeta = {
    cancelled: { label: 'Không thực hiện khám', tone: 'neutral' },
    no_show: { label: 'Không đến khám', tone: 'danger' },
    completed: { label: 'Đã hoàn thành khám', tone: 'success' }
  };
  const consultationMeta = terminalConsultationMeta[appointment.status] ||
    (appointment.consultationStatus ? getConsultationMeta(appointment.consultationStatus) : null);

  return (
    <section className={`apd-live-status-card ${statusMeta.tone}`} aria-live="polite">
      <div className="apd-live-status-heading">
        <span className={`apd-live-dot ${statusMeta.tone}`} aria-hidden="true">{presentation.icon}</span>
        <div>
          <span>Trạng thái hiện tại</span>
          <strong>{presentation.title}</strong>
          <p>{presentation.description}</p>
        </div>
      </div>
      <dl className="apd-live-status-grid">
        <div>
          <dt>Lịch hẹn</dt>
          <dd>{statusMeta.label}</dd>
        </div>
        {consultationMeta && (
          <div>
            <dt>Khám bệnh</dt>
            <dd>{consultationMeta.label}</dd>
          </div>
        )}
        <div>
          <dt>Cập nhật gần nhất</dt>
          <dd>{formatDateTimeVN(appointment.updatedAt || appointment.createdAt)}</dd>
        </div>
      </dl>
    </section>
  );
}

function DocumentCenter({
  appointment,
  canDownloadMedicalRecord,
  canDownloadQueueTicket,
  onDownload,
  pdfLoadingType
}) {
  const priorityKey = appointment.status === 'completed'
    ? 'record'
    : canDownloadQueueTicket
      ? 'queue'
      : 'appointment';
  const documents = [
    {
      key: 'appointment',
      title: 'Phiếu đặt lịch',
      description: 'Thông tin lịch hẹn, bác sĩ, cơ sở khám và thời gian khám.',
      available: true,
      status: 'Sẵn sàng',
      icon: 'PDF',
      priorityLabel: priorityKey === 'appointment' ? 'Tài liệu chính' : ''
    },
    {
      key: 'queue',
      title: 'Phiếu khám / số thứ tự',
      description: 'Dùng khi lịch đã được xác nhận và có thể vào quy trình khám.',
      available: canDownloadQueueTicket,
      status: canDownloadQueueTicket ? 'Sẵn sàng' : 'Có sau khi xác nhận',
      icon: 'STT',
      priorityLabel: priorityKey === 'queue' ? 'Quan trọng khi đi khám' : ''
    },
    {
      key: 'record',
      title: 'Kết quả khám',
      description: 'Phiếu kết quả khám bệnh sau khi buổi khám hoàn thành.',
      available: canDownloadMedicalRecord,
      status: canDownloadMedicalRecord ? 'Sẵn sàng' : 'Có sau khi hoàn thành khám',
      icon: 'KQ',
      priorityLabel: priorityKey === 'record' ? 'Kết quả chính' : ''
    }
  ].sort((a, b) => Number(b.key === priorityKey) - Number(a.key === priorityKey));

  return (
    <section className="apd-document-center">
      <div>
        <span>Tài liệu</span>
        <strong>Trung tâm tài liệu</strong>
      </div>
      <div className="apd-document-list">
        {documents.map((document) => {
          const isLoading = pdfLoadingType === document.key;
          return (
            <article className={`apd-document-item ${document.available ? 'is-available' : 'is-disabled'} ${document.key === priorityKey ? 'is-priority' : ''}`} key={document.key}>
              <span className="apd-document-icon">{document.icon}</span>
              <div className="apd-document-main">
                <div className="apd-document-title-row">
                  <strong>{document.title}</strong>
                  {document.priorityLabel && <em>{document.priorityLabel}</em>}
                </div>
                <p>{document.description}</p>
                <span className={document.available ? 'apd-document-status ready' : 'apd-document-status muted'}>
                  {document.status}
                </span>
              </div>
              <button
                className="btn btn-outline-primary apd-document-action"
                disabled={!document.available || Boolean(pdfLoadingType)}
                type="button"
                aria-label={`${document.available ? 'Tải' : 'Chưa thể tải'} ${document.title}`}
                onClick={() => onDownload(document.key)}
              >
                {isLoading ? 'Đang tải...' : 'Tải PDF'}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PatientActionPanel({ appointment, canCancel, onCancel }) {
  if (!onCancel || !canCancel) return null;
  const isRequest = appointment.status === 'confirmed';

  return (
    <section className="apd-patient-action-card">
      <div>
        <span>Yêu cầu</span>
        <strong>{isRequest ? 'Yêu cầu hủy lịch' : 'Hủy lịch hẹn'}</strong>
      </div>
      <p>
        {isRequest
          ? 'Lịch đã xác nhận nên yêu cầu hủy cần được phòng khám xử lý trước khi lịch chính thức bị hủy.'
          : 'Lịch đang chờ xác nhận, bạn có thể hủy lịch hẹn này nếu không còn nhu cầu khám.'}
      </p>
      <button className="btn btn-outline-danger" type="button" onClick={() => onCancel(appointment)}>
        {isRequest ? 'Gửi yêu cầu hủy' : 'Hủy lịch'}
      </button>
    </section>
  );
}

export default function AppointmentDetailModal({
  appointment,
  currentUser,
  role,
  onCancel,
  onClose,
  onUpdateStatus,
  onAfterAction
}) {
  const { user: authUser } = useAuth();
  const toast = useToast();
  const [adminAction, setAdminAction] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pdfLoadingType, setPdfLoadingType] = useState('');

  if (!appointment) return null;

  const userRole = (role || currentUser?.role || authUser?.role || 'patient').toLowerCase();
  const canManageAppointment = ['admin', 'doctor'].includes(userRole);
  const statusMeta = getStatusMeta(appointment.status);
  const doctor = getEntity(appointment.doctorId);
  const clinic = getEntity(appointment.clinicId);
  const specialty = getEntity(appointment.specialtyId);
  const appointmentCode = getAppointmentCode(appointment);
  const canCancel = ['pending', 'confirmed'].includes(appointment.status);
  const canDownloadQueueTicket = ['confirmed', 'in_progress', 'completed'].includes(appointment.status);
  const canDownloadMedicalRecord = appointment.status === 'completed';
  const showAdminActions = canManageAppointment && Boolean(onUpdateStatus);

  const hasAdminActions = showAdminActions && Boolean(SIMPLE_ADMIN_ACTIONS[appointment.status] || REQUEST_ADMIN_ACTIONS[appointment.status]);

  async function submitAdminStatus(status, note = '', context = '') {
    if (!onUpdateStatus) return;
    setIsSubmitting(true);
    try {
      const success = await onUpdateStatus(appointment, status, note, context);
      if (!success) return;
      setAdminAction(null);
      setAdminNote('');
      onAfterAction?.();
    } finally {
      setIsSubmitting(false);
    }
  }

  function openAdminNoteAction(action) {
    setAdminAction(action);
    setAdminNote('');
  }

  async function downloadAppointmentDocument(type) {
    if (!appointment?._id || pdfLoadingType) return;

    setPdfLoadingType(type);
    try {
      if (type === 'appointment') {
        await downloadPdf(`/appointments/${appointment._id}/pdf`);
      } else if (type === 'queue') {
        await downloadPdf(`/appointments/${appointment._id}/queue-ticket/pdf`);
      } else if (type === 'record') {
        const payload = await api(`/appointments/${appointment._id}/medical-record`);
        await downloadPdf(`/medical-records/${payload.data._id}/pdf`);
      }
    } catch (error) {
      toast.error(error.message || 'Không tải được PDF');
    } finally {
      setPdfLoadingType('');
    }
  }

  function renderAdminActions() {
    if (!showAdminActions) return null;

    const simpleActions = SIMPLE_ADMIN_ACTIONS[appointment.status];
    const requestActions = REQUEST_ADMIN_ACTIONS[appointment.status];
    if (!simpleActions && !requestActions) return null;

    return (
      <section className="apd-action-panel">
        <div>
          <span>Quản lý lịch hẹn</span>
          <strong>{requestActions ? 'Yêu cầu cần xử lý' : 'Hành động quản trị'}</strong>
        </div>

        {adminAction && (
          <label className="apd-admin-note">
            <span>Ghi chú phản hồi phòng khám</span>
            <textarea
              disabled={isSubmitting}
              rows="3"
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value)}
              placeholder="Nhập ghi chú nếu cần"
            />
          </label>
        )}

        <div className="apd-action-buttons">
          {!adminAction && simpleActions?.map((action) => (
            <button
              className={`btn ${action.className}`}
              disabled={isSubmitting}
              key={`${action.status}-${action.label}`}
              type="button"
              onClick={() => (action.status === 'cancelled' ? openAdminNoteAction(action) : submitAdminStatus(action.status))}
            >
              {action.label}
            </button>
          ))}

          {!adminAction && requestActions?.map((action) => (
            <button
              className={`btn ${action.className}`}
              disabled={isSubmitting}
              key={`${action.status}-${action.label}`}
              type="button"
              onClick={() => openAdminNoteAction(action)}
            >
              {action.label}
            </button>
          ))}

          {adminAction && (
            <>
              <button className="btn btn-outline-secondary" disabled={isSubmitting} type="button" onClick={() => setAdminAction(null)}>
                Hủy
              </button>
              <button
                className={`btn ${adminAction.className}`}
                disabled={isSubmitting}
                type="button"
                onClick={() => submitAdminStatus(adminAction.status, adminNote.trim(), adminAction.context)}
              >
                {isSubmitting ? 'Đang xử lý...' : adminAction.label}
              </button>
            </>
          )}
        </div>
      </section>
    );
  }

  return (
    <BaseModal
      ariaLabel="Chi tiết lịch hẹn"
      backdropClassName="admin-modal-backdrop apd-backdrop"
      className="appointment-detail-modal apd-modal"
      disableClose={isSubmitting}
      onClose={onClose}
      size="lg"
    >
      <header className="apd-header">
        <div className="apd-header-main">
          <span className="apd-eyebrow">Theo dõi hành trình lịch hẹn</span>
          <h2>{formatDateVN(appointment.date)} · {text(appointment.timeSlot, 'Chưa chọn giờ')}</h2>
          <div className="apd-header-meta">
            <span>{appointmentCode}</span>
            <span>{getAppointmentTypeLabel(appointment)}</span>
            <span className={`apd-pill ${statusMeta.tone}`}>{statusMeta.label}</span>
          </div>
        </div>
        <button className="apd-close" disabled={isSubmitting} type="button" onClick={onClose}>
          Đóng
        </button>
      </header>

      <div className="apd-body">
        <main className="apd-main">
          <AppointmentProgress appointment={appointment} />

          <Section title="Tổng quan lịch khám" eyebrow="Tổng quan">
            <div className="apd-overview-grid">
              <InfoItem label="Bệnh nhân" value={getPatientValue(appointment, 'name')} strong />
              <InfoItem label="Người đặt" value={getBookingValue(appointment, 'name')} />
              <InfoItem label="Số thứ tự khám" value={formatQueueNumber(appointment.queueNumber)} />
              <InfoItem label="Dịch vụ" value={getServicePackage(appointment)?.name || 'Để bác sĩ tư vấn'} />
              <InfoItem label="Chuyên khoa" value={specialty} />
              <InfoItem label="Ngày đặt lịch" value={formatDateTimeVN(appointment.createdAt)} />
            </div>
          </Section>

          <div className="apd-two-column">
            <DoctorBlock appointment={appointment} />
            <ClinicBlock appointment={appointment} />
          </div>

          <Section title="Thông tin bệnh nhân" eyebrow="Bệnh nhân">
            <div className="apd-overview-grid compact">
              <InfoItem label="Họ tên" value={getPatientValue(appointment, 'name')} />
              <InfoItem label="Thư điện tử" value={getPatientValue(appointment, 'email')} />
              <InfoItem label="Số điện thoại" value={getPatientValue(appointment, 'phone')} />
              <InfoItem label="Giới tính" value={getPatientValue(appointment, 'gender')} />
              <InfoItem label="Ngày sinh" value={formatDateVN(getPatientValue(appointment, 'dateOfBirth'))} />
              <InfoItem label="Lý do khám" value={appointment.reason || 'Chưa cập nhật'} />
            </div>
          </Section>

          <QueueBlock appointment={appointment} userRole={userRole} />
          <FollowUpContext appointment={appointment} userRole={userRole} />
          <RequestContext appointment={appointment} />
          <InsuranceSnapshot appointment={appointment} />
          <ServiceBlock appointment={appointment} />
          <PreparationGuidance appointment={appointment} />
          <JourneyEvents appointment={appointment} userRole={userRole} />

          {userRole === 'patient' && appointment.status === 'completed' && (
            <Section title="Hồ sơ khám bệnh" eyebrow="Hồ sơ khám">
              <div className="apd-record-callout">
                <div>
                  <strong>Kết quả khám của bạn</strong>
                  <p>Nếu hồ sơ chưa hiển thị, phòng khám có thể đang cập nhật kết quả khám.</p>
                </div>
                <Link className="btn btn-sm btn-outline-primary" to={`/medical-records?appointmentId=${appointment._id}`}>
                  Xem hồ sơ khám bệnh
                </Link>
              </div>
            </Section>
          )}
        </main>

        <aside className="apd-aside">
          <CurrentStatusCard appointment={appointment} />

          <DocumentCenter
            appointment={appointment}
            canDownloadMedicalRecord={canDownloadMedicalRecord}
            canDownloadQueueTicket={canDownloadQueueTicket}
            pdfLoadingType={pdfLoadingType}
            onDownload={downloadAppointmentDocument}
          />

          <PatientActionPanel appointment={appointment} canCancel={canCancel} onCancel={onCancel} />

          <section className="apd-summary-card">
            <span>Thông tin nhanh</span>
            <dl>
              <div><dt>Mã lịch</dt><dd>{appointmentCode}</dd></div>
              <div><dt>Loại lịch</dt><dd>{getAppointmentTypeLabel(appointment)}</dd></div>
              <div><dt>Ngày đặt lịch</dt><dd>{formatDateTimeVN(appointment.createdAt)}</dd></div>
            </dl>
          </section>

          {renderAdminActions()}
        </aside>
      </div>
    </BaseModal>
  );
}
