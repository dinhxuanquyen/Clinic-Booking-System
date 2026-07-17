import AppointmentCard from './AppointmentCard.jsx';
import { formatMonthYearVN, isTodayAppointment, isUpcomingAppointment } from '../../utils/appointmentView.js';

function groupLabel(appointment) {
  if (isTodayAppointment(appointment) && isUpcomingAppointment(appointment)) return 'Hôm nay';
  if (isUpcomingAppointment(appointment)) return 'Sắp tới';
  return formatMonthYearVN(appointment.date);
}

export default function AppointmentGroup({ appointments, getSourceRecordId, totalCount, ...actionProps }) {
  const groups = appointments.reduce((result, appointment) => {
    const label = groupLabel(appointment);
    if (!result.has(label)) result.set(label, []);
    result.get(label).push(appointment);
    return result;
  }, new Map());

  return (
    <div className="pa-groups" id="appointment-results" role="list">
      {Array.from(groups.entries()).map(([label, items]) => (
        <section className="pa-group" key={label} role="listitem">
          <div className="pa-group-heading">
            <h2>{label}</h2>
            <span>{items.length} lịch</span>
          </div>
          <div className="pa-card-list">
            {items.map((appointment) => (
              <AppointmentCard
                appointment={appointment}
                key={appointment._id}
                sourceRecordId={getSourceRecordId?.(appointment)}
                {...actionProps}
              />
            ))}
          </div>
        </section>
      ))}
      {totalCount > appointments.length && (
        <p className="pa-page-note">Đang hiển thị {appointments.length}/{totalCount} lịch hẹn theo phân trang.</p>
      )}
    </div>
  );
}
