import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { downloadPdf } from '../utils/downloadFile.js';
import { getConsultationStatusBadge, getStatusBadge } from '../utils/status.js';
import { cleanDisplayText } from '../utils/textEncoding.js';
import BaseModal from './BaseModal.jsx';

function valueName(value) {
  if (!value) return 'Đang cập nhật';
  return typeof value === 'object' ? value.name : value;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function getServicePackage(appointment) {
  const servicePackage = appointment?.servicePackageSnapshot || appointment?.servicePackageId;
  return servicePackage && typeof servicePackage === 'object' ? servicePackage : null;
}

function entityId(value) {
  return typeof value === 'object' ? value?._id : value;
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

function formatSimpleDate(value) {
  if (!value) return 'Chưa cập nhật';
  return String(value).slice(0, 10);
}

function followUpStatusText(status) {
  if (status === 'scheduled') return 'Đã đặt lịch tái khám';
  if (status === 'completed') return 'Đã hoàn thành tái khám';
  if (status === 'overdue') return 'Quá hạn tái khám';
  return 'Lịch tái khám';
}

function formatInsuranceDate(value) {
  if (!value) return 'Chưa cập nhật';
  return String(value).slice(0, 10);
}

function InsuranceSnapshotCard({ appointment }) {
  const insurance = appointment?.insuranceSnapshot;
  const hasInsurance = Boolean(insurance?.enabled && insurance?.insuranceNumber);

  return (
    <div className={`appointment-detail-full insurance-snapshot-card ${hasInsurance ? 'active' : 'inactive'}`}>
      <div className="insurance-snapshot-heading">
        <div>
          <strong>Thông tin BHYT</strong>
          <span>Dữ liệu được ghi nhận tại thời điểm đặt lịch.</span>
        </div>
        <em>{hasInsurance ? 'Có BHYT' : 'Không sử dụng BHYT'}</em>
      </div>
      {hasInsurance && (
        <div className="insurance-snapshot-grid">
          <div>
            <span>Mã BHYT</span>
            <strong>{insurance.insuranceNumber}</strong>
          </div>
          <div>
            <span>Ngày hết hạn</span>
            <strong>{formatInsuranceDate(insurance.insuranceExpiryDate)}</strong>
          </div>
          <div>
            <span>Nơi đăng ký KCB ban đầu</span>
            <strong>{insurance.insuranceRegisteredHospital || 'Chưa cập nhật'}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

function patientValue(appointment, field) {
  return appointment?.patientInfo?.[field] || appointment?.patientId?.[field] || 'Đang cập nhật';
}

function bookingUserValue(appointment, field) {
  return appointment?.patientId?.[field] || 'Đang cập nhật';
}

function hasQueueInfo(appointment) {
  return Boolean(
    appointment?.queueNumber ||
    ['in_progress', 'completed', 'skipped'].includes(appointment?.consultationStatus)
  );
}

function formatQueueNumber(queueNumber) {
  if (!queueNumber) return 'Đang cập nhật';
  return String(queueNumber).padStart(2, '0');
}

function getConsultationNotice(status) {
  if (status === 'waiting') {
    return {
      tone: 'waiting',
      message: 'Bạn đang trong hàng đợi khám. Vui lòng chú ý thông báo từ phòng khám.'
    };
  }

  if (status === 'in_progress') {
    return {
      tone: 'in-progress',
      message: 'Đã đến lượt khám của bạn. Vui lòng vào phòng khám.'
    };
  }

  if (status === 'completed') {
    return {
      tone: 'completed',
      message: 'Buổi khám đã hoàn thành.'
    };
  }

  if (status === 'skipped') {
    return {
      tone: 'skipped',
      message: 'Lượt khám này đã được đánh dấu bỏ qua. Vui lòng liên hệ phòng khám nếu cần hỗ trợ.'
    };
  }

  return null;
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value) {
  const date = toDate(value);
  if (!date) return 'Đang cập nhật';
  const pad = (number) => String(number).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatDateTimeShort(value) {
  const date = toDate(value);
  if (!date) return 'Đang cập nhật';
  const pad = (number) => String(number).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDuration(previousValue, currentValue) {
  const previous = toDate(previousValue);
  const current = toDate(currentValue);
  if (!previous || !current) return '';

  const diffMs = current.getTime() - previous.getTime();
  if (diffMs <= 0) return '';

  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'Sau vài giây';
  if (minutes < 60) return `Sau ${minutes} phút`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Sau ${hours} giờ`;

  const days = Math.round(hours / 24);
  return `Sau ${days} ngày`;
}

function hasCancelRequest(appointment) {
  return Boolean(
    appointment?.cancelRequest &&
    (appointment.cancelRequest.reason || appointment.cancelRequest.requestedAt || appointment.cancelRequest.adminNote)
  );
}

function getCancelResponseTitle(appointment) {
  if (!hasCancelRequest(appointment)) return '';
  if (appointment.status === 'cancelled') return 'Phản hồi từ phòng khám';
  if (appointment.status === 'confirmed' && appointment.cancelRequest?.handledAt) return 'Lý do từ chối yêu cầu hủy';
  return '';
}

function getCancelResponseMessage(appointment) {
  const adminNote = appointment?.cancelRequest?.adminNote?.trim();
  if (adminNote) return adminNote;
  if (appointment?.status === 'cancelled') return 'Phòng khám đã xác nhận hủy lịch hẹn.';
  if (appointment?.status === 'confirmed' && appointment.cancelRequest?.handledAt) return 'Yêu cầu hủy lịch không được chấp thuận.';
  return '';
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

function getRescheduleDecisionLabel(decision) {
  if (decision === 'approved') return 'Đã chấp thuận';
  if (decision === 'rejected') return 'Đã từ chối';
  if (decision === 'cancelled_by_patient') return 'Đã hủy bởi bệnh nhân';
  return 'Đang chờ xử lý';
}

function getRescheduleResponseTitle(appointment) {
  const decision = appointment?.rescheduleRequest?.decision;
  if (decision === 'cancelled_by_patient') return 'Yêu cầu đổi lịch đã được hủy';
  if (decision === 'approved' || decision === 'rejected') return 'Phản hồi phòng khám';
  return '';
}

function getRescheduleResponseMessage(appointment) {
  const request = appointment?.rescheduleRequest;
  if (!request) return '';
  if (request.adminNote?.trim()) return request.adminNote.trim();
  if (request.decision === 'approved') return 'Phòng khám đã xác nhận đổi lịch hẹn.';
  if (request.decision === 'rejected') return 'Yêu cầu đổi lịch không được chấp thuận.';
  if (request.decision === 'cancelled_by_patient') return 'Bạn đã hủy yêu cầu đổi lịch và giữ nguyên lịch khám ban đầu.';
  return '';
}

function getRescheduleResponseType(decision) {
  if (decision === 'rejected') return 'rejected';
  if (decision === 'cancelled_by_patient') return 'secondary';
  return 'approved';
}

function addTimelineItem(items, item) {
  if (!item.time && item.tone !== 'pending') return;
  items.push(item);
}

function buildAdminTimeline(appointment) {
  const items = [];
  const cancelRequestedAt = appointment.cancelRequestedAt || appointment.cancelRequest?.requestedAt;
  const cancelHandledAt = appointment.cancelApprovedAt || appointment.cancelRequest?.handledAt;
  const rescheduleRequestedAt = appointment.rescheduleRequestedAt || appointment.rescheduleRequest?.requestedAt;
  const rescheduleHandledAt = appointment.rescheduleApprovedAt || appointment.rescheduleRequest?.handledAt;

  addTimelineItem(items, {
    title: 'Đặt lịch',
    description: 'Bệnh nhân đã tạo lịch khám.',
    time: appointment.createdAt,
    tone: 'success'
  });

  addTimelineItem(items, {
    title: 'Gửi email xác nhận',
    description: 'Hệ thống đã gửi email xác nhận lịch hẹn cho bệnh nhân.',
    time: appointment.emailConfirmationSentAt,
    tone: 'success'
  });

  addTimelineItem(items, {
    title: 'Xác nhận lịch',
    description: 'Phòng khám đã xác nhận lịch hẹn.',
    time: appointment.confirmedAt,
    tone: 'success'
  });

  addTimelineItem(items, {
    title: 'Gửi thông báo xác nhận',
    description: 'Hệ thống đã gửi thông báo cập nhật trạng thái lịch hẹn.',
    time: appointment.notificationSentAt,
    tone: 'success'
  });

  addTimelineItem(items, {
    title: 'Yêu cầu hủy lịch',
    description: 'Bệnh nhân đã gửi yêu cầu hủy lịch hẹn.',
    time: cancelRequestedAt,
    tone: 'warning'
  });

  if (appointment.cancelRequest?.handledAt && appointment.status === 'confirmed') {
    addTimelineItem(items, {
      title: 'Admin từ chối hủy',
      description: 'Phòng khám không chấp thuận yêu cầu hủy lịch.',
      time: appointment.cancelRequest.handledAt,
      tone: 'danger'
    });
  }

  if (appointment.status === 'cancel_requested') {
    addTimelineItem(items, {
      title: 'Chờ xử lý yêu cầu hủy',
      description: 'Yêu cầu hủy đang chờ phòng khám xác nhận.',
      time: null,
      tone: 'pending'
    });
  }

  if (appointment.status === 'cancelled') {
    addTimelineItem(items, {
      title: cancelRequestedAt ? 'Admin xác nhận hủy' : 'Đã hủy',
      description: cancelRequestedAt ? 'Phòng khám đã xác nhận yêu cầu hủy lịch.' : 'Lịch hẹn đã được hủy.',
      time: cancelHandledAt || appointment.updatedAt,
      tone: 'danger'
    });
  }

  addTimelineItem(items, {
    title: 'Yêu cầu đổi lịch',
    description: 'Bệnh nhân đã gửi yêu cầu đổi lịch hẹn.',
    time: rescheduleRequestedAt,
    tone: 'warning'
  });

  if (appointment.status === 'reschedule_requested') {
    addTimelineItem(items, {
      title: 'Chờ xử lý yêu cầu đổi lịch',
      description: 'Yêu cầu đổi lịch đang chờ phòng khám xác nhận.',
      time: null,
      tone: 'pending'
    });
  }

  if (appointment.rescheduleRequest?.decision === 'approved') {
    addTimelineItem(items, {
      title: 'Admin duyệt đổi lịch',
      description: 'Phòng khám đã chấp thuận yêu cầu đổi lịch.',
      time: rescheduleHandledAt,
      tone: 'success'
    });
    addTimelineItem(items, {
      title: 'Lịch mới được áp dụng',
      description: `Lịch khám mới: ${appointment.rescheduleRequest.newDate || appointment.date} - ${appointment.rescheduleRequest.newTimeSlot || appointment.timeSlot}.`,
      time: rescheduleHandledAt,
      tone: 'success'
    });
  }

  if (appointment.rescheduleRequest?.decision === 'rejected') {
    addTimelineItem(items, {
      title: 'Admin từ chối đổi lịch',
      description: 'Phòng khám không chấp thuận yêu cầu đổi lịch.',
      time: rescheduleHandledAt,
      tone: 'danger'
    });
  }

  if (appointment.rescheduleRequest?.decision === 'cancelled_by_patient') {
    addTimelineItem(items, {
      title: 'Yêu cầu đổi lịch đã được hủy',
      description: 'Bệnh nhân đã hủy yêu cầu đổi lịch và giữ nguyên lịch khám ban đầu.',
      time: appointment.rescheduleRequest.handledAt,
      tone: 'secondary'
    });
  }

  addTimelineItem(items, {
    title: 'Hoàn thành khám',
    description: 'Bệnh nhân đã hoàn thành buổi khám.',
    time: appointment.completedAt,
    tone: 'success'
  });

  return items;
}

function buildPatientTimeline(appointment) {
  const items = [];
  const cancelRequestedAt = appointment.cancelRequestedAt || appointment.cancelRequest?.requestedAt;
  const cancelHandledAt = appointment.cancelApprovedAt || appointment.cancelRequest?.handledAt;
  const rescheduleRequestedAt = appointment.rescheduleRequestedAt || appointment.rescheduleRequest?.requestedAt;
  const rescheduleHandledAt = appointment.rescheduleApprovedAt || appointment.rescheduleRequest?.handledAt;
  const rescheduleDecision = appointment.rescheduleRequest?.decision;

  addTimelineItem(items, {
    title: 'Bạn đã đặt lịch khám',
    description: 'Lịch khám của bạn đã được ghi nhận trên hệ thống.',
    time: appointment.createdAt,
    tone: 'info'
  });

  addTimelineItem(items, {
    title: 'Phòng khám đã xác nhận lịch hẹn của bạn',
    description: 'Vui lòng đến trước giờ khám 15 phút để làm thủ tục.',
    time: appointment.confirmedAt,
    tone: 'success'
  });

  addTimelineItem(items, {
    title: 'Bạn đã gửi yêu cầu hủy lịch',
    description: 'Yêu cầu hủy lịch của bạn đã được gửi đến phòng khám.',
    time: cancelRequestedAt,
    tone: 'warning'
  });

  if (appointment.status === 'cancel_requested') {
    addTimelineItem(items, {
      title: 'Đang chờ phòng khám xử lý',
      description: 'Yêu cầu hủy lịch của bạn đang được phòng khám xem xét.',
      time: null,
      tone: 'pending'
    });
  }

  if (appointment.cancelRequest?.handledAt && appointment.status === 'confirmed') {
    addTimelineItem(items, {
      title: 'Yêu cầu hủy không được chấp thuận',
      description: 'Phòng khám chưa chấp thuận yêu cầu hủy lịch của bạn.',
      time: appointment.cancelRequest.handledAt,
      tone: 'danger'
    });
  }

  if (appointment.status === 'cancelled') {
    addTimelineItem(items, {
      title: cancelRequestedAt ? 'Phòng khám đã chấp thuận yêu cầu hủy' : 'Lịch hẹn đã được hủy',
      description: cancelRequestedAt ? 'Yêu cầu hủy lịch của bạn đã được phòng khám xác nhận.' : 'Lịch hẹn của bạn đã được hủy.',
      time: cancelHandledAt || appointment.updatedAt,
      tone: 'danger'
    });
    if (cancelRequestedAt) {
      addTimelineItem(items, {
        title: 'Lịch hẹn đã được hủy',
        description: 'Bạn không cần đến phòng khám theo lịch hẹn này.',
        time: cancelHandledAt || appointment.updatedAt,
        tone: 'danger'
      });
    }
  }

  addTimelineItem(items, {
    title: 'Bạn đã gửi yêu cầu đổi lịch',
    description: 'Yêu cầu đổi lịch của bạn đã được gửi đến phòng khám.',
    time: rescheduleRequestedAt,
    tone: 'warning'
  });

  if (appointment.status === 'reschedule_requested') {
    addTimelineItem(items, {
      title: 'Đang chờ phòng khám xử lý',
      description: 'Yêu cầu đổi lịch của bạn đang được phòng khám xem xét.',
      time: null,
      tone: 'pending'
    });
  }

  if (rescheduleDecision === 'approved') {
    addTimelineItem(items, {
      title: 'Phòng khám đã chấp thuận yêu cầu đổi lịch',
      description: 'Yêu cầu đổi lịch của bạn đã được chấp thuận.',
      time: rescheduleHandledAt,
      tone: 'success'
    });
    addTimelineItem(items, {
      title: 'Lịch khám đã được cập nhật',
      description: `Lịch mới: ${appointment.rescheduleRequest.newDate || appointment.date} - ${appointment.rescheduleRequest.newTimeSlot || appointment.timeSlot}.`,
      time: rescheduleHandledAt,
      tone: 'success'
    });
  }

  if (rescheduleDecision === 'rejected') {
    addTimelineItem(items, {
      title: 'Yêu cầu đổi lịch không được chấp thuận',
      description: 'Phòng khám chưa chấp thuận yêu cầu đổi lịch của bạn.',
      time: rescheduleHandledAt,
      tone: 'danger'
    });
  }

  if (rescheduleDecision === 'cancelled_by_patient') {
    addTimelineItem(items, {
      title: 'Bạn đã hủy yêu cầu đổi lịch',
      description: 'Lịch khám ban đầu của bạn vẫn được giữ nguyên.',
      time: appointment.rescheduleRequest.handledAt,
      tone: 'secondary'
    });
  }

  if (appointment.status === 'completed') {
    addTimelineItem(items, {
      title: 'Lịch khám đã hoàn thành',
      description: 'Bạn đã hoàn thành buổi khám.',
      time: appointment.completedAt || appointment.updatedAt,
      tone: 'success'
    });
  }

  return items;
}

function AppointmentTimeline({ appointment, role }) {
  const isAdmin = role === 'admin';
  const items = isAdmin ? buildAdminTimeline(appointment) : buildPatientTimeline(appointment);
  let previousTimedItem = null;

  return (
    <section className={`appointment-timeline-card ${isAdmin ? 'admin-timeline' : 'patient-timeline'}`}>
      <div className="appointment-timeline-header">
        <span className="eyebrow">{isAdmin ? 'Quy trình' : 'Theo dõi lịch hẹn'}</span>
        <h3>{isAdmin ? 'Timeline xử lý lịch hẹn' : 'Trạng thái lịch hẹn của bạn'}</h3>
      </div>

      <div className="appointment-timeline">
        {items.map((item, index) => {
          const duration = isAdmin && item.time && previousTimedItem ? formatDuration(previousTimedItem.time, item.time) : '';
          if (item.time) previousTimedItem = item;

          return (
            <div className={`appointment-timeline-item ${item.tone}`} key={`${item.title}-${index}`}>
              <span className="appointment-timeline-marker">✓</span>
              <div className="appointment-timeline-content">
                <strong>{item.title}</strong>
                <p>{item.description}</p>
                {item.time ? <time>{isAdmin ? formatDateTime(item.time) : formatDateTimeShort(item.time)}</time> : <time>Đang chờ xử lý</time>}
                {duration && <em>({duration})</em>}
              </div>
            </div>
          );
        })}
      </div>
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
  const isAdmin = userRole === 'admin';
  const canManageAppointment = ['admin', 'doctor'].includes(userRole);
  const badge = getStatusBadge(appointment.status);
  const canCancel = ['pending', 'confirmed'].includes(appointment.status);
  const cancelLabel = appointment.status === 'confirmed' ? 'Yêu cầu hủy' : 'Hủy lịch';
  const cancelResponseTitle = getCancelResponseTitle(appointment);
  const cancelResponseMessage = getCancelResponseMessage(appointment);
  const cancelResponseType = appointment.status === 'cancelled' ? 'approved' : 'rejected';
  const showConfirmedNotice = appointment.status === 'confirmed';
  const showNoShowAttendance = appointment.status === 'no_show' || Boolean(appointment.noShowAt);
  const showRescheduleRequest = hasRescheduleRequest(appointment);
  const rescheduleResponseTitle = getRescheduleResponseTitle(appointment);
  const rescheduleResponseMessage = getRescheduleResponseMessage(appointment);
  const rescheduleResponseType = getRescheduleResponseType(appointment.rescheduleRequest?.decision);
  const showAdminActions = canManageAppointment && Boolean(onUpdateStatus);
  const showPatientQueueStatus = userRole === 'patient' && hasQueueInfo(appointment);
  const showPatientMedicalRecord = userRole === 'patient' && appointment.status === 'completed';
  const canDownloadQueueTicket = ['confirmed', 'in_progress', 'completed'].includes(appointment.status);
  const canDownloadMedicalRecord = appointment.status === 'completed';
  const consultationStatus = appointment.consultationStatus || 'waiting';
  const consultationBadge = getConsultationStatusBadge(consultationStatus);
  const consultationNotice = getConsultationNotice(consultationStatus);
  const servicePackage = getServicePackage(appointment);
  const followUpRecord = getFollowUpRecord(appointment);
  const originalAppointment = getOriginalAppointment(appointment);
  const showFollowUpContext = isFollowUpAppointment(appointment);
  const followUpRecordId = entityId(appointment.followUpRecordId);
  const servicePackageTargets = Array.isArray(servicePackage?.targetPatients)
    ? servicePackage.targetPatients.filter(Boolean).slice(0, 4)
    : [];
  const servicePackageIncludes = Array.isArray(servicePackage?.includes)
    ? servicePackage.includes.filter(Boolean).slice(0, 5)
    : [];

  const simpleAdminActions = {
    pending: [
      { label: 'Từ chối lịch', status: 'cancelled', className: 'btn-outline-danger' },
      { label: 'Xác nhận lịch', status: 'confirmed', className: 'btn-primary' }
    ],
    confirmed: [
      { label: 'Hủy lịch', status: 'cancelled', className: 'btn-outline-danger' }
    ]
  };

  const requestAdminActions = {
    cancel_requested: [
      { label: 'Từ chối hủy', status: 'confirmed', className: 'btn-outline-warning', context: 'cancel_request' },
      { label: 'Xác nhận hủy', status: 'cancelled', className: 'btn-danger', context: 'cancel_request' }
    ],
    reschedule_requested: [
      { label: 'Từ chối đổi lịch', status: 'reschedule_rejected', className: 'btn-outline-warning', context: 'reschedule_request' },
      { label: 'Xác nhận đổi lịch', status: 'confirmed', className: 'btn-primary', context: 'reschedule_request' }
    ]
  };

  const hasAdminActions = showAdminActions && Boolean(simpleAdminActions[appointment.status] || requestAdminActions[appointment.status]);

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
        await downloadPdf(`/appointments/${appointment._id}/pdf`, `phieu-dat-lich-${appointment._id}.pdf`);
      } else if (type === 'queue') {
        await downloadPdf(`/appointments/${appointment._id}/queue-ticket/pdf`, `phieu-kham-${appointment._id}.pdf`);
      } else if (type === 'record') {
        const payload = await api(`/appointments/${appointment._id}/medical-record`);
        await downloadPdf(`/medical-records/${payload.data._id}/pdf`, `ket-qua-kham-${payload.data._id}.pdf`);
      }
    } catch (error) {
      toast.error(error.message || 'Không tải được PDF');
    } finally {
      setPdfLoadingType('');
    }
  }

  function renderAppointmentActions() {
    if (!showAdminActions) return null;

    const simpleActions = simpleAdminActions[appointment.status];
    const requestActions = requestAdminActions[appointment.status];
    if (!simpleActions && !requestActions) return null;

    return (
      <div className="appointment-action-bar">
        {simpleActions && !adminAction && (
          <div className="appointment-detail-admin-actions">
            {simpleActions.map((action) => (
              <button
                className={`btn ${action.className}`}
                disabled={isSubmitting}
                key={action.status}
                type="button"
                onClick={() => (action.status === 'cancelled'
                  ? openAdminNoteAction({ ...action, context: 'direct_cancel' })
                  : submitAdminStatus(action.status))}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {(requestActions || adminAction) && (
          <>
            {adminAction && (
              <div className="appointment-detail-admin-note">
                <label className="form-label">Ghi chú phản hồi phòng khám</label>
                <textarea
                  className="form-control"
                  disabled={isSubmitting}
                  rows="3"
                  value={adminNote}
                  onChange={(event) => setAdminNote(event.target.value)}
                  placeholder="Nhập ghi chú nếu cần"
                />
              </div>
            )}

            <div className="appointment-detail-admin-actions">
              {!adminAction && requestActions.map((action) => (
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
          </>
        )}
      </div>
    );
  }

  return (
    <BaseModal className="admin-modal appointment-detail-modal" disableClose={isSubmitting} onClose={onClose} size="lg">
      <div className="appointment-modal-header d-flex justify-content-between align-items-start gap-3">
        <div>
          <span className="eyebrow">Chi tiết lịch hẹn</span>
          <h2 className="h4 mt-2 mb-0">{appointment.date} - {appointment.timeSlot}</h2>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-primary btn-sm"
            disabled={Boolean(pdfLoadingType)}
            type="button"
            onClick={() => downloadAppointmentDocument('appointment')}
          >
            {pdfLoadingType === 'appointment' ? 'Đang tải...' : 'Tải phiếu đặt lịch'}
          </button>
          {canDownloadQueueTicket && (
            <button
              className="btn btn-outline-primary btn-sm"
              disabled={Boolean(pdfLoadingType)}
              type="button"
              onClick={() => downloadAppointmentDocument('queue')}
            >
              {pdfLoadingType === 'queue' ? 'Đang tải...' : 'Tải phiếu khám'}
            </button>
          )}
          {canDownloadMedicalRecord && (
            <button
              className="btn btn-outline-success btn-sm"
              disabled={Boolean(pdfLoadingType)}
              type="button"
              onClick={() => downloadAppointmentDocument('record')}
            >
              {pdfLoadingType === 'record' ? 'Đang tải...' : 'Tải kết quả khám'}
            </button>
          )}
          {onCancel && canCancel && (
            <button className="btn btn-outline-danger btn-sm" type="button" onClick={() => onCancel(appointment)}>
              {cancelLabel}
            </button>
          )}
          <button className="btn btn-outline-primary btn-sm" type="button" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>

      <div className={`appointment-modal-body ${hasAdminActions ? 'has-actions' : ''}`}>
        <div className="appointment-detail-grid">
        <div className="appointment-detail-full appointment-detail-section-title">Người đặt lịch</div>
        <div><strong>Họ và tên</strong><span>{bookingUserValue(appointment, 'name')}</span></div>
        <div><strong>Email</strong><span>{bookingUserValue(appointment, 'email')}</span></div>

        <div className="appointment-detail-full appointment-detail-section-title">Bệnh nhân đi khám</div>
        <div><strong>Họ và tên</strong><span>{patientValue(appointment, 'name')}</span></div>
        <div><strong>Email</strong><span>{patientValue(appointment, 'email')}</span></div>
        <div><strong>Số điện thoại</strong><span>{patientValue(appointment, 'phone')}</span></div>
        <div><strong>Giới tính</strong><span>{patientValue(appointment, 'gender')}</span></div>
        <div><strong>Ngày sinh</strong><span>{patientValue(appointment, 'dateOfBirth')}</span></div>
        <InsuranceSnapshotCard appointment={appointment} />

        <div className="appointment-detail-full appointment-detail-section-title">Thông tin lịch khám</div>
        <div><strong>Ngày khám</strong><span>{appointment.date}</span></div>
        <div><strong>Khung giờ</strong><span>{appointment.timeSlot}</span></div>
        <div><strong>Bác sĩ</strong><span>{valueName(appointment.doctorId)}</span></div>
        <div><strong>Cơ sở</strong><span>{valueName(appointment.clinicId)}</span></div>
        <div><strong>Chuyên khoa</strong><span>{valueName(appointment.specialtyId)}</span></div>
        {showFollowUpContext && (
          <div><strong>Loại lịch</strong><span><span className="follow-up-appointment-chip">Tái khám</span></span></div>
        )}
        <div><strong>Ngày đặt lịch</strong><span>{formatDateTime(appointment.createdAt)}</span></div>
        <div><strong>Người đặt</strong><span>{bookingUserValue(appointment, 'name')}</span></div>
        <div><strong>Trạng thái</strong><span><span className={`badge ${badge.className}`}>{badge.label}</span></span></div>
        {showNoShowAttendance && (
          <>
            <div><strong>Trạng thái tham dự</strong><span>Không đến khám</span></div>
            <div><strong>Thời gian ghi nhận</strong><span>{formatDateTime(appointment.noShowAt || appointment.updatedAt)}</span></div>
          </>
        )}

        {showFollowUpContext && (
          <div className="appointment-detail-full follow-up-appointment-card">
            <div className="follow-up-appointment-card-main">
              <span className="eyebrow">Lịch tái khám</span>
              <strong>{followUpStatusText(followUpRecord?.followUpStatus)}</strong>
              <p>
                Lịch này được tạo để theo dõi tiếp sau buổi khám trước.
                {followUpRecord?.followUpDate
                  ? ` Ngày tái khám được bác sĩ khuyến nghị: ${formatSimpleDate(followUpRecord.followUpDate)}.`
                  : ' Bác sĩ chưa chỉ định ngày cố định, bệnh nhân đã chọn thời gian phù hợp.'}
              </p>
            </div>
            <dl className="follow-up-appointment-meta">
              <div>
                <dt>Hồ sơ gốc</dt>
                <dd>
                  {originalAppointment
                    ? `${formatSimpleDate(originalAppointment.date)}${originalAppointment.timeSlot ? ` · ${originalAppointment.timeSlot}` : ''}`
                    : 'Đã liên kết hồ sơ khám bệnh'}
                </dd>
              </div>
              {followUpRecord?.diagnosis && (
                <div>
                  <dt>Chẩn đoán trước đó</dt>
                  <dd>{followUpRecord.diagnosis}</dd>
                </div>
              )}
            </dl>
            {userRole === 'patient' && followUpRecordId && (
              <Link className="btn btn-sm btn-outline-primary" to={`/medical-records?recordId=${followUpRecordId}`}>
                Xem hồ sơ gốc
              </Link>
            )}
          </div>
        )}

        {showPatientQueueStatus && (
          <div className="appointment-detail-full consultation-status-card">
            <div className="consultation-status-card-header">
              <div>
                <span className="eyebrow">Trạng thái khám</span>
                <h3>Thông tin hàng đợi của bạn</h3>
              </div>
              <span className={`badge ${consultationBadge.className}`}>{consultationBadge.label}</span>
            </div>
            <div className="consultation-status-grid">
              <div>
                <strong>Số thứ tự khám</strong>
                <span>{formatQueueNumber(appointment.queueNumber)}</span>
              </div>
              <div>
                <strong>Trạng thái hiện tại</strong>
                <span>{consultationBadge.label}</span>
              </div>
              {appointment.startConsultationAt && (
                <div>
                  <strong>Thời gian gọi vào khám</strong>
                  <span>{formatDateTimeShort(appointment.startConsultationAt)}</span>
                </div>
              )}
              {appointment.finishConsultationAt && (
                <div>
                  <strong>Thời gian hoàn thành</strong>
                  <span>{formatDateTimeShort(appointment.finishConsultationAt)}</span>
                </div>
              )}
            </div>
            {consultationNotice && (
              <div className={`consultation-notice ${consultationNotice.tone}`}>
                {consultationNotice.message}
              </div>
            )}
          </div>
        )}

        {showConfirmedNotice && (
          <div className="appointment-detail-full confirmed-appointment-notice">
            <span className="confirmed-notice-icon" aria-hidden="true" />
            <div>
              <strong>Lịch hẹn đã được xác nhận</strong>
              <p>Vui lòng đến trước giờ khám 15 phút để làm thủ tục.</p>
              <dl>
                <div><dt>Cơ sở khám</dt><dd>{valueName(appointment.clinicId)}</dd></div>
                <div><dt>Địa chỉ cơ sở</dt><dd>{appointment.clinicId?.address || 'Đang cập nhật'}</dd></div>
                <div><dt>Bác sĩ</dt><dd>{valueName(appointment.doctorId)}</dd></div>
                <div><dt>Chuyên khoa</dt><dd>{valueName(appointment.specialtyId)}</dd></div>
                <div><dt>Ngày khám</dt><dd>{appointment.date}</dd></div>
                <div><dt>Khung giờ</dt><dd>{appointment.timeSlot}</dd></div>
              </dl>
            </div>
          </div>
        )}

        {showPatientMedicalRecord && (
          <div className="appointment-detail-full consultation-status-card">
            <div className="consultation-status-card-header">
              <div>
                <span className="eyebrow">Hồ sơ khám bệnh</span>
                <h3>Kết quả khám của bạn</h3>
              </div>
              <Link className="btn btn-sm btn-outline-primary" to={`/medical-records?appointmentId=${appointment._id}`}>
                Xem hồ sơ khám bệnh
              </Link>
            </div>
            <p className="mb-0 text-secondary">Nếu hồ sơ chưa hiển thị, phòng khám có thể đang cập nhật kết quả khám.</p>
          </div>
        )}

        <div className="appointment-detail-full"><strong>Lý do khám</strong><span>{appointment.reason || 'Đang cập nhật'}</span></div>

        {showRescheduleRequest && (
          <>
            <div className="appointment-detail-full appointment-detail-section-title">Yêu cầu đổi lịch</div>
            <div><strong>Ngày giờ cũ</strong><span>{appointment.rescheduleRequest?.oldDate || appointment.date} - {appointment.rescheduleRequest?.oldTimeSlot || appointment.timeSlot}</span></div>
            <div><strong>Ngày giờ mới</strong><span>{appointment.rescheduleRequest?.newDate || 'Đang cập nhật'} - {appointment.rescheduleRequest?.newTimeSlot || 'Đang cập nhật'}</span></div>
            <div className="appointment-detail-full"><strong>Lý do đổi lịch</strong><span>{appointment.rescheduleRequest?.reason || 'Không có lý do'}</span></div>
            <div><strong>Quyết định</strong><span>{getRescheduleDecisionLabel(appointment.rescheduleRequest?.decision)}</span></div>
            {appointment.rescheduleRequest?.handledAt && (
              <div><strong>Thời gian xử lý</strong><span>{formatDateTime(appointment.rescheduleRequest.handledAt)}</span></div>
            )}
            {rescheduleResponseMessage && (
              <div className={`appointment-detail-full cancel-response-card ${rescheduleResponseType}`}>
                <span className="cancel-response-icon" aria-hidden="true" />
                <div>
                  <strong>{rescheduleResponseTitle}</strong>
                  <p>{rescheduleResponseMessage}</p>
                </div>
              </div>
            )}
          </>
        )}

        {appointment.cancelRequest?.reason && (
          <div className="appointment-detail-full"><strong>Lý do hủy</strong><span>{appointment.cancelRequest.reason}</span></div>
        )}
        {appointment.cancelRequest?.requestedAt && (
          <div><strong>Thời gian yêu cầu hủy</strong><span>{formatDateTime(appointment.cancelRequest.requestedAt)}</span></div>
        )}
        {cancelResponseTitle && (
          <div className={`appointment-detail-full cancel-response-card ${cancelResponseType}`}>
            <span className="cancel-response-icon" aria-hidden="true" />
            <div>
              <strong>{cancelResponseTitle}</strong>
              <p>{cancelResponseMessage}</p>
            </div>
          </div>
        )}
        </div>

        <div className="appointment-detail-full service-package-detail-card service-package-detail-card-pro">
          <div className="service-package-detail-header">
            <span className="eyebrow">Thông tin dịch vụ</span>
            <strong>{servicePackage ? cleanDisplayText(servicePackage.name, 'Gói khám') : 'Để bác sĩ tư vấn'}</strong>
            <p>
              {servicePackage
                ? cleanDisplayText(servicePackage.description, 'Dịch vụ khám được chọn khi đặt lịch.')
                : 'Bác sĩ sẽ đánh giá tình trạng và tư vấn dịch vụ phù hợp khi thăm khám.'}
            </p>
          </div>
          {servicePackage ? (
            <>
              <div className="service-package-detail-grid">
                <div>
                  <span>Mã gói</span>
                  <b>{cleanDisplayText(servicePackage.code, 'STANDARD')}</b>
                </div>
                <div>
                  <span>Giá</span>
                  <b>{formatCurrency(servicePackage.price)}</b>
                </div>
                <div>
                  <span>Thời lượng</span>
                  <b>{servicePackage.durationMinutes || 30} phút</b>
                </div>
                <div>
                  <span>Thanh toán</span>
                  <b>Tại phòng khám</b>
                </div>
              </div>
              {servicePackageTargets.length > 0 && (
                <div className="service-package-detail-list">
                  <span>Phù hợp với ai</span>
                  {servicePackageTargets.map((item) => (
                    <small key={`target-${item}`}>✓ {cleanDisplayText(item)}</small>
                  ))}
                </div>
              )}
              {servicePackageIncludes.length > 0 && (
                <div className="service-package-detail-list">
                  <span>Bao gồm</span>
                  {servicePackageIncludes.map((item) => (
                    <small key={`include-${item}`}>✓ {cleanDisplayText(item)}</small>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="service-package-detail-grid">
              <div>
                <span>Dịch vụ</span>
                <b>Để bác sĩ tư vấn</b>
              </div>
              <div>
                <span>Thanh toán</span>
                <b>Tại phòng khám</b>
              </div>
            </div>
          )}
        </div>

        <AppointmentTimeline appointment={appointment} role={userRole} />
      </div>

      {renderAppointmentActions()}
    </BaseModal>
  );
}
