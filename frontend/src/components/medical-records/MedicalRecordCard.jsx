import { useNavigate } from 'react-router-dom';
import {
  appointmentTypeLabel,
  canBookFollowUp,
  deriveClinicalStatus,
  displayText,
  examDate,
  followUpBookingUrl,
  followUpStatusInfo,
  formatDateVN,
  formatSlot,
  hasAttachmentFiles,
  hasInsuranceInfo,
  prescriptionCount
} from '../../utils/medicalRecordView.js';
import RecordDoctorInfo from './RecordDoctorInfo.jsx';
import RecordStatusBadge from './RecordStatusBadge.jsx';

export default function MedicalRecordCard({ record, onOpen, onDownload }) {
  const navigate = useNavigate();
  const appointment = record.appointmentId || {};
  const followUpStatus = followUpStatusInfo(record);
  const clinicalStatus = deriveClinicalStatus(record);
  const medicineCount = prescriptionCount(record);
  const slot = appointment.timeSlot ? formatSlot(appointment.timeSlot) : '';

  return (
    <article className="phr-record-card phr-premium-card">
      <div className="phr-card-date">
        <strong>{formatDateVN(examDate(record))}</strong>
        {slot && <span>{slot}</span>}
        <em>{appointmentTypeLabel(record)}</em>
      </div>

      <div className="phr-card-body">
        <div className="phr-card-title-row">
          <div>
            <span className={`phr-clinical-state ${clinicalStatus.tone}`}>{clinicalStatus.label}</span>
            <h3>{displayText(record.diagnosis, 'Chưa cập nhật chẩn đoán')}</h3>
          </div>
          {record.followUpRequired && <RecordStatusBadge status={followUpStatus} />}
        </div>

        <RecordDoctorInfo doctor={record.doctorId} specialty={record.specialtyId} clinic={record.clinicId} />

        {record.conclusion && (
          <p className="phr-record-summary">{displayText(record.conclusion)}</p>
        )}

        <div className="phr-record-clinical">
          {medicineCount > 0 && <span>{medicineCount} thuốc</span>}
          {record.followUpRequired && (
            <span>{record.followUpDate ? `Tái khám ${formatDateVN(record.followUpDate)}` : 'Cần chọn ngày tái khám'}</span>
          )}
          {hasAttachmentFiles(record) && <span>Có cận lâm sàng</span>}
          {hasInsuranceInfo(record) && <span>Có BHYT</span>}
        </div>
      </div>

      <div className="phr-card-actions">
        <button className="btn btn-primary btn-sm" type="button" onClick={() => onOpen(record)}>
          Xem hồ sơ
        </button>
        {canBookFollowUp(record) && (
          <button className="btn btn-outline-primary btn-sm" type="button" onClick={() => navigate(followUpBookingUrl(record))}>
            Đặt tái khám
          </button>
        )}
        <button className="btn btn-link btn-sm" type="button" onClick={() => onDownload(record)}>
          Tải PDF
        </button>
      </div>
    </article>
  );
}
