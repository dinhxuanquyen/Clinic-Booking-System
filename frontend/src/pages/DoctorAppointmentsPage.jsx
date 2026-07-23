import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import AppointmentDetailModal from '../components/AppointmentDetailModal.jsx';
import BaseModal from '../components/BaseModal.jsx';
import MedicalRecordModal from '../components/MedicalRecordModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { connectSocket, getSocket } from '../services/socket.js';
import { getToken } from '../utils/auth.js';
import { downloadPdf } from '../utils/downloadFile.js';
import { downloadMedicalRecordPdf } from '../utils/medicalRecordPdf.js';
import { getStatusBadge } from '../utils/status.js';
import { AdminEmptyState, AdminPagination, ConfirmDialog, getName, paginate } from './admin/adminUtils.jsx';

const actionStatuses = ['pending', 'cancel_requested', 'reschedule_requested'];

const statusTabs = [
  { key: 'action', label: 'Cần xử lý', statuses: actionStatuses, empty: 'Không có lịch cần xử lý' },
  { key: 'all', label: 'Tất cả', empty: 'Không có lịch hẹn phù hợp' },
  { key: 'pending', label: 'Chờ xác nhận', empty: 'Không có lịch chờ xác nhận' },
  { key: 'confirmed', label: 'Đã xác nhận', empty: 'Không có lịch đã xác nhận' },
  { key: 'in_progress', label: 'Đang khám', empty: 'Không có lịch đang khám' },
  { key: 'completed', label: 'Hoàn thành', empty: 'Chưa có lịch hoàn thành' },
  { key: 'cancelled', label: 'Đã hủy', empty: 'Không có lịch đã hủy' },
  { key: 'no_show', label: 'Không đến khám', empty: 'Không có lịch không đến khám' },
  { key: 'cancel_requested', label: 'Yêu cầu hủy', empty: 'Không có yêu cầu hủy' },
  { key: 'reschedule_requested', label: 'Yêu cầu đổi lịch', empty: 'Không có yêu cầu đổi lịch' }
];

const statusPriority = {
  pending: 1,
  cancel_requested: 2,
  reschedule_requested: 3,
  confirmed: 4,
  in_progress: 5,
  completed: 6,
  cancelled: 7,
  no_show: 8
};

const quickDateFilters = [
  { key: 'today', label: 'Hôm nay' },
  { key: 'next7', label: '7 ngày tới' },
  { key: 'month', label: 'Tháng này' },
  { key: 'all', label: 'Tất cả' }
];

function patientName(appointment) {
  return appointment.patientInfo?.name || appointment.patientId?.name || 'Bệnh nhân';
}

function recordValue(value) {
  if (!value) return 'Chưa cập nhật';
  return typeof value === 'object' ? value.name : value;
}

function isFollowUpAppointment(appointment) {
  return Boolean(appointment?.isFollowUp || appointment?.followUpRecordId);
}

function formatRecordDate(value) {
  if (!value) return 'Chưa cập nhật';
  return String(value).slice(0, 10);
}

function getFollowUpAppointmentHint(appointment) {
  const record = appointment?.followUpRecordId && typeof appointment.followUpRecordId === 'object'
    ? appointment.followUpRecordId
    : null;
  const original = record?.appointmentId && typeof record.appointmentId === 'object'
    ? record.appointmentId
    : appointment?.originalAppointmentId;

  if (original && typeof original === 'object' && original.date) {
    return `Theo hồ sơ ${formatRecordDate(original.date)}${original.timeSlot ? ` · ${original.timeSlot}` : ''}`;
  }
  if (record?.followUpDate) return `Ngày khuyến nghị ${formatRecordDate(record.followUpDate)}`;
  return 'Lịch tái khám theo hồ sơ đã tạo';
}

function FollowUpAppointmentChip({ appointment }) {
  if (!isFollowUpAppointment(appointment)) return null;

  return (
    <span className="follow-up-appointment-chip doctor-follow-up-appointment-chip" title={getFollowUpAppointmentHint(appointment)}>
      Tái khám
    </span>
  );
}

function recordFollowUpText(record) {
  if (!record?.followUpRequired) return 'Không cần tái khám';
  return record.followUpDate ? String(record.followUpDate).slice(0, 10) : 'Chưa cập nhật';
}

function entityId(value) {
  return typeof value === 'object' ? value?._id : value;
}

function getSourceFollowUpRecordFromRecord(record) {
  const source = record?.appointmentId?.followUpRecordId;
  return source && typeof source === 'object' ? source : null;
}

function getSourceFollowUpRecordIdFromRecord(record) {
  return entityId(record?.appointmentId?.followUpRecordId);
}

function isFollowUpMedicalRecord(record) {
  return Boolean(record?.appointmentId?.isFollowUp || record?.appointmentId?.followUpRecordId);
}

