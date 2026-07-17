import { Link } from 'react-router-dom';
import AppointmentActions from './AppointmentActions.jsx';
import AppointmentDoctorInfo from './AppointmentDoctorInfo.jsx';
import AppointmentStatusBadge from './AppointmentStatusBadge.jsx';
import {
  formatAppointmentDateTime,
  formatQueueNumber,
  getAppointmentCode,
  getAppointmentTypeLabel,
  getClinicDisplayName,
  getServicePackageName
} from '../../utils/appointmentView.js';

export default function UpcomingAppointmentHero({ appointment, getSourceRecordId, ...actionProps }) {
  if (!appointment) {
    return (
      <section className="pa-upcoming empty">
        <div>
          <span className="pa-eyebrow">Lịch khám sắp tới</span>
          <h2>Bạn chưa có lịch khám sắp tới.</h2>
          <p>Đặt lịch mới để được phòng khám xác nhận khung giờ phù hợp.</p>
        </div>
        <Link className="btn btn-primary" to="/booking">Đặt lịch khám</Link>
      </section>
    );
  }

  return (
    <section className="pa-upcoming">
      <div className="pa-upcoming-main">
        <span className="pa-eyebrow">Lịch khám sắp tới</span>
        <h2>{formatAppointmentDateTime(appointment.date, appointment.timeSlot)}</h2>
        <AppointmentDoctorInfo appointment={appointment} />
        <dl>
          <div><dt>Cơ sở</dt><dd>{getClinicDisplayName(appointment)}</dd></div>
          <div><dt>Dịch vụ</dt><dd>{getServicePackageName(appointment)}</dd></div>
          <div><dt>Mã lịch</dt><dd>{getAppointmentCode(appointment)}</dd></div>
          <div><dt>Loại lịch</dt><dd>{getAppointmentTypeLabel(appointment)}</dd></div>
          {appointment.queueNumber && <div><dt>Số thứ tự</dt><dd>{formatQueueNumber(appointment.queueNumber)}</dd></div>}
        </dl>
      </div>
      <div className="pa-upcoming-side">
        <AppointmentStatusBadge status={appointment.status} />
        <AppointmentActions
          appointment={appointment}
          sourceRecordId={getSourceRecordId?.(appointment)}
          {...actionProps}
        />
      </div>
    </section>
  );
}
