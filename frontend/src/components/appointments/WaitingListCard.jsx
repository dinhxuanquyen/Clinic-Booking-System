import AppointmentStatusBadge from './AppointmentStatusBadge.jsx';
import { displayName, formatDateVN, formatTimeSlot } from '../../utils/appointmentView.js';

export default function WaitingListCard({ entry, onCancel }) {
  return (
    <article className="pa-waiting-card">
      <div className="pa-waiting-position">
        <span>Vị trí</span>
        <strong>#{entry.position || '-'}</strong>
      </div>
      <div className="pa-waiting-main">
        <div className="pa-waiting-heading">
          <div>
            <h3>{displayName(entry.doctorId, 'Bác sĩ đang cập nhật')}</h3>
            <p>{displayName(entry.clinicId, 'Cơ sở đang cập nhật')}</p>
          </div>
          <AppointmentStatusBadge status={entry.status} type="waiting" />
        </div>
        <dl>
          <div><dt>Ngày mong muốn</dt><dd>{formatDateVN(entry.date)}</dd></div>
          <div><dt>Khung giờ</dt><dd>{formatTimeSlot(entry.timeSlot)}</dd></div>
        </dl>
      </div>
      {['waiting', 'offered'].includes(entry.status) && (
        <button className="btn btn-outline-danger btn-sm" type="button" onClick={() => onCancel(entry)}>
          Hủy đăng ký
        </button>
      )}
    </article>
  );
}
