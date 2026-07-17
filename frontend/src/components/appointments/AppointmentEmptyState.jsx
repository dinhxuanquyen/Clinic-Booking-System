import { Link } from 'react-router-dom';

export default function AppointmentEmptyState({ filtered = false, onReset, type = 'appointments' }) {
  if (type === 'waiting') {
    return (
      <div className="pa-empty-state" role="status">
        <span className="pa-empty-icon" aria-hidden="true" />
        <h2>Bạn chưa tham gia danh sách chờ nào</h2>
        <p>Khi khung giờ mong muốn đã đầy, bạn có thể đăng ký chờ tại trang bác sĩ.</p>
        <Link className="btn btn-primary" to="/doctors">Tìm bác sĩ</Link>
      </div>
    );
  }

  if (filtered) {
    return (
      <div className="pa-empty-state" role="status">
        <span className="pa-empty-icon search" aria-hidden="true" />
        <h2>Không tìm thấy lịch hẹn phù hợp</h2>
        <p>Thử đổi từ khóa, năm khám, trạng thái hoặc xóa bộ lọc để xem toàn bộ lịch hẹn.</p>
        <button className="btn btn-primary" type="button" onClick={onReset}>
          Xóa bộ lọc
        </button>
      </div>
    );
  }

  return (
    <div className="pa-empty-state" role="status">
      <span className="pa-empty-icon" aria-hidden="true" />
      <h2>Bạn chưa có lịch khám nào</h2>
      <p>Hãy đặt lịch khám đầu tiên để được bác sĩ hỗ trợ và theo dõi lịch sử thăm khám tại đây.</p>
      <Link className="btn btn-primary" to="/booking">Đặt lịch khám</Link>
    </div>
  );
}