function sourceFollowUpVisitText(record) {
  const sourceRecord = getSourceFollowUpRecordFromRecord(record);
  const sourceAppointment = sourceRecord?.appointmentId || record?.appointmentId?.originalAppointmentId;
  if (sourceAppointment?.date) {
    return `${formatRecordDate(sourceAppointment.date)}${sourceAppointment.timeSlot ? ` · ${sourceAppointment.timeSlot}` : ''}`;
  }
  if (sourceRecord?.createdAt) return formatRecordDate(sourceRecord.createdAt);
  return 'lần khám trước';
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
          <div><span>Ngày hết hạn</span><strong>{insurance.insuranceExpiryDate ? String(insurance.insuranceExpiryDate).slice(0, 10) : 'Chưa cập nhật'}</strong></div>
          <div><span>Nơi đăng ký KCB ban đầu</span><strong>{insurance.insuranceRegisteredHospital || 'Chưa cập nhật'}</strong></div>
        </div>
      )}
    </div>
  );
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayString() {
  return formatLocalDate(new Date());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function monthRange() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: formatLocalDate(first),
    to: formatLocalDate(last)
  };
}

function isInDateRange(appointment, rangeKey, dateFilter, customFromDate = '', customToDate = '') {
  if (dateFilter) return appointment.date === dateFilter;
  if (rangeKey === 'customRange') {
    if (customFromDate && appointment.date < customFromDate) return false;
    if (customToDate && appointment.date > customToDate) return false;
    return true;
  }
  if (rangeKey === 'all') return true;

  const today = todayString();
  if (rangeKey === 'today') return appointment.date === today;
  if (rangeKey === 'next7') {
    const to = formatLocalDate(addDays(new Date(), 6));
    return appointment.date >= today && appointment.date <= to;
  }
  if (rangeKey === 'month') {
    const { from, to } = monthRange();
    return appointment.date >= from && appointment.date <= to;
  }

  return true;
}

function sortAppointmentsByPriority(items) {
  return [...items].sort((a, b) => {
    const priorityDiff = (statusPriority[a.status] || 99) - (statusPriority[b.status] || 99);
    if (priorityDiff) return priorityDiff;
    if (a.date !== b.date) return String(b.date || '').localeCompare(String(a.date || ''));
    return String(a.timeSlot || '').localeCompare(String(b.timeSlot || ''));
  });
}

