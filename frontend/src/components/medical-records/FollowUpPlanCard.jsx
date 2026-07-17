import { useNavigate } from 'react-router-dom';
import {
  canBookFollowUp,
  followUpBookingUrl,
  followUpDescription,
  followUpStatusInfo,
  formatDateVN,
  formatSlot,
  hasValue,
  linkedFollowUpAppointmentId
} from '../../utils/medicalRecordView.js';

function getObjectId(value) {
  if (!value) return '';
  return typeof value === 'object' ? value._id : value;
}

function getFollowUpAppointment(record) {
  return record?.followUpAppointmentId && typeof record.followUpAppointmentId === 'object'
    ? record.followUpAppointmentId
    : null;
}

function getCompletedRecordId(record) {
  return getObjectId(record?.followUpCompletedRecordId);
}

function FollowUpRow({ label, value }) {
  if (!hasValue(value)) return null;
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function FollowUpPlanCard({ onClose, record }) {
  const navigate = useNavigate();
  const followUpStatus = followUpStatusInfo(record);
  const linkedAppointmentId = linkedFollowUpAppointmentId(record);
  const followUpAppointment = getFollowUpAppointment(record);
  const completedRecordId = getCompletedRecordId(record);
  const appointmentText = followUpAppointment?.date
    ? `${formatDateVN(followUpAppointment.date)}${followUpAppointment.timeSlot ? ` · ${formatSlot(followUpAppointment.timeSlot)}` : ''}`
    : '';

  return (
    <div className={`phr-follow-up-callout phr-modal-follow-up ${followUpStatus.tone}`}>
      <div className="phr-follow-up-plan-main">
        <span>{followUpStatus.label}</span>
        <p>{followUpDescription(record)}</p>
        <div className="phr-follow-up-plan-grid">
          <FollowUpRow label="Ngày đề xuất" value={record?.followUpDate ? formatDateVN(record.followUpDate) : ''} />
          <FollowUpRow label="Lịch đã đặt" value={appointmentText} />
        </div>
      </div>
      <div className="phr-callout-actions">
        {canBookFollowUp(record) && (
          <button
            className="btn btn-primary btn-sm"
            type="button"
            onClick={() => {
              onClose();
              navigate(followUpBookingUrl(record));
            }}
          >
            Đặt lịch tái khám
          </button>
        )}
        {completedRecordId && (
          <button
            className="btn btn-outline-primary btn-sm"
            type="button"
            onClick={() => {
              onClose();
              navigate(`/medical-records?recordId=${completedRecordId}`);
            }}
          >
            Xem hồ sơ tái khám
          </button>
        )}
        {followUpStatus.key === 'scheduled' && linkedAppointmentId && (
          <button
            className="btn btn-outline-primary btn-sm"
            type="button"
            onClick={() => {
              onClose();
              navigate(`/appointments/my?appointmentId=${linkedAppointmentId}`);
            }}
          >
            Xem lịch tái khám
          </button>
        )}
      </div>
    </div>
  );
}
