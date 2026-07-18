import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import BaseModal from '../components/BaseModal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { downloadPdf } from '../utils/downloadFile.js';
import { connectSocket, getSocket } from '../services/socket.js';
import { getToken, getUser } from '../utils/auth.js';

function getName(value) {
  if (!value) return 'Đang cập nhật';
  return typeof value === 'object' ? value.name : value;
}

function formatDate(value) {
  if (!value) return 'Chưa cập nhật';
  return String(value).slice(0, 10);
}

function doctorFollowUpText(record) {
  if (!record?.followUpRequired) return 'Không cần tái khám';
  return record.followUpDate ? formatDate(record.followUpDate) : 'Chưa chỉ định ngày cụ thể';
}

function doctorFollowUpStatusLabel(record) {
  if (record?.followUpStatus === 'completed') return { label: 'Đã hoàn thành tái khám', tone: 'success' };
  if (!record?.followUpRequired) return { label: 'Không cần tái khám', tone: 'neutral' };
  if (record.followUpStatus === 'scheduled') return { label: 'Đã đặt lịch tái khám', tone: 'success' };
  if (record.followUpStatus === 'overdue') return { label: 'Quá hạn tái khám', tone: 'danger' };
  if (record.followUpStatus === 'cancelled') return { label: 'Đã hủy lịch tái khám', tone: 'danger' };
  return { label: 'Cần tái khám', tone: 'warning' };
}

function appointmentStatusLabel(status) {
  const labels = {
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    in_progress: 'Đang khám',
    completed: 'Đã hoàn thành khám',
    cancelled: 'Đã hủy',
    no_show: 'Không đến khám',
    cancel_requested: 'Yêu cầu hủy',
    reschedule_requested: 'Yêu cầu đổi lịch',
    reschedule_rejected: 'Từ chối đổi lịch'
  };
  return labels[status] || 'Chưa cập nhật';
}

function appointmentStatusTone(status) {
  if (status === 'completed') return 'success';
  if (['cancelled', 'no_show'].includes(status)) return 'danger';
  if (['pending', 'cancel_requested', 'reschedule_requested'].includes(status)) return 'warning';
  return 'neutral';
}

function getId(value) {
  return typeof value === 'object' ? value?._id : value;
}

function linkedFollowUpAppointmentId(record) {
  const appointment = record?.followUpAppointmentId;
  if (!appointment) return '';
  return typeof appointment === 'object' ? appointment._id : appointment;
}

function doctorFollowUpDescription(record) {
  if (!record?.followUpRequired) {
    return 'Hồ sơ này không có chỉ định tái khám.';
  }
  if (record.followUpStatus === 'scheduled' && record.followUpAppointmentId) {
    const appointment = record.followUpAppointmentId;
    if (appointment && typeof appointment === 'object' && appointment.date) {
      return `Bệnh nhân đã đặt lịch tái khám ngày ${formatDate(appointment.date)}${appointment.timeSlot ? `, khung giờ ${appointment.timeSlot}` : ''}.`;
    }
    return 'Bệnh nhân đã đặt lịch tái khám cho hồ sơ này.';
  }
  if (record.followUpStatus === 'completed') {
    return 'Bệnh nhân đã hoàn thành vòng tái khám cho hồ sơ này.';
  }
  if (record.followUpDate) {
    return `Ngày tái khám khuyến nghị: ${formatDate(record.followUpDate)}.`;
  }
  return 'Bác sĩ đã chỉ định cần tái khám nhưng chưa chọn ngày cụ thể. Bệnh nhân có thể tự chọn ngày phù hợp khi đặt lịch tái khám.';
}

function buildFollowUpSummary(items) {
  return items.reduce((summary, record) => {
    const status = record.followUpRequired ? (record.followUpStatus || 'recommended') : 'none';
    summary.total += 1;
    summary[status] = (summary[status] || 0) + 1;
    if (record.followUpRequired && !record.followUpDate) summary.noDate += 1;
    if (record.followUpRequired && ['recommended', 'overdue'].includes(status)) {
      summary.needBooking += 1;
    }
    return summary;
  }, {
    total: 0,
    needBooking: 0,
    noDate: 0,
    recommended: 0,
    scheduled: 0,
    completed: 0,
    overdue: 0,
    none: 0,
    cancelled: 0
  });
}

