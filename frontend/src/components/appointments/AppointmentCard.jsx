import AppointmentActions from './AppointmentActions.jsx';
import AppointmentDoctorInfo from './AppointmentDoctorInfo.jsx';
import AppointmentProgress from './AppointmentProgress.jsx';
import AppointmentStatusBadge from './AppointmentStatusBadge.jsx';
import {
  formatDateVN,
  formatQueueNumber,
  formatTimeSlot,
  getAppointmentCode,
  getAppointmentTypeLabel,
  getServicePackageName,
  isFollowUpAppointment,
  isTodayAppointment
} from '../../utils/appointmentView.js';

export default function AppointmentCard({ appointment, sourceRecordId, ...actionProps }) {
  const formattedDate = formatDateVN(appointment.date);
  const hasFormattedDate = formattedDate !== 'Chưa cập nhật';
  const cardLabel = `Lịch hẹn ${formattedDate}, ${formatTimeSlot(appointment.timeSlot)}, ${getAppointmentCode(appointment)}`;

  return (
    <article className={`pa-card ${isFollowUpAppointment(appointment) ? 'follow-up' : ''}`} aria-label={cardLabel}>
      <div className="pa-card-date">
        {isTodayAppointment(appointment) && <span>Hôm nay</span>}
        <strong>{hasFormattedDate ? formattedDate.slice(0, 5) : formattedDate}</strong>
        {hasFormattedDate && <small>{formattedDate.slice(6)}</small>}
        <em>{formatTimeSlot(appointment.timeSlot)}</em>
      </div>

      <div className="pa-card-main">
        <div className="pa-card-title-row">
          <AppointmentDoctorInfo appointment={appointment} />
          <AppointmentStatusBadge status={appointment.status} />
        </div>
        <div className="pa-card-meta">
          <span>{getServicePackageName(appointment)}</span>
          <span>{getAppointmentTypeLabel(appointment)}</span>
          <span>{getAppointmentCode(appointment)}</span>
          {appointment.queueNumber && <span>Số thứ tự {formatQueueNumber(appointment.queueNumber)}</span>}
        </div>
        <AppointmentProgress status={appointment.status} />
      </div>

      <AppointmentActions appointment={appointment} sourceRecordId={sourceRecordId} {...actionProps} />
    </article>
  );
}
