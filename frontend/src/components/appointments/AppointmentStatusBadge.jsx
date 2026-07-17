import { getAppointmentStatusLabel, getAppointmentStatusTone, getWaitingStatusLabel, getWaitingStatusTone } from '../../utils/appointmentView.js';

export default function AppointmentStatusBadge({ status, type = 'appointment' }) {
  const label = type === 'waiting' ? getWaitingStatusLabel(status) : getAppointmentStatusLabel(status);
  const tone = type === 'waiting' ? getWaitingStatusTone(status) : getAppointmentStatusTone(status);

  return <span className={`pa-status-badge ${tone}`}>{label}</span>;
}
