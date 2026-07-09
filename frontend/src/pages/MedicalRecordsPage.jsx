import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import BaseModal from '../components/BaseModal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { SkeletonList } from '../components/SkeletonCard.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { connectSocket, getSocket } from '../services/socket.js';
import { getToken } from '../utils/auth.js';
import { downloadPdf } from '../utils/downloadFile.js';

function getName(value) {
  if (!value) return 'Đang cập nhật';
  return typeof value === 'object' ? value.name : value;
}

function formatDate(value) {
  if (!value) return 'Chưa cập nhật';
  return String(value).slice(0, 10);
}

function followUpText(record) {
  return record?.followUpRequired ? formatDate(record.followUpDate) : 'Không cần tái khám';
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

function VitalsBadge({ label, value, unit, status = 'normal' }) {
  if (!value) return null;
  return (
    <div className={`vital-badge vital-${status}`}>
      <span className="vital-label">{label}</span>
      <strong className="vital-value">{value} <small>{unit}</small></strong>
    </div>
  );
}

function evaluateVitalStatus(key, value) {
  if (!value) return 'normal';
  const num = Number(value);
  if (isNaN(num) && key !== 'bloodPressure') return 'normal';

  switch (key) {
    case 'bloodPressure': {
      const [sys, dia] = value.split('/').map(Number);
      if (sys > 140 || dia > 90) return 'danger';
      if (sys < 90 || dia < 60) return 'warning';
      return 'normal';
    }
    case 'heartRate':
      if (num > 100 || num < 60) return 'warning';
      return 'normal';
    case 'temperature':
      if (num > 37.5) return 'danger';
      if (num < 36.0) return 'warning';
      return 'normal';
    case 'spo2':
      if (num < 95) return 'danger';
      return 'normal';
    case 'bmi':
      if (num >= 25 || num < 18.5) return 'warning';
      return 'normal';
    default:
      return 'normal';
  }
}

function MedicalRecordDetailModal({ record, onClose }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);

  if (!record) return null;
  const appointment = record.appointmentId || {};
  const vitals = record.vitals || {};
  const attachments = record.attachments || [];
  const hasVitals = Object.values(vitals).some(Boolean);
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
          <h2 className="h4 mt-2 mb-1">{formatDate(appointment.date || record.createdAt)} - {appointment.timeSlot || ''}</h2>
          <p className="text-secondary mb-0">{getName(record.doctorId)} · {getName(record.specialtyId)}</p>
        </div>
        <div className="d-flex flex-wrap justify-content-end gap-2">
          <button className="btn btn-sm btn-outline-success" disabled={downloading} type="button" onClick={handleDownloadPdf}>
            {downloading ? 'Đang tải...' : 'Tải PDF kết quả khám'}
          </button>
          <button className="btn btn-sm btn-outline-secondary" type="button" onClick={onClose}>Đóng</button>
        </div>
      </div>

      <div className="medical-record-detail-grid">
        <div><span>Bác sĩ</span><strong>{getName(record.doctorId)}</strong></div>
        <div><span>Cơ sở</span><strong>{getName(record.clinicId)}</strong></div>
        <div><span>Chuyên khoa</span><strong>{getName(record.specialtyId)}</strong></div>
        <div><span>Tái khám</span><strong>{followUpText(record)}</strong></div>
      </div>

      <InsuranceSnapshotCard insurance={appointment.insuranceSnapshot} />

      <div className={`medical-record-follow-up-card ${followUpStatus.tone}`}>
        <div>
          <span>Kế hoạch tái khám</span>
          <strong>{followUpStatus.label}</strong>
          <p>
            {record.followUpRequired
              ? `Ngày tái khám khuyến nghị: ${formatDate(record.followUpDate)}`
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

      {hasVitals && (
        <div className="medical-record-detail-section">
          <h3>Chỉ số sinh tồn</h3>
          <div className="vitals-badge-grid">
            <VitalsBadge label="Huyết áp" value={vitals.bloodPressure} unit="mmHg" status={evaluateVitalStatus('bloodPressure', vitals.bloodPressure)} />
            <VitalsBadge label="Nhịp tim" value={vitals.heartRate} unit="bpm" status={evaluateVitalStatus('heartRate', vitals.heartRate)} />
            <VitalsBadge label="Nhiệt độ" value={vitals.temperature} unit="°C" status={evaluateVitalStatus('temperature', vitals.temperature)} />
            <VitalsBadge label="SpO2" value={vitals.spo2} unit="%" status={evaluateVitalStatus('spo2', vitals.spo2)} />
            <VitalsBadge label="Nhịp thở" value={vitals.respiratoryRate} unit="lần/p" />
            <VitalsBadge label="Chiều cao" value={vitals.height} unit="cm" />
            <VitalsBadge label="Cân nặng" value={vitals.weight} unit="kg" />
            <VitalsBadge label="BMI" value={vitals.bmi} unit="" status={evaluateVitalStatus('bmi', vitals.bmi)} />
          </div>
        </div>
      )}

      <div className="medical-record-detail-section">
        <h3>Triệu chứng & Bệnh sử</h3>
        <p>{record.symptoms || 'Chưa cập nhật'}</p>
        {record.allergies && (
          <div className="alert alert-warning mt-2 mb-0 py-2">
            <strong>⚠️ Tiền sử dị ứng:</strong> {record.allergies}
          </div>
        )}
      </div>

      <div className="medical-record-detail-section">
        <h3>Chẩn đoán</h3>
        {record.icd10Code && <span className="icd10-badge mb-2 d-inline-block">ICD-10: {record.icd10Code}</span>}
        <p className="fw-medium text-dark">{record.diagnosis}</p>
      </div>

      <div className="medical-record-detail-section">
        <h3>Kết luận & Hướng điều trị</h3>
        <p>{record.conclusion}</p>
      </div>

      {attachments.length > 0 && (
        <div className="medical-record-detail-section">
          <h3>Cận lâm sàng</h3>
          <div className="attachments-grid">
            {attachments.map((attachment, index) => (
              <a href={attachment.url} target="_blank" rel="noreferrer" className="attachment-card" key={index}>
                <div className="attachment-icon">
                  {attachment.type === 'pdf' ? '📄' : '🖼️'}
                </div>
                <div className="attachment-info">
                  <strong>{attachment.name}</strong>
                  <span>Xem chi tiết</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="medical-record-detail-section">
        <h3>Đơn thuốc (e-Prescription)</h3>
        {record.prescription?.length ? (
          <div className="e-prescription-card">
            <div className="e-prescription-header">
              <span className="rx-symbol">Rx</span>
              <span>Đơn thuốc có giá trị sử dụng 1 lần</span>
            </div>
            <div className="e-prescription-body">
              {record.prescription.map((item, index) => (
                <div className="prescription-item" key={index}>
                  <div className="prescription-item-header">
                    <strong>{index + 1}. {item.medicineName}</strong>
                  </div>
                  <div className="prescription-item-details">
                    <span>💊 <strong>Liều dùng:</strong> {item.dosage || '-'}</span>
                    <span>⏱️ <strong>Tần suất:</strong> {item.frequency || '-'}</span>
                    <span>📅 <strong>Thời gian:</strong> {item.duration || '-'}</span>
                  </div>
                  {item.note && <div className="prescription-item-note"><em>Ghi chú: {item.note}</em></div>}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p>Không có đơn thuốc.</p>
        )}
      </div>

      <div className="medical-record-detail-section">
        <h3>Lời dặn của Bác sĩ</h3>
        <p>{record.advice || 'Không có lời dặn thêm.'}</p>
      </div>
    </BaseModal>
  );
}

export default function MedicalRecordsPage() {
  const location = useLocation();
  const toast = useToast();
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [queryHandled, setQueryHandled] = useState('');
  const [recordsLoaded, setRecordsLoaded] = useState(false);

  const loadRecords = useCallback(() => {
    setLoading(true);
    setRecordsLoaded(false);
    return api('/medical-records/my')
      .then((payload) => setRecords(payload.data || []))
      .catch((error) => toast.error(error.message || 'Không tải được lịch sử khám'))
      .finally(() => {
        setLoading(false);
        setRecordsLoaded(true);
      });
  }, [toast]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    const socket = getSocket() || connectSocket(getToken());
    if (!socket) return undefined;

    function handleMedicalRecordCreated() {
      setQueryHandled('');
      loadRecords().catch(() => {});
    }

    socket.on('medical-record:created', handleMedicalRecordCreated);
    return () => socket.off('medical-record:created', handleMedicalRecordCreated);
  }, [loadRecords]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const recordId = params.get('recordId');
    const appointmentId = params.get('appointmentId');
    const queryKey = recordId ? `record:${recordId}` : appointmentId ? `appointment:${appointmentId}` : '';
    if (!queryKey || loading || !recordsLoaded || queryHandled === queryKey) return;

    const record = records.find((item) => {
      if (recordId) return String(item._id) === String(recordId);
      const recordAppointmentId = item.appointmentId?._id || item.appointmentId;
      return String(recordAppointmentId) === String(appointmentId);
    });

    setQueryHandled(queryKey);
    if (record) {
      setSelected(record);
    } else {
      toast.warning('Không tìm thấy hồ sơ khám bệnh');
    }
  }, [loading, location.search, queryHandled, records, recordsLoaded, toast]);

  return (
    <div className="public-page medical-records-page">
      <div className="page-heading">
        <span className="section-eyebrow">Lịch sử khám</span>
        <h1>Hồ sơ khám bệnh</h1>
        <p className="text-secondary">Theo dõi dòng thời gian sức khỏe, chẩn đoán và đơn thuốc điện tử của bạn.</p>
      </div>

      {loading ? (
        <SkeletonList count={3} height={96} />
      ) : records.length ? (
        <div className="medical-timeline">
          {records.map((record) => {
            const appointment = record.appointmentId || {};
            const dateStr = appointment.date || formatDate(record.createdAt);
            const hasVitals = Object.values(record.vitals || {}).some(Boolean);
            const followUpStatus = followUpStatusLabel(record);
            
            return (
              <div className="medical-timeline-item" key={record._id}>
                <div className="medical-timeline-marker">
                  <div className="medical-timeline-dot"></div>
                  <div className="medical-timeline-date">{dateStr}</div>
                </div>
                <article className="medical-record-card timeline-card">
                  <div className="medical-record-header">
                    <h2>{record.diagnosis}</h2>
                    <div className="medical-record-header-badges">
                      {record.icd10Code && <span className="icd10-badge mini">ICD-10: {record.icd10Code}</span>}
                      {record.followUpRequired && (
                        <span className={`follow-up-status-pill ${followUpStatus.tone}`}>
                          {followUpStatus.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="medical-record-meta">
                    <p>👨‍⚕️ {getName(record.doctorId)} · 🏥 {getName(record.clinicId)}</p>
                  </div>
                  
                  {hasVitals && (
                    <div className="medical-record-vitals-preview">
                      {record.vitals?.bloodPressure && <span>🩸 HA: {record.vitals.bloodPressure}</span>}
                      {record.vitals?.heartRate && <span>❤️ Nhịp tim: {record.vitals.heartRate} bpm</span>}
                      {record.vitals?.temperature && <span>🌡️ {record.vitals.temperature}°C</span>}
                    </div>
                  )}

                  <div className="medical-record-actions mt-3">
                    <button className="btn btn-sm btn-primary" type="button" onClick={() => setSelected(record)}>
                      Xem hồ sơ chi tiết
                    </button>
                    <button className="btn btn-sm btn-outline-success" type="button" onClick={() => downloadPdf(`/medical-records/${record._id}/pdf`, `ket-qua-kham-${record._id}.pdf`).catch((error) => toast.error(error.message || 'Không tải được PDF'))}>
                      Tải PDF
                    </button>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon="📋"
          title="Chưa có hồ sơ khám bệnh"
          description="Dòng thời gian sức khỏe của bạn sẽ được cập nhật tại đây sau khi bác sĩ hoàn thành buổi khám."
        />
      )}

      <MedicalRecordDetailModal record={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