const FOLLOW_UP_FILTERS = [
  { value: 'recommended', label: 'Cần tái khám' },
  { value: 'scheduled', label: 'Đã đặt lịch' },
  { value: 'overdue', label: 'Quá hạn' },
  { value: 'completed', label: 'Đã hoàn thành' },
  { value: 'none', label: 'Không cần tái khám' }
];

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
          <div>
            <span>Mã BHYT</span>
            <strong>{insurance.insuranceNumber}</strong>
          </div>
          <div>
            <span>Ngày hết hạn</span>
            <strong>{formatDate(insurance.insuranceExpiryDate)}</strong>
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

function DoctorRecordDetailModal({ record, onClose, onDownloadPdf, downloading }) {
  const navigate = useNavigate();
  if (!record) return null;
  const appointment = record.appointmentId || {};
  const followUpStatus = doctorFollowUpStatusLabel(record);
  const linkedAppointmentId = linkedFollowUpAppointmentId(record);
  const sourceFollowUpRecord = appointment.followUpRecordId && typeof appointment.followUpRecordId === 'object'
    ? appointment.followUpRecordId
    : null;
  const sourceFollowUpRecordId = getId(appointment.followUpRecordId);
  const sourceAppointment = sourceFollowUpRecord?.appointmentId || appointment.originalAppointmentId;
  const isFollowUpRecord = Boolean(appointment.isFollowUp || appointment.followUpRecordId);
  const sourceDate = sourceAppointment?.date || sourceFollowUpRecord?.createdAt;

  return (
    <BaseModal ariaLabel="Chi tiết hồ sơ khám" className="admin-modal medical-record-detail-modal" onClose={onClose} size="lg">
      <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
        <div>
          <span className="eyebrow">Hồ sơ đã tạo</span>
          <h2 className="h4 mt-2 mb-1">{getName(record.patientId)}</h2>
          <p className="text-secondary mb-0">{appointment.date || formatDate(record.createdAt)} · {appointment.timeSlot || 'Đang cập nhật'}</p>
        </div>
        <div className="d-flex flex-wrap justify-content-end gap-2">
          <button className="btn btn-sm btn-outline-success" disabled={downloading} type="button" onClick={() => onDownloadPdf(record)}>
            {downloading ? 'Đang tải...' : 'Tải PDF'}
          </button>
          <button className="btn btn-sm btn-outline-secondary" type="button" onClick={onClose}>Đóng</button>
        </div>
      </div>

      <div className="medical-record-detail-grid">
        <div><span>Bệnh nhân</span><strong>{getName(record.patientId)}</strong></div>
        <div><span>Cơ sở</span><strong>{getName(record.clinicId)}</strong></div>
        <div><span>Chuyên khoa</span><strong>{getName(record.specialtyId)}</strong></div>
        <div><span>Tái khám</span><strong>{doctorFollowUpText(record)}</strong></div>
      </div>

      {isFollowUpRecord && (
        <div className="doctor-follow-up-source-banner">
          <div>
            <span>Hồ sơ tái khám</span>
            <strong>
              Hồ sơ này là tái khám từ hồ sơ ngày {sourceDate ? formatDate(sourceDate) : 'trước đó'}
              {sourceAppointment?.timeSlot ? `, khung giờ ${sourceAppointment.timeSlot}` : ''}.
            </strong>
            {sourceFollowUpRecord?.diagnosis && <p>Chẩn đoán lần khám gốc: {sourceFollowUpRecord.diagnosis}</p>}
          </div>
          {sourceFollowUpRecordId && (
            <button
              className="btn btn-sm btn-outline-primary"
              type="button"
              onClick={() => {
                onClose();
                navigate(`/doctor/medical-records?recordId=${sourceFollowUpRecordId}`);
              }}
            >
              Xem hồ sơ gốc
            </button>
          )}
        </div>
      )}

      {record.followUpRequired && (
        <div className={`medical-record-follow-up-card ${followUpStatus.tone}`}>
          <div>
            <span>Kế hoạch tái khám</span>
            <strong>{followUpStatus.label}</strong>
            <p>{doctorFollowUpDescription(record)}</p>
          </div>
          {linkedAppointmentId && (
            <button
              className="btn btn-sm btn-outline-primary"
              type="button"
              onClick={() => {
                onClose();
                navigate(`/doctor/appointments?appointmentId=${linkedAppointmentId}`);
              }}
            >
              Xem lịch tái khám
            </button>
          )}
        </div>
      )}

      <InsuranceSnapshotCard insurance={appointment.insuranceSnapshot} />

      {[
        ['Triệu chứng', record.symptoms || 'Chưa cập nhật'],
        ['Chẩn đoán', record.diagnosis],
        ['Kết luận', record.conclusion],
        ['Lời dặn', record.advice || 'Chưa cập nhật'],
        ['Ghi chú nội bộ', record.note || 'Không có']
      ].map(([label, value]) => (
        <div className="medical-record-detail-section" key={label}>
          <h3>{label}</h3>
          <p>{value}</p>
        </div>
      ))}

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
                  <tr key={index}>
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
    </BaseModal>
  );
}

