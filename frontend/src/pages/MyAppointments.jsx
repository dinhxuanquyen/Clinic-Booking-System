import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import AppointmentDetailModal from '../components/AppointmentDetailModal.jsx';
import BaseModal from '../components/BaseModal.jsx';
import ReviewDoctorModal from '../components/ReviewDoctorModal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { connectSocket, joinSocketRoom } from '../services/socket.js';
import { getToken, getUser } from '../utils/auth.js';
import { downloadPdf } from '../utils/downloadFile.js';
import { getConsultationStatusBadge, getStatusBadge } from '../utils/status.js';
import { cleanDisplayText } from '../utils/textEncoding.js';

const pageSize = 10;

const filterLabels = {
  all: 'Tổng lịch hẹn',
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  no_show: 'Không đến khám'
};

function valueName(value) {
  if (!value) return 'Đang cập nhật';
  return typeof value === 'object' ? value.name : value;
}

function errorMessage(error) {
  return cleanDisplayText(error?.message, 'Đã xảy ra lỗi, vui lòng thử lại');
}

function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatRecordDate(value) {
  if (!value) return 'Chưa cập nhật';
  return String(value).slice(0, 10);
}

function recordFollowUpText(record) {
  return record?.followUpRequired ? formatRecordDate(record.followUpDate) : 'Không cần tái khám';
}

function followUpStatusLabel(record) {
  if (record?.followUpStatus === 'completed') return { label: 'Đã hoàn thành tái khám', tone: 'success' };
  if (!record?.followUpRequired) return { label: 'Không cần tái khám', tone: 'neutral' };
  if (record.followUpStatus === 'scheduled') return { label: 'Đã đặt lịch tái khám', tone: 'success' };
  if (record.followUpStatus === 'overdue') return { label: 'Quá hạn tái khám', tone: 'danger' };
  return { label: 'Cần tái khám', tone: 'warning' };
}

function followUpBookingUrl(record) {
  const clinicId = record?.clinicId?._id || record?.clinicId || '';
  const specialtyId = record?.specialtyId?._id || record?.specialtyId || '';
  const doctorId = record?.doctorId?._id || record?.doctorId || '';
  const params = new URLSearchParams({
    followUpRecordId: record._id,
    clinicId,
    specialtyId,
    doctorId
  });

  return `/booking?${params.toString()}`;
}

function medicalRecordVitalItems(record) {
  const vitals = record?.vitals || {};
  return [
    ['Huyết áp', vitals.bloodPressure, 'mmHg'],
    ['Nhịp tim', vitals.heartRate, 'lần/phút'],
    ['Nhiệt độ', vitals.temperature, '°C'],
    ['Nhịp thở', vitals.respiratoryRate, 'lần/phút'],
    ['SpO2', vitals.spo2, '%'],
    ['Chiều cao', vitals.height, 'cm'],
    ['Cân nặng', vitals.weight, 'kg'],
    ['BMI', vitals.bmi, '']
  ].filter(([, value]) => value !== undefined && value !== null && value !== '');
}

function InsuranceSnapshotCard({ insurance }) {
  const hasInsurance = Boolean(insurance?.enabled && insurance?.insuranceNumber);

  return (
    <div className={`insurance-snapshot-card medical-record-insurance-card ${hasInsurance ? 'active' : 'inactive'}`}>
      <div className="insurance-snapshot-heading">
        <div>
          <strong>Thông tin BHYT</strong>
          <span>Dữ liệu được ghi nhận tại thời điểm đặt lịch.</span>
        </div>
        <em>{hasInsurance ? 'Có BHYT' : 'Không sử dụng BHYT'}</em>
      </div>
      {hasInsurance && (
        <div className="insurance-snapshot-grid">
          <div><span>Mã BHYT</span><strong>{insurance.insuranceNumber}</strong></div>
          <div><span>Ngày hết hạn</span><strong>{formatRecordDate(insurance.insuranceExpiryDate)}</strong></div>
          <div><span>Nơi đăng ký KCB ban đầu</span><strong>{insurance.insuranceRegisteredHospital || 'Chưa cập nhật'}</strong></div>
        </div>
      )}
    </div>
  );
}

