import EmptyState from '../EmptyState.jsx';

export default function RecordEmptyState({ filtered, onBook, onReset }) {
  if (filtered) {
    return (
      <div className="phr-empty-with-action">
        <EmptyState
          variant="record"
          title="Không tìm thấy hồ sơ phù hợp"
          description="Thử đổi từ khóa, chuyên khoa, năm khám hoặc xóa bộ lọc để xem lại toàn bộ hồ sơ."
        />
        <button className="btn btn-outline-primary" type="button" onClick={onReset}>
          Xóa bộ lọc
        </button>
      </div>
    );
  }

  return (
    <div className="phr-empty-with-action">
      <EmptyState
        variant="record"
        title="Chưa có hồ sơ khám bệnh"
        description="Sau khi buổi khám hoàn tất, kết quả khám và kế hoạch điều trị sẽ được lưu tại đây."
      />
      {onBook && (
        <button className="btn btn-primary" type="button" onClick={onBook}>
          Đặt lịch khám
        </button>
      )}
    </div>
  );
}
