import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import BaseModal from '../components/BaseModal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { SkeletonList } from '../components/SkeletonCard.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { connectSocket, getSocket } from '../services/socket.js';
import { getToken } from '../utils/auth.js';
import { downloadPdf } from '../utils/downloadFile.js';
import { cleanDisplayText } from '../utils/textEncoding.js';

function displayName(value, fallback = 'Đang cập nhật') {
  if (!value) return fallback;
  const raw = typeof value === 'object' ? value.name : value;
  return cleanDisplayText(raw, fallback);
}

function displayText(value, fallback = 'Chưa cập nhật') {
  return cleanDisplayText(value, fallback);
}

function formatDate(value) {
  if (!value) return 'Chưa cập nhật';
  return String(value).slice(0, 10);
}

function followUpText(record) {
  if (!record?.followUpRequired) return 'Không cần tái khám';
  return record.followUpDate ? formatDate(record.followUpDate) : 'Bác sĩ chưa chỉ định ngày cụ thể';
}

function followUpStatusLabel(record) {
  if (record?.followUpStatus === 'completed') return { label: 'Đã hoàn thành tái khám', tone: 'success' };
  if (!record?.followUpRequired) return { label: 'Không cần tái khám', tone: 'neutral' };
  if (record.followUpStatus === 'scheduled') return { label: 'Đã đặt lịch tái khám', tone: 'success' };
  if (record.followUpStatus === 'overdue') return { label: 'Quá hạn tái khám', tone: 'danger' };
  return { label: 'Cần tái khám', tone: 'warning' };
}

function canBookFollowUp(record) {
  if (!record?.followUpRequired) return false;
  return ['recommended', 'overdue'].includes(record.followUpStatus || 'recommended') && !record.followUpAppointmentId;
}

function linkedFollowUpAppointmentId(record) {
  const appointment = record?.followUpAppointmentId;
  if (!appointment) return '';
  return typeof appointment === 'object' ? appointment._id : appointment;
}

