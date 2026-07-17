import { Link } from 'react-router-dom';
import { formatAppointmentDateTime, getDoctorDisplayName } from '../../utils/appointmentView.js';

export default function AppointmentPageHeader({ latestAppointment, updatedText }) {
  return (
    <header className="pa-page-header">
      <div>
        <span className="pa-eyebrow">Tài khoản bệnh nhân</span>
        <h1>Lịch hẹn của tôi</h1>
        <p>Theo dõi lịch khám sắp tới, trạng thái xác nhận và lịch sử thăm khám của bạn.</p>
      </div>
      <aside className="pa-header-context" aria-label="Tổng quan lịch hẹn">
        <span>Lịch gần nhất</span>
        <strong>
          {latestAppointment
            ? formatAppointmentDateTime(latestAppointment.date, latestAppointment.timeSlot)
            : 'Chưa có lịch'}
        </strong>
        {latestAppointment && <small>{getDoctorDisplayName(latestAppointment)}</small>}
        {updatedText && <em>Cập nhật {updatedText}</em>}
      </aside>
      <Link className="btn btn-primary pa-header-cta" to="/booking">
        Đặt lịch khám
      </Link>
    </header>
  );
}