export default function DoctorMedicalRecordsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const initialFollowUpOnly = useMemo(() => (
    new URLSearchParams(location.search).get('followUpOnly') === 'true'
  ), [location.search]);
  const currentDoctorId = useMemo(() => {
    const authUser = getUser();
    return String(authUser?.doctorId?._id || authUser?.doctorId || '');
  }, []);
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [clinics, setClinics] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [downloadingRecordId, setDownloadingRecordId] = useState('');
  const [queryHandled, setQueryHandled] = useState('');
  const [followUpSummary, setFollowUpSummary] = useState({
    total: 0,
    needBooking: 0,
    noDate: 0,
    recommended: 0,
    scheduled: 0,
    completed: 0,
    overdue: 0,
    none: 0,
    cancelled: 0
  });
  const [filters, setFilters] = useState({
    patientName: '',
    date: '',
    clinicId: '',
    specialtyId: '',
    followUpStatus: '',
    followUpOnly: initialFollowUpOnly ? 'true' : '',
    followUpNoDate: ''
  });
  const isFollowUpDashboard = filters.followUpOnly === 'true';

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }, [filters]);

  async function loadRecords() {
    setLoading(true);
    try {
      const payload = await api(`/doctor/medical-records${query ? `?${query}` : ''}`);
      const items = payload.data || [];
      setRecords(items);
      setFollowUpSummary(payload.meta?.followUpSummary || buildFollowUpSummary(items));
    } catch (error) {
      toast.error(error.message || 'Không tải được hồ sơ đã tạo');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecords();
  }, [query]);

  useEffect(() => {
    const socket = getSocket() || connectSocket(getToken());
    if (!socket) return undefined;

    function handleFollowUpUpdated(payload = {}) {
      if (payload.doctorId && currentDoctorId && String(payload.doctorId) !== currentDoctorId) return;
      loadRecords().catch(() => {});
    }

    socket.on('follow-up:updated', handleFollowUpUpdated);
    return () => {
      socket.off('follow-up:updated', handleFollowUpUpdated);
    };
  }, [currentDoctorId, query]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const recordId = params.get('recordId');
    if (!recordId || loading || queryHandled === recordId) return;

    const record = records.find((item) => String(item._id) === String(recordId));
    if (record) {
      setSelected(record);
      setQueryHandled(recordId);
      return;
    }

    let cancelled = false;
    api(`/medical-records/${recordId}`)
      .then((payload) => {
        if (cancelled) return;
        setSelected(payload.data);
        setQueryHandled(recordId);
      })
      .catch((error) => {
        if (cancelled) return;
        toast.warning(error.message || 'Không tìm thấy hồ sơ khám bệnh');
        setQueryHandled(recordId);
      });

    return () => {
      cancelled = true;
    };
  }, [loading, location.search, queryHandled, records, toast]);

  useEffect(() => {
    Promise.allSettled([api('/clinics'), api('/specialties')]).then(([clinicResult, specialtyResult]) => {
      if (clinicResult.status === 'fulfilled') setClinics(clinicResult.value.data || []);
      if (specialtyResult.status === 'fulfilled') setSpecialties(specialtyResult.value.data || []);
    });
  }, []);

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function resetFilters() {
    setFilters({
      patientName: '',
      date: '',
      clinicId: '',
      specialtyId: '',
      followUpStatus: '',
      followUpOnly: '',
      followUpNoDate: ''
    });
  }

  function applyFollowUpFilter(status, options = {}) {
    setFilters((current) => ({
      ...current,
      followUpOnly: 'true',
      followUpStatus: status,
      followUpNoDate: options.noDate ? 'true' : ''
    }));
  }

  async function openRecordDetail(recordOrId) {
    if (!recordOrId) return;
    if (typeof recordOrId === 'object' && recordOrId.patientId && recordOrId.doctorId) {
      setSelected(recordOrId);
      return;
    }
    try {
      const payload = await api(`/medical-records/${getId(recordOrId)}`);
      setSelected(payload.data);
    } catch (error) {
      toast.error(error.message || 'Không mở được hồ sơ khám bệnh');
    }
  }

  function openFollowUpAppointment(record) {
    const appointmentId = linkedFollowUpAppointmentId(record);
    if (!appointmentId) return;
    navigate(`/doctor/appointments?appointmentId=${appointmentId}`);
  }

  useEffect(() => {
    const shouldShowFollowUps = new URLSearchParams(location.search).get('followUpOnly') === 'true';
    setFilters((current) => {
      const nextValue = shouldShowFollowUps ? 'true' : '';
      if (current.followUpOnly === nextValue) return current;
      return { ...current, followUpOnly: nextValue };
    });
  }, [location.search]);

  async function downloadRecordPdf(record) {
    if (!record?._id || downloadingRecordId) return;
    setDownloadingRecordId(record._id);
    try {
      await downloadPdf(`/medical-records/${record._id}/pdf`);
    } catch (error) {
      toast.error(error.message || 'Không tải được PDF');
    } finally {
      setDownloadingRecordId('');
    }
  }

  return (
    <div className="doctor-page">
      <div className="doctor-page-header">
        <div className="doctor-page-header-main">
          <p className="doctor-page-eyebrow">Hồ sơ khám bệnh</p>
          <h1 className="doctor-page-title">{isFollowUpDashboard ? 'Theo dõi tái khám' : 'Hồ sơ đã tạo'}</h1>
          <p className="doctor-page-subtitle">
            {isFollowUpDashboard
              ? 'Theo dõi bệnh nhân cần tái khám, lịch đã đặt và hồ sơ tái khám đã hoàn thành.'
              : 'Xem lại kết quả khám, chẩn đoán và đơn thuốc bạn đã cập nhật cho bệnh nhân.'}
          </p>
        </div>
      </div>

      <section className="doctor-record-follow-up-summary" aria-label="Tổng quan tái khám">
        <button className={`doctor-record-follow-up-card warning ${filters.followUpStatus === 'recommended' ? 'active' : ''}`} type="button" onClick={() => applyFollowUpFilter('recommended')}>
          <span>Cần tái khám</span>
          <strong>{followUpSummary.needBooking || followUpSummary.recommended}</strong>
          <p>Hồ sơ có chỉ định tái khám, bệnh nhân chưa đặt lịch mới.</p>
        </button>
        <button className={`doctor-record-follow-up-card success ${filters.followUpStatus === 'scheduled' ? 'active' : ''}`} type="button" onClick={() => applyFollowUpFilter('scheduled')}>
          <span>Đã đặt lịch</span>
          <strong>{followUpSummary.scheduled}</strong>
          <p>Bệnh nhân đã có lịch tái khám liên kết với hồ sơ.</p>
        </button>
        <button className={`doctor-record-follow-up-card danger ${filters.followUpStatus === 'overdue' ? 'active' : ''}`} type="button" onClick={() => applyFollowUpFilter('overdue')}>
          <span>Quá hạn</span>
          <strong>{followUpSummary.overdue}</strong>
          <p>Đã quá ngày tái khám khuyến nghị, cần nhắc bệnh nhân.</p>
        </button>
        <button className={`doctor-record-follow-up-card neutral ${filters.followUpStatus === 'completed' ? 'active' : ''}`} type="button" onClick={() => applyFollowUpFilter('completed')}>
          <span>Đã hoàn thành</span>
          <strong>{followUpSummary.completed}</strong>
          <p>Hồ sơ đã được ghi nhận hoàn tất vòng tái khám.</p>
        </button>
        <button className={`doctor-record-follow-up-card neutral ${filters.followUpStatus === 'none' ? 'active' : ''}`} type="button" onClick={() => applyFollowUpFilter('none')}>
          <span>Không cần tái khám</span>
          <strong>{followUpSummary.none || 0}</strong>
          <p>Hồ sơ đã kết thúc, không có kế hoạch theo dõi tiếp.</p>
        </button>
      </section>

      {isFollowUpDashboard && (
        <section className="doctor-follow-up-mode-banner">
          <div>
            <strong>Dashboard theo dõi tái khám</strong>
            <p>Bác sĩ có thể kiểm tra hồ sơ gốc, lịch tái khám đã đặt và hồ sơ tái khám đã tạo trong cùng một dòng.</p>
          </div>
          <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => updateFilter('followUpOnly', '')}>
            Xem tất cả hồ sơ
          </button>
        </section>
      )}

      <section className="queue-filter-card medical-record-filter-card">
        <div>
          <label className="form-label">Tên bệnh nhân</label>
          <input className="form-control" value={filters.patientName} onChange={(event) => updateFilter('patientName', event.target.value)} />
        </div>
        <div>
          <label className="form-label">Ngày tạo</label>
          <input className="form-control" type="date" value={filters.date} onChange={(event) => updateFilter('date', event.target.value)} />
        </div>
        <div>
          <label className="form-label">Cơ sở</label>
          <select className="form-select" value={filters.clinicId} onChange={(event) => updateFilter('clinicId', event.target.value)}>
            <option value="">Tất cả cơ sở</option>
            {clinics.map((clinic) => (
              <option key={clinic._id} value={clinic._id}>{clinic.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Chuyên khoa</label>
          <select className="form-select" value={filters.specialtyId} onChange={(event) => updateFilter('specialtyId', event.target.value)}>
            <option value="">Tất cả chuyên khoa</option>
            {specialties.map((specialty) => (
              <option key={specialty._id} value={specialty._id}>{specialty.name}</option>
            ))}
          </select>
        </div>
        <div className="doctor-follow-up-status-filter">
          <span>Trạng thái tái khám</span>
          <button
            className={filters.followUpOnly !== 'true' && !filters.followUpStatus ? 'active' : ''}
            type="button"
            onClick={() => setFilters((current) => ({ ...current, followUpOnly: '', followUpStatus: '', followUpNoDate: '' }))}
          >
            Tất cả hồ sơ
          </button>
          {FOLLOW_UP_FILTERS.map((item) => (
            <button
              className={filters.followUpStatus === item.value ? 'active' : ''}
              key={item.value || 'all'}
              type="button"
              onClick={() => {
                setFilters((current) => ({
                  ...current,
                  followUpOnly: item.value ? 'true' : current.followUpOnly,
                  followUpStatus: item.value,
                  followUpNoDate: ''
                }));
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button className="btn btn-outline-secondary align-self-end" type="button" onClick={resetFilters}>
          Xóa lọc
        </button>
      </section>

      <section className="management-panel admin-table-card">
        {loading ? (
          <div className="admin-empty-state"><p>Đang tải hồ sơ...</p></div>
        ) : records.length ? (
          <div className="table-responsive">
            <table className="table table-hover align-middle admin-table">
              <thead>
                <tr>
                  {isFollowUpDashboard ? (
                    <>
                      <th>Ngày khám gốc</th>
                      <th>Bệnh nhân</th>
                      <th>Chẩn đoán</th>
                      <th>Ngày tái khám khuyến nghị</th>
                      <th>Lịch tái khám đã đặt</th>
                      <th>Trạng thái đến khám</th>
                      <th className="text-end">Thao tác</th>
                    </>
                  ) : (
                    <>
                      <th>Ngày khám</th>
                      <th>Bệnh nhân</th>
                      <th>Cơ sở</th>
                      <th>Chuyên khoa</th>
                      <th>Chẩn đoán</th>
                      <th>Tái khám</th>
                      <th className="text-end">Thao tác</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const appointment = record.appointmentId || {};
                  const followUpStatus = doctorFollowUpStatusLabel(record);
                  const followUpAppointment = record.followUpAppointmentId && typeof record.followUpAppointmentId === 'object'
                    ? record.followUpAppointmentId
                    : null;
                  const followUpCompletedRecord = record.followUpCompletedRecordId;
                  const followUpCompletedRecordId = getId(followUpCompletedRecord);
                  const attendanceTone = appointmentStatusTone(followUpAppointment?.status);
                  return (
                    <tr key={record._id}>
                      {isFollowUpDashboard ? (
                        <>
                          <td>
                            <div className="doctor-follow-up-table-cell">
                              <strong>{appointment.date || formatDate(record.createdAt)}</strong>
                              <small>{appointment.timeSlot || 'Chưa cập nhật giờ'}</small>
                            </div>
                          </td>
                          <td>{getName(record.patientId)}</td>
                          <td>
                            <div className="doctor-follow-up-table-cell">
                              <strong>{record.diagnosis}</strong>
                              <small>{getName(record.specialtyId)} · {getName(record.clinicId)}</small>
                            </div>
                          </td>
                          <td>
                            <div className="doctor-follow-up-table-cell">
                              <span className={`follow-up-status-pill ${followUpStatus.tone}`}>{followUpStatus.label}</span>
                              <small>{doctorFollowUpText(record)}</small>
                            </div>
                          </td>
                          <td>
                            {followUpAppointment ? (
                              <div className="doctor-follow-up-appointment-mini">
                                <strong>{formatDate(followUpAppointment.date)}</strong>
                                <span>{followUpAppointment.timeSlot || 'Chưa cập nhật giờ'}</span>
                              </div>
                            ) : (
                              <span className="text-secondary fw-bold">Chưa có lịch</span>
                            )}
                          </td>
                          <td>
                            {followUpAppointment ? (
                              <span className={`follow-up-status-pill ${attendanceTone}`}>
                                {appointmentStatusLabel(followUpAppointment.status)}
                              </span>
                            ) : (
                              <span className="follow-up-status-pill neutral">Chưa đặt lịch</span>
                            )}
                          </td>
                          <td className="text-end">
                            <div className="doctor-follow-up-row-actions">
                              <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => setSelected(record)}>
                                Xem hồ sơ gốc
                              </button>
                              {linkedFollowUpAppointmentId(record) && (
                                <button className="btn btn-sm btn-outline-info" type="button" onClick={() => openFollowUpAppointment(record)}>
                                  Xem lịch tái khám
                                </button>
                              )}
                              {followUpCompletedRecordId && (
                                <button className="btn btn-sm btn-outline-success" type="button" onClick={() => openRecordDetail(followUpCompletedRecord)}>
                                  Xem hồ sơ tái khám
                                </button>
                              )}
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{appointment.date || formatDate(record.createdAt)}</td>
                          <td>{getName(record.patientId)}</td>
                          <td>{getName(record.clinicId)}</td>
                          <td>{getName(record.specialtyId)}</td>
                          <td>{record.diagnosis}</td>
                          <td>
                            <div className="doctor-follow-up-table-cell">
                              <span className={`follow-up-status-pill ${followUpStatus.tone}`}>{followUpStatus.label}</span>
                              {record.followUpRequired && <small>{doctorFollowUpText(record)}</small>}
                            </div>
                          </td>
                          <td className="text-end">
                            <div className="d-flex flex-wrap justify-content-end gap-2">
                              <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => setSelected(record)}>
                                Xem chi tiết
                              </button>
                              <button className="btn btn-sm btn-outline-success" disabled={downloadingRecordId === record._id} type="button" onClick={() => downloadRecordPdf(record)}>
                                {downloadingRecordId === record._id ? 'Đang tải...' : 'Tải PDF'}
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <span aria-hidden="true">+</span>
            <p>Chưa có hồ sơ khám bệnh</p>
          </div>
        )}
      </section>

      <DoctorRecordDetailModal
        downloading={downloadingRecordId === selected?._id}
        record={selected}
        onClose={() => setSelected(null)}
        onDownloadPdf={downloadRecordPdf}
      />
    </div>
  );
}