function MedicalRecordDetailModal({ record, onClose }) {
  const navigate = useNavigate();
  if (!record) return null;

  const appointment = record.appointmentId || {};
  const vitalItems = medicalRecordVitalItems(record);
  const sourceRecord = getSourceFollowUpRecordFromRecord(record);
  const sourceRecordId = getSourceFollowUpRecordIdFromRecord(record);
  const showSourceFollowUp = isFollowUpMedicalRecord(record) && sourceRecordId;

  return (
    <BaseModal ariaLabel="Chi tiết hồ sơ khám" className="admin-modal medical-record-detail-modal" onClose={onClose} size="lg">
      <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
        <div>
          <span className="eyebrow">Hồ sơ khám bệnh</span>
          <h2 className="h4 mt-2 mb-1">{appointment.date || String(record.createdAt || '').slice(0, 10)} - {appointment.timeSlot || ''}</h2>
          <p className="text-secondary mb-0">{recordValue(record.patientId)} · {recordValue(record.specialtyId)}</p>
        </div>
        <button className="btn btn-sm btn-outline-secondary" type="button" onClick={onClose}>Đóng</button>
      </div>

      <div className="medical-record-detail-grid">
        <div><span>Bệnh nhân</span><strong>{recordValue(record.patientId)}</strong></div>
        <div><span>Cơ sở</span><strong>{recordValue(record.clinicId)}</strong></div>
        <div><span>Chuyên khoa</span><strong>{recordValue(record.specialtyId)}</strong></div>
        <div><span>Tái khám</span><strong>{recordFollowUpText(record)}</strong></div>
      </div>

      <InsuranceSnapshotCard insurance={appointment.insuranceSnapshot} />

      {showSourceFollowUp && (
        <div className="medical-record-source-card">
          <div>
            <span>Hồ sơ tái khám</span>
            <strong>Hồ sơ này là tái khám từ hồ sơ ngày {sourceFollowUpVisitText(record)}.</strong>
            {sourceRecord?.diagnosis && <p>Chẩn đoán lần khám gốc: {sourceRecord.diagnosis}</p>}
          </div>
          <button
            className="btn btn-sm btn-outline-primary"
            type="button"
            onClick={() => {
              onClose();
              navigate(`/doctor/medical-records?recordId=${sourceRecordId}`);
            }}
          >
            Xem hồ sơ gốc
          </button>
        </div>
      )}

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
                {record.prescription.map((medicine, index) => (
                  <tr key={`${medicine.medicineName}-${index}`}>
                    <td>{medicine.medicineName}</td>
                    <td>{medicine.dosage || '-'}</td>
                    <td>{medicine.frequency || '-'}</td>
                    <td>{medicine.duration || '-'}</td>
                    <td>{medicine.note || '-'}</td>
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

function successMessage(status, context = '') {
  if (status === 'confirmed' && context === 'reschedule_request') return 'Đã duyệt yêu cầu đổi lịch';
  if (status === 'reschedule_rejected') return 'Đã từ chối yêu cầu đổi lịch';
  if (status === 'confirmed' && context === 'cancel_request') return 'Đã từ chối yêu cầu hủy';
  if (status === 'cancelled' && context === 'cancel_request') return 'Đã duyệt yêu cầu hủy';
  if (status === 'confirmed') return 'Đã xác nhận lịch hẹn';
  if (status === 'in_progress') return 'Đã bắt đầu khám';
  if (status === 'completed') return 'Đã hoàn thành khám';
  if (status === 'cancelled') return 'Đã hủy lịch hẹn';
  return 'Cập nhật lịch hẹn thành công';
}

export default function DoctorAppointmentsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryOpenedRef = useRef('');
  const actionLockRef = useRef('');
  const initialFromDate = searchParams.get('fromDate') || '';
  const initialToDate = searchParams.get('toDate') || '';
  const [appointments, setAppointments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [dateFilter, setDateFilter] = useState('');
  const [dateRange, setDateRange] = useState(initialFromDate || initialToDate ? 'customRange' : 'all');
  const [customFromDate, setCustomFromDate] = useState(initialFromDate);
  const [customToDate, setCustomToDate] = useState(initialToDate);
  const [activeStatusTab, setActiveStatusTab] = useState(() => {
    const status = new URLSearchParams(window.location.search).get('status');
    return statusTabs.some((tab) => tab.key === status) ? status : 'all';
  });
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmAction, setConfirmAction] = useState(null);
  const [reasonAction, setReasonAction] = useState(null);
  const [medicalRecordAppointment, setMedicalRecordAppointment] = useState(null);
  const [selectedMedicalRecord, setSelectedMedicalRecord] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState('');
  const [actionLoadingType, setActionLoadingType] = useState('');
  const [downloadingPdfKey, setDownloadingPdfKey] = useState('');

  const dateFilteredAppointments = useMemo(
    () => appointments.filter((item) => isInDateRange(item, dateRange, dateFilter, customFromDate, customToDate)),
    [appointments, dateFilter, dateRange, customFromDate, customToDate]
  );

  const tabCounts = useMemo(() => {
    const counts = {};
    statusTabs.forEach((tab) => {
      counts[tab.key] = dateFilteredAppointments.filter((item) => {
        if (tab.key === 'all') return true;
        if (tab.statuses) return tab.statuses.includes(item.status);
        return item.status === tab.key;
      }).length;
    });
    return counts;
  }, [dateFilteredAppointments]);

  const summary = useMemo(() => {
    const today = todayString();
    const { from, to } = monthRange();
    return {
      action: appointments.filter((item) => actionStatuses.includes(item.status)).length,
      today: appointments.filter((item) => item.date === today).length,
      inProgress: appointments.filter((item) => item.status === 'in_progress').length,
      completedMonth: appointments.filter((item) => item.status === 'completed' && item.date >= from && item.date <= to).length,
      cancelledMonth: appointments.filter((item) => item.status === 'cancelled' && item.date >= from && item.date <= to).length,
      noShowMonth: appointments.filter((item) => item.status === 'no_show' && item.date >= from && item.date <= to).length
    };
  }, [appointments]);

  const activeTabConfig = statusTabs.find((tab) => tab.key === activeStatusTab) || statusTabs[1];

  const filteredAppointments = useMemo(() => {
    const statusFiltered = dateFilteredAppointments.filter((item) => {
      if (activeTabConfig.key === 'all') return true;
      if (activeTabConfig.statuses) return activeTabConfig.statuses.includes(item.status);
      return item.status === activeTabConfig.key;
    });
    return sortAppointmentsByPriority(statusFiltered);
  }, [activeTabConfig, dateFilteredAppointments]);

  const { currentPage: safePage, pageItems, totalPages } = useMemo(
    () => paginate(filteredAppointments, currentPage),
    [currentPage, filteredAppointments]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeStatusTab, dateFilter, dateRange, customFromDate, customToDate]);

  useEffect(() => {
    const status = searchParams.get('status');
    if (status && statusTabs.some((tab) => tab.key === status) && status !== activeStatusTab) {
      setActiveStatusTab(status);
    } else if (!status && activeStatusTab !== 'all') {
      setActiveStatusTab('all');
    }
  }, [activeStatusTab, searchParams]);

  useEffect(() => {
    const fromDate = searchParams.get('fromDate') || '';
    const toDate = searchParams.get('toDate') || '';
    if (!fromDate && !toDate) return;
    setCustomFromDate(fromDate);
    setCustomToDate(toDate);
    setDateFilter('');
    setDateRange('customRange');
  }, [searchParams]);

  async function loadAppointments({ preserveSelectedId = selected?._id } = {}) {
    if (!user?.doctorId) return [];

    setLoading(true);
    try {
      const payload = await api(`/doctors/${user.doctorId}/appointments`);
      const nextAppointments = payload.data || [];
      setAppointments(nextAppointments);
      if (preserveSelectedId) {
        const updatedSelected = nextAppointments.find((item) => item._id === preserveSelectedId);
        setSelected(updatedSelected || null);
      }
      return nextAppointments;
    } catch (error) {
      toast.error(error.message || 'Không tải được lịch hẹn');
      return [];
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments({ preserveSelectedId: null });
  }, [user?.doctorId]);

  useEffect(() => {
    if (!user?.doctorId) return undefined;

    const socket = getSocket() || connectSocket(getToken());
    if (!socket) return undefined;

    function handleAppointmentUpdated(payload) {
      const updatedAppointment = payload?.appointment;
      if (!updatedAppointment) return;
      if (String(updatedAppointment.doctorId?._id || updatedAppointment.doctorId) !== String(user.doctorId)) return;

      setAppointments((current) => current.map((item) => (
        item._id === updatedAppointment._id ? updatedAppointment : item
      )));
      setSelected((current) => (current?._id === updatedAppointment._id ? updatedAppointment : current));
    }

    function handleNotificationNew(payload) {
      const notification = payload?.notification || payload;
      if (!notification?.appointmentId) return;
      if (!String(notification.type || '').startsWith('doctor_')) return;

      api(`/doctors/${user.doctorId}/appointments`)
        .then((response) => setAppointments(response.data || []))
        .catch(() => {});
    }

    socket.on('appointment:updated', handleAppointmentUpdated);
    socket.on('notification:new', handleNotificationNew);
    return () => {
      socket.off('appointment:updated', handleAppointmentUpdated);
      socket.off('notification:new', handleNotificationNew);
    };
  }, [user?.doctorId]);

  useEffect(() => {
    const appointmentId = new URLSearchParams(location.search).get('appointmentId');
    if (!appointmentId || queryOpenedRef.current === appointmentId || !appointments.length) return;

    const appointment = appointments.find((item) => item._id === appointmentId);
    if (appointment) {
      queryOpenedRef.current = appointmentId;
      setSelected(appointment);
    }
  }, [appointments, location.search]);

  async function updateAppointmentStatus(appointment, status, note = '', context = '', { closeSelected = false } = {}) {
    if (!appointment?._id || actionLockRef.current === appointment._id) return false;

    const loadingType = `${status}:${context || 'status'}`;
    actionLockRef.current = appointment._id;
    setActionLoadingId(appointment._id);
    setActionLoadingType(loadingType);

    try {
      const payload = await api(`/appointments/${appointment._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          adminNote: note,
          reason: note
        })
      });

      const updatedAppointment = payload.data;
      if (!payload?.success && !updatedAppointment) {
        throw new Error(payload?.message || 'Không cập nhật được lịch hẹn');
      }
      toast.success(successMessage(status, context));
      setAppointments((current) => current.map((item) => (
        item._id === appointment._id ? (updatedAppointment || item) : item
      )));
      if (closeSelected) {
        setSelected(null);
      } else if (selected?._id === appointment._id && updatedAppointment) {
        setSelected(updatedAppointment);
      }
      return true;
    } catch (error) {
      toast.error(error.message || 'Không cập nhật được lịch hẹn');
      return false;
    } finally {
      if (actionLockRef.current === appointment._id) actionLockRef.current = '';
      setActionLoadingId((current) => (current === appointment._id ? '' : current));
      setActionLoadingType((current) => (current === loadingType ? '' : current));
    }
  }

  async function submitMedicalRecord(data) {
    const appointment = medicalRecordAppointment;
    if (!appointment?._id || actionLockRef.current === appointment._id) return;

    console.log('[DoctorAppointments] submit medical record', {
      appointmentId: appointment._id,
      selectedAppointment: appointment
    });

    actionLockRef.current = appointment._id;
    setActionLoadingId(appointment._id);
    setActionLoadingType('medical_record:create');

    try {
      const payload = await api('/medical-records', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          appointmentId: appointment._id
        })
      });
      const medicalRecord = payload.data?.medicalRecord || payload.data;
      const completedAppointment = payload.data?.appointment || payload.data?.appointmentId || medicalRecord?.appointmentId;
      const isDuplicateRecord = payload.message === 'Hồ sơ khám bệnh đã tồn tại';
      if (isDuplicateRecord) {
        toast.info('Hồ sơ khám bệnh đã tồn tại');
      } else {
        toast.success(payload.message || 'Tạo hồ sơ khám bệnh thành công');
      }
      if (completedAppointment?._id) {
        setAppointments((current) => current.map((item) => (
          item._id === completedAppointment._id ? { ...item, ...completedAppointment } : item
        )));
        setSelected((current) => (current?._id === completedAppointment._id ? { ...current, ...completedAppointment } : current));
      } else {
        setAppointments((current) => current.map((item) => (
          item._id === appointment._id
            ? { ...item, status: 'completed', consultationStatus: 'completed', completedAt: new Date().toISOString() }
            : item
        )));
      }
      setMedicalRecordAppointment(null);
    } catch (error) {
      toast.error(error.message || 'Không lưu được hồ sơ khám bệnh');
    } finally {
      if (actionLockRef.current === appointment._id) actionLockRef.current = '';
      setActionLoadingId((current) => (current === appointment._id ? '' : current));
      setActionLoadingType((current) => (current === 'medical_record:create' ? '' : current));
    }
  }

  function openMedicalRecordModal(appointment) {
    if (!appointment?._id || actionLockRef.current === appointment._id) return;

    const latestAppointment = appointments.find((item) => item._id === appointment._id) || appointment;
    console.log('[DoctorAppointments] open medical record modal', {
      appointmentId: latestAppointment._id,
      selectedAppointment: latestAppointment
    });

    if (latestAppointment.status !== 'in_progress') {
      toast.warning('Chỉ có thể nhập hồ sơ khi lịch đang khám');
      return;
    }

    setMedicalRecordAppointment(latestAppointment);
  }

  async function openMedicalRecordDetail(appointment) {
    if (!appointment?._id || actionLockRef.current === appointment._id) return;

    actionLockRef.current = appointment._id;
    setActionLoadingId(appointment._id);
    setActionLoadingType('medical_record:view');

    try {
      const payload = await api(`/appointments/${appointment._id}/medical-record`);
      setSelectedMedicalRecord(payload.data);
    } catch (error) {
      toast.error(error.message || 'Không tải được hồ sơ khám bệnh');
    } finally {
      if (actionLockRef.current === appointment._id) actionLockRef.current = '';
      setActionLoadingId((current) => (current === appointment._id ? '' : current));
      setActionLoadingType((current) => (current === 'medical_record:view' ? '' : current));
    }
  }

  async function downloadAppointmentPdf(appointment, type) {
    if (!appointment?._id) return;
    const key = `${appointment._id}:${type}`;
    if (downloadingPdfKey) return;

    setDownloadingPdfKey(key);
    try {
      if (type === 'appointment') {
        await downloadPdf(`/appointments/${appointment._id}/pdf`);
      } else if (type === 'queue') {
        await downloadPdf(`/appointments/${appointment._id}/queue-ticket/pdf`);
      } else if (type === 'record') {
        const payload = await api(`/appointments/${appointment._id}/medical-record`);
        await downloadMedicalRecordPdf(payload.data._id);
      }
    } catch (error) {
      toast.error(error.message || 'Không tải được PDF');
    } finally {
      setDownloadingPdfKey('');
    }
  }

  function updateStatusFromModal(appointment, status, note = '', context = '') {
    return updateAppointmentStatus(appointment, status, note, context);
  }

  async function handleConfirmAction() {
    if (!confirmAction || actionLockRef.current === confirmAction.appointment?._id) return;
    const { appointment, status, context } = confirmAction;
    const success = await updateAppointmentStatus(appointment, status, '', context);
    if (success) setConfirmAction(null);
  }

  function openConfirmAction(appointment, status, message, context = '') {
    if (actionLockRef.current === appointment?._id) return;
    setConfirmAction({ appointment, status, context, message });
  }

  function openReasonAction(appointment, status, context, title) {
    if (actionLockRef.current === appointment?._id) return;
    setReasonAction({ appointment, status, context, title, reason: '' });
  }

  async function submitReasonAction(event) {
    event.preventDefault();
    if (!reasonAction || actionLockRef.current === reasonAction.appointment?._id) return;

    const note = reasonAction.reason.trim();
    if (!note) {
      toast.warning('Vui lòng nhập lý do xử lý lịch hẹn');
      return;
    }

    const success = await updateAppointmentStatus(
      reasonAction.appointment,
      reasonAction.status,
      note,
      reasonAction.context
    );
    if (success) setReasonAction(null);
  }

  function detailButton(item) {
    const disabled = actionLoadingId === item._id;
    return (
      <button className="btn btn-sm btn-outline-primary" disabled={disabled} type="button" onClick={() => setSelected(item)}>
        Chi tiết
      </button>
    );
  }

  function pdfButtons(item) {
    const isDownloading = (type) => downloadingPdfKey === `${item._id}:${type}`;
    return (
      <>
        <button className="btn btn-sm btn-outline-primary" disabled={Boolean(downloadingPdfKey)} type="button" onClick={() => downloadAppointmentPdf(item, 'appointment')}>
          {isDownloading('appointment') ? 'Đang tải...' : 'Phiếu đặt lịch'}
        </button>
        {['confirmed', 'in_progress', 'completed'].includes(item.status) && (
          <button className="btn btn-sm btn-outline-primary" disabled={Boolean(downloadingPdfKey)} type="button" onClick={() => downloadAppointmentPdf(item, 'queue')}>
            {isDownloading('queue') ? 'Đang tải...' : 'Phiếu khám'}
          </button>
        )}
        {item.status === 'completed' && (
          <button className="btn btn-sm btn-outline-success" disabled={Boolean(downloadingPdfKey)} type="button" onClick={() => downloadAppointmentPdf(item, 'record')}>
            {isDownloading('record') ? 'Đang tải...' : 'Kết quả khám'}
          </button>
        )}
      </>
    );
  }

  function actionLabel(item, status, context, label) {
    return actionLoadingId === item._id && actionLoadingType === `${status}:${context || 'status'}`
      ? 'Đang xử lý...'
      : label;
  }

  function renderQuickActions(item) {
    const disabled = actionLoadingId === item._id;

    if (item.status === 'pending') {
      return (
        <div className="doctor-appointment-actions">
          <button className="btn btn-sm btn-success" disabled={disabled} type="button" onClick={() => openConfirmAction(item, 'confirmed', 'Bạn có chắc muốn xác nhận lịch hẹn này?')}>
            {actionLabel(item, 'confirmed', '', 'Xác nhận')}
          </button>
          <button className="btn btn-sm btn-outline-danger" disabled={disabled} type="button" onClick={() => openReasonAction(item, 'cancelled', 'direct_cancel', 'Hủy lịch hẹn')}>
            Hủy
          </button>
          {detailButton(item)}
          {pdfButtons(item)}
        </div>
      );
    }

    if (item.status === 'confirmed') {
      return (
        <div className="doctor-appointment-actions">
          <button className="btn btn-sm btn-primary" disabled={disabled} type="button" onClick={() => openConfirmAction(item, 'in_progress', 'Bạn có chắc muốn bắt đầu khám cho lịch hẹn này?')}>
            {actionLabel(item, 'in_progress', '', 'Bắt đầu khám')}
          </button>
          <button className="btn btn-sm btn-outline-danger" disabled={disabled} type="button" onClick={() => openReasonAction(item, 'cancelled', 'direct_cancel', 'Hủy lịch hẹn')}>
            Hủy
          </button>
          {detailButton(item)}
          {pdfButtons(item)}
        </div>
      );
    }

    if (item.status === 'in_progress') {
      return (
        <div className="doctor-appointment-actions">
          <button className="btn btn-sm btn-success" disabled={disabled} type="button" onClick={() => openMedicalRecordModal(item)}>
            {actionLoadingType === 'medical_record:create' && disabled ? 'Đang xử lý...' : 'Hoàn thành & nhập hồ sơ'}
          </button>
          {detailButton(item)}
          {pdfButtons(item)}
        </div>
      );
    }

    if (item.status === 'completed') {
      return (
        <div className="doctor-appointment-actions">
          <button className="btn btn-sm btn-outline-success" disabled={disabled} type="button" onClick={() => openMedicalRecordDetail(item)}>
            {actionLoadingType === 'medical_record:view' && disabled ? 'Đang tải...' : 'Xem hồ sơ'}
          </button>
          {detailButton(item)}
          {pdfButtons(item)}
        </div>
      );
    }

    if (item.status === 'cancel_requested') {
      return (
        <div className="doctor-appointment-actions">
          <button className="btn btn-sm btn-success" disabled={disabled} type="button" onClick={() => openConfirmAction(item, 'cancelled', 'Bạn có chắc muốn duyệt yêu cầu hủy lịch này?', 'cancel_request')}>
            {actionLabel(item, 'cancelled', 'cancel_request', 'Duyệt hủy')}
          </button>
          <button className="btn btn-sm btn-outline-warning" disabled={disabled} type="button" onClick={() => openReasonAction(item, 'confirmed', 'cancel_request', 'Từ chối yêu cầu hủy')}>
            Từ chối hủy
          </button>
          {detailButton(item)}
          {pdfButtons(item)}
        </div>
      );
    }

    if (item.status === 'reschedule_requested') {
      return (
        <div className="doctor-appointment-actions">
          <button className="btn btn-sm btn-success" disabled={disabled} type="button" onClick={() => openConfirmAction(item, 'confirmed', 'Bạn có chắc muốn duyệt yêu cầu đổi lịch này?', 'reschedule_request')}>
            {actionLabel(item, 'confirmed', 'reschedule_request', 'Duyệt đổi lịch')}
          </button>
          <button className="btn btn-sm btn-outline-warning" disabled={disabled} type="button" onClick={() => openReasonAction(item, 'reschedule_rejected', 'reschedule_request', 'Từ chối yêu cầu đổi lịch')}>
            Từ chối đổi lịch
          </button>
          {detailButton(item)}
          {pdfButtons(item)}
        </div>
      );
    }

    return <div className="doctor-appointment-actions">{detailButton(item)}{pdfButtons(item)}</div>;
  }

  function changeStatusTab(tabKey) {
    setActiveStatusTab(tabKey);
    const nextParams = new URLSearchParams(searchParams);
    if (tabKey === 'all') {
      nextParams.delete('status');
    } else {
      nextParams.set('status', tabKey);
    }
    nextParams.delete('appointmentId');
    setSearchParams(nextParams);
  }

  function applyQuickDateFilter(key) {
    setDateRange(key);
    setDateFilter('');
    setCustomFromDate('');
    setCustomToDate('');
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('fromDate');
    nextParams.delete('toDate');
    nextParams.delete('appointmentId');
    setSearchParams(nextParams);
  }

  return (
    <div className="doctor-page doctor-appointments-page">
      <div className="doctor-page-header">
        <div className="doctor-page-header-main">
          <p className="doctor-page-eyebrow">Lịch hẹn của tôi</p>
          <h1 className="doctor-page-title">Danh sách lịch hẹn</h1>
          <p className="doctor-page-subtitle">Theo dõi và xử lý toàn bộ lịch hẹn thuộc hồ sơ bác sĩ của bạn.</p>
        </div>
      </div>

      <div className="doctor-appointment-stats">
        <article className="doctor-stat-card urgent">
          <div className="doctor-stat-icon">!</div>
          <div>
            <span>Cần xử lý</span>
            <strong>{summary.action}</strong>
            <small>Lịch chờ xác nhận/yêu cầu</small>
          </div>
        </article>
        <article className="doctor-stat-card today">
          <div className="doctor-stat-icon">📅</div>
          <div>
            <span>Lịch hôm nay</span>
            <strong>{summary.today}</strong>
            <small>Toàn bộ lịch trong ngày</small>
          </div>
        </article>
        <article className="doctor-stat-card active">
          <div className="doctor-stat-icon">▶</div>
          <div>
            <span>Đang khám</span>
            <strong>{summary.inProgress}</strong>
            <small>Ca đang thực hiện</small>
          </div>
        </article>
        <article className="doctor-stat-card done">
          <div className="doctor-stat-icon">✓</div>
          <div>
            <span>Hoàn thành tháng này</span>
            <strong>{summary.completedMonth}</strong>
            <small>Đã có kết quả khám</small>
          </div>
        </article>
        <article className="doctor-stat-card cancelled">
          <div className="doctor-stat-icon">×</div>
          <div>
            <span>Đã hủy tháng này</span>
            <strong>{summary.cancelledMonth}</strong>
            <small>Lịch đã hủy</small>
          </div>
        </article>
        <article className="doctor-stat-card no-show">
          <div className="doctor-stat-icon">!</div>
          <div>
            <span>Không đến khám</span>
            <strong>{summary.noShowMonth}</strong>
            <small>Lịch quá hạn tháng này</small>
          </div>
        </article>
      </div>

      <div className="doctor-appointments-controls">
        <section className="doctor-filter-card doctor-time-filter-card">
          <div className="doctor-filter-card-header">
            <div>
              <h2>Thời gian</h2>
              <p>Chọn nhanh khoảng thời gian cần theo dõi.</p>
            </div>
            {dateFilter && <span className="doctor-filter-active-date">Ngày chọn: {dateFilter}</span>}
            {!dateFilter && dateRange === 'customRange' && (
              <span className="doctor-filter-active-date">Khoảng: {customFromDate || '...'} - {customToDate || '...'}</span>
            )}
          </div>
          <div className="doctor-filter-card-body">
            <div className="doctor-quick-filter-group">
              {quickDateFilters.map((filter) => (
                <button
                  className={`doctor-quick-filter ${dateRange === filter.key && !dateFilter ? 'active' : ''}`}
                  key={filter.key}
                  type="button"
                  onClick={() => applyQuickDateFilter(filter.key)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            {(dateFilter || dateRange === 'customRange') && (
              <button
                className="doctor-clear-filter"
                type="button"
                onClick={() => {
                  setDateFilter('');
                  setCustomFromDate('');
                  setCustomToDate('');
                  setDateRange('all');
                  const nextParams = new URLSearchParams(searchParams);
                  nextParams.delete('fromDate');
                  nextParams.delete('toDate');
                  nextParams.delete('appointmentId');
                  setSearchParams(nextParams);
                }}
              >
                Xóa lọc thời gian
              </button>
            )}
          </div>
        </section>

        <section className="doctor-filter-card doctor-status-filter-card">
          <div className="doctor-filter-card-header">
            <div>
              <h2>Trạng thái lịch hẹn</h2>
              <p>Lọc nhanh các nhóm lịch cần xử lý hoặc theo dõi.</p>
            </div>
          </div>
          <div className="doctor-status-tabs" role="tablist" aria-label="Lọc lịch hẹn theo trạng thái">
            {statusTabs.map((tab) => (
              <button
                className={`doctor-status-tab ${activeStatusTab === tab.key ? 'active' : ''}`}
                key={tab.key}
                type="button"
                onClick={() => changeStatusTab(tab.key)}
              >
                <span>{tab.label}</span>
                <strong>{tabCounts[tab.key] || 0}</strong>
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="doctor-appointments-table-card">
        <div className="doctor-table-card-header">
          <div>
            <h2>Danh sách lịch hẹn</h2>
            <p>Hiển thị theo bộ lọc hiện tại</p>
          </div>
          <input
            className="form-control doctor-date-filter"
            type="date"
            value={dateFilter}
            onChange={(event) => {
              setDateFilter(event.target.value);
              setDateRange('custom');
              setCustomFromDate('');
              setCustomToDate('');
              const nextParams = new URLSearchParams(searchParams);
              nextParams.delete('fromDate');
              nextParams.delete('toDate');
              nextParams.delete('appointmentId');
              setSearchParams(nextParams);
            }}
          />
        </div>
        {loading ? (
          <AdminEmptyState message="Đang tải lịch hẹn..." />
        ) : filteredAppointments.length ? (
          <>
            {/* Desktop Table View */}
            <div className="table-responsive d-none d-md-block">
              <table className="table table-hover align-middle admin-table">
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Giờ</th>
                    <th>Bệnh nhân</th>
                    <th>Cơ sở</th>
                    <th>Chuyên khoa</th>
                    <th>Trạng thái</th>
                    <th className="text-end">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((item) => {
                    const status = getStatusBadge(item.status);
                    return (
                      <tr key={item._id}>
                        <td className="fw-semibold">{item.date}</td>
                        <td>{item.timeSlot}</td>
                        <td>
                          <div className="doctor-patient-cell">
                            <span>{patientName(item)}</span>
                            <FollowUpAppointmentChip appointment={item} />
                          </div>
                        </td>
                        <td>{getName(item.clinicId)}</td>
                        <td>{getName(item.specialtyId)}</td>
                        <td><span className={`badge ${status.className}`}>{status.label}</span></td>
                        <td className="text-end">{renderQuickActions(item)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="doctor-appointments-mobile-list d-block d-md-none">
              {pageItems.map((item) => {
                const status = getStatusBadge(item.status);
                return (
                  <article className="dam-card" key={item._id}>
                    <div className="dam-header">
                      <div className="dam-datetime">
                        <span className="dam-date">{item.date}</span>
                        <span className="dam-time">{item.timeSlot}</span>
                      </div>
                      <span className={`badge ${status.className}`}>{status.label}</span>
                    </div>
                    <div className="dam-body">
                      <h4 className="dam-patient">{patientName(item)}</h4>
                      <div className="dam-chips">
                        <FollowUpAppointmentChip appointment={item} />
                        <span className="dam-chip">{getName(item.specialtyId)}</span>
                        <span className="dam-chip dam-chip-muted">{getName(item.clinicId)}</span>
                      </div>
                    </div>
                    <div className="dam-actions">
                      {renderQuickActions(item)}
                    </div>
                  </article>
                );
              })}
            </div>

            <AdminPagination currentPage={safePage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </>
        ) : (
          <div className="doctor-appointments-empty">
            <span aria-hidden="true">∅</span>
            <h3>{activeTabConfig.empty}</h3>
            <p>Một số lịch có thể nằm ở bộ lọc khác.</p>
          </div>
        )}
      </section>

      <AppointmentDetailModal
        appointment={selected}
        currentUser={user}
        onClose={() => setSelected(null)}
        onUpdateStatus={updateStatusFromModal}
        role="doctor"
      />

      <MedicalRecordModal
        appointment={medicalRecordAppointment}
        submitting={actionLoadingId === medicalRecordAppointment?._id}
        onClose={() => {
          if (actionLoadingId !== medicalRecordAppointment?._id) setMedicalRecordAppointment(null);
        }}
        onSubmit={submitMedicalRecord}
      />

      <MedicalRecordDetailModal
        record={selectedMedicalRecord}
        onClose={() => setSelectedMedicalRecord(null)}
      />

      {confirmAction && (
        <ConfirmDialog
          title="Xác nhận thao tác"
          message={confirmAction.message}
          confirmText={actionLoadingId === confirmAction.appointment?._id ? 'Đang xử lý...' : 'Xác nhận'}
          cancelText="Hủy"
          onCancel={() => {
            if (actionLoadingId !== confirmAction.appointment?._id) setConfirmAction(null);
          }}
          onConfirm={handleConfirmAction}
        />
      )}

      {reasonAction && (
        <BaseModal ariaLabel={reasonAction.title || 'Xử lý lịch hẹn'} className="admin-modal doctor-action-modal" disableClose={actionLoadingId === reasonAction.appointment?._id} onClose={() => setReasonAction(null)} size="sm">
          <div className="doctor-action-modal-header">
            <div className="doctor-action-modal-title">
              <span className="eyebrow">Xử lý lịch hẹn</span>
              <h2>{reasonAction.title}</h2>
              <p>Ghi rõ lý do để bệnh nhân và phòng khám nắm được quyết định xử lý.</p>
            </div>
            <button className="btn btn-sm btn-outline-secondary doctor-action-modal-close" disabled={actionLoadingId === reasonAction.appointment?._id} type="button" onClick={() => setReasonAction(null)}>
              Đóng
            </button>
          </div>
          <form className="doctor-action-modal-form" onSubmit={submitReasonAction}>
            <label className="form-label">Lý do / ghi chú phản hồi</label>
            <textarea
              className="form-control"
              disabled={actionLoadingId === reasonAction.appointment?._id}
              rows="4"
              value={reasonAction.reason}
              onChange={(event) => setReasonAction((current) => ({ ...current, reason: event.target.value }))}
              placeholder="Nhập lý do để bệnh nhân/phòng khám nắm được thông tin"
            />
            <div className="doctor-action-modal-footer">
              <button className="btn btn-outline-secondary" disabled={actionLoadingId === reasonAction.appointment?._id} type="button" onClick={() => setReasonAction(null)}>
                Hủy
              </button>
              <button className="btn btn-primary" disabled={actionLoadingId === reasonAction.appointment?._id} type="submit">
                {actionLoadingId === reasonAction.appointment?._id ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </form>
        </BaseModal>
      )}
    </div>
  );
}
