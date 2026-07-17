export default function AppointmentErrorState({ message, onRetry }) {
  return (
    <div className="pa-error-state" role="alert">
      <span className="pa-error-icon" aria-hidden="true">!</span>
      <div>
        <h2>Không thể tải lịch hẹn</h2>
        <p>{message || 'Hệ thống chưa lấy được dữ liệu lịch hẹn. Vui lòng thử lại.'}</p>
      </div>
      <button className="btn btn-primary" type="button" aria-label="Thử tải lại danh sách lịch hẹn" onClick={onRetry}>
        Thử lại
      </button>
    </div>
  );
}