function MedicalRecordDetailModal({ record, onClose }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);

  if (!record) return null;

  const appointment = record.appointmentId || {};
  const vitalItems = medicalRecordVitalItems(record);
  const followUpStatus = followUpStatusLabel(record);

  async function handleDownloadPdf() {
    if (!record?._id || downloading) return;
    setDownloading(true);
    try {
      await downloadPdf(`/medical-records/${record._id}/pdf`, `ket-qua-kham-${record._id}.pdf`);
    } catch (error) {
      toast.error(error.message || 'Không tải được PDF kết quả khám');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <BaseModal className="admin-modal medical-record-detail-modal" onClose={onClose} size="lg">
      <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
        <div>
          <span className="eyebrow">Hồ sơ khám bệnh</span>
          <h2 className="h4 mt-2 mb-1">{formatRecordDate(appointment.date || record.createdAt)} - {appointment.timeSlot || ''}</h2>
          <p className="text-secondary mb-0">{valueName(record.doctorId)} · {valueName(record.specialtyId)}</p>
        </div>
        <div className="d-flex flex-wrap justify-content-end gap-2">
          <button className="btn btn-sm btn-outline-success" disabled={downloading} type="button" onClick={handleDownloadPdf}>
            {downloading ? 'Đang tải...' : 'Tải PDF kết quả khám'}
          </button>
          <button className="btn btn-sm btn-outline-secondary" type="button" onClick={onClose}>Đóng</button>
        </div>
      </div>

      <div className="medical-record-detail-grid">
        <div><span>Ngày khám</span><strong>{formatRecordDate(appointment.date || record.createdAt)}</strong></div>
        <div><span>Bác sĩ</span><strong>{valueName(record.doctorId)}</strong></div>
        <div><span>Chuyên khoa</span><strong>{valueName(record.specialtyId)}</strong></div>
        <div><span>Cơ sở</span><strong>{valueName(record.clinicId)}</strong></div>
        <div><span>Tái khám</span><strong>{recordFollowUpText(record)}</strong></div>
      </div>

      <InsuranceSnapshotCard insurance={appointment.insuranceSnapshot} />

      <div className={`medical-record-follow-up-card ${followUpStatus.tone}`}>
        <div>
          <span>Kế hoạch tái khám</span>
          <strong>{followUpStatus.label}</strong>
          <p>
            {record.followUpRequired
              ? `Ngày tái khám khuyến nghị: ${formatRecordDate(record.followUpDate)}`
              : 'Bác sĩ chưa yêu cầu tái khám. Nếu có triệu chứng bất thường, bạn nên đặt lịch kiểm tra lại.'}
          </p>
        </div>
        {record.followUpRequired && ['recommended', 'overdue'].includes(record.followUpStatus || 'recommended') && (
          <button
            className="btn btn-sm btn-primary"
            type="button"
            onClick={() => {
              onClose();
              navigate(followUpBookingUrl(record));
            }}
          >
            Đặt lịch tái khám
          </button>
        )}
      </div>

      {vitalItems.length > 0 && (
        <div className="medical-record-detail-section">
          <h3>Chỉ số sinh tồn</h3>
          <div className="medical-record-vitals-list">
            {vitalItems.map(([label, value, unit]) => (
              <div className="medical-record-vital-item" key={label}>
                <span>{label}</span>
                <strong>{value}{unit ? ` ${unit}` : ''}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="medical-record-detail-section">
        <h3>Triệu chứng</h3>
        <p>{record.symptoms || 'Chưa cập nhật'}</p>
      </div>
      <div className="medical-record-detail-section">
        <h3>Chẩn đoán</h3>
        <p>{record.diagnosis}</p>
      </div>
      <div className="medical-record-detail-section">
        <h3>Kết luận</h3>
        <p>{record.conclusion}</p>
      </div>

      <div className="medical-record-detail-section">
        <h3>Đơn thuốc</h3>
        {record.prescription?.length ? (
          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>Tên thuốc</th>
                  <th>Liều dùng</th>
                  <th>Số lần/ngày</th>
                  <th>Thời gian</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {record.prescription.map((item, index) => (
                  <tr key={`${item.medicineName}-${index}`}>
                    <td>{item.medicineName}</td>
                    <td>{item.dosage || '-'}</td>
                    <td>{item.frequency || '-'}</td>
                    <td>{item.duration || '-'}</td>
                    <td>{item.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>Không có đơn thuốc.</p>
        )}
      </div>

      <div className="medical-record-detail-section">
        <h3>Lời dặn</h3>
        <p>{record.advice || 'Chưa cập nhật'}</p>
      </div>
    </BaseModal>
  );
}

function StatusBadge({ status }) {
  const badge = getStatusBadge(status);

  return <span className={`badge ${badge.className}`}>{badge.label}</span>;
}

function hasQueueInfo(appointment) {
  return Boolean(
    appointment?.queueNumber ||
    ['in_progress', 'completed', 'skipped'].includes(appointment?.consultationStatus)
  );
}

function formatQueueNumber(queueNumber) {
  if (!queueNumber) return '';
  return String(queueNumber).padStart(2, '0');
}

function ConsultationStatusBadge({ status }) {
  const badge = getConsultationStatusBadge(status || 'waiting');

  return <span className={`badge ${badge.className}`}>{badge.label}</span>;
}

const waitingStatusMap = {
  waiting: { label: 'Đang chờ', className: 'bg-warning-subtle text-warning-emphasis' },
  offered: { label: 'Đã đề nghị', className: 'bg-info-subtle text-primary' },
  accepted: { label: 'Đã chấp nhận', className: 'bg-success-subtle text-success' },
  declined: { label: 'Đã từ chối', className: 'bg-danger-subtle text-danger' },
  expired: { label: 'Đã hết hạn', className: 'bg-secondary-subtle text-secondary' },
  cancelled: { label: 'Đã hủy', className: 'bg-secondary-subtle text-secondary' }
};

function WaitingStatusBadge({ status }) {
  const badge = waitingStatusMap[status] || { label: status, className: 'bg-secondary-subtle text-secondary' };
  return <span className={`badge ${badge.className}`}>{badge.label}</span>;
}

function AppointmentQueueSummary({ appointment }) {
  if (!hasQueueInfo(appointment)) return null;

  return (
    <div className="appointment-queue-summary">
      {appointment.queueNumber && <span>Số thứ tự khám: {formatQueueNumber(appointment.queueNumber)}</span>}
      {appointment.consultationStatus && <ConsultationStatusBadge status={appointment.consultationStatus} />}
    </div>
  );
}

function getServicePackage(appointment) {
  const servicePackage = appointment?.servicePackageSnapshot || appointment?.servicePackageId;
  return servicePackage && typeof servicePackage === 'object' ? servicePackage : null;
}

function AppointmentServicePackageChip({ appointment }) {
  const servicePackage = getServicePackage(appointment);
  if (!servicePackage) {
    return (
      <span className="appointment-service-package-chip is-advisory">
        {'\u0110\u1ec3 b\u00e1c s\u0129 t\u01b0 v\u1ea5n'}
      </span>
    );
  }

  return (
    <span className="appointment-service-package-chip">
      {cleanDisplayText(servicePackage.name, '\u0047\u00f3i kh\u00e1m')}{' \u00b7 '}{formatCurrency(servicePackage.price)}
    </span>
  );
}

function canCancelAppointment(appointment) {
  return ['pending', 'confirmed'].includes(appointment.status);
}

function canRescheduleAppointment(appointment) {
  return appointment.status === 'confirmed';
}

function canCancelRescheduleRequest(appointment) {
  return appointment.status === 'reschedule_requested';
}

function canViewMedicalRecord(appointment) {
  return appointment.status === 'completed';
}

function canReviewDoctor(appointment) {
  return appointment.status === 'completed';
}

function entityId(value) {
  return typeof value === 'object' ? value?._id : value;
}

function cancelActionLabel(appointment) {
  return appointment.status === 'confirmed' ? 'Yêu cầu hủy' : 'Hủy lịch';
}

function CancelConfirmDialog({ appointment, onCancel, onConfirm }) {
  const [reason, setReason] = useState(appointment.cancelRequest?.reason || '');
  const requiresReason = appointment.status === 'confirmed';

  return (
    <BaseModal className="admin-confirm-dialog" onClose={onCancel} size="sm">
      <h2 className="h5 mb-2">Hủy lịch khám</h2>
      <p className="text-secondary mb-4">Bạn có chắc muốn hủy lịch khám này?</p>
      <label className="form-label">{requiresReason ? 'Lý do hủy lịch' : 'Lý do hủy lịch (không bắt buộc)'}</label>
      <textarea
        className="form-control mb-3"
        rows="3"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <div className="d-flex justify-content-end gap-2">
        <button className="btn btn-outline-secondary" type="button" onClick={onCancel}>
          Không
        </button>
        <button className="btn btn-danger" type="button" onClick={() => onConfirm(reason)}>
          {cancelActionLabel(appointment)}
        </button>
      </div>
    </BaseModal>
  );
}

function CancelRescheduleRequestDialog({ onCancel, onConfirm }) {
  return (
    <BaseModal className="admin-confirm-dialog" onClose={onCancel} size="sm">
      <h2 className="h5 mb-2">Hủy yêu cầu đổi lịch</h2>
      <p className="text-secondary mb-4">
        Bạn có chắc muốn hủy yêu cầu đổi lịch và giữ nguyên lịch khám hiện tại?
      </p>
      <div className="d-flex justify-content-end gap-2">
        <button className="btn btn-outline-secondary" type="button" onClick={onCancel}>
          Không
        </button>
        <button className="btn btn-primary" type="button" onClick={onConfirm}>
          Hủy yêu cầu đổi lịch
        </button>
      </div>
    </BaseModal>
  );
}

function RescheduleRequestModal({ appointment, onClose, onSubmit }) {
  const [form, setForm] = useState({ newDate: '', newTimeSlot: '', reason: '' });
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const doctorId = entityId(appointment.doctorId);

  useEffect(() => {
    if (!doctorId || !form.newDate) {
      setSlots([]);
      return undefined;
    }

    let isActive = true;
    setLoadingSlots(true);
    setForm((current) => ({ ...current, newTimeSlot: '' }));

    api(`/doctors/${doctorId}/available-slots?date=${form.newDate}`)
      .then((payload) => {
        if (isActive) setSlots(payload.data || []);
      })
      .catch(() => {
        if (isActive) setSlots([]);
      })
      .finally(() => {
        if (isActive) setLoadingSlots(false);
      });

    return () => {
      isActive = false;
    };
  }, [doctorId, form.newDate]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit() {
    setSubmitting(true);
    try {
      await onSubmit(appointment, form);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BaseModal className="admin-modal appointment-detail-modal" disableClose={submitting} onClose={onClose} size="lg">
      <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
        <div>
          <span className="eyebrow">Yêu cầu đổi lịch</span>
          <h2 className="h4 mt-2 mb-0">Chọn thời gian khám mới</h2>
        </div>
        <button className="btn btn-outline-primary btn-sm" disabled={submitting} type="button" onClick={onClose}>
          Đóng
        </button>
      </div>

      <div className="appointment-detail-grid mb-3">
        <div><strong>Ngày hiện tại</strong><span>{appointment.date}</span></div>
        <div><strong>Khung giờ hiện tại</strong><span>{appointment.timeSlot}</span></div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <label className="form-label">Ngày mới</label>
          <input
            className="form-control"
            min={new Date().toISOString().slice(0, 10)}
            type="date"
            value={form.newDate}
            onChange={(event) => updateField('newDate', event.target.value)}
          />
        </div>
        <div className="col-12">
          <label className="form-label">Khung giờ mới</label>
          <div className="slot-grid">
            {loadingSlots && <span className="text-secondary">Đang tải khung giờ...</span>}
            {!loadingSlots && form.newDate && slots.map((slot) => (
              <button
                className={`slot-button ${slot.available ? 'slot-available' : 'slot-booked'} ${form.newTimeSlot === slot.timeSlot ? 'slot-selected' : ''}`}
                disabled={!slot.available || submitting}
                key={slot.timeSlot}
                type="button"
                onClick={() => updateField('newTimeSlot', slot.timeSlot)}
              >
                <strong>{slot.timeSlot}</strong>
                <span>{slot.available ? 'Còn trống' : 'Đã có người đặt'}</span>
              </button>
            ))}
            {!loadingSlots && form.newDate && !slots.length && <span className="text-secondary">Không có khung giờ khám.</span>}
            {!form.newDate && <span className="text-secondary">Vui lòng chọn ngày mới để xem khung giờ.</span>}
          </div>
        </div>
        <div className="col-12">
          <label className="form-label">Lý do đổi lịch</label>
          <textarea
            className="form-control"
            rows="4"
            value={form.reason}
            onChange={(event) => updateField('reason', event.target.value)}
          />
        </div>
      </div>

      <div className="d-flex justify-content-end gap-2">
        <button className="btn btn-outline-secondary" disabled={submitting} type="button" onClick={onClose}>
          Hủy
        </button>
        <button className="btn btn-primary" disabled={submitting} type="button" onClick={submit}>
          {submitting ? 'Đang gửi...' : 'Gửi yêu cầu đổi lịch'}
        </button>
      </div>
    </BaseModal>
  );
}

function AppointmentMobileCard({ appointment, downloadingPdfKey, onCancel, onCancelReschedule, onDetail, onDownloadPdf, onReschedule, onReviewDoctor, onViewMedicalRecord }) {
  return (
    <article className="amc-card">
      {/* Top row: date/time + status */}
      <div className="amc-header">
        <div className="amc-datetime">
          <span className="amc-date">{appointment.date}</span>
          <span className="amc-time">{appointment.timeSlot}</span>
        </div>
        <StatusBadge status={appointment.status} />
      </div>

      {/* Doctor & specialty */}
      <div className="amc-body">
        <p className="amc-doctor">{valueName(appointment.doctorId)}</p>
        <div className="amc-chips">
          <span className="amc-chip">{valueName(appointment.specialtyId)}</span>
          <span className="amc-chip amc-chip-muted">{valueName(appointment.clinicId)}</span>
        </div>
        <AppointmentQueueSummary appointment={appointment} />
        <AppointmentServicePackageChip appointment={appointment} />
      </div>

      {/* Actions */}
      <div className="amc-actions">
        <button className="btn btn-primary btn-sm" type="button" onClick={() => onDetail(appointment)}>
          Xem chi tiết
        </button>

        {canViewMedicalRecord(appointment) && (
          <button className="btn btn-secondary btn-sm" disabled={appointment.medicalRecordLoading} type="button" onClick={() => onViewMedicalRecord(appointment)}>
            Xem hồ sơ
          </button>
        )}

        {canReviewDoctor(appointment) && (
          <button
            className={appointment.doctorReview ? 'btn btn-secondary btn-sm' : 'btn btn-warning btn-sm'}
            type="button"
            onClick={() => onReviewDoctor(appointment)}
          >
            {appointment.doctorReview ? 'Đã đánh giá' : 'Đánh giá'}
          </button>
        )}

        {canCancelAppointment(appointment) && (
          <button className="btn btn-danger btn-sm" type="button" onClick={() => onCancel(appointment)}>
            {cancelActionLabel(appointment)}
          </button>
        )}

        {canRescheduleAppointment(appointment) && (
          <button className="btn btn-secondary btn-sm" type="button" onClick={() => onReschedule(appointment)}>
            Đổi lịch
          </button>
        )}

        {canCancelRescheduleRequest(appointment) && (
          <button className="btn btn-secondary btn-sm" type="button" onClick={() => onCancelReschedule(appointment)}>
            Hủy đổi lịch
          </button>
        )}

        <button className="btn btn-ghost btn-sm" disabled={downloadingPdfKey === `${appointment._id}:appointment`} type="button" onClick={() => onDownloadPdf(appointment, 'appointment')}>
          Tải phiếu
        </button>

        {appointment.queueNumber && (
          <button className="btn btn-ghost btn-sm" disabled={downloadingPdfKey === `${appointment._id}:queue`} type="button" onClick={() => onDownloadPdf(appointment, 'queue')}>
            Phiếu khám
          </button>
        )}

        {canViewMedicalRecord(appointment) && (
          <button className="btn btn-ghost btn-sm" disabled={downloadingPdfKey === `${appointment._id}:record`} type="button" onClick={() => onDownloadPdf(appointment, 'record')}>
            Tải kết quả
          </button>
        )}
      </div>
    </article>
  );
}


export default function MyAppointments() {
  const location = useLocation();
  const toast = useToast();
  const emptyToastShown = useRef(false);
  const queryOpenedRef = useRef('');
  const [appointments, setAppointments] = useState([]);
  const [waitingEntries, setWaitingEntries] = useState([]);
  const [activeView, setActiveView] = useState('appointments');
  const [cancellingAppointment, setCancellingAppointment] = useState(null);
  const [cancellingRescheduleAppointment, setCancellingRescheduleAppointment] = useState(null);
  const [reschedulingAppointment, setReschedulingAppointment] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [selectedMedicalRecord, setSelectedMedicalRecord] = useState(null);
  const [reviewingAppointment, setReviewingAppointment] = useState(null);
  const [medicalRecordLoadingId, setMedicalRecordLoadingId] = useState('');
  const [downloadingPdfKey, setDownloadingPdfKey] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [waitingLoading, setWaitingLoading] = useState(true);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await api('/appointments/my');
      const data = payload.data || [];
      setAppointments(data);
      setError('');
      return data;
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      toast.error(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const refreshAppointmentsQuietly = useCallback(async () => {
    try {
      const payload = await api('/appointments/my');
      setAppointments(payload.data || []);
      setSelectedAppointment((current) => {
        if (!current) return current;
        return (payload.data || []).find((item) => item._id === current._id) || current;
      });
    } catch {
      // Polling and manual refresh remain available as fallback.
    }
  }, []);

  useEffect(() => {
    api('/appointments/my')
      .then((payload) => {
        const data = payload.data || [];
        setAppointments(data);
        if (!data.length && !emptyToastShown.current) {
          emptyToastShown.current = true;
          toast.info('Bạn chưa có lịch hẹn nào');
        }
      })
      .catch((err) => {
        const message = errorMessage(err);
        setError(message);
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }, [toast]);

  const loadWaitingEntries = useCallback(async () => {
    setWaitingLoading(true);
    try {
      const payload = await api('/waiting-list/my');
      setWaitingEntries(payload.data || []);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setWaitingLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadWaitingEntries();
  }, [loadWaitingEntries]);

  useEffect(() => {
    const socket = connectSocket(getToken());
    if (!socket) return undefined;
    const currentUser = getUser();
    joinSocketRoom(currentUser?._id || currentUser?.id);

    function handleQueueEvent(payload) {
      if (!payload?.appointmentId) return;
      setAppointments((current) => current.map((item) => (
        item._id === payload.appointmentId
          ? {
              ...item,
              consultationStatus: payload.consultationStatus || item.consultationStatus,
              queueNumber: payload.queueNumber || item.queueNumber,
              status: payload.consultationStatus === 'completed' ? 'completed' : item.status
            }
          : item
      )));
      setSelectedAppointment((current) => (
        current?._id === payload.appointmentId
          ? {
              ...current,
              consultationStatus: payload.consultationStatus || current.consultationStatus,
              queueNumber: payload.queueNumber || current.queueNumber,
              status: payload.consultationStatus === 'completed' ? 'completed' : current.status
            }
          : current
      ));
      refreshAppointmentsQuietly();
    }

    function handleAppointmentUpdated(payload) {
      const updatedAppointment = payload?.appointment;
      const appointmentId = payload?.appointmentId || updatedAppointment?._id;
      if (!appointmentId) return;

      setAppointments((current) => current.map((item) => (
        item._id === appointmentId ? { ...item, ...updatedAppointment, status: payload.status || updatedAppointment?.status || item.status } : item
      )));
      setSelectedAppointment((current) => (
        current?._id === appointmentId ? { ...current, ...updatedAppointment, status: payload.status || updatedAppointment?.status || current.status } : current
      ));
    }

    socket.on('queue:called', handleQueueEvent);
    socket.on('queue:completed', handleQueueEvent);
    socket.on('queue:updated', handleQueueEvent);
    socket.on('appointment:updated', handleAppointmentUpdated);

    return () => {
      socket.off('queue:called', handleQueueEvent);
      socket.off('queue:completed', handleQueueEvent);
      socket.off('queue:updated', handleQueueEvent);
      socket.off('appointment:updated', handleAppointmentUpdated);
    };
  }, [refreshAppointmentsQuietly]);

  const stats = useMemo(() => ({
    total: appointments.length,
    pending: appointments.filter((item) => item.status === 'pending').length,
    confirmed: appointments.filter((item) => item.status === 'confirmed').length,
    completed: appointments.filter((item) => item.status === 'completed').length,
    cancelled: appointments.filter((item) => item.status === 'cancelled').length,
    noShow: appointments.filter((item) => item.status === 'no_show').length,
    cancelRequested: appointments.filter((item) => item.status === 'cancel_requested').length
  }), [appointments]);

  const filteredAppointments = useMemo(() => {
    if (activeFilter === 'all') return appointments;
    return appointments.filter((item) => item.status === activeFilter);
  }, [activeFilter, appointments]);

  const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / pageSize));
  const paginatedAppointments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAppointments.slice(start, start + pageSize);
  }, [currentPage, filteredAppointments]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    const appointmentId = new URLSearchParams(location.search).get('appointmentId');
    if (!appointmentId || queryOpenedRef.current === appointmentId || !appointments.length) return;

    const appointment = appointments.find((item) => item._id === appointmentId);
    if (appointment) {
      queryOpenedRef.current = appointmentId;
      setSelectedAppointment(appointment);
    }
  }, [appointments, location.search]);

  function selectFilter(filter) {
    setActiveFilter(filter);
    setCurrentPage(1);
  }

  function changePage(nextPage) {
    setCurrentPage(Math.min(Math.max(nextPage, 1), totalPages));
  }

  function applyUpdatedAppointment(nextAppointment) {
    setAppointments((current) => current.map((item) => (item._id === nextAppointment._id ? nextAppointment : item)));
    setSelectedAppointment((current) => (current?._id === nextAppointment._id ? nextAppointment : current));
  }

  async function openMedicalRecord(appointment) {
    if (!appointment?._id || medicalRecordLoadingId === appointment._id) return;

    setMedicalRecordLoadingId(appointment._id);
    try {
      const payload = await api(`/appointments/${appointment._id}/medical-record`);
      setSelectedMedicalRecord(payload.data);
    } catch (err) {
      toast.warning(err.message || 'Hồ sơ đang được cập nhật');
    } finally {
      setMedicalRecordLoadingId((current) => (current === appointment._id ? '' : current));
    }
  }

  async function downloadAppointmentPdf(appointment, type) {
    if (!appointment?._id) return;
    const key = `${appointment._id}:${type}`;
    if (downloadingPdfKey) return;

    setDownloadingPdfKey(key);
    try {
      if (type === 'appointment') {
        await downloadPdf(`/appointments/${appointment._id}/pdf`, `phieu-dat-lich-${appointment._id}.pdf`);
      } else if (type === 'queue') {
        await downloadPdf(`/appointments/${appointment._id}/queue-ticket/pdf`, `phieu-kham-${appointment._id}.pdf`);
      } else if (type === 'record') {
        const payload = await api(`/appointments/${appointment._id}/medical-record`);
        await downloadPdf(`/medical-records/${payload.data._id}/pdf`, `ket-qua-kham-${payload.data._id}.pdf`);
      }
    } catch (err) {
      toast.error(errorMessage(err) || 'Không tải được PDF');
    } finally {
      setDownloadingPdfKey('');
    }
  }

  async function submitDoctorReview({ rating, comment }) {
    if (!reviewingAppointment?._id) return;
    if (!rating) {
      toast.warning('Vui lòng chọn số sao đánh giá');
      return;
    }
    if (comment.length > 1000) {
      toast.warning('Nhận xét tối đa 1000 ký tự');
      return;
    }

    try {
      const payload = await api('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          appointmentId: reviewingAppointment._id,
          rating,
          comment: comment.trim()
        })
      });
      const review = payload.data;
      setAppointments((current) => current.map((item) => (
        item._id === reviewingAppointment._id ? { ...item, doctorReview: review } : item
      )));
      setReviewingAppointment(null);
      toast.success('Cảm ơn bạn đã đánh giá bác sĩ');
    } catch (err) {
      toast.error(errorMessage(err) || 'Không gửi được đánh giá');
    }
  }

  async function cancelAppointment(appointment, reason = '') {
    if (appointment.status === 'confirmed' && !reason.trim()) {
      toast.warning('Vui lòng nhập lý do hủy lịch');
      return;
    }

    try {
      const payload = await api(`/appointments/${appointment._id}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: reason.trim() })
      });
      applyUpdatedAppointment(payload.data);
      setCancellingAppointment(null);
      if (payload.data?.status === 'cancel_requested') {
        toast.info(cleanDisplayText(payload.message, 'Đã gửi yêu cầu hủy lịch. Vui lòng chờ phòng khám xác nhận.'));
      } else {
        toast.success(cleanDisplayText(payload.message, 'Hủy lịch hẹn thành công'));
      }
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function requestReschedule(appointment, request) {
    if (!request.newDate) {
      toast.warning('Vui lòng chọn ngày mới');
      return;
    }
    if (!request.newTimeSlot) {
      toast.warning('Vui lòng chọn khung giờ mới');
      return;
    }
    if (!request.reason.trim()) {
      toast.warning('Vui lòng nhập lý do đổi lịch');
      return;
    }

    try {
      const payload = await api(`/appointments/${appointment._id}/reschedule-request`, {
        method: 'PATCH',
        body: JSON.stringify({
          newDate: request.newDate,
          newTimeSlot: request.newTimeSlot,
          reason: request.reason.trim()
        })
      });
      applyUpdatedAppointment(payload.data);
      setReschedulingAppointment(null);
      await loadAppointments();
      toast.info(cleanDisplayText(payload.message, 'Đã gửi yêu cầu đổi lịch. Vui lòng chờ phòng khám xác nhận.'));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function cancelRescheduleRequest(appointment) {
    try {
      const payload = await api(`/appointments/${appointment._id}/cancel-reschedule-request`, {
        method: 'PATCH'
      });
      applyUpdatedAppointment(payload.data);
      setCancellingRescheduleAppointment(null);
      await loadAppointments();
      toast.success(cleanDisplayText(payload.message, 'Đã hủy yêu cầu đổi lịch.'));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function cancelWaitingEntry(entry) {
    try {
      const payload = await api(`/waiting-list/${entry._id}`, { method: 'DELETE' });
      setWaitingEntries((current) => current.map((item) => (item._id === entry._id ? payload.data : item)));
      toast.success(cleanDisplayText(payload.message, 'Đã hủy đăng ký danh sách chờ'));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <main className="section-band my-appointments-page">
      <div className="container">
        <div className="page-heading appointment-heading">
          <div>
            <span className="eyebrow">Tài khoản bệnh nhân</span>
            <h1 className="h2 mt-2 mb-2">Lịch hẹn của tôi</h1>
            <p className="text-secondary mb-0">
              Theo dõi lịch khám, bác sĩ phụ trách và trạng thái xác nhận trong một nơi.
            </p>
          </div>
        </div>

        <div className="patient-appointment-tabs" role="tablist" aria-label="Quản lý lịch khám">
          <button
            className={activeView === 'appointments' ? 'active' : ''}
            role="tab"
            type="button"
            onClick={() => setActiveView('appointments')}
          >
            Lịch hẹn <span>{appointments.length}</span>
          </button>
          <button
            className={activeView === 'waiting-list' ? 'active' : ''}
            role="tab"
            type="button"
            onClick={() => setActiveView('waiting-list')}
          >
            Danh sách chờ <span>{waitingEntries.filter((item) => ['waiting', 'offered'].includes(item.status)).length}</span>
          </button>
        </div>

        {activeView === 'appointments' && (
          <>

        {appointments.length > 0 && (
          <>
            <div className="appointment-stats-grid mb-3">
              <button className={`appointment-stat-card ${activeFilter === 'all' ? 'active' : ''}`} type="button" onClick={() => selectFilter('all')}>
                <span>Tổng lịch hẹn</span>
                <strong>{stats.total}</strong>
              </button>
              <button className={`appointment-stat-card warning ${activeFilter === 'pending' ? 'active' : ''}`} type="button" onClick={() => selectFilter('pending')}>
                <span>Chờ xác nhận</span>
                <strong>{stats.pending}</strong>
              </button>
              <button className={`appointment-stat-card success ${activeFilter === 'confirmed' ? 'active' : ''}`} type="button" onClick={() => selectFilter('confirmed')}>
                <span>Đã xác nhận</span>
                <strong>{stats.confirmed}</strong>
              </button>
              <button className={`appointment-stat-card primary ${activeFilter === 'completed' ? 'active' : ''}`} type="button" onClick={() => selectFilter('completed')}>
                <span>Hoàn thành</span>
                <strong>{stats.completed}</strong>
              </button>
              <button className={`appointment-stat-card danger ${activeFilter === 'cancelled' ? 'active' : ''}`} type="button" onClick={() => selectFilter('cancelled')}>
                <span>Đã hủy</span>
                <strong>{stats.cancelled}</strong>
              </button>
              <button className={`appointment-stat-card danger ${activeFilter === 'no_show' ? 'active' : ''}`} type="button" onClick={() => selectFilter('no_show')}>
                <span>Không đến khám</span>
                <strong>{stats.noShow}</strong>
              </button>
            </div>

            {stats.cancelRequested > 0 && (
              <div className="cancel-request-notice mb-3">
                Có {stats.cancelRequested} yêu cầu hủy đang xử lý
              </div>
            )}
          </>
        )}

        {appointments.length > 0 && (
          <div className="appointment-filter-bar mb-3">
            <span>Đang xem: <strong>{filterLabels[activeFilter]}</strong></span>
            {activeFilter !== 'all' && (
              <button className="btn btn-outline-primary btn-sm" type="button" onClick={() => selectFilter('all')}>
                Xem tất cả
              </button>
            )}
          </div>
        )}

        {loading && (
          <div className="row g-3 mt-1">
            {Array.from({ length: 4 }, (_, i) => (
              <div className="col-12" key={i}>
                <div style={{ padding: '20px', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-xl)', background: '#fff' }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div className="skeleton-line" style={{ width: 80, height: 20, borderRadius: 6 }} />
                    <div className="skeleton-line" style={{ width: 60, height: 20, borderRadius: 6 }} />
                    <div className="skeleton-line" style={{ flex: 1, height: 20, borderRadius: 6 }} />
                    <div className="skeleton-line" style={{ width: 90, height: 28, borderRadius: 14 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {error && <div className="alert alert-danger mt-3">{error}</div>}

        {!loading && !error && !appointments.length && (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <h3 className="empty-state-title">Bạn chưa có lịch khám nào</h3>
            <p className="empty-state-desc">Hãy đặt lịch khám đầu tiên để được bác sĩ hỗ trợ.</p>
            <Link className="btn btn-primary" to="/booking">Đặt lịch khám</Link>
          </div>
        )}

        {!loading && !error && appointments.length > 0 && !filteredAppointments.length && (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3 className="empty-state-title">Không có lịch hẹn nào trong mục này</h3>
            <p className="empty-state-desc">Chọn bộ lọc khác hoặc xem tất cả lịch hẹn của bạn.</p>
            <button className="btn btn-primary" type="button" onClick={() => selectFilter('all')}>Xem tất cả</button>
          </div>
        )}

        {!loading && !error && filteredAppointments.length > 0 && (
          <>
            <div className="appointment-table-card d-none d-lg-block">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0 appointment-table">
                  <thead>
                    <tr>
                      <th>Ngày khám</th>
                      <th>Khung giờ</th>
                      <th>Cơ sở</th>
                      <th>Chuyên khoa</th>
                      <th>Bác sĩ</th>
                      <th>Trạng thái</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAppointments.map((item) => (
                      <tr key={item._id}>
                        <td>{item.date}</td>
                        <td>{item.timeSlot}</td>
                        <td>{valueName(item.clinicId)}</td>
                        <td>{valueName(item.specialtyId)}</td>
                        <td>{valueName(item.doctorId)}</td>
                        <td>
                          <div className="appointment-status-stack">
                            <StatusBadge status={item.status} />
                            <AppointmentQueueSummary appointment={item} />
                            <AppointmentServicePackageChip appointment={item} />
                          </div>
                        </td>
                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-2">
                            <button className="btn btn-outline-primary btn-sm" type="button" onClick={() => setSelectedAppointment(item)}>
                              Chi tiết
                            </button>
                            <button className="btn btn-outline-primary btn-sm" disabled={downloadingPdfKey === `${item._id}:appointment`} type="button" onClick={() => downloadAppointmentPdf(item, 'appointment')}>
                              Tải phiếu đặt lịch
                            </button>
                            {item.queueNumber && (
                              <button className="btn btn-outline-primary btn-sm" disabled={downloadingPdfKey === `${item._id}:queue`} type="button" onClick={() => downloadAppointmentPdf(item, 'queue')}>
                                Tải phiếu khám
                              </button>
                            )}
                            {canViewMedicalRecord(item) && (
                              <button className="btn btn-outline-success btn-sm" disabled={medicalRecordLoadingId === item._id} type="button" onClick={() => openMedicalRecord(item)}>
                                Xem hồ sơ
                              </button>
                            )}
                            {canViewMedicalRecord(item) && (
                              <button className="btn btn-outline-success btn-sm" disabled={downloadingPdfKey === `${item._id}:record`} type="button" onClick={() => downloadAppointmentPdf(item, 'record')}>
                                Tải kết quả khám
                              </button>
                            )}
                            {canReviewDoctor(item) && (
                              <button
                                className={item.doctorReview ? 'btn btn-outline-secondary btn-sm' : 'btn btn-warning btn-sm'}
                                type="button"
                                onClick={() => setReviewingAppointment(item)}
                              >
                                {item.doctorReview ? 'Đã đánh giá' : 'Đánh giá bác sĩ'}
                              </button>
                            )}
                            {canCancelAppointment(item) && (
                              <button className="btn btn-outline-danger btn-sm" type="button" onClick={() => setCancellingAppointment(item)}>
                                {cancelActionLabel(item)}
                              </button>
                            )}
                            {canCancelRescheduleRequest(item) && (
                              <button className="btn btn-outline-warning btn-sm" type="button" onClick={() => setCancellingRescheduleAppointment(item)}>
                                Hủy yêu cầu đổi lịch
                              </button>
                            )}
                            {canRescheduleAppointment(item) && (
                              <button className="btn btn-outline-info btn-sm" type="button" onClick={() => setReschedulingAppointment(item)}>
                                Yêu cầu đổi lịch
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="appointment-mobile-list d-lg-none">
              {paginatedAppointments.map((item) => (
                <AppointmentMobileCard
                  appointment={{ ...item, medicalRecordLoading: medicalRecordLoadingId === item._id }}
                  downloadingPdfKey={downloadingPdfKey}
                  key={item._id}
                  onCancel={setCancellingAppointment}
                  onCancelReschedule={setCancellingRescheduleAppointment}
                  onDetail={setSelectedAppointment}
                  onDownloadPdf={downloadAppointmentPdf}
                  onReviewDoctor={setReviewingAppointment}
                  onReschedule={setReschedulingAppointment}
                  onViewMedicalRecord={openMedicalRecord}
                />
              ))}
            </div>

            <div className="appointment-pagination">
              <button
                className="btn btn-secondary btn-sm"
                disabled={currentPage === 1}
                type="button"
                onClick={() => changePage(currentPage - 1)}
              >
                ← Trước
              </button>
              <span style={{ fontSize: '0.87rem', color: 'var(--gray-500)', fontWeight: 500 }}>
                Trang {currentPage} / {totalPages} · {filteredAppointments.length} lịch hẹn
              </span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={currentPage === totalPages}
                type="button"
                onClick={() => changePage(currentPage + 1)}
              >
                Sau →
              </button>
            </div>
          </>
        )}
      </>
    )}

        {activeView === 'waiting-list' && (
          <section className="waiting-list-section">
            <div className="waiting-list-heading">
              <div>
                <span className="eyebrow">Danh sách chờ</span>
                <h2>Theo dõi vị trí đang chờ</h2>
                <p>Hệ thống sẽ cập nhật khi phòng khám có khung giờ phù hợp dành cho bạn.</p>
              </div>
              <button className="btn btn-outline-primary btn-sm" disabled={waitingLoading} type="button" onClick={loadWaitingEntries}>
                Làm mới
              </button>
            </div>

            {waitingLoading && (
              <div className="row g-3">
                {Array.from({ length: 3 }, (_, i) => (
                  <div className="col-12" key={i}>
                    <div style={{ padding: '18px', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-xl)', background: '#fff' }}>
                      <div className="skeleton-line" style={{ height: 18, marginBottom: 10 }} />
                      <div className="skeleton-line" style={{ height: 14, width: '60%' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!waitingLoading && !waitingEntries.length && (
              <div className="empty-state">
                <div className="empty-state-icon">⌛</div>
                <h3 className="empty-state-title">Bạn chưa tham gia danh sách chờ nào</h3>
                <p className="empty-state-desc">Khi khung giờ mong muốn đã đầy, bạn có thể đăng ký chờ ngay tại trang bác sĩ.</p>
                <Link className="btn btn-primary" to="/doctors">Tìm bác sĩ</Link>
              </div>
            )}

            {!waitingLoading && waitingEntries.length > 0 && (
              <>
                <div className="appointment-table-card d-none d-lg-block">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0 appointment-table waiting-list-table">
                      <thead>
                        <tr><th>Bác sĩ</th><th>Cơ sở</th><th>Ngày</th><th>Khung giờ</th><th>Vị trí</th><th>Trạng thái</th><th /></tr>
                      </thead>
                      <tbody>
                        {waitingEntries.map((entry) => (
                          <tr key={entry._id}>
                            <td className="fw-semibold">{valueName(entry.doctorId)}</td>
                            <td>{valueName(entry.clinicId)}</td>
                            <td>{entry.date}</td>
                            <td>{entry.timeSlot}</td>
                            <td><span className="waiting-position-badge">#{entry.position}</span></td>
                            <td><WaitingStatusBadge status={entry.status} /></td>
                            <td className="text-end">
                              {['waiting', 'offered'].includes(entry.status) && (
                                <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => cancelWaitingEntry(entry)}>
                                  Hủy đăng ký
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="waiting-list-mobile d-lg-none">
                  {waitingEntries.map((entry) => (
                    <article className="waiting-list-mobile-card" key={entry._id}>
                      <div className="d-flex justify-content-between align-items-start gap-3">
                        <div><span>Vị trí</span><strong>#{entry.position}</strong></div>
                        <WaitingStatusBadge status={entry.status} />
                      </div>
                      <h3>{valueName(entry.doctorId)}</h3>
                      <dl>
                        <div><dt>Cơ sở</dt><dd>{valueName(entry.clinicId)}</dd></div>
                        <div><dt>Ngày</dt><dd>{entry.date}</dd></div>
                        <div><dt>Khung giờ</dt><dd>{entry.timeSlot}</dd></div>
                      </dl>
                      {['waiting', 'offered'].includes(entry.status) && (
                        <button className="btn btn-outline-danger btn-sm w-100" type="button" onClick={() => cancelWaitingEntry(entry)}>
                          Hủy đăng ký
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        <AppointmentDetailModal
          appointment={selectedAppointment}
          onCancel={setCancellingAppointment}
          onClose={() => setSelectedAppointment(null)}
        />
        <MedicalRecordDetailModal
          record={selectedMedicalRecord}
          onClose={() => setSelectedMedicalRecord(null)}
        />
        <ReviewDoctorModal
          appointment={reviewingAppointment}
          existingReview={reviewingAppointment?.doctorReview}
          onClose={() => setReviewingAppointment(null)}
          onSubmit={submitDoctorReview}
        />
        {cancellingAppointment && (
          <CancelConfirmDialog
            appointment={cancellingAppointment}
            onCancel={() => setCancellingAppointment(null)}
            onConfirm={(reason) => cancelAppointment(cancellingAppointment, reason)}
          />
        )}
        {reschedulingAppointment && (
          <RescheduleRequestModal
            appointment={reschedulingAppointment}
            onClose={() => setReschedulingAppointment(null)}
            onSubmit={requestReschedule}
          />
        )}
        {cancellingRescheduleAppointment && (
          <CancelRescheduleRequestDialog
            onCancel={() => setCancellingRescheduleAppointment(null)}
            onConfirm={() => cancelRescheduleRequest(cancellingRescheduleAppointment)}
          />
        )}
      </div>
    </main>
  );
}