function followUpDescription(record) {
  if (!record?.followUpRequired) {
    return 'Bác sĩ chưa yêu cầu tái khám. Nếu có triệu chứng bất thường, bạn nên đặt lịch kiểm tra lại.';
  }

  if (record.followUpStatus === 'scheduled' && record.followUpAppointmentId) {
    const appointment = record.followUpAppointmentId;
    if (!appointment.date) {
      return 'Bạn đã đặt lịch tái khám cho hồ sơ này. Vui lòng kiểm tra trong mục Lịch hẹn của tôi.';
    }
    return `Bạn đã đặt lịch tái khám ngày ${formatDate(appointment.date)}${appointment.timeSlot ? `, khung giờ ${appointment.timeSlot}` : ''}.`;
  }

  if (record.followUpStatus === 'completed') {
    return 'Bạn đã hoàn thành lịch tái khám cho hồ sơ này.';
  }

  if (record.followUpDate) {
    return `Ngày tái khám khuyến nghị: ${formatDate(record.followUpDate)}. Vui lòng đặt lịch phù hợp để được theo dõi tiếp.`;
  }

  return 'Bác sĩ chưa chỉ định ngày cụ thể. Bạn có thể chọn ngày phù hợp khi đặt lịch tái khám.';
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

function getVitalItems(record) {
  const vitals = record?.vitals || {};
  return [
    ['Huyết áp', vitals.bloodPressure, 'mmHg'],
    ['Nhịp tim', vitals.heartRate, 'bpm'],
    ['Nhiệt độ', vitals.temperature, '°C'],
    ['SpO2', vitals.spo2, '%'],
    ['Nhịp thở', vitals.respiratoryRate, 'lần/phút'],
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

function FollowUpDashboard({ records, summary, onOpenRecord, forceVisible = false }) {
  const navigate = useNavigate();
  if (!records.length && !forceVisible) return null;

  const cards = [
    { label: 'Cần đặt lịch', value: summary.needBooking || 0, tone: 'warning' },
    { label: 'Đã đặt lịch', value: summary.scheduled || 0, tone: 'success' },
    { label: 'Quá hạn', value: summary.overdue || 0, tone: 'danger' },
    { label: 'Không có ngày cố định', value: summary.noDate || 0, tone: 'neutral' }
  ];

  return (
    <section className="patient-follow-up-panel">
      <div className="patient-follow-up-header">
        <div>
          <span className="section-eyebrow">Tái khám</span>
          <h2>Lịch tái khám của tôi</h2>
          <p>Theo dõi các hồ sơ được bác sĩ chỉ định tái khám và đặt lịch theo đúng bác sĩ, chuyên khoa đã khám.</p>
        </div>
      </div>

      <div className="patient-follow-up-summary">
        {cards.map((card) => (
          <div className={`patient-follow-up-summary-card ${card.tone}`} key={card.label}>
            <strong>{card.value}</strong>
            <span>{card.label}</span>
          </div>
        ))}
      </div>

      <div className="patient-follow-up-list">
        {!records.length ? (
          <div className="patient-follow-up-empty">
            <strong>Chưa có hồ sơ cần tái khám</strong>
            <p>Khi bác sĩ chỉ định tái khám, hồ sơ sẽ xuất hiện tại đây để bạn đặt lịch và theo dõi trạng thái.</p>
          </div>
        ) : records.map((record) => {
          const appointment = record.appointmentId || {};
          const followUpStatus = followUpStatusLabel(record);

          return (
            <article className={`patient-follow-up-item ${followUpStatus.tone}`} key={record._id}>
              <div className="patient-follow-up-item-main">
                <span className={`follow-up-status-pill ${followUpStatus.tone}`}>{followUpStatus.label}</span>
                <h3>{displayName(record.specialtyId)} với {displayName(record.doctorId)}</h3>
                <p>{followUpDescription(record)}</p>
                <div className="patient-follow-up-meta">
                  <span>Lần khám gốc: {formatDate(appointment.date || record.createdAt)}</span>
                  <span>Cơ sở: {displayName(record.clinicId)}</span>
                </div>
              </div>
              <div className="patient-follow-up-actions">
                <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => onOpenRecord(record)}>
                  Xem hồ sơ
                </button>
                {record.followUpStatus === 'scheduled' && linkedFollowUpAppointmentId(record) && (
                  <button
                    className="btn btn-sm btn-outline-success"
                    type="button"
                    onClick={() => navigate(`/appointments/my?appointmentId=${linkedFollowUpAppointmentId(record)}`)}
                  >
                    Xem lịch tái khám
                  </button>
                )}
                {canBookFollowUp(record) && (
                  <button className="btn btn-sm btn-primary" type="button" onClick={() => navigate(followUpBookingUrl(record))}>
                    Đặt lịch tái khám
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function MedicalRecordDetailModal({ record, onClose }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);

  if (!record) return null;

  const appointment = record.appointmentId || {};
  const vitalItems = getVitalItems(record);
  const followUpStatus = followUpStatusLabel(record);
  const attachments = record.attachments || [];

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
          <p className="text-secondary mb-0">{displayName(record.doctorId)} · {displayName(record.specialtyId)}</p>
        </div>
        <div className="d-flex flex-wrap justify-content-end gap-2">
          <button className="btn btn-sm btn-outline-success" disabled={downloading} type="button" onClick={handleDownloadPdf}>
            {downloading ? 'Đang tải...' : 'Tải PDF kết quả khám'}
          </button>
          <button className="btn btn-sm btn-outline-secondary" type="button" onClick={onClose}>Đóng</button>
        </div>
      </div>

      <div className="medical-record-detail-grid">
        <div><span>Bác sĩ</span><strong>{displayName(record.doctorId)}</strong></div>
        <div><span>Cơ sở</span><strong>{displayName(record.clinicId)}</strong></div>
        <div><span>Chuyên khoa</span><strong>{displayName(record.specialtyId)}</strong></div>
        <div><span>Tái khám</span><strong>{followUpText(record)}</strong></div>
      </div>

      <InsuranceSnapshotCard insurance={appointment.insuranceSnapshot} />

      <div className={`medical-record-follow-up-card ${followUpStatus.tone}`}>
        <div>
          <span>Kế hoạch tái khám</span>
          <strong>{followUpStatus.label}</strong>
          <p>{followUpDescription(record)}</p>
        </div>
        {canBookFollowUp(record) && (
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
        {record.followUpStatus === 'scheduled' && linkedFollowUpAppointmentId(record) && (
          <button
            className="btn btn-sm btn-outline-primary"
            type="button"
            onClick={() => {
              onClose();
              navigate(`/appointments/my?appointmentId=${linkedFollowUpAppointmentId(record)}`);
            }}
          >
            Xem lịch tái khám
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
        <h3>Triệu chứng & Bệnh sử</h3>
        <p>{displayText(record.symptoms)}</p>
        {record.allergies && (
          <div className="alert alert-warning mt-2 mb-0 py-2">
            <strong>Tiền sử dị ứng:</strong> {displayText(record.allergies)}
          </div>
        )}
      </div>

      <div className="medical-record-detail-section">
        <h3>Chẩn đoán</h3>
        {record.icd10Code && <span className="icd10-badge mb-2 d-inline-block">ICD-10: {record.icd10Code}</span>}
        <p className="fw-medium text-dark">{displayText(record.diagnosis)}</p>
      </div>

      <div className="medical-record-detail-section">
        <h3>Kết luận & Hướng điều trị</h3>
        <p>{displayText(record.conclusion)}</p>
      </div>

      {attachments.length > 0 && (
        <div className="medical-record-detail-section">
          <h3>Cận lâm sàng</h3>
          <div className="attachments-grid">
            {attachments.map((attachment, index) => (
              <a href={attachment.url} target="_blank" rel="noreferrer" className="attachment-card" key={`${attachment.url}-${index}`}>
                <div className="attachment-icon">{attachment.type === 'pdf' ? 'PDF' : 'IMG'}</div>
                <div className="attachment-info">
                  <strong>{displayText(attachment.name, 'Tệp đính kèm')}</strong>
                  <span>Xem chi tiết</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

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
                    <td>{displayText(item.medicineName)}</td>
                    <td>{displayText(item.dosage, '-')}</td>
                    <td>{displayText(item.frequency, '-')}</td>
                    <td>{displayText(item.duration, '-')}</td>
                    <td>{displayText(item.note, '-')}</td>
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
        <h3>Lời dặn của bác sĩ</h3>
        <p>{displayText(record.advice, 'Không có lời dặn thêm.')}</p>
      </div>
    </BaseModal>
  );
}

export default function MedicalRecordsPage() {
  const location = useLocation();
  const toast = useToast();
  const [records, setRecords] = useState([]);
  const [followUpRecords, setFollowUpRecords] = useState([]);
  const [followUpSummary, setFollowUpSummary] = useState({});
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [queryHandled, setQueryHandled] = useState('');
  const [recordsLoaded, setRecordsLoaded] = useState(false);
  const followUpPanelRef = useRef(null);

  const loadRecords = useCallback(() => {
    setLoading(true);
    setRecordsLoaded(false);
    return Promise.all([
      api('/medical-records/my'),
      api('/medical-records/follow-ups/my')
    ])
      .then(([recordsPayload, followUpPayload]) => {
        setRecords(recordsPayload.data || []);
        setFollowUpRecords(followUpPayload.data || []);
        setFollowUpSummary(followUpPayload.meta?.summary || {});
      })
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

    function refreshMedicalRecords() {
      setQueryHandled('');
      loadRecords().catch(() => {});
    }

    socket.on('medical-record:created', refreshMedicalRecords);
    socket.on('follow-up:updated', refreshMedicalRecords);
    socket.on('appointment:updated', refreshMedicalRecords);
    return () => {
      socket.off('medical-record:created', refreshMedicalRecords);
      socket.off('follow-up:updated', refreshMedicalRecords);
      socket.off('appointment:updated', refreshMedicalRecords);
    };
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

  useEffect(() => {
    if (loading || !recordsLoaded) return;

    const params = new URLSearchParams(location.search);
    const shouldFocusFollowUps = params.get('tab') === 'follow-ups' || params.get('followUps') === 'true';
    if (!shouldFocusFollowUps) return;

    window.requestAnimationFrame(() => {
      followUpPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [loading, location.search, recordsLoaded]);

  async function handleDownloadPdf(record) {
    try {
      await downloadPdf(`/medical-records/${record._id}/pdf`, `ket-qua-kham-${record._id}.pdf`);
    } catch (error) {
      toast.error(error.message || 'Không tải được PDF');
    }
  }

  return (
    <div className="public-page medical-records-page">
      <div className="page-heading">
        <span className="section-eyebrow">Lịch sử khám</span>
        <h1>Hồ sơ khám bệnh</h1>
        <p className="text-secondary">Theo dõi dòng thời gian sức khỏe, chẩn đoán, đơn thuốc và kế hoạch tái khám của bạn.</p>
      </div>

      {!loading && (
        <div ref={followUpPanelRef}>
          <FollowUpDashboard
            records={followUpRecords}
            summary={followUpSummary}
            forceVisible={
              new URLSearchParams(location.search).get('tab') === 'follow-ups'
              || new URLSearchParams(location.search).get('followUps') === 'true'
            }
            onOpenRecord={setSelected}
          />
        </div>
      )}

      {loading ? (
        <SkeletonList count={3} height={96} />
      ) : records.length ? (
        <div className="medical-timeline">
          {records.map((record) => {
            const appointment = record.appointmentId || {};
            const dateStr = appointment.date || formatDate(record.createdAt);
            const hasVitals = getVitalItems(record).length > 0;
            const followUpStatus = followUpStatusLabel(record);

            return (
              <div className="medical-timeline-item" key={record._id}>
                <div className="medical-timeline-marker">
                  <div className="medical-timeline-dot" />
                  <div className="medical-timeline-date">{dateStr}</div>
                </div>
                <article className="medical-record-card timeline-card">
                  <div className="medical-record-header">
                    <h2>{displayText(record.diagnosis)}</h2>
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
                    <p>{displayName(record.doctorId)} · {displayName(record.clinicId)}</p>
                  </div>

                  {hasVitals && (
                    <div className="medical-record-vitals-preview">
                      {record.vitals?.bloodPressure && <span>HA: {record.vitals.bloodPressure}</span>}
                      {record.vitals?.heartRate && <span>Nhịp tim: {record.vitals.heartRate} bpm</span>}
                      {record.vitals?.temperature && <span>{record.vitals.temperature}°C</span>}
                    </div>
                  )}

                  <div className="medical-record-actions mt-3">
                    <button className="btn btn-sm btn-primary" type="button" onClick={() => setSelected(record)}>
                      Xem hồ sơ chi tiết
                    </button>
                    <button className="btn btn-sm btn-outline-success" type="button" onClick={() => handleDownloadPdf(record)}>
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
