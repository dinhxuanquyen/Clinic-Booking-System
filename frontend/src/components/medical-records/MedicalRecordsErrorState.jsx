export default function MedicalRecordsErrorState({ onRetry }) {
  return (
    <div className="phr-feedback-state phr-error-state" role="alert">
      <span className="phr-feedback-icon" aria-hidden="true">!</span>
      <div>
        <h2>Không thể tải hồ sơ khám bệnh</h2>
        <p>Hệ thống chưa lấy được dữ liệu hồ sơ. Vui lòng thử lại sau ít phút.</p>
      </div>
      <button className="btn btn-primary" type="button" onClick={onRetry}>
        Thử lại
      </button>
    </div>
  );
}
