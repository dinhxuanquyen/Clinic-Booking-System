import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BaseModal from './BaseModal.jsx';
import { useToast } from '../context/ToastContext.jsx';
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

function linkedFollowUpAppointmentId(record) {
  const appointment = record?.followUpAppointmentId;
  if (!appointment) return '';
  return typeof appointment === 'object' ? appointment._id : appointment;
}

function canBookFollowUp(record) {
  if (!record?.followUpRequired) return false;
  return ['recommended', 'overdue'].includes(record.followUpStatus || 'recommended');
}

function entityId(value) {
  return typeof value === 'object' ? value?._id : value;
}

function getSourceFollowUpRecord(record) {
  const source = record?.appointmentId?.followUpRecordId;
  return source && typeof source === 'object' ? source : null;
}

function getSourceFollowUpRecordId(record) {
  return entityId(record?.appointmentId?.followUpRecordId);
}

function isFollowUpMedicalRecord(record) {
  return Boolean(record?.appointmentId?.isFollowUp || record?.appointmentId?.followUpRecordId);
}

function sourceFollowUpVisitText(record) {
  const sourceRecord = getSourceFollowUpRecord(record);
  const sourceAppointment = sourceRecord?.appointmentId || record?.appointmentId?.originalAppointmentId;
  if (sourceAppointment?.date) {
    return `${formatDate(sourceAppointment.date)}${sourceAppointment.timeSlot ? ` · ${sourceAppointment.timeSlot}` : ''}`;
  }
  if (sourceRecord?.createdAt) return formatDate(sourceRecord.createdAt);
  return 'lần khám trước';
}

function sourceRecordPath(recordId, pathname) {
  if (pathname.startsWith('/doctor')) return `/doctor/medical-records?recordId=${recordId}`;
  return `/medical-records?recordId=${recordId}`;
}

function followUpDescription(record) {
  if (!record?.followUpRequired) {
    return 'Bác sĩ chưa yêu cầu tái khám. Nếu có triệu chứng bất thường, bạn nên đặt lịch kiểm tra lại.';
  }

  if (record.followUpStatus === 'scheduled' && record.followUpAppointmentId) {
    const appointment = record.followUpAppointmentId;
    if (!appointment.date) return 'Bạn đã đặt lịch tái khám cho hồ sơ này. Vui lòng kiểm tra trong mục Lịch hẹn của tôi.';
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
          <div><span>Mã BHYT</span><strong>{insurance.insuranceNumber}</strong></div>
          <div><span>Ngày hết hạn</span><strong>{formatDate(insurance.insuranceExpiryDate)}</strong></div>
          <div><span>Nơi đăng ký KCB ban đầu</span><strong>{insurance.insuranceRegisteredHospital || 'Chưa cập nhật'}</strong></div>
        </div>
      )}
    </div>
  );
}

export default function MedicalRecordDetailModal({ record, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);

  if (!record) return null;

  const appointment = record.appointmentId || {};
  const vitalItems = getVitalItems(record);
  const followUpStatus = followUpStatusLabel(record);
  const sourceRecord = getSourceFollowUpRecord(record);
  const sourceRecordId = getSourceFollowUpRecordId(record);
  const showSourceFollowUp = isFollowUpMedicalRecord(record) && sourceRecordId;

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

      {showSourceFollowUp && (
        <div className="medical-record-source-card">
          <div>
            <span>Hồ sơ tái khám</span>
            <strong>Hồ sơ này là tái khám từ hồ sơ ngày {sourceFollowUpVisitText(record)}.</strong>
            {sourceRecord?.diagnosis && <p>Chẩn đoán lần khám gốc: {displayText(sourceRecord.diagnosis)}</p>}
          </div>
          <button
            className="btn btn-sm btn-outline-primary"
            type="button"
            onClick={() => {
              onClose();
              navigate(sourceRecordPath(sourceRecordId, location.pathname));
            }}
          >
            Xem hồ sơ gốc
          </button>
        </div>
      )}

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
